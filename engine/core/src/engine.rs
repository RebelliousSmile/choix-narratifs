//! La façade du moteur — l'API exposée à l'hôte (TS / harnais terminal).
//!
//! ```text
//! Engine::restore(snapshot?) -> Engine
//! engine.prepare(action)     -> Prepared { packet, n }   // directeur → paquet canon-free
//! engine.resolve(candidates) -> Outcome                  // verifier → Commit | ResampleNeeded
//! engine.snapshot()          -> bytes
//! ```
//!
//! La boucle hôte : `prepare` → (Hub `/narrate`) → `resolve` → resample si tous
//! invalides (Mikado, §6) → persist. Le verifier reste **côté client** (canon-aware).

use serde::{Deserialize, Serialize};

use crate::directeur::{self, BeatPlan};
use crate::packet::ScenePacket;
use crate::state::{Event, SceneSpec, World};
use crate::verifier::{self, Rejet};

/// Sortie de `prepare` : ce qui part vers le relais (le paquet + le best-of-N).
#[derive(Debug, Clone, PartialEq, Serialize)]
#[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export))]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
pub struct Prepared {
    pub packet: ScenePacket,
    pub n: u8,
}

/// Info **publique** de la scène (décor + PNJ), pour l'en-tête de l'UI. N'expose
/// aucun canon : ce sont les mêmes champs que le directeur copie déjà dans le paquet.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export))]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
pub struct SceneInfo {
    pub lieu: String,
    pub ambiance: Option<String>,
    pub pnj_nom: String,
    pub pnj_voix: String,
}

/// Décision de l'éditeur pour un secret resté caché en fin de partie (US-1.4).
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export))]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum Decision {
    /// Le mur tombe : le secret est révélé, sous la formulation choisie par l'éditeur.
    Reveler { texte: String },
    /// Le secret est retiré du compte rendu (il reste « caché vivant »).
    Retirer,
}

/// Entrée du producteur : la décision prise pour un secret donné.
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export))]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
pub struct SecretResolution {
    pub secret: String,
    pub decision: Decision,
}

/// Une révélation publiée : la formulation de l'éditeur (jamais le canon brut).
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export))]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
pub struct ResolutionPublique {
    pub revelation: String,
}

/// Un échange du compte rendu (forme close, déjà canon-free).
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export))]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
pub struct Echange {
    pub action: String,
    pub prose: String,
}

/// Le **compte rendu** : type FERMÉ qui franchit la membrane vers Suddenly. Ne
/// contient QUE du public : scène, échanges, faits appris, résolutions explicites.
/// Aucun secret « caché vivant » n'y figure.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export))]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
pub struct CompteRendu {
    pub scene: SceneInfo,
    pub echanges: Vec<Echange>,
    pub faits_appris: Vec<String>,
    pub resolutions: Vec<ResolutionPublique>,
}

/// Pourquoi la membrane refuse l'export.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(tag = "type", content = "detail", rename_all = "snake_case")]
#[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export))]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
pub enum ExportError {
    /// Un secret caché n'a reçu aucune décision (ni révélé, ni retiré).
    SecretNonResolu(String),
    /// Un secret qu'on veut retirer apparaît pourtant déjà dans la prose : impossible
    /// de le retirer proprement (il faudrait éditer la prose, ou le révéler).
    FuiteDansProse { secret: String, jeton: String },
}

/// Résultat de `resolve`.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export))]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
#[serde(tag = "outcome", rename_all = "snake_case")]
pub enum Outcome {
    /// Un candidat valide a été retenu ; l'état a avancé.
    Commit {
        index: usize,
        candidat: String,
        /// Faits que le joueur apprend ce tour (diff du registre).
        diff: Vec<String>,
    },
    /// Tous les candidats ont été écartés → l'hôte doit redemander (resample §6).
    /// Le beat reste « ouvert » : un nouvel appel à `resolve` re-juge le même beat.
    ResampleNeeded { rejets: Vec<(usize, Rejet)> },
}

/// Trace dev par tour (US-1.2) : le paquet envoyé, le verdict par candidat, le
/// nombre de resamples, et le commit final.
#[derive(Debug, Clone, Default)]
pub struct TourTrace {
    pub paquet_json: String,
    pub verdicts: Vec<(usize, Result<(), Rejet>)>,
    pub resamples: u32,
    pub commit: Option<(usize, Vec<String>)>,
}

/// Verdict sérialisable d'un candidat (US-1.2). `rejet: null` = candidat retenu.
#[derive(Debug, Clone, Serialize)]
#[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export))]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
pub struct VerdictTrace {
    pub index: usize,
    pub rejet: Option<Rejet>,
}

/// Commit sérialisable d'un tour.
#[derive(Debug, Clone, Serialize)]
#[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export))]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
pub struct CommitTrace {
    pub index: usize,
    pub diff: Vec<String>,
}

/// Vue sérialisable d'un tour de trace (pour la vue dev côté UI).
#[derive(Debug, Clone, Serialize)]
#[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export))]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
pub struct TourTraceView {
    pub paquet_json: String,
    pub verdicts: Vec<VerdictTrace>,
    pub resamples: u32,
    pub commit: Option<CommitTrace>,
}

/// Le moteur. Détient l'état + le beat en cours + la trace.
pub struct Engine {
    world: World,
    pending: Option<BeatPlan>,
    /// Action du beat en cours, mémorisée à `prepare` pour journaliser au commit.
    derniere_action: String,
    pub trace: Vec<TourTrace>,
}

impl Engine {
    /// Reprend une session depuis un snapshot, ou amorce la scène par défaut.
    pub fn restore(snapshot: Option<&[u8]>) -> Engine {
        let world = match snapshot {
            Some(bytes) => serde_json::from_slice(bytes).expect("snapshot illisible"),
            None => World::scene_docker(),
        };
        Engine { world, pending: None, derniere_action: String::new(), trace: Vec::new() }
    }

    /// Amorce une session sur une scène **créée par l'auteur** (UI Phase 4 / bucket).
    /// Renvoie une erreur si le devis est injouable (cf. [`SceneSpec::validate`]).
    pub fn author(spec: SceneSpec) -> Result<Engine, String> {
        spec.validate()?;
        let world = World::from_spec(spec);
        Ok(Engine { world, pending: None, derniere_action: String::new(), trace: Vec::new() })
    }

    /// Le directeur produit le paquet canon-free ; le plan privé est mémorisé.
    pub fn prepare(&mut self, action: &str) -> Prepared {
        let brief = directeur::prepare(&self.world, action);
        self.pending = Some(brief.plan);
        self.derniere_action = action.to_string();
        self.trace.push(TourTrace {
            paquet_json: serde_json::to_string(&brief.packet).expect("paquet sérialisable"),
            ..Default::default()
        });
        Prepared { packet: brief.packet, n: brief.n }
    }

    /// Le verifier trie les candidats. Premier valide → commit ; sinon resample.
    ///
    /// # Panics
    /// Si appelé sans `prepare` préalable (aucun beat ouvert).
    pub fn resolve(&mut self, candidates: &[String]) -> Outcome {
        let plan = self.pending.clone().expect("resolve() sans prepare()");

        let mut verdicts = Vec::with_capacity(candidates.len());
        let mut rejets = Vec::new();
        let mut gagnant: Option<(usize, String)> = None;

        for (i, cand) in candidates.iter().enumerate() {
            let v = verifier::verifier(&self.world.canon, &plan, cand);
            match v.rejet {
                Some(r) => {
                    verdicts.push((i, Err(r.clone())));
                    rejets.push((i, r));
                }
                None => {
                    verdicts.push((i, Ok(())));
                    if gagnant.is_none() {
                        gagnant = Some((i, cand.clone()));
                    }
                }
            }
        }

        // Met à jour la trace du beat courant.
        if let Some(tour) = self.trace.last_mut() {
            tour.verdicts = verdicts;
        }

        match gagnant {
            Some((index, candidat)) => {
                let diff = self.appliquer(&plan);
                if let Some(tour) = self.trace.last_mut() {
                    tour.commit = Some((index, diff.clone()));
                }
                // Journalise le tour commité (transcript persistant → export + reprise).
                self.world.journal.push(crate::state::TourJournal {
                    action: self.derniere_action.clone(),
                    prose: candidat.clone(),
                    faits_reveles: diff.clone(),
                });
                self.pending = None; // le beat se referme
                Outcome::Commit { index, candidat, diff }
            }
            None => {
                if let Some(tour) = self.trace.last_mut() {
                    tour.resamples += 1;
                }
                // `pending` reste : le même beat sera re-jugé au prochain resolve.
                Outcome::ResampleNeeded { rejets }
            }
        }
    }

    /// Sérialise l'état (snapshot local — IndexedDB / bucket). Inclut le canon :
    /// il reste donc côté client, jamais dans le paquet.
    pub fn snapshot(&self) -> Vec<u8> {
        serde_json::to_vec(&self.world).expect("état sérialisable")
    }

    /// Ce que le joueur sait à cet instant (fold du registre).
    pub fn savoir_joueur(&self) -> Vec<String> {
        self.world.registre.knows("joueur")
    }

    /// Vue sérialisable de la trace dev (US-1.2). Reflète les tours joués depuis le
    /// chargement (la trace n'est pas persistée dans le snapshot).
    pub fn trace_view(&self) -> Vec<TourTraceView> {
        self.trace
            .iter()
            .map(|t| TourTraceView {
                paquet_json: t.paquet_json.clone(),
                verdicts: t
                    .verdicts
                    .iter()
                    .map(|(i, r)| VerdictTrace { index: *i, rejet: r.clone().err() })
                    .collect(),
                resamples: t.resamples,
                commit: t
                    .commit
                    .as_ref()
                    .map(|(i, diff)| CommitTrace { index: *i, diff: diff.clone() }),
            })
            .collect()
    }

    /// Info publique de la scène (pour l'en-tête de l'UI). Aucun canon.
    pub fn scene(&self) -> SceneInfo {
        SceneInfo {
            lieu: self.world.cadre.lieu.clone(),
            ambiance: self.world.cadre.ambiance.clone(),
            pnj_nom: self.world.locuteur.nom.clone(),
            pnj_voix: self.world.locuteur.voix.clone(),
        }
    }

    /// Les secrets du canon (Phase 1 : un seul), filtrés des vides.
    fn canon_secrets(&self) -> Vec<String> {
        [self.world.canon.secret_reponse.clone()]
            .into_iter()
            .filter(|s| !s.trim().is_empty())
            .collect()
    }

    /// Les secrets encore **cachés** en fin de partie : non révélés au joueur, donc
    /// en attente d'une décision de l'éditeur (révéler / retirer) avant export.
    pub fn secrets_en_attente(&self) -> Vec<String> {
        let known = self.world.registre.knows("joueur");
        self.canon_secrets()
            .into_iter()
            .filter(|s| !known.contains(s))
            .collect()
    }

    /// **La membrane d'export** (US-1.4). Produit un compte rendu FERMÉ qui ne
    /// contient que du public. Refuse (`Err`) tant qu'un secret caché est indécis,
    /// ou si un secret qu'on veut retirer traîne encore dans la prose (paranoïa :
    /// un mur ne fait jamais confiance à l'étage du dessous).
    ///
    /// Un secret **révélé en jeu** sort tel quel ; un secret **caché** ne sort que
    /// sous la formulation explicite de l'éditeur (`Reveler`), ou pas du tout (`Retirer`).
    pub fn export(
        &self,
        resolutions: &[SecretResolution],
    ) -> Result<CompteRendu, Vec<ExportError>> {
        let known = self.world.registre.knows("joueur");
        let mut errors = Vec::new();
        let mut publiques = Vec::new();

        for secret in self.canon_secrets() {
            if known.contains(&secret) {
                // Résolu pendant la partie : le mur est déjà tombé dessus.
                publiques.push(ResolutionPublique { revelation: secret });
                continue;
            }
            match resolutions.iter().find(|r| r.secret == secret) {
                None => errors.push(ExportError::SecretNonResolu(secret)),
                Some(SecretResolution { decision: Decision::Reveler { texte }, .. }) => {
                    publiques.push(ResolutionPublique { revelation: texte.clone() });
                }
                Some(SecretResolution { decision: Decision::Retirer, .. }) => {
                    // Vérifie qu'aucun jeton du secret ne subsiste dans la prose.
                    if let Some(jeton) = self.jeton_fuite_dans_prose() {
                        errors.push(ExportError::FuiteDansProse { secret, jeton });
                    }
                }
            }
        }

        if !errors.is_empty() {
            return Err(errors);
        }

        Ok(CompteRendu {
            scene: self.scene(),
            echanges: self
                .world
                .journal
                .iter()
                .map(|t| Echange { action: t.action.clone(), prose: t.prose.clone() })
                .collect(),
            faits_appris: known,
            resolutions: publiques,
        })
    }

    /// Premier jeton de fuite trouvé dans la prose journalisée, le cas échéant.
    fn jeton_fuite_dans_prose(&self) -> Option<String> {
        for jeton in &self.world.canon.jetons_fuite {
            let j = jeton.to_lowercase();
            if self.world.journal.iter().any(|t| t.prose.to_lowercase().contains(&j)) {
                return Some(jeton.clone());
            }
        }
        None
    }

    /// Applique le diff d'état : le joueur apprend jusqu'à `budget` faits
    /// révélables encore inconnus de lui.
    fn appliquer(&mut self, plan: &BeatPlan) -> Vec<String> {
        let connus = self.world.registre.knows("joueur");
        let mut diff = Vec::new();
        for fait in &plan.revealable {
            if diff.len() >= plan.budget as usize {
                break;
            }
            if !connus.contains(fait) {
                self.world.registre.events.push(Event::Revealed {
                    agent: "joueur".into(),
                    fait: fait.clone(),
                });
                diff.push(fait.clone());
            }
        }
        diff
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // Le fuyard (contient le secret) ; le valide (lâche le fait mineur).
    fn batch_avec_fuyard() -> Vec<String> {
        vec![
            "Le docker grogne : « Verain a tout payé. »".into(),
            "Le docker se détourne. « La cargaison ? Partie. Elle a quitté le quai. »".into(),
        ]
    }

    #[test]
    fn prepare_produit_un_paquet_canon_free() {
        let mut e = Engine::restore(None);
        let prep = e.prepare("Je lui demande où est passée la cargaison.");
        let json = serde_json::to_string(&prep.packet).unwrap();
        // Le secret ne transite jamais (US-1.1, vérifiable en trace).
        assert!(!json.contains("Verain"));
        assert!(prep.packet.validate().is_ok());
        // Le sujet est marqué tu, mais sans son contenu.
        assert_eq!(prep.packet.withhold, vec!["qui a payé".to_string()]);
    }

    #[test]
    fn le_fuyard_est_ecarte() {
        let mut e = Engine::restore(None);
        e.prepare("Je lui demande où est passée la cargaison.");
        match e.resolve(&batch_avec_fuyard()) {
            Outcome::Commit { index, diff, .. } => {
                assert_eq!(index, 1, "le candidat #0 (fuyard) doit être écarté");
                assert_eq!(diff, vec!["la cargaison a quitté le quai".to_string()]);
            }
            other => panic!("attendu Commit, obtenu {other:?}"),
        }
        // Le verdict #0 doit être une fuite.
        let t = e.trace.last().unwrap();
        assert!(matches!(t.verdicts[0].1, Err(Rejet::Fuite(_))));
    }

    #[test]
    fn tous_invalides_demande_resample_puis_commit() {
        let mut e = Engine::restore(None);
        e.prepare("Je le saisis par le col : qui a payé ?!");

        // Batch 1 : fuite, contradiction, move non exécuté → tous écartés.
        let invalides = vec![
            "Il ricane : « Verain, évidemment. »".into(),
            "Il hausse les épaules : « La cargaison est toujours sur le quai. »".into(),
            "Il sourit, serein, et ne bronche pas.".into(),
        ];
        match e.resolve(&invalides) {
            Outcome::ResampleNeeded { rejets } => assert_eq!(rejets.len(), 3),
            other => panic!("attendu ResampleNeeded, obtenu {other:?}"),
        }

        // Le beat reste ouvert : un resample (invisible) le re-juge.
        let resample = vec![
            "Le docker détourne les yeux. « Tout ce que je sais : elle a quitté le quai. »".into(),
        ];
        assert!(matches!(e.resolve(&resample), Outcome::Commit { .. }));

        let t = e.trace.last().unwrap();
        assert_eq!(t.resamples, 1);
        assert!(t.commit.is_some());
    }

    #[test]
    fn snapshot_round_trip_preserve_le_savoir() {
        let mut e = Engine::restore(None);
        e.prepare("Je lui demande où est passée la cargaison.");
        e.resolve(&batch_avec_fuyard());
        let savoir = e.savoir_joueur();
        assert_eq!(savoir, vec!["la cargaison a quitté le quai".to_string()]);

        let snap = e.snapshot();
        let e2 = Engine::restore(Some(&snap));
        assert_eq!(e2.savoir_joueur(), savoir);
    }
}
