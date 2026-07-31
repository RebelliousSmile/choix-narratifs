//! Le directeur : à partir de l'action du joueur et de l'état **public**, il
//! choisit move / hearing / forme, puis **strippe** le tout en un paquet
//! canon-free. Il ne lit jamais `world.canon` — la fuite est impossible par
//! construction (il n'a aucune ligne qui touche le secret).

use crate::moves::{self, Move};
use crate::packet::{
    Cadre, Form, Locuteur, Ratio, Registre, ScenePacket, PACKET_SCHEMA_VERSION,
};
use crate::state::World;
use crate::texte::plier;

/// Le plan de beat gardé **côté moteur**. NE franchit PAS le mur : il porte les
/// attentes de vérification (jetons du move, budget) que le verifier appliquera.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BeatPlan {
    /// Au moins un de ces jetons doit apparaître dans la prose retenue
    /// (preuve que le move « lâcher le fait mineur » a bien été exécuté).
    pub jetons_move: Vec<String>,
    /// Faits révélables candidats à la divulgation ce beat.
    pub revealable: Vec<String>,
    /// Budget de révélation du beat (cap sur le nombre de faits lâchés).
    pub budget: u8,
}

/// Sortie du directeur : le paquet (public) + n + le plan privé.
pub struct BeatBrief {
    pub packet: ScenePacket,
    pub n: u8,
    pub plan: BeatPlan,
}

/// Produit le brief du beat. `world` n'est lu que pour ses champs **publics**.
pub fn prepare(world: &World, action_joueur: &str) -> BeatBrief {
    let menace = touche_au_sujet_tu(action_joueur, &world.withhold);
    let hearing = if menace {
        // La méprise est motivée (§6) : le docker entend une menace sur le secret.
        "menace sur le secret".to_string()
    } else {
        "demande anodine".to_string()
    };

    // Le geste est choisi dans le catalogue AGNOSTIQUE (cf. moves.rs) selon l'état
    // public — jamais le canon. La preuve d'exécution reste portée par la scène
    // (`jetons_move`), donc le couplage de jouabilité est inchangé.
    let geste = choisir_geste(menace);
    let mouvement = geste.libelle.to_string();
    let budget = 1u8;

    // Interdit les 3 dernières shapes pour casser le lockstep (§6).
    let interdit_shape = world
        .shapes_recentes
        .iter()
        .rev()
        .take(3)
        .copied()
        .collect();

    let packet = ScenePacket {
        schema_version: PACKET_SCHEMA_VERSION,
        cadre: Cadre {
            lieu: world.cadre.lieu.clone(),
            ambiance: world.cadre.ambiance.clone(),
            presents: world.cadre.presents.clone(),
        },
        language: world.language.clone(),
        locuteur: Locuteur {
            nom: world.locuteur.nom.clone(),
            voix: world.locuteur.voix.clone(),
        },
        action_joueur: action_joueur.to_string(),
        hearing,
        mouvement,
        revealable: world.revealable.clone(),
        withhold: world.withhold.clone(),
        form: Form {
            registre: Registre::Sec,
            budget_revelation: budget,
            ratio: Ratio::NonVerbalDominant,
            interdit_shape,
        },
    };

    BeatBrief {
        packet,
        n: 3, // best-of-3, dans [N_MIN, N_MAX]
        plan: BeatPlan {
            jetons_move: world.jetons_move.clone(),
            revealable: world.revealable.clone(),
            budget,
        },
    }
}

/// Sélection du geste dans le catalogue agnostique, selon l'état **public**.
/// Temps 1 : choix minimal (sous tension → se fermer ; sinon → concéder). Le temps 2
/// (profil de système) viendra restreindre le catalogue disponible avant ce choix.
fn choisir_geste(menace: bool) -> &'static Move {
    if menace {
        &moves::SE_FERMER
    } else {
        &moves::CONCEDER
    }
}

/// Mots-outils écartés des étiquettes `withhold` : ils ne caractérisent pas le
/// sujet tu et sur-déclencheraient la méprise (« qui a payé » → seul « payé »
/// porte le sujet).
const MOTS_OUTILS: &[&str] = &[
    "qui", "que", "quoi", "est", "les", "des", "une", "aux", "par", "pour", "sur", "dans", "avec",
    "son", "sa", "ses", "the", "and", "was", "who",
];

/// Termes-signaux du sujet tu, dérivés des étiquettes `withhold` : mots de
/// contenu (≥ 3 lettres, hors mots-outils), repliés. Ex. `["qui a payé"]` → `["paye"]`.
/// C'est CE qui rend la méprise agnostique à la scène (plus de liste codée en dur).
fn termes_du_sujet_tu(withhold: &[String]) -> Vec<String> {
    let mut termes: Vec<String> = Vec::new();
    for etiquette in withhold {
        for mot in plier(etiquette).split(|c: char| !c.is_alphanumeric()) {
            if mot.chars().count() >= 3 && !MOTS_OUTILS.contains(&mot) && !termes.iter().any(|t| t == mot) {
                termes.push(mot.to_string());
            }
        }
    }
    termes
}

/// Heuristique de méprise (Phase 1, avant le Hub) : l'action du joueur touche-t-elle
/// un terme du sujet tu ? Dérivée de la scène (`withhold`) et repliée (accents/casse).
/// Le vrai jugement d'intention viendra du narrateur/directeur LLM.
fn touche_au_sujet_tu(action: &str, withhold: &[String]) -> bool {
    let a = plier(action);
    termes_du_sujet_tu(withhold)
        .iter()
        .any(|terme| a.contains(terme.as_str()))
}

#[cfg(test)]
mod tests {
    use super::{termes_du_sujet_tu, touche_au_sujet_tu};

    fn wh(labels: &[&str]) -> Vec<String> {
        labels.iter().map(|s| s.to_string()).collect()
    }

    #[test]
    fn termes_ecartent_les_mots_outils() {
        // « qui a payé » → seul le mot de contenu « payé » (replié) subsiste.
        assert_eq!(termes_du_sujet_tu(&wh(&["qui a payé"])), vec!["paye".to_string()]);
    }

    #[test]
    fn meprise_agnostique_a_la_scene() {
        // Une scène dont le sujet tu est « qui a trahi » déclenche sur « trahi »,
        // sans aucune liste codée en dur (robuste aux accents/casse).
        let secret = wh(&["qui a trahi le clan"]);
        assert!(touche_au_sujet_tu("Tu sais qui l'a TRAHI ?", &secret));
        assert!(!touche_au_sujet_tu("Belle soirée, non ?", &secret));
    }

    #[test]
    fn amorce_docker_inchangee() {
        // Régression : sur le sujet tu du docker, « payé » déclenche ; l'anodin non.
        let docker = wh(&["qui a payé"]);
        assert!(touche_au_sujet_tu("Je demande qui a payé pour la cargaison.", &docker));
        assert!(!touche_au_sujet_tu("Bonsoir, belle nuit.", &docker));
    }
}
