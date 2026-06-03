//! # cn-wasm — la couche wasm-bindgen
//!
//! Enveloppe mince autour de [`cn_core::Engine`]. Elle ne contient **aucune
//! logique** : elle traduit l'API du core (`restore/prepare/resolve/snapshot`)
//! en types amicaux pour le JS de l'island.
//!
//! ## Conventions de frontière
//! - Les structures (paquet, outcome) traversent en **JSON `String`** : l'hôte
//!   fait `JSON.parse`. Simple, sans dépendance de pont, et le paquet reste la
//!   forme fermée du contrat (`packet.rs`).
//! - Les candidats arrivent en `string[]` (`Vec<String>`).
//! - Le snapshot est un `Uint8Array` (`Vec<u8>`).
//! - Les erreurs sont levées comme **`string`** côté JS (`Result<_, String>`).
//!
//! La boucle hôte (TS) reste : `prepare` → `await Hub./narrate` → `resolve` →
//! resample si `outcome === "resample_needed"` → `snapshot` pour persister.

use wasm_bindgen::prelude::*;

use cn_core::Engine;

/// Façade JS du moteur. Un objet = une session.
#[wasm_bindgen]
pub struct WasmEngine {
    inner: Engine,
}

#[wasm_bindgen]
impl WasmEngine {
    /// Nouvelle session sur la scène d'amorce (Phase 1 : le docker).
    #[wasm_bindgen(constructor)]
    pub fn new() -> WasmEngine {
        WasmEngine { inner: Engine::restore(None) }
    }

    /// Reprend une session depuis un snapshot (`Uint8Array`).
    #[wasm_bindgen(js_name = fromSnapshot)]
    pub fn from_snapshot(snapshot: &[u8]) -> WasmEngine {
        WasmEngine { inner: Engine::restore(Some(snapshot)) }
    }

    /// Directeur → paquet canon-free. Retourne `{"packet":…,"n":…}` en JSON.
    pub fn prepare(&mut self, action: &str) -> Result<String, String> {
        let prep = self.inner.prepare(action);
        serde_json::to_string(&prep).map_err(|e| e.to_string())
    }

    /// Verifier → tri des candidats. Retourne l'`Outcome` en JSON :
    /// `{"outcome":"commit",…}` ou `{"outcome":"resample_needed",…}`.
    pub fn resolve(&mut self, candidates: Vec<String>) -> Result<String, String> {
        let outcome = self.inner.resolve(&candidates);
        serde_json::to_string(&outcome).map_err(|e| e.to_string())
    }

    /// Sérialise l'état pour persistance (IndexedDB / bucket).
    pub fn snapshot(&self) -> Vec<u8> {
        self.inner.snapshot()
    }

    /// Ce que le joueur sait à cet instant (`string[]`).
    #[wasm_bindgen(js_name = savoirJoueur)]
    pub fn savoir_joueur(&self) -> Vec<String> {
        self.inner.savoir_joueur()
    }
}

impl Default for WasmEngine {
    fn default() -> Self {
        Self::new()
    }
}
