//! Tests de la frontière JS (côté hôte) : on vérifie la **forme JSON** exposée au
//! TS de l'island, sans navigateur. Le crate étant aussi `rlib`, les méthodes
//! `#[wasm_bindgen]` restent appelables nativement.

use cn_wasm::WasmEngine;
use serde_json::Value;

#[test]
fn prepare_expose_un_paquet_canon_free_en_json() {
    let mut e = WasmEngine::new();
    let json = e.prepare("Je lui demande où est passée la cargaison.").unwrap();
    let v: Value = serde_json::from_str(&json).unwrap();

    // Forme attendue : { packet: {...}, n: u8 }.
    assert!(v["packet"].is_object());
    assert_eq!(v["n"], 3);
    // Le paquet voyage bien sous la clé "move" (rename serde).
    assert!(v["packet"]["move"].is_string());
    // Aucun secret ne traverse.
    assert!(!json.contains("Verain"));
    assert_eq!(v["packet"]["withhold"][0], "qui a payé");
}

#[test]
fn resolve_commit_a_la_forme_attendue() {
    let mut e = WasmEngine::new();
    e.prepare("Je lui demande où est passée la cargaison.").unwrap();
    let candidates = vec![
        "Le docker grogne : « Verain a payé. »".to_string(), // fuyard
        "Il se détourne. « La cargaison ? Partie, elle a quitté le quai. »".to_string(),
    ];
    let json = e.resolve(candidates).unwrap();
    let v: Value = serde_json::from_str(&json).unwrap();

    assert_eq!(v["outcome"], "commit");
    assert_eq!(v["index"], 1); // le fuyard #0 écarté
    assert_eq!(v["diff"][0], "la cargaison a quitté le quai");
}

#[test]
fn resolve_resample_needed_a_la_forme_attendue() {
    let mut e = WasmEngine::new();
    e.prepare("Je le saisis par le col : qui a payé ?!").unwrap();
    let tous_invalides = vec![
        "Il ricane : « Verain. »".to_string(),
        "Il hausse les épaules : « toujours sur le quai. »".to_string(),
        "Il sourit, serein, et ne bronche pas.".to_string(),
    ];
    let json = e.resolve(tous_invalides).unwrap();
    let v: Value = serde_json::from_str(&json).unwrap();

    assert_eq!(v["outcome"], "resample_needed");
    // 3 rejets, chacun balisé par un "type".
    assert_eq!(v["rejets"].as_array().unwrap().len(), 3);
    assert_eq!(v["rejets"][0][1]["type"], "fuite");
}

#[test]
fn snapshot_round_trip_via_la_facade() {
    let mut e = WasmEngine::new();
    e.prepare("Je lui demande où est passée la cargaison.").unwrap();
    e.resolve(vec![
        "Il se détourne. « Partie. Elle a quitté le quai. »".to_string()
    ])
    .unwrap();

    let snap = e.snapshot();
    let reprise = WasmEngine::from_snapshot(&snap);
    assert_eq!(reprise.savoir_joueur(), e.savoir_joueur());
    assert_eq!(reprise.savoir_joueur(), vec!["la cargaison a quitté le quai".to_string()]);
}
