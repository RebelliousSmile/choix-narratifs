//! Harnais terminal — Phase 1, « la boucle juste » (+ Phase 4 #39, juge stub).
//!
//! Déroule trois tours avec un `/narrate` **STUB** (candidats *canned*, dont un
//! fuyard) pour régler la boucle AVANT le LLM et AVANT l'island. Critère de
//! sortie du jalon Phase 1 :
//! - Tour 1 : le fuyard est écarté, un candidat valide est commité.
//! - Tour 2 : tous les candidats sont invalides → resample invisible (Mikado §6).
//!
//! Tour 3 (#39, Phase 4) rejoue le même mécanisme avec un candidat qui **passe**
//! le filet lexical (`verifier()`) mais reformule un fait établi contredit en
//! des termes absents des `jetons_contradiction` canon — exactement le trou que
//! le juge sémantique canon-free (cf. ADR
//! `aidd_docs/decisions/2026_07-verifier-judge-placement.md`) doit combler.
//! Le drapeau `--with-judge` (défaut : absent = filet lexical seul, comportement
//! inchangé) active un juge sémantique **stub**, miroir Rust de `narrate_stub` /
//! `src/scripts/narrative/judge.ts` — le harnais est du Rust synchrone pur, sans
//! interop TS/async, donc pas de `HttpJudge` ici.
//!
//! Invariant montré en trace : seul le **paquet** (canon-free) franchit le mur,
//! y compris vers le juge stub.

use cn_core::engine::Outcome;
use cn_core::packet::ScenePacket;
use cn_core::{Engine, Rejet};

fn main() {
    let with_judge = std::env::args().any(|a| a == "--with-judge");

    println!("=== choix-narratifs — harnais terminal (Phase 1 : la boucle juste) ===");
    println!(
        "    juge sémantique (#39, Phase 4) : {}\n",
        if with_judge { "ACTIVÉ (stub)" } else { "désactivé (filet lexical seul)" }
    );

    let mut engine = Engine::restore(None);

    // Tour 1 — le fuyard est écarté, un candidat valide commité.
    tour(&mut engine, 1, "Je lui demande où est passée la cargaison.", with_judge);

    // Tour 2 — tous invalides au 1er batch → resample invisible → commit.
    tour(&mut engine, 2, "Je le saisis par le col : qui a payé ?!", with_judge);

    // Tour 3 (#39, Phase 4) — un candidat passe le lexical, seul le juge le voit.
    tour(&mut engine, 3, "Et cette cargaison, elle est où maintenant ?", with_judge);

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

/// Un tour complet de la boucle hôte : prepare → narrate(stub) → [juge stub] →
/// resolve, avec resample tant que tous les candidats sont écartés. Quand
/// `with_judge` est faux, le juge stub ne rejette jamais rien : le chemin est
/// alors identique, octet pour octet, au harnais Phase 1 (défaut inchangé).
fn tour(engine: &mut Engine, num: u32, action: &str, with_judge: bool) {
    println!("── Tour {num} — action joueur : « {action} »");

    let prep = engine.prepare(action);
    let packet_json = serde_json::to_string(&prep.packet).expect("paquet sérialisable");

    // L'invariant du mur, vérifié en trace : aucun secret ne transite — ni vers
    // le narrateur, ni vers le juge (cf. `judge_stub`, même paquet canon-free).
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

        // Passe sémantique (#39, Phase 4) : filtre AVANT resolve(), miroir de
        // `session.ts`. Verdicts jamais `Fuite` (cf. `JudgeRejet` en TS) — le
        // filet lexical reste seul juge de la fuite.
        let verdicts = if with_judge {
            judge_stub(&packet_json, num, batch, &candidats)
        } else {
            candidats.iter().map(|_| None).collect()
        };

        let mut survivants = Vec::new();
        let mut survivant_index_original = Vec::new();
        for (i, (candidat, verdict)) in candidats.iter().zip(verdicts.iter()).enumerate() {
            match verdict {
                Some(rejet) => {
                    println!("    ✗ #{i} écarté par le juge sémantique — {}", motif(rejet));
                }
                None => {
                    survivant_index_original.push(i);
                    survivants.push(candidat.clone());
                }
            }
        }

        if with_judge && survivants.is_empty() {
            println!("  ↻ tout écarté par le juge → resample invisible (Mikado §6)");
            batch += 1;
            if batch > 3 {
                println!("  ⚠ abandon après 3 resamples (ne devrait pas arriver ici)");
                break;
            }
            continue;
        }

        match engine.resolve(&survivants) {
            Outcome::Commit { index, candidat, diff } => {
                let index = survivant_index_original[index];
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
                    let i = survivant_index_original[*i];
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
        // Tour 1 : un fuyard (#0, cite le secret) + un aveu valide (#1).
        (1, _) => vec![
            "Le docker grogne. « Verain a payé pour tout ça. La cargaison a quitté le quai. »"
                .into(),
            "Le docker pèse sa question, puis crache par terre. « La cargaison ? Partie. \
             Elle a quitté le quai mardi soir, et vous n'en tirerez pas plus. »"
                .into(),
        ],
        // Tour 2, batch 0 : fuite, contradiction, move non exécuté → tous écartés.
        (2, 0) => vec![
            "Il ricane : « Verain, évidemment. »".into(),
            "Il hausse les épaules. « La cargaison est toujours sur le quai. »".into(),
            "Il sourit, serein, et ne bronche pas.".into(),
        ],
        // Tour 2, resample : le PNJ se braque mais lâche à nouveau le fait (relance valide).
        (2, _) => vec![
            "Le docker vous repousse d'une main. « Lâche-moi. Je vous l'ai dit : \
             elle a quitté le quai. Rien de plus. »"
                .into(),
        ],
        // Tour 3, batch 0 (#39, Phase 4) : un seul candidat, qui PASSE le filet
        // lexical — le jeton de move « embarqué » est présent, aucun jeton de
        // fuite/contradiction canon ne l'est — mais qui nie par le SENS le fait
        // établi (« la cargaison a quitté le quai ») avec une reformulation
        // absente des `jetons_contradiction` canon. Seul le juge sémantique voit
        // la contradiction ; le filet lexical la laisserait passer telle quelle.
        (3, 0) => vec![
            "Il hausse les épaules : « Rien n'a été embarqué, la cargaison croupit \
             encore dans le hangar du quai. »"
                .into(),
        ],
        // Tour 3, resample : un aveu sans ambiguïté, que le juge laisse passer.
        (3, _) => vec![
            "Le docker soupire. « Bon, d'accord : elle a quitté le quai hier soir. \
             Rien de plus à en tirer. »"
                .into(),
        ],
        _ => vec![],
    }
}

/// Le juge sémantique STUB (#39, Phase 4) : miroir Rust de `narrate_stub`, même
/// principe de verdicts *canned* selon (tour, batch) — mais ici pour simuler
/// `/judge` plutôt que `/narrate`. Ne rend jamais `Fuite` (cf. `JudgeRejet` en
/// TS, `src/scripts/narrative/judge.ts`) : la fuite reste le filet lexical
/// autoritaire, invoqué par `Engine::resolve` et lui seul.
fn judge_stub(packet_json: &str, tour: u32, batch: u32, candidats: &[String]) -> Vec<Option<Rejet>> {
    // Même invariant que le narrateur : le juge ne reçoit jamais le canon.
    let _packet: ScenePacket =
        serde_json::from_str(packet_json).expect("le juge ne reçoit qu'un paquet valide");
    assert!(!packet_json.contains("Verain"), "FUITE : le juge a reçu le secret !");

    match (tour, batch) {
        // Tour 3, batch 0 : le candidat unique nie par le sens un fait établi
        // (« la cargaison a quitté le quai ») en des termes que le filet lexical
        // ne connaît pas — le juge le rejette là où `verifier()` l'aurait laissé
        // commiter (jeton de move « embarqué » présent).
        (3, 0) => candidats
            .iter()
            .map(|_| {
                Some(Rejet::Contradiction(
                    "nie par le sens « la cargaison a quitté le quai »".into(),
                ))
            })
            .collect(),
        _ => candidats.iter().map(|_| None).collect(),
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
