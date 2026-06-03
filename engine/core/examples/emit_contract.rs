//! Émet les JSON exacts de la frontière (mêmes octets que `cn-wasm` renvoie au
//! JS) pour servir de **fixtures** aux tests TS de l'island. Sert de garde-fou
//! d'alignement TS ↔ Rust : si la forme change, les fixtures changent et les
//! tests TS le voient.
//!
//! Usage : `cargo run -p cn-core --example emit_contract`

use cn_core::Engine;

fn main() {
    // 1) prepare → { packet, n }
    let mut e = Engine::restore(None);
    let prep = e.prepare("Je lui demande où est passée la cargaison.");
    println!("--- PREPARE ---");
    println!("{}", serde_json::to_string_pretty(&prep).unwrap());

    // 2) resolve → commit (le fuyard #0 est écarté)
    let commit = e.resolve(&[
        "Le docker grogne : « Verain a payé. »".to_string(),
        "Il se détourne. « La cargaison ? Partie, elle a quitté le quai. »".to_string(),
    ]);
    println!("--- RESOLVE_COMMIT ---");
    println!("{}", serde_json::to_string_pretty(&commit).unwrap());

    // 3) resolve → resample_needed (tous invalides : fuite, contradiction, move)
    e.prepare("Je le saisis par le col : qui a payé ?!");
    let resample = e.resolve(&[
        "Il ricane : « Verain. »".to_string(),
        "Il hausse les épaules : « toujours sur le quai. »".to_string(),
        "Il sourit, serein, et ne bronche pas.".to_string(),
    ]);
    println!("--- RESOLVE_RESAMPLE ---");
    println!("{}", serde_json::to_string_pretty(&resample).unwrap());
}
