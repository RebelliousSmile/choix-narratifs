//! Harnais terminal — Phase 1, « la boucle juste ».
//!
//! Déroule deux tours avec un `/narrate` **STUB** (candidats *canned*, dont un
//! fuyard) pour régler la boucle AVANT le LLM et AVANT l'island. Critère de
//! sortie du jalon :
//! - Tour 1 : le fuyard est écarté, un candidat valide est commité.
//! - Tour 2 : tous les candidats sont invalides → resample invisible (Mikado §6).
//!
//! Invariant montré en trace : seul le **paquet** (canon-free) franchit le mur.

use cn_core::engine::Outcome;
use cn_core::packet::ScenePacket;
use cn_core::Engine;

fn main() {
    println!("=== choix-narratifs — harnais terminal (Phase 1 : la boucle juste) ===\n");

    let mut engine = Engine::restore(None);

    // Tour 1 — le fuyard est écarté, un candidat valide commité.
    tour(&mut engine, 1, "Je lui demande où est passée la cargaison.");

    // Tour 2 — tous invalides au 1er batch → resample invisible → commit.
    tour(&mut engine, 2, "Je le saisis par le col : qui a payé ?!");

    // Persistance.
    let snap = engine.snapshot();
    println!("── État final");
    println!("  le joueur sait : {:?}", engine.savoir_joueur());
    println!("  snapshot : {} octets", snap.len());

    // Reprise de session : le savoir survit au round-trip.
    let reprise = Engine::restore(Some(&snap));
    assert_eq!(reprise.savoir_joueur(), engine.savoir_joueur());
    println!("  reprise depuis snapshot : OK (savoir préservé)\n");

    println!("=== jalon Phase 1 atteint : fuyard écarté + resample invisible ===");
}

/// Un tour complet de la boucle hôte : prepare → narrate(stub) → resolve,
/// avec resample tant que tous les candidats sont écartés.
fn tour(engine: &mut Engine, num: u32, action: &str) {
    println!("── Tour {num} — action joueur : « {action} »");

    let prep = engine.prepare(action);
    let packet_json = serde_json::to_string(&prep.packet).expect("paquet sérialisable");

    // L'invariant du mur, vérifié en trace : aucun secret ne transite.
    assert!(
        !packet_json.contains("Verain"),
        "FUITE : un secret a franchi le mur dans le paquet !"
    );
    println!(
        "  → relais : paquet canon-free ({} octets), n={}, withhold={:?}",
        packet_json.len(),
        prep.n,
        prep.packet.withhold
    );

    let mut batch = 0u32;
    loop {
        // Le relais (STUB) ne reçoit QUE le paquet JSON. Il le re-désérialise,
        // ce qui prouve que seule la forme fermée a traversé.
        let candidats = narrate_stub(&packet_json, num, batch);
        println!("  ← relais : {} candidat(s)", candidats.len());

        match engine.resolve(&candidats) {
            Outcome::Commit { index, candidat, diff } => {
                println!("  ✓ commit #{index} : {candidat}");
                if diff.is_empty() {
                    println!("    diff : (rien de neuf appris ce tour)");
                } else {
                    println!("    diff : le joueur apprend {diff:?}");
                }
                break;
            }
            Outcome::ResampleNeeded { rejets } => {
                for (i, r) in &rejets {
                    println!("    ✗ #{i} écarté — {}", motif(r));
                }
                println!("  ↻ tous invalides → resample invisible (Mikado §6)");
                batch += 1;
                if batch > 3 {
                    println!("  ⚠ abandon après 3 resamples (ne devrait pas arriver ici)");
                    break;
                }
            }
        }
    }
    println!();
}

/// Le `/narrate` STUB : candidats *canned* selon (tour, batch). Aveugle au canon.
/// Le fuyard cite « Verain » non parce qu'il l'a reçu (il ne l'a pas), mais pour
/// jouer l'adversaire et exercer le verifier.
fn narrate_stub(packet_json: &str, tour: u32, batch: u32) -> Vec<String> {
    // Preuve que seul le paquet (forme fermée) a traversé le mur.
    let _packet: ScenePacket =
        serde_json::from_str(packet_json).expect("le relais ne reçoit qu'un paquet valide");

    match (tour, batch) {
        // Tour 1 : un fuyard (#0) + un valide (#1).
        (1, _) => vec![
            "Le docker grogne. « Verain a payé pour tout ça. La cargaison a quitté le quai. »"
                .into(),
            "Le docker se détourne et crache. « La cargaison ? Partie. Elle a quitté le quai. »"
                .into(),
        ],
        // Tour 2, batch 0 : fuite, contradiction, move non exécuté → tous écartés.
        (2, 0) => vec![
            "Il ricane : « Verain, évidemment. »".into(),
            "Il hausse les épaules. « La cargaison est toujours sur le quai. »".into(),
            "Il sourit, serein, et ne bronche pas.".into(),
        ],
        // Tour 2, resample : un candidat valide.
        (2, _) => vec![
            "Le docker détourne les yeux. « Lâche-moi. Tout ce que je sais : elle a quitté le quai. »"
                .into(),
        ],
        _ => vec![],
    }
}

fn motif(r: &cn_core::Rejet) -> String {
    use cn_core::Rejet::*;
    match r {
        Fuite(j) => format!("FUITE (secret « {j} » dans la prose)"),
        Contradiction(j) => format!("CONTRADICTION (« {j} » nie un fait établi)"),
        MoveNonExecute => "MOVE NON EXÉCUTÉ (la prose n'exécute pas la décision)".into(),
    }
}
