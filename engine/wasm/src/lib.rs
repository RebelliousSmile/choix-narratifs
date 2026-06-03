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

use cn_core::{Engine, SceneSpec};

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

    /// Amorce une session sur une scène **créée par l'auteur** (UI / bucket). Le
    /// JSON est un `SceneSpec`. Lève (string) si le devis est injouable.
    #[wasm_bindgen(js_name = fromScene)]
    pub fn from_scene(spec_json: &str) -> Result<WasmEngine, String> {
        let spec: SceneSpec = serde_json::from_str(spec_json).map_err(|e| e.to_string())?;
        let inner = Engine::author(spec)?;
        Ok(WasmEngine { inner })
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

    /// Info publique de la scène (décor + PNJ) en JSON, pour l'en-tête de l'UI.
    pub fn scene(&self) -> Result<String, String> {
        serde_json::to_string(&self.inner.scene()).map_err(|e| e.to_string())
    }

    /// Les secrets encore cachés à résoudre avant export (`string[]`).
    #[wasm_bindgen(js_name = secretsEnAttente)]
    pub fn secrets_en_attente(&self) -> Vec<String> {
        self.inner.secrets_en_attente()
    }

    /// Trace dev (US-1.2) en JSON : par tour, le paquet, les verdicts par candidat,
    /// les resamples et le commit. Reflète les tours joués depuis le chargement.
    pub fn trace(&self) -> Result<String, String> {
        serde_json::to_string(&self.inner.trace_view()).map_err(|e| e.to_string())
    }

    /// La membrane d'export (US-1.4). `resolutions_json` = tableau de
    /// `{ secret, decision: { type: "reveler", texte } | { type: "retirer" } }`.
    /// Retourne le `CompteRendu` en JSON, ou lève le JSON des `ExportError[]`.
    pub fn export(&self, resolutions_json: &str) -> Result<String, String> {
        let resolutions: Vec<cn_core::engine::SecretResolution> =
            serde_json::from_str(resolutions_json).map_err(|e| e.to_string())?;
        match self.inner.export(&resolutions) {
            Ok(cr) => serde_json::to_string(&cr).map_err(|e| e.to_string()),
            Err(errs) => Err(serde_json::to_string(&errs).unwrap_or_else(|e| e.to_string())),
        }
    }
}

impl Default for WasmEngine {
    fn default() -> Self {
        Self::new()
    }
}
