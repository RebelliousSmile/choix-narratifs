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
  createMapState,
  addItem,
  removeItem,
  moveItem,
  snap,
} from './map-state';

export interface MapEditorOptions {
  palette: PaletteItem[];
  presets?: PlacedItem[];
  background?: string;
  gridSize?: number;
  width?: number;
  height?: number;
  onChange?: (state: MapState) => void;
}

export interface MapEditor {
  getState(): MapState;
  loadState(state: MapState): void;
  addFromPalette(paletteId: string, x: number, y: number): void;
  removeSelected(): void;
  setLabel(id: string, label: string): void;
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
  const height = options.height ?? (container.clientHeight || 600);
  const paletteById = new Map(options.palette.map((p) => [p.id, p]));

  let state: MapState = createMapState();
  let selectedId: string | null = null;

  const stage = new Konva.Stage({
    container: container as HTMLDivElement,
    width,
    height,
    draggable: false,
  });

  const gridLayer = new Konva.Layer({ listening: false });
  const itemLayer = new Konva.Layer();
  stage.add(gridLayer);
  stage.add(itemLayer);

  // Fond optionnel.
  if (options.background) {
    const bg = new Konva.Rect({
      x: 0,
      y: 0,
      width,
      height,
      fill: options.background,
      listening: false,
    });
    gridLayer.add(bg);
  }

  drawGrid();

  function drawGrid(): void {
    if (gridSize <= 0) return;
    for (let x = 0; x <= width; x += gridSize) {
      gridLayer.add(
        new Konva.Line({
          points: [x, 0, x, height],
          stroke: '#e0e0e0',
          strokeWidth: 1,
          listening: false,
        }),
      );
    }
    for (let y = 0; y <= height; y += gridSize) {
      gridLayer.add(
        new Konva.Line({
          points: [0, y, width, y],
          stroke: '#e0e0e0',
          strokeWidth: 1,
          listening: false,
        }),
      );
    }
    gridLayer.draw();
  }

  function emitChange(): void {
    options.onChange?.(state);
  }

  function buildNode(item: PlacedItem): Konva.Group {
    const palette = paletteById.get(item.paletteId);
    const color = palette?.color ?? '#4477aa';
    const shape = palette?.shape ?? 'rect';
    const labelText = item.label ?? palette?.label ?? '';

    const group = new Konva.Group({
      x: item.x,
      y: item.y,
      rotation: item.rotation ?? 0,
      draggable: true,
      id: item.id,
    });

    if (shape === 'circle') {
      group.add(new Konva.Circle({ radius: gridSize, fill: color }));
    } else if (shape === 'label') {
      group.add(
        new Konva.Rect({
          width: gridSize * 3,
          height: gridSize,
          fill: color,
          cornerRadius: 4,
        }),
      );
    } else {
      group.add(
        new Konva.Rect({
          width: gridSize * 2,
          height: gridSize * 2,
          fill: color,
          cornerRadius: 2,
        }),
      );
    }

    if (labelText) {
      group.add(
        new Konva.Text({
          text: labelText,
          fontSize: 12,
          fill: '#111',
          padding: 2,
        }),
      );
    }

    group.on('dragend', () => {
      const nx = snap(group.x(), gridSize);
      const ny = snap(group.y(), gridSize);
      group.position({ x: nx, y: ny });
      state = moveItem(state, item.id, nx, ny);
      itemLayer.draw();
      emitChange();
    });

    group.on('click tap', () => {
      selectedId = item.id;
      highlightSelection();
    });

    return group;
  }

  function highlightSelection(): void {
    for (const node of itemLayer.getChildren()) {
      const isSel = node.id() === selectedId;
      (node as Konva.Group).getChildren().forEach((child) => {
        if (child instanceof Konva.Rect || child instanceof Konva.Circle) {
          child.stroke(isSel ? '#111' : 'transparent');
          child.strokeWidth(isSel ? 2 : 0);
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
  }

  // Zoom (molette) basique centré sur le pointeur.
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
    stage.position({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
    stage.batchDraw();
  });

  // Pan en glissant le fond (clic sur le stage vide désélectionne).
  stage.on('click tap', (e) => {
    if (e.target === stage) {
      selectedId = null;
      highlightSelection();
    }
  });

  // Suppression clavier.
  function onKeyDown(e: KeyboardEvent): void {
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
      removeSelected();
    }
  }
  container.tabIndex = container.tabIndex >= 0 ? container.tabIndex : 0;
  container.addEventListener('keydown', onKeyDown);

  function nextId(): string {
    return `item-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  }

  function addFromPalette(paletteId: string, x: number, y: number): void {
    const palette = paletteById.get(paletteId);
    if (!palette) return;
    const item: PlacedItem = {
      id: nextId(),
      paletteId,
      x: snap(x, gridSize),
      y: snap(y, gridSize),
      label: palette.label,
      rotation: 0,
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
    emitChange();
  }

  function setLabel(id: string, label: string): void {
    state = {
      ...state,
      items: state.items.map((it) => (it.id === id ? { ...it, label } : it)),
    };
    render();
    emitChange();
  }

  function loadState(next: MapState): void {
    state = { schemaVersion: next.schemaVersion, items: [...next.items] };
    selectedId = null;
    render();
    emitChange();
  }

  function getState(): MapState {
    return { schemaVersion: state.schemaVersion, items: [...state.items] };
  }

  function exportPNG(): string {
    return stage.toDataURL({ pixelRatio: 2 });
  }

  function destroy(): void {
    container.removeEventListener('keydown', onKeyDown);
    stage.destroy();
  }

  // Presets initiaux.
  if (options.presets && options.presets.length > 0) {
    for (const preset of options.presets) {
      state = addItem(state, preset);
    }
  }
  render();

  return {
    getState,
    loadState,
    addFromPalette,
    removeSelected,
    setLabel,
    exportPNG,
    destroy,
  };
}
