//! Normalisation de texte pour les heuristiques Phase 1 (`directeur`, `verifier`).
//!
//! Pliage d'accents + minuscules, **sans dépendance** (le cœur reste pur et léger,
//! compilable wasm sans crate Unicode). But : que « Vérain » et « verain », ou
//! « quitté » et « quitte », se comparent comme égaux — moins de fuites ratées au
//! mur, et une méprise robuste à la façon dont le joueur saisit son texte.
//!
//! Ce n'est PAS de la sémantique (ça, c'est le Hub) : juste une comparaison de
//! surface moins fragile que `to_lowercase()` seul.

/// Minuscule + repli des diacritiques latins courants vers leur base ASCII.
pub fn plier(s: &str) -> String {
    s.chars()
        .flat_map(char::to_lowercase)
        .map(plier_diacritique)
        .collect()
}

/// Un caractère (déjà minuscule) → sa base sans accent. Inconnu : inchangé.
fn plier_diacritique(c: char) -> char {
    match c {
        'à' | 'â' | 'ä' | 'á' | 'ã' | 'å' => 'a',
        'ç' => 'c',
        'é' | 'è' | 'ê' | 'ë' => 'e',
        'î' | 'ï' | 'í' | 'ì' => 'i',
        'ô' | 'ö' | 'ó' | 'ò' | 'õ' => 'o',
        'ù' | 'û' | 'ü' | 'ú' => 'u',
        'ÿ' | 'ý' => 'y',
        'ñ' => 'n',
        autre => autre,
    }
}

#[cfg(test)]
mod tests {
    use super::plier;

    #[test]
    fn minuscule_et_sans_accent() {
        assert_eq!(plier("Vérain"), "verain");
        assert_eq!(plier("QUITTÉ le Quai"), "quitte le quai");
        assert_eq!(plier("Ça, déjà vu où ?"), "ca, deja vu ou ?");
    }

    #[test]
    fn ascii_inchange() {
        assert_eq!(plier("la cargaison a quitte le quai"), "la cargaison a quitte le quai");
    }
}
