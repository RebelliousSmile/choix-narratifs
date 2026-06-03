//! Épreuve du catalogue agnostique de gestes (temps 1, cf. audit système→moves).
//!
//! Vérifie : le catalogue est cohérent (ids uniques, lookup), la sélection du
//! directeur mappe l'état public sur un geste, et le geste par défaut sous tension
//! garde le libellé historique (régression : la fixture prepare.json reste valide).

use cn_core::moves;
use cn_core::Engine;

#[test]
fn catalogue_ids_uniques_et_non_vides() {
    let ids: Vec<&str> = moves::CATALOGUE.iter().map(|m| m.id).collect();
    let mut tries = ids.clone();
    tries.sort_unstable();
    tries.dedup();
    assert_eq!(tries.len(), ids.len(), "ids dupliqués dans le catalogue");
    for m in moves::CATALOGUE {
        assert!(!m.id.is_empty() && !m.libelle.is_empty());
    }
}

#[test]
fn lookup_par_id() {
    assert_eq!(moves::par_id("se_fermer"), Some(&moves::SE_FERMER));
    assert_eq!(moves::par_id("conceder"), Some(&moves::CONCEDER));
    assert_eq!(moves::par_id("inconnu"), None);
}

#[test]
fn le_catalogue_reste_agnostique() {
    // Aucun terme propre à un système de jeu (PbtA & co.) dans les ids/libellés.
    const INTERDITS: &[&str] = &[
        "playbook", "pbta", "stat", "roll", "move ", "mc ", "apocalypse", "skin",
    ];
    for m in moves::CATALOGUE {
        let hay = format!("{} {}", m.id, m.libelle).to_lowercase();
        for mot in INTERDITS {
            assert!(!hay.contains(mot), "jargon « {mot} » dans le geste « {} »", m.id);
        }
    }
}

#[test]
fn geste_par_defaut_sous_tension_inchange() {
    // Le docker, sous une action qui touche au secret, doit produire le libellé
    // historique → la fixture prepare.json (clé "move") reste fidèle.
    let mut e = Engine::restore(None);
    let prep = e.prepare("Je lui demande qui a payé pour la cargaison.");
    assert_eq!(prep.packet.mouvement, moves::SE_FERMER.libelle);
    assert_eq!(prep.packet.mouvement, "se détourne, lâche 1 fait mineur");
}

#[test]
fn geste_anodin_conceder() {
    let mut e = Engine::restore(None);
    let prep = e.prepare("Bonsoir, belle nuit.");
    assert_eq!(prep.packet.mouvement, moves::CONCEDER.libelle);
}
