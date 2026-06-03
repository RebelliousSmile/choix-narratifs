// Passage de relais entre la page d'élaboration et la page de jeu.
//
// L'élaboration produit un `SceneSpec` ; le jeu le consomme via `WasmEngine.fromScene`.
// On passe par `sessionStorage` (éphémère, suffisant pour un transfert one-shot) plutôt
// que par l'URL (le secret y figurerait en clair) ou IndexedDB (réservé aux snapshots).

const KEY = 'cn-pending-scene';

/** Stocke le devis à jouer ; la page de jeu le récupérera une fois. */
export function setPendingScene(specJson: string): void {
  sessionStorage.setItem(KEY, specJson);
}

/** Récupère ET efface le devis en attente (consommation unique). */
export function takePendingScene(): string | null {
  const v = sessionStorage.getItem(KEY);
  if (v !== null) sessionStorage.removeItem(KEY);
  return v;
}
