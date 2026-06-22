import { createStore } from 'zustand/vanilla';

import type { PrimitiveItem, PrimitiveKind } from '../../domains/drawing/PrimitiveItem';
import type { Point } from '../../domains/geometry/Geometry';
import { createLayer } from '../../domains/layer/LayerService';
import type { Layer } from '../../domains/layer/Layer';

type EditorState = {
  selectedLayerId: string | null;
  selectedItemIds: string[];
  layers: Layer[];
  items: PrimitiveItem[];
};

type EditorActions = {
  selectLayer: (layerId: string | null) => void;
  selectSingleItem: (itemId: string) => void;
  toggleLayerVisibility: (layerId: string) => void;
  addPrimitive: (kind: PrimitiveKind) => void;
  deleteSelectedItem: () => void;
  moveSelectedItemBy: (delta: Point) => void;
  clearSelection: () => void;
};

export type EditorStoreState = EditorState & EditorActions;

type EditorStoreInitialState = Partial<EditorState>;

const defaultLayers: Layer[] = [
  createLayer({ id: 'layer-floorplan', name: 'Floor Plan', category: 'floorplan' }),
  createLayer({ id: 'layer-furniture', name: 'Furniture', category: 'furniture' }),
];

const defaultEditorState: EditorState = {
  selectedLayerId: 'layer-floorplan',
  selectedItemIds: [],
  layers: defaultLayers,
  items: [],
};

function defaultPointsByKind(kind: PrimitiveKind): Point[] {
  if (kind === 'polyline') {
    return [
      { xMm: 100, yMm: 100 },
      { xMm: 240, yMm: 120 },
      { xMm: 340, yMm: 220 },
    ];
  }

  if (kind === 'polygon') {
    return [
      { xMm: 120, yMm: 120 },
      { xMm: 260, yMm: 120 },
      { xMm: 220, yMm: 240 },
    ];
  }

  return [
    { xMm: 140, yMm: 140 },
    { xMm: 320, yMm: 140 },
    { xMm: 320, yMm: 260 },
    { xMm: 140, yMm: 260 },
  ];
}

export function createEditorStore(initial: EditorStoreInitialState = {}) {
  return createStore<EditorStoreState>((set) => ({
    ...defaultEditorState,
    ...initial,
    selectLayer: (layerId) => {
      set({ selectedLayerId: layerId });
    },
    selectSingleItem: (itemId) => {
      set({ selectedItemIds: [itemId] });
    },
    toggleLayerVisibility: (layerId) => {
      set((state) => ({
        layers: state.layers.map((layer) => {
          if (layer.id !== layerId) {
            return layer;
          }

          return {
            ...layer,
            visible: !layer.visible,
          };
        }),
      }));
    },
    addPrimitive: (kind) => {
      set((state) => {
        const layerId = state.selectedLayerId ?? state.layers[0]?.id;

        if (!layerId) {
          return {};
        }

        const item: PrimitiveItem = {
          id: `item-${state.items.length + 1}`,
          kind,
          layerId,
          points: defaultPointsByKind(kind),
        };

        return {
          items: [...state.items, item],
          selectedItemIds: [item.id],
        };
      });
    },
    deleteSelectedItem: () => {
      set((state) => {
        const [selectedItemId] = state.selectedItemIds;

        if (!selectedItemId) {
          return {};
        }

        return {
          items: state.items.filter((item) => item.id !== selectedItemId),
          selectedItemIds: [],
        };
      });
    },
    moveSelectedItemBy: (delta) => {
      set((state) => {
        const [selectedItemId] = state.selectedItemIds;

        if (!selectedItemId) {
          return {};
        }

        return {
          items: state.items.map((item) => {
            if (item.id !== selectedItemId) {
              return item;
            }

            return {
              ...item,
              points: item.points.map((point) => ({
                xMm: point.xMm + delta.xMm,
                yMm: point.yMm + delta.yMm,
              })),
            };
          }),
        };
      });
    },
    clearSelection: () => {
      set({ selectedLayerId: null, selectedItemIds: [] });
    },
  }));
}
