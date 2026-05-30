/**
 * Éditeur de carte 2D basé sur Konva.
 *
 * IMPORTANT : ce module importe `konva`, qui requiert le DOM. Il ne doit JAMAIS
 * être importé côté serveur. Les composants .astro l'importent dynamiquement
 * depuis un <script> client. La logique pure vit dans map-state.ts.
 */

import Konva from 'konva';
import {
  type MapState,
  type PaletteItem,
  type PlacedItem,
  type Group,
  type Relation,
  createMapState,
  addItem,
  removeItem,
  moveItem,
  addGroup,
  removeGroup as removeGroupFromState,
  setItemGroup,
  addRelation,
  removeRelation,
  snap,
} from './map-state';

export type ItemType = 'desk' | 'human' | 'other';

export interface MapEditorOptions {
  palette: PaletteItem[];
  presets?: PlacedItem[];
  background?: string;
  gridSize?: number;
  width?: number;
  height?: number;
  /** Préfixe de paletteId des pupitres. */
  deskPalettePrefix?: string;
  /** Préfixe de paletteId des humains (ascendants autorisés). */
  humanPrefix?: string;
  onChange?: (state: MapState) => void;
  onSelect?: (selectedId: string | null, itemType: ItemType | null) => void;
  onLinkModeChange?: (active: boolean) => void;
}

export interface MapEditor {
  getState(): MapState;
  loadState(state: MapState): void;
  addFromPalette(paletteId: string, x: number, y: number): void;
  removeSelected(): void;
  setLabel(id: string, label: string): void;
  setItemGroup(itemId: string, groupId: string | undefined): void;
  setItemDims(id: string, wUnits: number, hUnits: number): void;
  addGroup(group: Group): void;
  removeGroup(groupId: string): void;
  startLinkMode(): void;
  cancelLinkMode(): void;
  isLinkMode(): boolean;
  getSelectedId(): string | null;
  getCanvasDims(): { width: number; height: number };
  exportPNG(): string;
  destroy(): void;
}

const DEFAULT_GRID = 20;

export function createMapEditor(
  container: HTMLElement,
  options: MapEditorOptions,
): MapEditor {
  const gridSize = options.gridSize ?? DEFAULT_GRID;
  const width = options.width ?? (container.clientWidth || 800);
  const height = options.height ?? (container.clientHeight || 500);
  const paletteById = new Map(options.palette.map((p) => [p.id, p]));
  const humanPrefix = options.humanPrefix ?? 'humain-';
  const deskPrefix = options.deskPalettePrefix ?? 'pupitre';

  function getItemType(paletteId: string): ItemType {
    if (paletteId === deskPrefix || paletteId.startsWith(deskPrefix + '-')) return 'desk';
    if (paletteId.startsWith(humanPrefix)) return 'human';
    return 'other';
  }

  function isHuman(paletteId: string): boolean {
    return paletteId.startsWith(humanPrefix);
  }

  let state: MapState = createMapState();
  let selectedId: string | null = null;
  let selectedRelationId: string | null = null;
  let linkSource: string | null = null; // id of the "from" item when in link mode

  // ── Stage & layers ──────────────────────────────────────────────────────────
  const stage = new Konva.Stage({ container: container as HTMLDivElement, width, height });

  const gridLayer = new Konva.Layer({ listening: false });
  const relationsLayer = new Konva.Layer(); // arrows below items
  const itemLayer = new Konva.Layer();
  stage.add(gridLayer);
  stage.add(relationsLayer);
  stage.add(itemLayer);

  if (options.background) {
    gridLayer.add(
      new Konva.Rect({ x: 0, y: 0, width, height, fill: options.background, listening: false }),
    );
  }

  drawGrid();

  function drawGrid(): void {
    for (let x = 0; x <= width; x += gridSize) {
      gridLayer.add(new Konva.Line({ points: [x, 0, x, height], stroke: '#e0e0e0', strokeWidth: 1, listening: false }));
    }
    for (let y = 0; y <= height; y += gridSize) {
      gridLayer.add(new Konva.Line({ points: [0, y, width, y], stroke: '#e0e0e0', strokeWidth: 1, listening: false }));
    }
    gridLayer.draw();
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function emitChange(): void { options.onChange?.(state); }

  function nextId(): string {
    return `item-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  }

  function itemDims(item: PlacedItem): { w: number; h: number; wUnits: number; hUnits: number } {
    const p = paletteById.get(item.paletteId);
    const wUnits = item.widthUnits ?? p?.widthUnits ?? 2;
    const hUnits = item.heightUnits ?? p?.heightUnits ?? 2;
    return { w: wUnits * gridSize, h: hUnits * gridSize, wUnits, hUnits };
  }

  function getItemCenter(item: PlacedItem): { x: number; y: number } {
    const { w, h } = itemDims(item);
    return { x: item.x + w / 2, y: item.y + h / 2 };
  }

  function groupColorFor(item: PlacedItem): string | null {
    if (!item.groupId) return null;
    return (state.groups ?? []).find((g) => g.id === item.groupId)?.couleur ?? null;
  }

  // ── Build an item node ────────────────────────────────────────────────────────
  function buildNode(item: PlacedItem): Konva.Group {
    const palette = paletteById.get(item.paletteId);
    const fillColor = palette?.color ?? '#4477aa';
    const shape = palette?.shape ?? 'rect';
    const labelText = item.label ?? palette?.label ?? '';
    const groupColor = groupColorFor(item);
    const { w, h, wUnits, hUnits } = itemDims(item);

    const group = new Konva.Group({
      x: item.x, y: item.y,
      rotation: item.rotation ?? 0,
      draggable: !linkSource,
      id: item.id,
    });

    const strokeColor = selectedId === item.id ? '#ffd34d' : (groupColor ?? 'transparent');
    const strokeWidth = (groupColor || selectedId === item.id) ? 3 : 0;

    if (shape === 'circle') {
      group.add(new Konva.Circle({
        x: gridSize, y: gridSize,
        radius: gridSize,
        fill: fillColor,
        stroke: strokeColor,
        strokeWidth,
      }));
    } else {
      group.add(new Konva.Rect({
        width: w, height: h,
        fill: fillColor,
        stroke: strokeColor,
        strokeWidth,
        cornerRadius: 2,
      }));

      // Séparateurs de places pour les pupitres multi-places
      const seatsH = Math.floor(wUnits / 2);
      const seatsV = Math.floor(hUnits / 2);
      if (seatsH > 1) {
        for (let i = 1; i < seatsH; i++) {
          group.add(new Konva.Line({
            points: [i * 2 * gridSize, 2, i * 2 * gridSize, h - 2],
            stroke: 'rgba(255,255,255,0.35)',
            strokeWidth: 1,
            listening: false,
          }));
        }
      }
      if (seatsV > 1) {
        for (let i = 1; i < seatsV; i++) {
          group.add(new Konva.Line({
            points: [2, i * 2 * gridSize, w - 2, i * 2 * gridSize],
            stroke: 'rgba(255,255,255,0.35)',
            strokeWidth: 1,
            listening: false,
          }));
        }
      }
    }

    if (labelText) {
      group.add(new Konva.Text({ text: labelText, fontSize: 11, fill: '#fff', padding: 2, x: 2, y: 2 }));
    }

    // Badge de groupe (disque coloré, coin haut-droite)
    if (groupColor) {
      group.add(new Konva.Circle({ x: w - 6, y: 6, radius: 5, fill: groupColor, stroke: '#fff', strokeWidth: 1 }));
    }

    group.on('dragend', () => {
      const nx = snap(group.x(), gridSize);
      const ny = snap(group.y(), gridSize);
      group.position({ x: nx, y: ny });
      state = moveItem(state, item.id, nx, ny);
      itemLayer.draw();
      renderRelations();
      emitChange();
    });

    group.on('click tap', () => {
      if (linkSource !== null) {
        // Ascendant : la cible doit être un humain différent de la source.
        // Mode « collant » : on RESTE en mode liaison pour enchaîner plusieurs
        // ascendants depuis la même source (Échap / Terminé pour sortir).
        if (item.id !== linkSource && isHuman(item.paletteId)) {
          const rel: Relation = { id: `rel-${linkSource}-${item.id}`, from: linkSource, to: item.id };
          state = addRelation(state, rel);
          renderRelations();
          emitChange();
        }
        return;
      }
      selectedId = item.id;
      selectedRelationId = null;
      highlightSelection();
      options.onSelect?.(selectedId, getItemType(item.paletteId));
    });

    return group;
  }

  // ── Render items ─────────────────────────────────────────────────────────────
  function highlightSelection(): void {
    for (const node of itemLayer.getChildren()) {
      const item = state.items.find((i) => i.id === node.id());
      if (!item) continue;
      const gc = groupColorFor(item);
      const isSel = node.id() === selectedId;
      (node as Konva.Group).getChildren().forEach((child) => {
        if (child instanceof Konva.Rect || child instanceof Konva.Circle) {
          if (!(child instanceof Konva.Circle && child.radius() === 5)) {
            child.stroke(isSel ? '#ffd34d' : (gc ?? 'transparent'));
            child.strokeWidth(isSel ? 3 : (gc ? 3 : 0));
          }
        }
      });
    }
    itemLayer.draw();
  }

  function render(): void {
    itemLayer.destroyChildren();
    for (const item of state.items) {
      itemLayer.add(buildNode(item));
    }
    highlightSelection();
    itemLayer.draw();
    renderRelations();
  }

  // ── Render relations (arrows) ─────────────────────────────────────────────────
  function renderRelations(): void {
    relationsLayer.destroyChildren();
    for (const rel of state.relations ?? []) {
      const fromItem = state.items.find((i) => i.id === rel.from);
      const toItem = state.items.find((i) => i.id === rel.to);
      if (!fromItem || !toItem) continue;

      const from = getItemCenter(fromItem);
      const to = getItemCenter(toItem);
      const isSel = rel.id === selectedRelationId;

      const arrow = new Konva.Arrow({
        id: rel.id,
        points: [from.x, from.y, to.x, to.y],
        stroke: isSel ? '#ffd34d' : '#c45a92',
        strokeWidth: isSel ? 3 : 2,
        fill: isSel ? '#ffd34d' : '#c45a92',
        pointerLength: 10,
        pointerWidth: 8,
        listening: true,
        tension: 0,
        hitStrokeWidth: 14, // zone de clic élargie pour supprimer facilement
      });

      // Clic sur une flèche = suppression de l'ascendant (hors mode liaison)
      arrow.on('click tap', () => {
        if (linkSource !== null) return;
        state = removeRelation(state, rel.id);
        renderRelations();
        emitChange();
      });
      arrow.on('mouseenter', () => { if (linkSource === null) container.style.cursor = 'pointer'; });
      arrow.on('mouseleave', () => { container.style.cursor = ''; });

      relationsLayer.add(arrow);
    }
    relationsLayer.draw();
  }

  // ── Stage-level clicks (deselect) ─────────────────────────────────────────────
  stage.on('click tap', (e) => {
    if (e.target === stage) {
      if (linkSource !== null) {
        linkSource = null;
        options.onLinkModeChange?.(false);
        render();
        return;
      }
      selectedId = null;
      selectedRelationId = null;
      highlightSelection();
      renderRelations();
      options.onSelect?.(null, null);
    }
  });

  // ── Zoom (wheel) ──────────────────────────────────────────────────────────────
  stage.on('wheel', (e) => {
    e.evt.preventDefault();
    const scaleBy = 1.05;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
    stage.scale({ x: newScale, y: newScale });
    stage.position({ x: pointer.x - mousePointTo.x * newScale, y: pointer.y - mousePointTo.y * newScale });
    stage.batchDraw();
  });

  // ── Keyboard ──────────────────────────────────────────────────────────────────
  function onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape' && linkSource !== null) {
      linkSource = null;
      options.onLinkModeChange?.(false);
      render();
      return;
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selectedRelationId) {
        state = removeRelation(state, selectedRelationId);
        selectedRelationId = null;
        renderRelations();
        emitChange();
      } else if (selectedId) {
        removeSelected();
      }
    }
  }
  container.tabIndex = container.tabIndex >= 0 ? container.tabIndex : 0;
  container.addEventListener('keydown', onKeyDown);

  // ── Public API ────────────────────────────────────────────────────────────────
  function addFromPalette(paletteId: string, x: number, y: number): void {
    const palette = paletteById.get(paletteId);
    if (!palette) return;
    const wUnits = palette.widthUnits ?? 2;
    const hUnits = palette.heightUnits ?? 2;
    const item: PlacedItem = {
      id: nextId(), paletteId,
      x: snap(x - (wUnits / 2) * gridSize, gridSize),
      y: snap(y - (hUnits / 2) * gridSize, gridSize),
      label: palette.label,
    };
    state = addItem(state, item);
    selectedId = item.id;
    render();
    emitChange();
  }

  function removeSelected(): void {
    if (!selectedId) return;
    state = removeItem(state, selectedId);
    selectedId = null;
    render();
    options.onSelect?.(null, null);
    emitChange();
  }

  function setLabel(id: string, label: string): void {
    state = { ...state, items: state.items.map((it) => (it.id === id ? { ...it, label } : it)) };
    render();
    emitChange();
  }

  function setItemGroupFn(itemId: string, groupId: string | undefined): void {
    state = setItemGroup(state, itemId, groupId);
    render();
    emitChange();
  }

  function setItemDimsFn(id: string, wUnits: number, hUnits: number): void {
    state = {
      ...state,
      items: state.items.map((i) =>
        i.id === id ? { ...i, widthUnits: wUnits, heightUnits: hUnits } : i,
      ),
    };
    render();
    emitChange();
  }

  function addGroupFn(group: Group): void {
    state = addGroup(state, group);
    emitChange();
  }

  function removeGroupFn(groupId: string): void {
    state = removeGroupFromState(state, groupId);
    render();
    emitChange();
  }

  function startLinkMode(): void {
    if (!selectedId) return;
    const item = state.items.find((i) => i.id === selectedId);
    if (!item || !isHuman(item.paletteId)) return; // uniquement depuis un humain
    linkSource = selectedId;
    options.onLinkModeChange?.(true);
    render();
  }

  function cancelLinkMode(): void {
    linkSource = null;
    options.onLinkModeChange?.(false);
    render();
  }

  function loadState(next: MapState): void {
    state = {
      schemaVersion: next.schemaVersion,
      items: [...next.items],
      groups: [...(next.groups ?? [])],
      relations: [...(next.relations ?? [])],
    };
    selectedId = null;
    selectedRelationId = null;
    linkSource = null;
    render();
    options.onSelect?.(null, null);
    emitChange();
  }

  function getState(): MapState {
    return {
      schemaVersion: state.schemaVersion,
      items: [...state.items],
      groups: [...(state.groups ?? [])],
      relations: [...(state.relations ?? [])],
    };
  }

  function exportPNG(): string {
    return stage.toDataURL({ pixelRatio: 2 });
  }

  function destroy(): void {
    container.removeEventListener('keydown', onKeyDown);
    stage.destroy();
  }

  // ── Init with presets ─────────────────────────────────────────────────────────
  if (options.presets?.length) {
    for (const preset of options.presets) state = addItem(state, preset);
  }
  render();

  return {
    getState, loadState, addFromPalette, removeSelected,
    setLabel,
    setItemGroup: setItemGroupFn,
    setItemDims: setItemDimsFn,
    addGroup: addGroupFn, removeGroup: removeGroupFn,
    startLinkMode, cancelLinkMode, isLinkMode: () => linkSource !== null,
    getSelectedId: () => selectedId,
    getCanvasDims: () => ({ width, height }),
    exportPNG, destroy,
  };
}
