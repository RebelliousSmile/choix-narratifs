//! Le verifier : **canon-aware**, côté client. Il lit le canon que le mur a caché
//! au narrateur et passe chaque candidat de prose par une checklist (§7) :
//!
//! 1. **fuite** — la prose nomme-t-elle le secret ? (jetons de fuite)
//! 2. **contradiction** — nie-t-elle un fait établi ?
//! 3. **move exécuté** — reflète-t-elle bien ce que le directeur a décidé ?
//!
//! Phase 1 = checklist par jetons (stub avant LLM). La version « qualité » fera
//! le même travail sémantiquement ; la *forme* du contrat ne change pas.

use serde::Serialize;

use crate::directeur::BeatPlan;
use crate::state::Canon;

/// Motif d'écartement d'un candidat.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export))]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
#[serde(tag = "type", content = "detail", rename_all = "snake_case")]
pub enum Rejet {
    /// Un jeton du secret est apparu dans la prose (le fuyard).
    Fuite(String),
    /// La prose nie un fait établi.
    Contradiction(String),
    /// Le move décidé n'apparaît pas (aucun jeton de move présent).
    MoveNonExecute,
}

/// Verdict du verifier pour un candidat.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Verdict {
    pub passe: bool,
    pub rejet: Option<Rejet>,
}

impl Verdict {
    fn ok() -> Self {
        Verdict { passe: true, rejet: None }
    }
    fn ko(r: Rejet) -> Self {
        Verdict { passe: false, rejet: Some(r) }
    }
}

/// Passe `candidat` par la checklist. L'ordre compte : on rapporte le motif le
/// plus grave d'abord (fuite > contradiction > move).
pub fn verifier(canon: &Canon, plan: &BeatPlan, candidat: &str) -> Verdict {
    let prose = candidat.to_lowercase();

    // 1) Fuite — le mur sémantique.
    for jeton in &canon.jetons_fuite {
        if prose.contains(&jeton.to_lowercase()) {
            return Verdict::ko(Rejet::Fuite(jeton.clone()));
        }
    }

    // 2) Contradiction — cohérence avec les faits établis.
    for jeton in &canon.jetons_contradiction {
        if prose.contains(&jeton.to_lowercase()) {
            return Verdict::ko(Rejet::Contradiction(jeton.clone()));
        }
    }

    // 3) Move exécuté — la prose doit refléter la décision du directeur.
    let move_ok = plan
        .jetons_move
        .iter()
        .any(|j| prose.contains(&j.to_lowercase()));
    if !move_ok {
        return Verdict::ko(Rejet::MoveNonExecute);
    }

    Verdict::ok()
}
