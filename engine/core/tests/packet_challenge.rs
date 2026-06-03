//! # Challenge du contrat `packet.rs`
//!
//! La brique de couture (`packet.rs`) est livrée avec 5 tests, mais plusieurs de
//! ses invariants n'étaient **pas couverts**. Ce fichier les attaque
//! systématiquement et documente, par des tests, la **frontière exacte** de la
//! garantie « canon-free » : ce que le type empêche (structurel) vs ce qu'il
//! n'empêche PAS (sémantique — le travail du verifier).
//!
//! Angles morts des tests fournis, comblés ici :
//! - `VersionMismatch` n'était jamais déclenché ;
//! - `n` n'était testé qu'en deçà (0), jamais au-dessus de `N_MAX`, ni aux bornes ;
//! - `deny_unknown_fields` n'était prouvé qu'au niveau racine, pas imbriqué ;
//! - la robustesse du `#[serde(rename = "move")]` (clé Rust refusée) ;
//! - champ requis manquant, variante d'enum invalide, JSON minimal valide ;
//! - **la limite** : une fuite *sémantique* passe `validate()` (par design).

use cn_core::packet::*;

fn exemple() -> ScenePacket {
    ScenePacket {
        schema_version: PACKET_SCHEMA_VERSION,
        cadre: Cadre {
            lieu: "le quai, à la nuit tombée".into(),
            ambiance: Some("pluie fine".into()),
            presents: vec![],
        },
        locuteur: Locuteur { nom: "le docker".into(), voix: "bourru".into() },
        action_joueur: "Je lui demande où est passée la cargaison.".into(),
        hearing: "menace sur le secret".into(),
        mouvement: "se détourne, lâche 1 fait mineur".into(),
        revealable: vec!["la cargaison a quitté le quai".into()],
        withhold: vec!["qui a payé".into()],
        form: Form {
            registre: Registre::Sec,
            budget_revelation: 1,
            ratio: Ratio::NonVerbalDominant,
            interdit_shape: vec![],
        },
    }
}

// --- 1. Versionnement : déclenche réellement VersionMismatch (jamais testé) ---

#[test]
fn version_differente_rejetee() {
    let mut p = exemple();
    p.schema_version = PACKET_SCHEMA_VERSION + 1;
    assert!(matches!(
        p.validate(),
        Err(PacketError::VersionMismatch { attendu, recu })
            if attendu == PACKET_SCHEMA_VERSION && recu == PACKET_SCHEMA_VERSION + 1
    ));
}

#[test]
fn version_zero_rejetee() {
    let mut p = exemple();
    p.schema_version = 0;
    assert!(matches!(p.validate(), Err(PacketError::VersionMismatch { .. })));
}

// --- 2. Bornes de n : au-dessus de N_MAX + bornes incluses (jamais testé) ---

#[test]
fn n_au_dessus_des_bornes_rejete() {
    let req = NarrateRequest { packet: exemple(), n: N_MAX + 1 };
    assert!(matches!(req.validate(), Err(PacketError::NHorsBornes { n }) if n == N_MAX + 1));
}

#[test]
fn n_aux_bornes_accepte() {
    for n in [N_MIN, N_MAX] {
        let req = NarrateRequest { packet: exemple(), n };
        assert!(req.validate().is_ok(), "n={n} devrait être accepté");
    }
}

// --- 3. Budget : la borne d'égalité (budget == len) doit passer ---

#[test]
fn budget_egal_aux_disponibles_accepte() {
    let mut p = exemple();
    p.form.budget_revelation = p.revealable.len() as u8; // 1 == 1
    assert!(p.validate().is_ok());
}

#[test]
fn budget_zero_toujours_ok() {
    let mut p = exemple();
    p.revealable.clear();
    p.form.budget_revelation = 0;
    assert!(p.validate().is_ok());
}

// --- 4. Le mur structurel tient EN PROFONDEUR, pas qu'à la racine ---

#[test]
fn champ_inconnu_imbrique_dans_form_rejete() {
    let json = r#"{
        "schema_version":1,
        "cadre":{"lieu":"x"},
        "locuteur":{"nom":"a","voix":"b"},
        "action_joueur":"","hearing":"","move":"",
        "revealable":[],"withhold":[],
        "form":{"registre":"sec","budget_revelation":0,"ratio":"equilibre","intrus":42}
    }"#;
    assert!(serde_json::from_str::<ScenePacket>(json).is_err());
}

#[test]
fn champ_inconnu_imbrique_dans_cadre_rejete() {
    let json = r#"{
        "schema_version":1,
        "cadre":{"lieu":"x","etat_secret":"vrai"},
        "locuteur":{"nom":"a","voix":"b"},
        "action_joueur":"","hearing":"","move":"",
        "revealable":[],"withhold":[],
        "form":{"registre":"sec","budget_revelation":0,"ratio":"equilibre"}
    }"#;
    assert!(serde_json::from_str::<ScenePacket>(json).is_err());
}

// --- 5. Le rename "move" est étanche dans les DEUX sens ---

#[test]
fn cle_json_move_obligatoire_la_cle_rust_est_refusee() {
    // Envoyer le NOM Rust du champ ("mouvement") au lieu de la clé JSON ("move")
    // doit échouer : "mouvement" est inconnu ET "move" requis manque.
    let json = r#"{
        "schema_version":1,
        "cadre":{"lieu":"x"},
        "locuteur":{"nom":"a","voix":"b"},
        "action_joueur":"","hearing":"","mouvement":"",
        "revealable":[],"withhold":[],
        "form":{"registre":"sec","budget_revelation":0,"ratio":"equilibre"}
    }"#;
    assert!(serde_json::from_str::<ScenePacket>(json).is_err());
}

// --- 6. Champ requis manquant / enum invalide ---

#[test]
fn champ_requis_manquant_rejete() {
    // "hearing" omis → erreur de désérialisation.
    let json = r#"{
        "schema_version":1,
        "cadre":{"lieu":"x"},
        "locuteur":{"nom":"a","voix":"b"},
        "action_joueur":"","move":"",
        "revealable":[],"withhold":[],
        "form":{"registre":"sec","budget_revelation":0,"ratio":"equilibre"}
    }"#;
    assert!(serde_json::from_str::<ScenePacket>(json).is_err());
}

#[test]
fn variante_enum_inconnue_rejetee() {
    let json = r#"{
        "schema_version":1,
        "cadre":{"lieu":"x"},
        "locuteur":{"nom":"a","voix":"b"},
        "action_joueur":"","hearing":"","move":"",
        "revealable":[],"withhold":[],
        "form":{"registre":"colere","budget_revelation":0,"ratio":"equilibre"}
    }"#;
    assert!(serde_json::from_str::<ScenePacket>(json).is_err());
}

// --- 7. Le JSON minimal (tous les `default` omis) parse bien ---

#[test]
fn json_minimal_sans_champs_default_parse() {
    let json = r#"{
        "schema_version":1,
        "cadre":{"lieu":"x"},
        "locuteur":{"nom":"a","voix":"b"},
        "action_joueur":"","hearing":"","move":"",
        "revealable":[],"withhold":[],
        "form":{"registre":"sec","budget_revelation":0,"ratio":"equilibre"}
    }"#;
    let p: ScenePacket = serde_json::from_str(json).expect("le JSON minimal doit parser");
    assert!(p.cadre.ambiance.is_none());
    assert!(p.cadre.presents.is_empty());
    assert!(p.form.interdit_shape.is_empty());
    assert!(p.validate().is_ok());
}

// --- 8. L'enveloppe NarrateResponse fait l'aller-retour ---

#[test]
fn narrate_response_round_trip() {
    let r = NarrateResponse {
        candidates: vec!["a".into(), "b".into()],
        credits_spent: 3,
    };
    let json = serde_json::to_string(&r).unwrap();
    let back: NarrateResponse = serde_json::from_str(&json).unwrap();
    assert_eq!(r, back);
}

#[test]
fn narrate_response_refuse_champ_surnumeraire() {
    let json = r#"{"candidates":[],"credits_spent":0,"debug":"x"}"#;
    assert!(serde_json::from_str::<NarrateResponse>(json).is_err());
}

// --- 9. LA LIMITE, documentée : le type est un mur STRUCTUREL, pas SÉMANTIQUE ---

#[test]
fn limite_un_secret_dans_revealable_passe_la_validation() {
    // `validate()` ne lit pas le SENS. Un secret glissé dans une string passe.
    // C'est par DESIGN : la fuite sémantique est coupée par le verifier
    // (canon-aware, côté client), pas par ce type. Ce test fige la frontière —
    // si un jour `validate()` se met à filtrer du sens, il faudra le vouloir.
    let mut p = exemple();
    p.revealable.push("c'est Verain qui a payé".into());
    p.form.budget_revelation = 2;
    assert!(
        p.validate().is_ok(),
        "le mur de packet.rs est structurel : il ne voit pas la fuite sémantique"
    );
}

#[test]
fn limite_un_secret_dans_withhold_passe_la_validation() {
    // `withhold` est censé ne porter que des ÉTIQUETTES, jamais le contenu tu.
    // Rien dans le type ne l'impose : c'est une convention que le directeur tient.
    let mut p = exemple();
    p.withhold = vec!["la réponse est Verain".into()];
    assert!(p.validate().is_ok());
}
