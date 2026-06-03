//! Émet le **JSON Schema** (validation-grade, agnostique) des types de frontière —
//! la « dpc » que le relais (Hub) et tout consommateur non-Rust lisent pour VALIDER.
//! Pendant runtime de ts-rs ; généré depuis les mêmes types (source de vérité unique).
//!
//! Usage (via `pnpm gen:types`) : `cargo run -p cn-core --features schema --example emit_schema`
//! Sortie (stdout) → `src/scripts/narrative/generated/schema.json` (bundle `$defs`).

use cn_core::engine::{
    CompteRendu, Decision, Echange, ExportError, Outcome, Prepared, ResolutionPublique,
    SceneInfo, SecretResolution, TourTraceView, VerdictTrace, CommitTrace,
};
use cn_core::moves::Move;
use cn_core::packet::{Cadre, Form, Locuteur, Ratio, Registre, ScenePacket, ShapeTag};
use cn_core::state::SceneSpec;
use cn_core::verifier::Rejet;
use schemars::gen::SchemaSettings;
use serde_json::{json, Value};

fn main() {
    // Un seul générateur → toutes les définitions partagées dans un même `$defs`.
    let mut gen = SchemaSettings::draft2019_09().into_generator();

    // Enregistre chaque type de frontière (les dépendances suivent automatiquement).
    macro_rules! reg {
        ($($t:ty),* $(,)?) => { $( let _ = gen.subschema_for::<$t>(); )* };
    }
    reg!(
        ScenePacket, Cadre, Locuteur, Form, Registre, Ratio, ShapeTag,
        Prepared, Outcome, Rejet, SceneInfo,
        SceneSpec, Move,
        CompteRendu, Echange, ResolutionPublique, SecretResolution, Decision, ExportError,
        VerdictTrace, CommitTrace, TourTraceView,
    );

    let defs: Value = serde_json::to_value(gen.definitions()).unwrap();

    let doc = json!({
        "$schema": "https://json-schema.org/draft/2019-09/schema",
        "title": "choix-narratifs — schéma des types de frontière du moteur",
        "description": "Généré depuis cn-core (source de vérité). Le Hub et tout \
consommateur non-Rust valident contre #/$defs/<Type>. Les types internes porteurs \
de canon (World, Canon, Registry) n'y figurent PAS.",
        "$defs": defs,
    });

    println!("{}", serde_json::to_string_pretty(&doc).unwrap());
}
