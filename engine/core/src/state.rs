//! État du monde + registre épistémique minimal (Phase 1 : 1 PNJ, 1 secret).
//!
//! Le **canon** (la vérité) vit ici, côté moteur, et n'est JAMAIS copié dans un
//! [`ScenePacket`](crate::packet::ScenePacket). Le registre est *event-sourced* :
//! on stocke les faits une fois, le savoir d'un agent se recalcule par fold.

use serde::{Deserialize, Serialize};

use crate::packet::{Cadre, Locuteur, ShapeTag};

/// Le canon : la vérité protégée par le mur (§5). Le verifier (canon-aware) le lit
/// pour couper toute prose qui fuit ou contredit. Ne franchit jamais la couture.
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct Canon {
    /// La réponse tue (le contenu de `withhold`), ici : qui a payé.
    pub secret_reponse: String,
    /// Jetons de fuite : si l'un apparaît dans la prose, c'est une fuite du secret.
    pub jetons_fuite: Vec<String>,
    /// Faits établis (vrais) du monde. Base de détection des contradictions.
    pub faits_etablis: Vec<String>,
    /// Jetons de contradiction : tournures qui NIENT un fait établi.
    pub jetons_contradiction: Vec<String>,
}

/// Un événement du registre. Phase 1 : une seule sorte (révélation d'un fait).
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
pub enum Event {
    /// Un agent (le joueur en est un de plus) apprend un fait.
    Revealed { agent: String, fait: String },
}

/// Le registre épistémique : la liste ordonnée des événements. Le savoir n'est
/// pas stocké, il se *recalcule* (fold) — arêtes creuses, pas duplication.
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq, Default)]
pub struct Registry {
    pub events: Vec<Event>,
}

impl Registry {
    /// Savoir d'un agent = fold sur les événements le concernant.
    pub fn knows(&self, agent: &str) -> Vec<String> {
        self.events
            .iter()
            .filter_map(|e| match e {
                Event::Revealed { agent: a, fait } if a == agent => Some(fait.clone()),
                _ => None,
            })
            .collect()
    }
}

/// L'état complet d'une session. Sérialisé pour le snapshot (stockage local :
/// IndexedDB / bucket). Contient le canon — il reste donc côté client, jamais
/// dans le paquet.
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct World {
    pub canon: Canon,
    pub cadre: Cadre,
    pub locuteur: Locuteur,
    /// Faits non-secrets que le directeur peut exposer (sous budget).
    pub revealable: Vec<String>,
    /// Étiquettes de sujet tu (jamais le contenu) — passe telles quelles au paquet.
    pub withhold: Vec<String>,
    /// Jetons qui prouvent que le move (« lâcher le fait mineur ») a été exécuté.
    /// Le verifier exige qu'au moins un apparaisse dans la prose retenue.
    pub jetons_move: Vec<String>,
    pub registre: Registry,
    /// Shapes récemment utilisées → alimentent `Form::interdit_shape` (§6).
    pub shapes_recentes: Vec<ShapeTag>,
}

impl World {
    /// La scène d'amorce de la Phase 1 : un PNJ (le docker), un secret (qui a payé).
    pub fn scene_docker() -> World {
        World {
            canon: Canon {
                secret_reponse: "Verain".into(),
                jetons_fuite: vec!["verain".into()],
                faits_etablis: vec!["la cargaison a quitté le quai".into()],
                jetons_contradiction: vec![
                    "toujours sur le quai".into(),
                    "encore là".into(),
                    "n'a pas bougé".into(),
                    "jamais partie".into(),
                ],
            },
            cadre: Cadre {
                lieu: "le quai, à la nuit tombée".into(),
                ambiance: Some("pluie fine, lanternes".into()),
                presents: vec![],
            },
            locuteur: Locuteur {
                nom: "le docker".into(),
                voix: "bourru, phrases courtes".into(),
            },
            revealable: vec!["la cargaison a quitté le quai".into()],
            withhold: vec!["qui a payé".into()],
            jetons_move: vec!["quitté le quai".into(), "partie".into(), "embarqué".into()],
            registre: Registry::default(),
            shapes_recentes: vec![ShapeTag::Monologue, ShapeTag::ListeDescripteurs],
        }
    }
}
