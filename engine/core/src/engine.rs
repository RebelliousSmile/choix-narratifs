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

use serde::Serialize;

use crate::directeur::{self, BeatPlan};
use crate::packet::ScenePacket;
use crate::state::{Event, World};
use crate::verifier::{self, Rejet};

/// Sortie de `prepare` : ce qui part vers le relais (le paquet + le best-of-N).
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct Prepared {
    pub packet: ScenePacket,
    pub n: u8,
}

/// Résultat de `resolve`.
#[derive(Debug, Clone, PartialEq, Serialize)]
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

/// Le moteur. Détient l'état + le beat en cours + la trace.
pub struct Engine {
    world: World,
    pending: Option<BeatPlan>,
    pub trace: Vec<TourTrace>,
}

impl Engine {
    /// Reprend une session depuis un snapshot, ou amorce la scène par défaut.
    pub fn restore(snapshot: Option<&[u8]>) -> Engine {
        let world = match snapshot {
            Some(bytes) => serde_json::from_slice(bytes).expect("snapshot illisible"),
            None => World::scene_docker(),
        };
        Engine { world, pending: None, trace: Vec::new() }
    }

    /// Le directeur produit le paquet canon-free ; le plan privé est mémorisé.
    pub fn prepare(&mut self, action: &str) -> Prepared {
        let brief = directeur::prepare(&self.world, action);
        self.pending = Some(brief.plan);
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
