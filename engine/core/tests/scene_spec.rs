//! # Épreuve de l'élaboration de scène (Phase 4)
//!
//! `SceneSpec` → `World::from_spec` → `Engine::author` : le chemin par lequel une
//! scène **créée par l'auteur** (UI / bucket) devient jouable. Ces tests verrouillent
//! les invariants délicats :
//!
//! - **couplage de jouabilité** : `jetons_move = revealable` → le stub/Hub prouve
//!   le move en énonçant un fait révélable ;
//! - **mur sémantique** : un jeton de fuite ne peut pas être sous-chaîne d'un fait
//!   révélable (sinon le seul énoncé possible fuit le secret) ;
//! - **validation** : champs requis, scène injouable refusée ;
//! - **dérivation** des jetons de fuite (noms propres du secret) ;
//! - le secret **ne franchit jamais** le paquet d'une scène custom.

use cn_core::{Engine, Outcome, SceneSpec};

fn spec_jouable() -> SceneSpec {
    SceneSpec {
        lieu: "L'arrière-salle du café".into(),
        ambiance: Some("Néons, fumée".into()),
        pnj_nom: "Soren".into(),
        pnj_voix: "Volubile, regarde ses mains".into(),
        secret: "Maline a commandité le vol".into(),
        jetons_fuite: vec![], // dérivé : "Maline"
        revealable: vec!["le coffre était déjà ouvert".into()],
        faits_etablis: vec![],
        jetons_contradiction: vec![],
        withhold: vec!["qui a commandité".into()],
    }
}

#[test]
fn devis_jouable_demarre_et_se_joue() {
    let mut e = Engine::author(spec_jouable()).expect("devis valide");
    let prep = e.prepare("Je demande qui était au courant.");

    // Le secret ne transite jamais (mur, même pour une scène custom).
    let json = serde_json::to_string(&prep.packet).unwrap();
    assert!(!json.contains("Maline"));

    // Le narrateur énonce un fait révélable → le move passe (couplage).
    let candidats = vec!["Soren marmonne : « le coffre était déjà ouvert. »".to_string()];
    assert!(matches!(e.resolve(&candidats), Outcome::Commit { .. }));
}

#[test]
fn jetons_fuite_derives_du_secret_coupent_la_fuite() {
    let mut e = Engine::author(spec_jouable()).expect("devis valide");
    e.prepare("Je demande qui était au courant.");

    // Un candidat qui nomme le commanditaire (dérivé "Maline") doit être écarté.
    let candidats = vec![
        "Soren lâche : « Maline, c'est elle. »".to_string(),
        "Soren grommelle : « le coffre était déjà ouvert. »".to_string(),
    ];
    match e.resolve(&candidats) {
        Outcome::Commit { index, .. } => assert_eq!(index, 1, "le fuyard (#0) doit être écarté"),
        other => panic!("attendu Commit, obtenu {other:?}"),
    }
}

#[test]
fn jetons_fuite_explicites_priment_sur_la_derivation() {
    let mut spec = spec_jouable();
    spec.secret = "le maire en personne".into(); // pas de nom propre
    spec.jetons_fuite = vec!["maire".into()];
    let e = Engine::author(spec);
    assert!(e.is_ok(), "des jetons explicites rendent la scène jouable");
}

#[test]
fn lieu_vide_refuse() {
    let mut spec = spec_jouable();
    spec.lieu = "   ".into();
    assert!(Engine::author(spec).is_err());
}

#[test]
fn pnj_vide_refuse() {
    let mut spec = spec_jouable();
    spec.pnj_nom = "".into();
    assert!(Engine::author(spec).is_err());
}

#[test]
fn secret_vide_refuse() {
    let mut spec = spec_jouable();
    spec.secret = "".into();
    assert!(Engine::author(spec).is_err());
}

#[test]
fn aucun_revealable_refuse() {
    let mut spec = spec_jouable();
    spec.revealable = vec![];
    assert!(Engine::author(spec).is_err(), "rien à lâcher = scène injouable");
}

#[test]
fn secret_sans_nom_propre_sans_jeton_refuse() {
    let mut spec = spec_jouable();
    spec.secret = "le maire en personne".into(); // aucun nom propre dérivable
    spec.jetons_fuite = vec![]; // ni explicite
    assert!(
        Engine::author(spec).is_err(),
        "sans jeton de fuite déterminable, la scène doit être refusée",
    );
}

#[test]
fn jeton_de_fuite_dans_revealable_refuse() {
    let mut spec = spec_jouable();
    // Le secret fuit dans le seul énoncé que le PNJ peut lâcher.
    spec.secret = "Verain a payé".into();
    spec.revealable = vec!["Verain est passé hier".into()];
    let err = Engine::author(spec).err().expect("doit être refusé");
    assert!(err.contains("fuiterait"), "message attendu sur la fuite, obtenu : {err}");
}

#[test]
fn revealable_vides_filtres() {
    let mut spec = spec_jouable();
    spec.revealable = vec!["  ".into(), "le coffre était déjà ouvert".into(), "".into()];
    // Ne doit pas être refusé : un fait non vide subsiste.
    assert!(Engine::author(spec).is_ok());
}

#[test]
fn ambiance_vide_devient_none() {
    let mut spec = spec_jouable();
    spec.ambiance = Some("   ".into());
    let mut e = Engine::author(spec).expect("valide");
    let prep = e.prepare("salut");
    // Le paquet omet l'ambiance vide (skip_serializing_if).
    let json = serde_json::to_string(&prep.packet).unwrap();
    assert!(!json.contains("\"ambiance\""));
}

#[test]
fn round_trip_json_du_spec() {
    let spec = spec_jouable();
    let json = serde_json::to_string(&spec).unwrap();
    let back: SceneSpec = serde_json::from_str(&json).unwrap();
    assert_eq!(spec, back);
}
