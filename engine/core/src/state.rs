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

/// Un tour commité, journalisé pour l'export (US-1.4) et la reprise d'historique.
/// La prose y est **déjà canon-free** (elle a passé le verifier). Persisté dans le
/// snapshot.
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
pub struct TourJournal {
    pub action: String,
    pub prose: String,
    /// Faits que le joueur a appris à ce tour.
    pub faits_reveles: Vec<String>,
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
    /// Transcript des tours commités (US-1.4). `default` : les snapshots antérieurs
    /// (Phase 3/4, sans journal) se chargent sans casser.
    #[serde(default)]
    pub journal: Vec<TourJournal>,
}

/// Devis d'élaboration **côté auteur** (UI Phase 4 / bucket de modules). Forme
/// amicale, non-technique : l'auteur saisit le décor, le PNJ, le secret et ce que
/// le PNJ peut lâcher. `World::from_spec` en dérive les jetons internes.
///
/// FRONTIÈRE : ce type porte le `secret` **en clair** (c'est l'auteur qui le tape).
/// Il vit côté client (UI → moteur) et ne franchit JAMAIS le mur : `prepare` ne lit
/// que les champs publics du `World`, pas le canon.
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Default)]
pub struct SceneSpec {
    pub lieu: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub ambiance: Option<String>,
    pub pnj_nom: String,
    pub pnj_voix: String,
    /// Le grand secret (la réponse tue).
    pub secret: String,
    /// Mots qui trahissent le secret. Si vide, dérivé des noms propres du secret.
    #[serde(default)]
    pub jetons_fuite: Vec<String>,
    /// Ce que le PNJ peut lâcher (faits révélables). Sert aussi de preuve de move.
    #[serde(default)]
    pub revealable: Vec<String>,
    /// Faits établis du monde (base de détection des contradictions).
    #[serde(default)]
    pub faits_etablis: Vec<String>,
    /// Tournures qui NIENT un fait établi.
    #[serde(default)]
    pub jetons_contradiction: Vec<String>,
    /// Étiquettes de sujet tu (jamais le contenu) — passent telles quelles au paquet.
    #[serde(default)]
    pub withhold: Vec<String>,
}

impl SceneSpec {
    /// Refuse une scène injouable ou dont le mur sémantique est cassé.
    pub fn validate(&self) -> Result<(), String> {
        if self.lieu.trim().is_empty() {
            return Err("Le lieu est requis.".into());
        }
        if self.pnj_nom.trim().is_empty() {
            return Err("Le nom du PNJ est requis.".into());
        }
        if self.secret.trim().is_empty() {
            return Err("Le grand secret est requis.".into());
        }
        // Sans rien à lâcher, le PNJ ne peut pas exécuter de move → scène injouable.
        if self.revealable.iter().all(|r| r.trim().is_empty()) {
            return Err("Au moins un fait révélable est requis (sinon le PNJ n'a rien à lâcher).".into());
        }
        let jetons = self.jetons_fuite_effectifs();
        if jetons.is_empty() {
            return Err(
                "Aucun mot qui trahit le secret n'a pu être déterminé. Précisez-en au moins un.".into(),
            );
        }
        // Le mur sémantique : un jeton de fuite ne doit JAMAIS apparaître dans un
        // fait révélable, sinon le seul énoncé possible du PNJ fuit le secret.
        for fait in &self.revealable {
            let f = fait.to_lowercase();
            for jeton in &jetons {
                if f.contains(&jeton.to_lowercase()) {
                    return Err(format!(
                        "Le fait révélable « {fait} » contient le mot secret « {jeton} » : il fuiterait le secret.",
                    ));
                }
            }
        }
        Ok(())
    }

    /// Les jetons de fuite explicites, ou dérivés du secret s'ils sont absents.
    fn jetons_fuite_effectifs(&self) -> Vec<String> {
        let explicites: Vec<String> = self
            .jetons_fuite
            .iter()
            .map(|j| j.trim().to_string())
            .filter(|j| !j.is_empty())
            .collect();
        if explicites.is_empty() {
            derive_jetons_fuite(&self.secret)
        } else {
            explicites
        }
    }
}

/// Dérive les jetons de fuite d'un secret : ses **noms propres** (mots capitalisés
/// hors mots-outils). Heuristique de pré-remplissage — l'auteur peut corriger.
fn derive_jetons_fuite(secret: &str) -> Vec<String> {
    const OUTILS: &[&str] = &[
        "le", "la", "les", "un", "une", "des", "de", "du", "il", "elle", "on",
        "ce", "cet", "cette", "ils", "elles", "nous", "vous", "et", "ou", "qui",
    ];
    secret
        .split(|c: char| !c.is_alphanumeric())
        .filter(|mot| {
            let m = mot.trim();
            m.chars().count() >= 3
                && m.chars().next().is_some_and(|c| c.is_uppercase())
                && !OUTILS.contains(&m.to_lowercase().as_str())
        })
        .map(|m| m.to_string())
        .collect()
}

impl World {
    /// Construit un monde jouable depuis un devis d'auteur.
    ///
    /// COUPLAGE DE JOUABILITÉ : `jetons_move = revealable`. Le narrateur (stub ou
    /// Hub) prouve le move en énonçant un fait révélable ; le verifier exige alors
    /// qu'un `jetons_move` apparaisse → satisfait par construction.
    pub fn from_spec(spec: SceneSpec) -> World {
        let jetons_fuite = spec.jetons_fuite_effectifs();
        let revealable: Vec<String> = spec
            .revealable
            .into_iter()
            .map(|r| r.trim().to_string())
            .filter(|r| !r.is_empty())
            .collect();
        World {
            canon: Canon {
                secret_reponse: spec.secret,
                jetons_fuite,
                faits_etablis: spec.faits_etablis,
                jetons_contradiction: spec.jetons_contradiction,
            },
            cadre: Cadre {
                lieu: spec.lieu,
                ambiance: spec.ambiance.filter(|a| !a.trim().is_empty()),
                presents: vec![],
            },
            locuteur: Locuteur { nom: spec.pnj_nom, voix: spec.pnj_voix },
            jetons_move: revealable.clone(),
            revealable,
            withhold: spec.withhold,
            registre: Registry::default(),
            shapes_recentes: vec![],
            journal: Vec::new(),
        }
    }

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
            journal: Vec::new(),
        }
    }
}
