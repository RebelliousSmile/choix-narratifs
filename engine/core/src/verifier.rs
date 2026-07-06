//! Le verifier : **canon-aware**, côté client. Il lit le canon que le mur a caché
//! au narrateur et passe chaque candidat de prose par une checklist (§7) :
//!
//! 1. **fuite** — la prose nomme-t-elle le secret ? (jetons de fuite)
//! 2. **contradiction** — nie-t-elle un fait établi ?
//! 3. **move exécuté** — reflète-t-elle bien ce que le directeur a décidé ?
//!
//! Phase 1 = checklist par jetons (avant le jugement sémantique du Hub). La
//! comparaison est **repliée** (accents + casse via [`crate::texte::plier`]) pour
//! ne pas laisser passer « Verain » quand le canon tait « Vérain » : le mur ne
//! doit pas dépendre de la façon dont le narrateur accentue. La *forme* du contrat
//! (les [`Rejet`]) ne change pas ; la version « qualité » fera le même travail
//! sémantiquement.

use serde::Serialize;

use crate::directeur::BeatPlan;
use crate::state::Canon;
use crate::texte::plier;

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
    // Comparaison repliée (accents + casse) des deux côtés : le mur ne dépend pas
    // de l'orthographe accentuée du narrateur. Le `Rejet` rapporte le jeton d'origine.
    let prose = plier(candidat);

    // 1) Fuite — le mur sémantique.
    for jeton in &canon.jetons_fuite {
        if prose.contains(&plier(jeton)) {
            return Verdict::ko(Rejet::Fuite(jeton.clone()));
        }
    }

    // 2) Contradiction — cohérence avec les faits établis.
    for jeton in &canon.jetons_contradiction {
        if prose.contains(&plier(jeton)) {
            return Verdict::ko(Rejet::Contradiction(jeton.clone()));
        }
    }

    // 3) Move exécuté — la prose doit refléter la décision du directeur.
    let move_ok = plan.jetons_move.iter().any(|j| prose.contains(&plier(j)));
    if !move_ok {
        return Verdict::ko(Rejet::MoveNonExecute);
    }

    Verdict::ok()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::state::Canon;

    fn canon(fuite: &[&str], contradiction: &[&str]) -> Canon {
        Canon {
            secret_reponse: "peu importe".into(),
            jetons_fuite: fuite.iter().map(|s| s.to_string()).collect(),
            faits_etablis: vec![],
            jetons_contradiction: contradiction.iter().map(|s| s.to_string()).collect(),
        }
    }

    fn plan(moves: &[&str]) -> BeatPlan {
        BeatPlan {
            jetons_move: moves.iter().map(|s| s.to_string()).collect(),
            revealable: vec![],
            budget: 1,
        }
    }

    #[test]
    fn fuite_meme_sans_accent_dans_la_prose() {
        // Canon tait « Vérain » ; la prose écrit « verain » (sans accent) → écartée.
        let v = verifier(&canon(&["Vérain"], &[]), &plan(&["quitté le quai"]), "c'est verain");
        assert_eq!(v.rejet, Some(Rejet::Fuite("Vérain".into())));
    }

    #[test]
    fn move_reconnu_malgre_accent() {
        // Jeton de move accentué, prose sans accent → le move passe quand même.
        let v = verifier(&canon(&[], &[]), &plan(&["quitté le quai"]), "elle a quitte le quai");
        assert!(v.passe);
    }

    #[test]
    fn contradiction_repliee() {
        let v = verifier(
            &canon(&[], &["toujours là"]),
            &plan(&["parti"]),
            "Non, c'est TOUJOURS LÀ.",
        );
        assert_eq!(v.rejet, Some(Rejet::Contradiction("toujours là".into())));
    }

    #[test]
    fn move_absent_rejete() {
        let v = verifier(&canon(&[], &[]), &plan(&["quitté le quai"]), "il se tait.");
        assert_eq!(v.rejet, Some(Rejet::MoveNonExecute));
    }
}
