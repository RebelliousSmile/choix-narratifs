# Contrat de couture CN ↔ Hub (vendorisé)

`hub-narrate.schema.json` est une **copie pinnée** du contrat que le Hub valide
réellement les requêtes contre :

    ai-hub/muses/narrate/contract/schema.json

Origine SHA1 (à la copie) : `815bda7e1c8249061aafce7e3134501bea79a9a8`

> **CN-first en cours (`language`)** — cette copie **devance** le Hub live d'un
> champ : `ScenePacket.language` (BCP-47) a été ajouté côté CN (source de vérité,
> `packet.rs`) et reporté ici pour garder l'anti-dérive verte. Le Hub ne l'attend
> pas encore et le rejetterait (`additionalProperties: false`) → à importer côté
> Hub (**Hub-B**, `import_narrate_contract.sh`), après quoi ce pin SHA redeviendra
> exact. Tant que Hub-B n'est pas fait, ne pas envoyer `language` au Hub live.

Il sert de **contrepartie** au test de contrat `tests/narrative/contract.test.ts` :
CN prouve, sans lancer le Hub, que la requête `{ packet, n }` qu'il émet est
acceptée par ce schéma, et que les réponses/erreurs golden sont bien consommées
par `HttpNarrator`.

## Re-synchroniser

Le Hub recopie `ScenePacket` depuis `src/scripts/narrative/generated/schema.json`
(source de vérité, émise par `pnpm gen:types`). En cas de changement du paquet :

1. côté Hub, resynchroniser `muses/narrate/contract/schema.json` ;
2. re-copier ici ce fichier ;
3. `pnpm test` — la garde anti-dérive de `contract.test.ts` signale toute
   divergence de champs / `required` / enums entre cette copie et la source CN.

La garde protège le lien **copie ↔ source CN**. Le lien **copie ↔ Hub réel** est
un simple pin (SHA ci-dessus) ; le contrôle réciproque (copie Hub == source CN)
doit vivre dans la CI du Hub.
