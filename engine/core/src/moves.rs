//! Catalogue **agnostique** de gestes dramatiques — indépendant de tout système de
//! jeu (pas de « moves » nommés d'un jeu, pas de jargon PbtA). Un geste est un beat
//! de scène en langage ordinaire ; son `libelle` part dans le paquet sous la clé
//! `move` (contrat figé) et reste la **forme close** que le narrateur reçoit.
//!
//! Temps 1 (cf. audit système→moves) : le directeur **sélectionne** un geste ici, au
//! lieu d'un texte codé en dur. La preuve d'exécution reste portée par la scène
//! (`jetons_move`) — le couplage de jouabilité est inchangé. Le « système » (profil
//! de données) viendra **restreindre** ce catalogue au temps 2.

/// Un geste dramatique. `id` stable (agnostique), `libelle` = texte du beat.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export))]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
pub struct Move {
    pub id: &'static str,
    pub libelle: &'static str,
}

/// Se fermer : se détourner, ne céder qu'un détail mineur (geste par défaut sous tension).
pub const SE_FERMER: Move = Move { id: "se_fermer", libelle: "se détourne, lâche 1 fait mineur" };
/// Concéder : lâcher un fait mineur sans résistance (situation anodine).
pub const CONCEDER: Move = Move { id: "conceder", libelle: "concède, lâche 1 fait mineur" };
/// Dévier : déplacer la conversation ailleurs.
pub const DEVIER: Move = Move { id: "devier", libelle: "dévie, parle d'autre chose" };
/// Temporiser : gagner du temps sans s'engager.
pub const TEMPORISER: Move = Move { id: "temporiser", libelle: "gagne du temps, ne s'engage pas" };
/// Révéler partiellement : donner un détail, taire l'essentiel.
pub const REVELER_PARTIELLEMENT: Move =
    Move { id: "reveler_partiellement", libelle: "lâche un détail, tait l'essentiel" };
/// Presser : retourner la pression vers l'interlocuteur.
pub const PRESSER: Move = Move { id: "presser", libelle: "presse, retourne la question" };

/// Le catalogue complet (agnostique). Un profil de système en sélectionnera un sous-ensemble.
pub const CATALOGUE: &[Move] = &[
    SE_FERMER,
    CONCEDER,
    DEVIER,
    TEMPORISER,
    REVELER_PARTIELLEMENT,
    PRESSER,
];

/// Cherche un geste par son id agnostique.
pub fn par_id(id: &str) -> Option<&'static Move> {
    CATALOGUE.iter().find(|m| m.id == id)
}
