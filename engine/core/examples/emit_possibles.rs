//! Émet le **contrat de données runtime** du moteur (façon `template.json` de
//! FoundryVTT) : les « possibles » que tout consommateur lit pour s'adapter —
//! catalogue de gestes, domaines d'enums, bornes, version. Agnostique du langage,
//! complément runtime des types ts-rs.
//!
//! Usage (via `pnpm gen:types`) : `cargo run -p cn-core --example emit_possibles`
//! La sortie (stdout) est écrite dans `src/scripts/narrative/generated/contract.json`.

use cn_core::moves;
use cn_core::packet::{Ratio, Registre, ShapeTag, N_MAX, N_MIN, PACKET_SCHEMA_VERSION};
use serde_json::{json, Value};

/// Sérialise une variante d'enum unitaire via serde (source de vérité du snake_case).
fn tag<T: serde::Serialize>(v: T) -> String {
    serde_json::to_value(v).unwrap().as_str().unwrap().to_string()
}

fn main() {
    let gestes: Vec<Value> = moves::CATALOGUE
        .iter()
        .map(|m| json!({ "id": m.id, "libelle": m.libelle }))
        .collect();

    // Domaines d'enums unitaires : les CHAÎNES viennent de serde (la liste des
    // variantes, elle, est explicite — pas d'itération d'enum sans dépendance).
    let registres: Vec<String> = [
        Registre::Sec,
        Registre::Neutre,
        Registre::Tendu,
        Registre::Lyrique,
        Registre::Familier,
        Registre::Solennel,
    ]
    .into_iter()
    .map(tag)
    .collect();

    let ratios: Vec<String> =
        [Ratio::NonVerbalDominant, Ratio::Equilibre, Ratio::VerbalDominant]
            .into_iter()
            .map(tag)
            .collect();

    let shapes: Vec<String> = [
        ShapeTag::Monologue,
        ShapeTag::QuestionReponse,
        ShapeTag::ActionPuisReplique,
        ShapeTag::DescriptionPuisDialogue,
        ShapeTag::ListeDescripteurs,
        ShapeTag::RepliqueSeche,
    ]
    .into_iter()
    .map(tag)
    .collect();

    let contrat = json!({
        "packet_schema_version": PACKET_SCHEMA_VERSION,
        "best_of_n": { "min": N_MIN, "max": N_MAX },
        // Le catalogue agnostique de gestes (les « possibles » du directeur).
        "moves": gestes,
        // Domaines d'enums (discriminants du contrat).
        "registres": registres,
        "ratios": ratios,
        "shapes": shapes,
        // Discriminateurs des enums taggés (tags, non itérables ici → explicites).
        "decisions": ["reveler", "retirer"],
        "rejets": ["fuite", "contradiction", "move_non_execute"],
        "outcomes": ["commit", "resample_needed"],
    });

    println!("{}", serde_json::to_string_pretty(&contrat).unwrap());
}
