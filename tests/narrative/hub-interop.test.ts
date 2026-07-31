// Test de contrat CN ↔ Hub (issue #40, validation L1).
//
// Preuve DÉTERMINISTE — sans lancer le Hub — de trois choses que les mocks de
// `narrator.test.ts` ne prouvent PAS (un mock écrit ici n'est pas une contrepartie) :
//
//   A. la requête `{ packet, n }` que CN émet est ACCEPTÉE par le schéma que le
//      Hub valide réellement les requêtes contre (`NarrateRequest`) ;
//   B. les réponses/erreurs golden autorisées par le contrat Hub sont bien
//      CONSOMMÉES par `HttpNarrator` (succès → candidats, erreur → NarrateHttpError) ;
//   C. garde anti-dérive : le `ScenePacket` embarqué dans le contrat Hub n'a pas
//      divergé (champs / `required` / enums) de la source de vérité CN
//      (`generated/schema.json`, émise par `pnpm gen:types`).
//
// La contrepartie est vendorisée : `contract/hub-narrate.schema.json`, copie
// pinnée de `ai-hub/muses/narrate/contract/schema.json` (cf. contract/README.md).

import { describe, it, expect, vi, afterEach } from 'vitest';
import Ajv2020, { type ValidateFunction } from 'ajv/dist/2020';
import hubContract from './contract/hub-narrate.schema.json';
import cnSchema from '../../src/scripts/narrative/generated/schema.json';
import prepared from './fixtures/prepare.json';
import { HttpNarrator, NarrateHttpError } from '../../src/scripts/narrative/narrator';

// --- compilation des sous-schémas du contrat Hub -----------------------------

const ajv = new Ajv2020({ allErrors: true, strict: false });
ajv.addSchema(hubContract);

function subSchema(pointer: string): ValidateFunction {
  const v = ajv.getSchema(`${hubContract.$id}#/$defs/${pointer}`);
  if (!v) throw new Error(`sous-schéma introuvable dans le contrat Hub: ${pointer}`);
  return v as ValidateFunction;
}

const validateRequest = subSchema('NarrateRequest');
const validateResponseOk = subSchema('NarrateResponseOk');
const validateError = subSchema('NarrateError');

/** Sérialise les erreurs Ajv pour un message d'échec lisible. */
function why(v: ValidateFunction): string {
  return JSON.stringify(v.errors ?? [], null, 2);
}

// --- A. La requête émise par CN satisfait le contrat Hub ----------------------

describe('A. Requête CN → NarrateRequest du Hub', () => {
  it('accepte le `Prepared { packet, n }` réel du moteur (fixture)', () => {
    const ok = validateRequest(prepared);
    expect(ok, why(validateRequest)).toBe(true);
  });

  const rejets: Array<{ nom: string; muter: (p: any) => void }> = [
    { nom: 'n = 0 (sous le minimum 1)', muter: (p) => (p.n = 0) },
    { nom: 'n = 6 (au-dessus du maximum 5)', muter: (p) => (p.n = 6) },
    { nom: 'packet absent', muter: (p) => delete p.packet },
    { nom: 'champ d’enveloppe en trop', muter: (p) => (p.secret = 'x') },
    { nom: 'schema_version non gérée (2 ≠ const 1)', muter: (p) => (p.packet.schema_version = 2) },
    { nom: 'champ requis manquant (move)', muter: (p) => delete p.packet.move },
    { nom: 'fuite : champ en trop dans le packet', muter: (p) => (p.packet.reponse_secrete = 'qui a payé') },
  ];

  it.each(rejets)('rejette : $nom', ({ muter }) => {
    const bad = structuredClone(prepared);
    muter(bad);
    expect(validateRequest(bad)).toBe(false);
  });
});

// --- B. Les réponses golden du Hub sont consommées par HttpNarrator -----------

describe('B. Réponses Hub → HttpNarrator', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('succès : { candidates, schema_version } valide le contrat ET rend les candidats', async () => {
    const body = { candidates: ['une prose', 'une autre'], schema_version: 1 };
    expect(validateResponseOk(body), why(validateResponseOk)).toBe(true);

    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body), { status: 200 })));
    const narrator = new HttpNarrator('https://hub.test/narrate', 'tok');
    await expect(narrator.narrate(JSON.stringify(prepared.packet), 2)).resolves.toEqual(body.candidates);
  });

  const erreurs: Array<{ status: number; code: string; retriable: boolean }> = [
    { status: 401, code: 'unauthorized', retriable: false },
    { status: 402, code: 'quota_exhausted', retriable: false },
    { status: 400, code: 'bad_request', retriable: false },
    { status: 409, code: 'schema_incompatible', retriable: false },
    { status: 502, code: 'provider_error', retriable: true },
  ];

  it.each(erreurs)(
    'erreur $code : { error, detail, retriable } valide le contrat ET mappe NarrateHttpError',
    async ({ status, code, retriable }) => {
      const body = { error: code, detail: 'motif', retriable };
      expect(validateError(body), why(validateError)).toBe(true);

      vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body), { status })));
      const narrator = new HttpNarrator('https://hub.test/narrate', 'tok');
      const err = await narrator.narrate('{}', 1).catch((e: unknown) => e);

      expect(err).toBeInstanceOf(NarrateHttpError);
      expect(err).toMatchObject({ status, code, detail: 'motif', retriable });
    },
  );
});

// --- C. Garde anti-dérive : contrat Hub vendorisé vs source de vérité CN ------
//
// Comparaison STRUCTURELLE normalisée (champs / required / enums), pas un
// deep-equal : le Hub durcit légitimement `schema_version` en `const: 1` et
// convertit `#/definitions/*` en `#/$defs/*` — différences de représentation, pas
// de contrat. La garde casse si un champ, un `required` ou un membre d'enum diverge.

type Defs = Record<string, any>;
const hubDefs = hubContract.$defs as Defs;
const cnDefs = (cnSchema as { $defs: Defs }).$defs;

function objSig(def: any) {
  return {
    required: [...(def.required ?? [])].sort(),
    props: Object.keys(def.properties ?? {}).sort(),
    additionalProperties: def.additionalProperties ?? true,
  };
}
const enumSig = (def: any): string[] => [...(def.enum ?? [])].sort();

describe('C. Garde anti-dérive ScenePacket (contrat Hub vendorisé vs source CN)', () => {
  // CN-B : l'enveloppe /narrate est désormais dans la source CN → on peut la garder
  // aussi (avant, `NarrateRequest`/`NarrateResponse` manquaient au schéma généré,
  // ce qui rendait l'anti-dérive d'enveloppe aveugle — cf. la dérive CN-A).
  const objets = ['ScenePacket', 'Cadre', 'Locuteur', 'Form', 'NarrateRequest'];
  const enums = ['Registre', 'Ratio', 'ShapeTag'];

  it.each(objets)('%s : mêmes champs / required / additionalProperties', (nom) => {
    expect(hubDefs[nom], `def ${nom} absente du contrat Hub`).toBeTruthy();
    expect(cnDefs[nom], `def ${nom} absente de la source CN`).toBeTruthy();
    expect(objSig(hubDefs[nom])).toEqual(objSig(cnDefs[nom]));
  });

  it.each(enums)('%s : mêmes membres d’enum', (nom) => {
    expect(enumSig(hubDefs[nom])).toEqual(enumSig(cnDefs[nom]));
  });

  it('NarrateResponse (CN) ≡ NarrateResponseOk (Hub) : mêmes champs', () => {
    // Noms distincts (le Hub sépare Ok/Error) et `required` volontairement
    // différent — le Hub rend `schema_version` optionnel (écho), CN le requiert
    // (champ Rust). On compare donc les CHAMPS, pas le `required`.
    const props = (d: any) => Object.keys(d.properties ?? {}).sort();
    expect(props(cnDefs.NarrateResponse)).toEqual(props(hubDefs.NarrateResponseOk));
    // Anti-dérive CN-A : le crédit ne réapparaît pas dans le corps.
    expect(cnDefs.NarrateResponse.properties.credits_spent).toBeUndefined();
  });
});
