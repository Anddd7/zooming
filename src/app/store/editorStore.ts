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
  selectItems: (itemIds: string[]) => void;
  toggleLayerVisibility: (layerId: string) => void;
  addLayer: (name: string) => void;
  deleteSelectedLayer: () => void;
  addPrimitive: (kind: PrimitiveKind) => void;
  updateSelectedPrimitiveDimensions: (dimensions: { widthMm: number; heightMm: number }) => void;
  updateSelectedPrimitivePoint: (pointIndex: number, point: Point) => void;
  appendSelectedPrimitivePoint: () => void;
  removeSelectedPrimitivePoint: () => void;
  updateSelectedPrimitiveLayer: (layerId: string) => void;
  deleteSelectedItem: () => void;
  moveSelectedItemBy: (delta: Point) => void;
  clearSelection: () => void;
};

export type EditorStoreState = EditorState & EditorActions;

type EditorStoreInitialState = Partial<EditorState>;

const defaultLayers: Layer[] = [
  createLayer({ id: 'layer-default', name: 'default', category: 'custom', zIndex: 0 }),
];

const defaultEditorState: EditorState = {
  selectedLayerId: 'layer-default',
  selectedItemIds: [],
  layers: defaultLayers,
  items: [],
};

function createLayerId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `layer-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

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
    selectItems: (itemIds) => {
      set({ selectedItemIds: itemIds });
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
    addLayer: (name) => {
      set((state) => {
        const nextZIndex =
          state.layers.length === 0
            ? 0
            : Math.max(...state.layers.map((layer) => layer.zIndex)) + 1;
        const nextLayerId = createLayerId();

        const layer = createLayer({
          id: nextLayerId,
          name,
          category: 'custom',
          zIndex: nextZIndex,
        });

        return {
          layers: [...state.layers, layer],
          selectedLayerId: layer.id,
        };
      });
    },
    deleteSelectedLayer: () => {
      set((state) => {
        const selectedLayerId = state.selectedLayerId;

        if (!selectedLayerId || state.layers.length <= 1) {
          return {};
        }

        const remainingLayers = state.layers.filter((layer) => layer.id !== selectedLayerId);
        const fallbackLayerId = remainingLayers[0]?.id ?? null;

        return {
          layers: remainingLayers,
          items: state.items.filter((item) => item.layerId !== selectedLayerId),
          selectedItemIds: state.selectedItemIds.filter(
            (itemId) => state.items.find((item) => item.id === itemId)?.layerId !== selectedLayerId,
          ),
          selectedLayerId: fallbackLayerId,
        };
      });
    },
    addPrimitive: (kind) => {
      set((state) => {
        const layerId = state.selectedLayerId ?? state.layers[0]?.id;
        const selectedLayer = state.layers.find((layer) => layer.id === layerId);

        if (!layerId || !selectedLayer || !selectedLayer.visible || selectedLayer.locked) {
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
    updateSelectedPrimitiveDimensions: ({ widthMm, heightMm }) => {
      set((state) => {
        const [selectedItemId] = state.selectedItemIds;

        if (!selectedItemId) {
          return {};
        }

        return {
          items: state.items.map((item) => {
            if (item.id !== selectedItemId || item.kind !== 'rect' || item.points.length !== 4) {
              return item;
            }

            const origin = item.points[0];
            const safeWidth = Math.max(1, widthMm);
            const safeHeight = Math.max(1, heightMm);

            return {
              ...item,
              points: [
                { xMm: origin.xMm, yMm: origin.yMm },
                { xMm: origin.xMm + safeWidth, yMm: origin.yMm },
                { xMm: origin.xMm + safeWidth, yMm: origin.yMm + safeHeight },
                { xMm: origin.xMm, yMm: origin.yMm + safeHeight },
              ],
            };
          }),
        };
      });
    },
    updateSelectedPrimitivePoint: (pointIndex, point) => {
      set((state) => {
        const [selectedItemId] = state.selectedItemIds;

        if (!selectedItemId) {
          return {};
        }

        return {
          items: state.items.map((item) => {
            if (item.id !== selectedItemId || pointIndex < 0 || pointIndex >= item.points.length) {
              return item;
            }

            return {
              ...item,
              points: item.points.map((existingPoint, existingPointIndex) => {
                if (existingPointIndex !== pointIndex) {
                  return existingPoint;
                }

                return point;
              }),
            };
          }),
        };
      });
    },
    appendSelectedPrimitivePoint: () => {
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

            const lastPoint = item.points[item.points.length - 1] ?? { xMm: 0, yMm: 0 };
            const nextPoint = {
              xMm: lastPoint.xMm + 40,
              yMm: lastPoint.yMm + 40,
            };

            return {
              ...item,
              points: [...item.points, nextPoint],
            };
          }),
        };
      });
    },
    removeSelectedPrimitivePoint: () => {
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

            const minPointCount = item.kind === 'polyline' ? 2 : 3;

            if (item.points.length <= minPointCount) {
              return item;
            }

            return {
              ...item,
              points: item.points.slice(0, -1),
            };
          }),
        };
      });
    },
    updateSelectedPrimitiveLayer: (layerId) => {
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
              layerId,
            };
          }),
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
