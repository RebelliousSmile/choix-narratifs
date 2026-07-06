//! # Le filet — invariants gelés avant le juge sémantique (#39, Phase 2)
//!
//! Avant d'ajouter le juge sémantique canon-free (`/judge`, ADR
//! `aidd_docs/decisions/2026_07-verifier-judge-placement.md`), ce fichier
//! verrouille par des tests ce qui ne doit **pas** bouger pendant la
//! transition :
//!
//! 1. `resolve()` coupe toujours la fuite **lexicalement** (filet autoritaire,
//!    canon-aware, synchrone) — le juge sémantique ne le remplace jamais.
//! 2. Les trois variantes de [`Rejet`] sont toujours émises, dans l'ordre de
//!    gravité (fuite > contradiction > move).
//! 3. `Outcome::ResampleNeeded` est toujours produit quand tous les candidats
//!    sont invalides, et le beat reste ouvert (un resample le re-juge).
//!
//! Si un de ces tests casse pendant l'implémentation du juge (Phase 3), c'est
//! que le mur a bougé ou que le contrat `Rejet`/`Outcome` a changé de forme —
//! précisément ce que l'ADR interdit.

use cn_core::{Engine, Outcome, Rejet};

#[test]
fn fuite_toujours_coupee_par_le_filet_lexical() {
    let mut e = Engine::restore(None);
    e.prepare("Je lui demande où est passée la cargaison.");

    let batch = vec![
        "Le docker grogne : « Verain a tout payé. »".to_string(),
        "Le docker se détourne. « La cargaison ? Partie. Elle a quitté le quai. »".to_string(),
    ];

    match e.resolve(&batch) {
        Outcome::Commit { index, .. } => assert_eq!(index, 1, "le fuyard (#0) doit être écarté"),
        other => panic!("attendu Commit, obtenu {other:?}"),
    }

    let t = e.trace.last().unwrap();
    assert_eq!(t.verdicts[0].1, Err(Rejet::Fuite("verain".into())));
    assert_eq!(t.verdicts[1].1, Ok(()));
}

#[test]
fn rejets_emettent_les_trois_variantes_attendues() {
    let mut e = Engine::restore(None);
    e.prepare("Je le saisis par le col : qui a payé ?!");

    // Un candidat par motif de rejet, dans l'ordre de gravité de la checklist.
    let batch = vec![
        "Il ricane : « Verain, évidemment. »".to_string(),
        "Il hausse les épaules : « La cargaison est toujours sur le quai. »".to_string(),
        "Il sourit, serein, et ne bronche pas.".to_string(),
    ];

    match e.resolve(&batch) {
        Outcome::ResampleNeeded { rejets } => {
            assert_eq!(rejets.len(), 3);
            assert!(matches!(rejets[0], (0, Rejet::Fuite(_))));
            assert!(matches!(rejets[1], (1, Rejet::Contradiction(_))));
            assert!(matches!(rejets[2], (2, Rejet::MoveNonExecute)));
        }
        other => panic!("attendu ResampleNeeded, obtenu {other:?}"),
    }
}

#[test]
fn tous_invalides_ouvre_un_resample_puis_le_meme_beat_commit() {
    let mut e = Engine::restore(None);
    e.prepare("Je le saisis par le col : qui a payé ?!");

    let invalides = vec![
        "Il ricane : « Verain, évidemment. »".to_string(),
        "Il hausse les épaules : « La cargaison est toujours sur le quai. »".to_string(),
        "Il sourit, serein, et ne bronche pas.".to_string(),
    ];
    assert!(matches!(e.resolve(&invalides), Outcome::ResampleNeeded { .. }));

    // Le beat reste ouvert : un resample (invisible au joueur) re-juge le MÊME beat.
    let resample = vec![
        "Le docker détourne les yeux. « Tout ce que je sais : elle a quitté le quai. »".to_string(),
    ];
    match e.resolve(&resample) {
        Outcome::Commit { index, .. } => assert_eq!(index, 0),
        other => panic!("attendu Commit après resample, obtenu {other:?}"),
    }

    let t = e.trace.last().unwrap();
    assert_eq!(t.resamples, 1);
    assert!(t.commit.is_some());
}
