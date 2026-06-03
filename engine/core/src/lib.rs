//! # cn-core — le cœur déterministe du moteur narratif
//!
//! Crate Rust **pure** (pas d'async, pas d'I/O) : état, registre épistémique,
//! directeur, verifier, et le contrat de couture [`packet`]. Compilable en WASM
//! (web) comme en natif (terminal / Discord / Godot). L'async (fetch, IndexedDB,
//! rendu) vit dans l'hôte, pas ici.
//!
//! Voir [`engine::Engine`] pour la boucle `prepare → resolve → snapshot`.

pub mod directeur;
pub mod engine;
pub mod packet;
pub mod state;
pub mod verifier;

pub use engine::{Engine, Outcome, Prepared};
pub use packet::ScenePacket;
pub use verifier::Rejet;
