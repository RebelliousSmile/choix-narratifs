//! # Le paquet de scène — la couture du moteur narratif
//!
//! Ce module définit le **seul** type qui franchit le mur vers le narrateur (§5)
//! et qui circule entre les deux installations : le moteur WASM (Rust) le
//! **produit**, le relais le **valide**, le narrateur ne reçoit **que** lui.
//!
//! ## Invariant central : canon-free PAR CONSTRUCTION
//!
//! Aucun champ ne peut porter un secret, une valeur de vérité, ni l'état
//! épistémique interne (le registre de croyances par agent). Le type rend la
//! fuite *structurellement impossible par accident* :
//! - il n'existe aucun champ « canon », « vérité » ou « état » ;
//! - `#[serde(deny_unknown_fields)]` rejette tout champ surnuméraire (cf. le test
//!   `champ_surnumeraire_rejete`) ;
//! - `withhold` ne porte que des **étiquettes de sujet**, jamais le contenu tu.
//!
//! La fuite *sémantique* (un secret glissé dans une string `revealable` ou
//! `hearing`) n'est pas du ressort du type : c'est le **verifier** (canon-aware,
//! côté client) qui la coupe sur la prose générée. Le relais, lui, reste aveugle
//! au canon : il valide la *forme fermée* (ce fichier) et les bornes, jamais le sens.
//!
//! ## Versionnement
//!
//! `PACKET_SCHEMA_VERSION` est le numéro de contrat. Le relais rejette tout
//! paquet dont `schema_version` diffère. Faire évoluer la couture = bumper la
//! version + régénérer le schéma côté relais.
//!
//! ## Génération du contrat côté relais
//!
//! Le relais (hors-Rust) valide contre un schéma généré depuis ces types — une
//! seule source de vérité, ce fichier :
//! - JSON Schema via `schemars` (ajouter `#[derive(JsonSchema)]`) ;
//! - ou types TS via `ts-rs`.
//!
//! ## Dépendances (Cargo.toml)
//! ```toml
//! [dependencies]
//! serde = { version = "1", features = ["derive"] }
//! # schemars = "0.8"   # optionnel, pour émettre le JSON Schema du relais
//!
//! [dev-dependencies]
//! serde_json = "1"
//! ```

use serde::{Deserialize, Serialize};
// use schemars::JsonSchema; // décommenter pour générer le JSON Schema du relais

/// Numéro de contrat de la couture. Le relais rejette si `schema_version` diffère.
pub const PACKET_SCHEMA_VERSION: u32 = 1;

/// Bornes dures sur le best-of-N (garde-fou côté relais et côté moteur).
pub const N_MIN: u8 = 1;
pub const N_MAX: u8 = 5;

/// Le paquet de scène : tout ce dont le narrateur a besoin pour rendre ce beat,
/// et rien qui puisse fuiter.
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
// #[derive(JsonSchema)]
#[serde(deny_unknown_fields)]
#[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export))]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
pub struct ScenePacket {
    /// Version du contrat. Doit valoir [`PACKET_SCHEMA_VERSION`].
    pub schema_version: u32,

    /// Cadre non-secret de la scène : lieu, ambiance, présents.
    pub cadre: Cadre,

    /// Le PNJ qui agit ce beat : identité publique + voix.
    pub locuteur: Locuteur,

    /// L'action commitée du joueur ce tour. Non-secret (ce sont *ses* mots) ;
    /// nécessaire au narrateur pour ancrer la scène. Le résultat d'oracle, lui,
    /// n'apparaît jamais brut : il est déjà *traduit* dans `mouvement` (le LLM
    /// est renderer, pas simulateur — il ne voit pas les dés).
    pub action_joueur: String,

    /// Comment le locuteur ENTEND l'énoncé du joueur, via son savoir/biais.
    /// La *forme* de la méprise (§6), motivée et lisible — pas le secret.
    pub hearing: String,

    /// Le move choisi par le directeur : ce que le locuteur FAIT ce beat
    /// (oracle déjà résolu et plié dedans).
    #[serde(rename = "move")]
    pub mouvement: String,

    /// Faits que le narrateur A LE DROIT d'utiliser. Les secrets sont ABSENTS.
    pub revealable: Vec<String>,

    /// Sujets marqués TUS — **étiquettes neutres**, jamais le contenu.
    /// Ex. `"qui a payé"`, pas la réponse. Le narrateur sait qu'il y a quelque
    /// chose à taire, sans savoir quoi.
    pub withhold: Vec<String>,

    /// Contraintes de forme posées par beat (§6) : des clôtures, pas des couloirs.
    pub form: Form,
}

/// Cadre non-secret de la scène.
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
#[serde(deny_unknown_fields)]
#[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export))]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
pub struct Cadre {
    /// Lieu / décor, descriptible librement.
    pub lieu: String,
    /// Ambiance, si pertinente.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts", ts(optional))]
    pub ambiance: Option<String>,
    /// Autres présents : identités publiques uniquement.
    #[serde(default)]
    pub presents: Vec<String>,
}

/// Le PNJ qui parle / agit ce beat.
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
#[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export))]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
#[serde(deny_unknown_fields)]
pub struct Locuteur {
    /// Nom / identité publique (non-secret).
    pub nom: String,
    /// Style de voix : registre, tics, manière. Descripteur, pas canon.
    pub voix: String,
}

/// Contraintes de forme, posées par beat. Clôtures (empêcher l'attracteur),
/// pas couloirs (dicter la phrase) — cf. §6.
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
#[serde(deny_unknown_fields)]
#[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export))]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
pub struct Form {
    /// Registre / ton de ce beat.
    pub registre: Registre,
    /// Budget de révélation : nombre MAX de faits `revealable` à lâcher ce beat.
    pub budget_revelation: u8,
    /// Ratio souhaité non-verbal / verbal.
    pub ratio: Ratio,
    /// Shapes à NE PAS reproduire (typiquement les 3 dernières utilisées), pour
    /// casser l'appariement 1:1 en lockstep (§6).
    #[serde(default)]
    pub interdit_shape: Vec<ShapeTag>,
}

/// Registre de ton. Palette bornée = une clôture de forme.
#[derive(Serialize, Deserialize, Debug, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
#[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export))]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
pub enum Registre {
    Sec,
    Neutre,
    Tendu,
    Lyrique,
    Familier,
    Solennel,
}

/// Dominante verbale / non-verbale du rendu.
#[derive(Serialize, Deserialize, Debug, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
#[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export))]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
pub enum Ratio {
    NonVerbalDominant,
    Equilibre,
    VerbalDominant,
}

/// Patrons structurels d'une réponse. Le directeur interdit les dernières
/// `shape` pour éviter le moule répétitif (§6). Partagé par le directeur ET le
/// verifier (même crate).
#[derive(Serialize, Deserialize, Debug, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
#[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export))]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
pub enum ShapeTag {
    Monologue,
    QuestionReponse,
    ActionPuisReplique,
    DescriptionPuisDialogue,
    ListeDescripteurs,
    RepliqueSeche,
}

/// Erreurs de validation **structurelle** du paquet (« le schéma EST le mur »).
/// Ne couvre PAS la fuite sémantique — c'est le verifier, côté client.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum PacketError {
    /// `schema_version` ne correspond pas au contrat courant.
    VersionMismatch { attendu: u32, recu: u32 },
    /// Le budget de révélation dépasse le nombre de faits révélables fournis.
    BudgetTropGrand { budget: u8, disponibles: usize },
    /// `n` (best-of-N) hors des bornes autorisées.
    NHorsBornes { n: u8 },
}

impl std::fmt::Display for PacketError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            PacketError::VersionMismatch { attendu, recu } => {
                write!(f, "version de schéma incompatible : attendu {attendu}, reçu {recu}")
            }
            PacketError::BudgetTropGrand { budget, disponibles } => {
                write!(f, "budget de révélation {budget} > {disponibles} faits révélables")
            }
            PacketError::NHorsBornes { n } => {
                write!(f, "n={} hors bornes [{}, {}]", n, N_MIN, N_MAX)
            }
        }
    }
}

impl std::error::Error for PacketError {}

impl ScenePacket {
    /// Validation **structurelle** (pas sémantique). Appelée côté moteur avant
    /// l'envoi ; le relais applique la même règle via le schéma généré.
    pub fn validate(&self) -> Result<(), PacketError> {
        if self.schema_version != PACKET_SCHEMA_VERSION {
            return Err(PacketError::VersionMismatch {
                attendu: PACKET_SCHEMA_VERSION,
                recu: self.schema_version,
            });
        }
        if self.form.budget_revelation as usize > self.revealable.len() {
            return Err(PacketError::BudgetTropGrand {
                budget: self.form.budget_revelation,
                disponibles: self.revealable.len(),
            });
        }
        Ok(())
    }
}

// ---------------------------------------------------------------------------
// L'enveloppe de requête / réponse du relais (`POST /narrate`).
// Le paquet est ce qui franchit le mur ; `n` (best-of-N) vit dans l'enveloppe.
// ---------------------------------------------------------------------------

/// Corps de `POST /narrate`. Le relais valide : `schema_version`, forme fermée,
/// et `N_MIN <= n <= N_MAX`. Il ne lit jamais le *sens* du paquet (aveugle au canon).
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct NarrateRequest {
    pub packet: ScenePacket,
    /// best-of-N : nombre de candidats à générer.
    pub n: u8,
}

impl NarrateRequest {
    pub fn validate(&self) -> Result<(), PacketError> {
        self.packet.validate()?;
        if self.n < N_MIN || self.n > N_MAX {
            return Err(PacketError::NHorsBornes { n: self.n });
        }
        Ok(())
    }
}

/// Réponse de `POST /narrate`.
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct NarrateResponse {
    /// Les candidats de prose (aveugles aux secrets). Le verifier les triera.
    pub candidates: Vec<String>,
    /// Crédits Muse débités (≈ n).
    pub credits_spent: u32,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn exemple() -> ScenePacket {
        ScenePacket {
            schema_version: PACKET_SCHEMA_VERSION,
            cadre: Cadre {
                lieu: "le quai, à la nuit tombée".into(),
                ambiance: Some("pluie fine, lanternes".into()),
                presents: vec![],
            },
            locuteur: Locuteur {
                nom: "le docker".into(),
                voix: "bourru, phrases courtes".into(),
            },
            action_joueur: "Je lui demande où est passée la cargaison.".into(),
            hearing: "menace sur le secret".into(),
            mouvement: "se détourne, lâche 1 fait mineur".into(),
            revealable: vec!["la cargaison a quitté le quai".into()],
            withhold: vec!["qui a payé".into()],
            form: Form {
                registre: Registre::Sec,
                budget_revelation: 1,
                ratio: Ratio::NonVerbalDominant,
                interdit_shape: vec![ShapeTag::Monologue, ShapeTag::ListeDescripteurs],
            },
        }
    }

    #[test]
    fn paquet_valide() {
        assert!(exemple().validate().is_ok());
    }

    #[test]
    fn round_trip_serde() {
        let p = exemple();
        let json = serde_json::to_string(&p).unwrap();
        let back: ScenePacket = serde_json::from_str(&json).unwrap();
        assert_eq!(p, back);
        // le champ Rust `mouvement` voyage bien sous la clé JSON "move"
        assert!(json.contains("\"move\""));
    }

    #[test]
    fn budget_trop_grand_rejete() {
        let mut p = exemple();
        p.form.budget_revelation = 5; // > revealable.len() == 1
        assert!(matches!(p.validate(), Err(PacketError::BudgetTropGrand { .. })));
    }

    #[test]
    fn n_hors_bornes_rejete() {
        let req = NarrateRequest { packet: exemple(), n: 0 };
        assert!(matches!(req.validate(), Err(PacketError::NHorsBornes { .. })));
    }

    #[test]
    fn champ_surnumeraire_rejete() {
        // « le schéma EST le mur » : un champ injecté (ici un faux "secret")
        // est refusé au parse par deny_unknown_fields.
        let json = r#"{
            "schema_version":1,
            "cadre":{"lieu":"x"},
            "locuteur":{"nom":"a","voix":"b"},
            "action_joueur":"",
            "hearing":"",
            "move":"",
            "revealable":[],
            "withhold":[],
            "form":{"registre":"sec","budget_revelation":0,"ratio":"equilibre"},
            "secret":"qui a payé"
        }"#;
        assert!(serde_json::from_str::<ScenePacket>(json).is_err());
    }
}
