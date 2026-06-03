//! # Épreuve de la membrane d'export (Phase 5, US-1.4)
//!
//! L'export ne franchit la membrane qu'**après résolution** : les secrets cachés
//! sont soit **révélés** (sous la formulation de l'éditeur), soit **retirés**. Le
//! mur tombe sur le résolu, jamais sur le caché vivant. Ces tests verrouillent :
//!
//! - refus tant qu'un secret caché est indécis ;
//! - `Retirer` → le secret n'apparaît nulle part dans le compte rendu ;
//! - `Reveler` → seule la formulation de l'éditeur sort (jamais le canon brut) ;
//! - un secret **révélé en jeu** sort tel quel, sans décision requise ;
//! - le journal (transcript) survit au snapshot → l'export reste possible après reprise.
//!
//! Note : `ExportError::FuiteDansProse` est une **défense en profondeur**
//! *inatteignable par la boucle normale* — la prose journalisée a déjà passé le
//! verifier (aucun `jetons_fuite`). On ne peut donc pas la déclencher sans corrompre
//! l'état ; sa présence garantit qu'un mur ne fait jamais confiance à l'étage du dessous.

use cn_core::{Decision, Engine, Outcome, SceneSpec, SecretResolution};

/// Une scène d'enquête : le secret (« Maline ») n'est jamais lâché par le directeur.
fn spec() -> SceneSpec {
    SceneSpec {
        lieu: "L'arrière-salle".into(),
        ambiance: None,
        pnj_nom: "Soren".into(),
        pnj_voix: "nerveux".into(),
        secret: "Maline a tout orchestré".into(),
        jetons_fuite: vec!["Maline".into()],
        revealable: vec!["la livraison a eu lieu mardi".into()],
        faits_etablis: vec![],
        jetons_contradiction: vec![],
        withhold: vec!["qui a orchestré".into()],
    }
}

/// Joue un tour avec une prose valide (cite le fait révélable → move OK, sans fuite).
fn jouer_un_tour(e: &mut Engine) {
    e.prepare("Je demande ce qui s'est passé.");
    let prose = "Soren marmonne : « la livraison a eu lieu mardi. »".to_string();
    assert!(matches!(e.resolve(&[prose]), Outcome::Commit { .. }));
}

#[test]
fn refuse_tant_que_le_secret_est_indecis() {
    let mut e = Engine::author(spec()).unwrap();
    jouer_un_tour(&mut e);

    assert_eq!(e.secrets_en_attente(), vec!["Maline a tout orchestré".to_string()]);

    match e.export(&[]) {
        Err(errs) => {
            assert_eq!(errs.len(), 1);
            assert!(matches!(&errs[0], cn_core::ExportError::SecretNonResolu(s) if s == "Maline a tout orchestré"));
        }
        Ok(_) => panic!("l'export doit refuser un secret indécis"),
    }
}

#[test]
fn retirer_garde_le_secret_hors_du_compte_rendu() {
    let mut e = Engine::author(spec()).unwrap();
    jouer_un_tour(&mut e);

    let res = vec![SecretResolution {
        secret: "Maline a tout orchestré".into(),
        decision: Decision::Retirer,
    }];
    let cr = e.export(&res).expect("retirer → export possible");

    let json = serde_json::to_string(&cr).unwrap();
    assert!(!json.contains("Maline"), "le secret retiré ne doit pas figurer");
    assert!(cr.resolutions.is_empty(), "rien de révélé");
    // Le transcript public est bien là.
    assert_eq!(cr.echanges.len(), 1);
    assert!(cr.echanges[0].prose.contains("livraison"));
}

#[test]
fn reveler_ne_publie_que_la_formulation_de_lediteur() {
    let mut e = Engine::author(spec()).unwrap();
    jouer_un_tour(&mut e);

    let res = vec![SecretResolution {
        secret: "Maline a tout orchestré".into(),
        decision: Decision::Reveler {
            texte: "C'était Maline depuis le début.".into(),
        },
    }];
    let cr = e.export(&res).expect("reveler → export possible");

    assert_eq!(cr.resolutions.len(), 1);
    assert_eq!(cr.resolutions[0].revelation, "C'était Maline depuis le début.");
    // La formulation brute du canon n'est PAS ce qui sort : seule celle de l'éditeur.
    let json = serde_json::to_string(&cr).unwrap();
    assert!(!json.contains("a tout orchestré"));
}

#[test]
fn secret_revele_en_jeu_sort_tel_quel_sans_decision() {
    // Scène où le secret EST un fait révélable (cas limite) : une fois lâché, il
    // est « résolu en jeu » et n'exige plus de décision d'éditeur.
    let mut s = spec();
    s.secret = "la livraison a eu lieu mardi".into();
    s.jetons_fuite = vec!["Maline".into()]; // jeton distinct, absent du fait révélable
    let mut e = Engine::author(s).unwrap();
    jouer_un_tour(&mut e);

    assert!(e.secrets_en_attente().is_empty(), "le secret a été révélé en jeu");
    let cr = e.export(&[]).expect("aucune décision requise");
    assert_eq!(cr.resolutions.len(), 1);
    assert_eq!(cr.resolutions[0].revelation, "la livraison a eu lieu mardi");
}

#[test]
fn le_journal_survit_au_snapshot() {
    let mut e = Engine::author(spec()).unwrap();
    jouer_un_tour(&mut e);
    let snap = e.snapshot();

    // Reprise : l'export reste possible (le transcript a survécu).
    let e2 = Engine::restore(Some(&snap));
    let res = vec![SecretResolution {
        secret: "Maline a tout orchestré".into(),
        decision: Decision::Retirer,
    }];
    let cr = e2.export(&res).expect("export après reprise");
    assert_eq!(cr.echanges.len(), 1, "le transcript a survécu au snapshot");
}

#[test]
fn snapshot_ancien_sans_journal_se_charge() {
    // Un snapshot Phase 3/4 (World sans champ `journal`) doit se désérialiser grâce
    // à `#[serde(default)]`. On simule en retirant la clé du JSON.
    let mut e = Engine::author(spec()).unwrap();
    jouer_un_tour(&mut e);
    let snap = e.snapshot();
    let mut v: serde_json::Value = serde_json::from_slice(&snap).unwrap();
    v.as_object_mut().unwrap().remove("journal");
    let snap2 = serde_json::to_vec(&v).unwrap();

    let e2 = Engine::restore(Some(&snap2));
    // Pas de journal → transcript vide, mais ça se charge sans paniquer.
    let cr = e2
        .export(&[SecretResolution {
            secret: "Maline a tout orchestré".into(),
            decision: Decision::Retirer,
        }])
        .expect("snapshot legacy chargé");
    assert!(cr.echanges.is_empty());
}
