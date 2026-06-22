import { createStore } from 'zustand/vanilla';

import {
  DEFAULT_ITEM_TAG_COLOR,
  createDefaultItemPricingRule,
  normalizeItemPricingRule,
  type PrimitiveItem,
  type PrimitiveKind,
  type PricingMode,
} from '../../domains/drawing/PrimitiveItem';
import type { Point } from '../../domains/geometry/Geometry';
import { createLayer } from '../../domains/layer/LayerService';
import type { Layer } from '../../domains/layer/Layer';
import type { ProjectBudget } from '../../domains/project/ProjectAggregate';

type EditorState = {
  selectedLayerId: string | null;
  selectedItemIds: string[];
  layers: Layer[];
  items: PrimitiveItem[];
  projectBudget: ProjectBudget;
};

type EditorActions = {
  selectLayer: (layerId: string | null) => void;
  selectSingleItem: (itemId: string) => void;
  selectItems: (itemIds: string[]) => void;
  toggleLayerVisibility: (layerId: string) => void;
  toggleLayerLock: (layerId: string) => void;
  addLayer: (name: string) => void;
  deleteSelectedLayer: () => void;
  addPrimitive: (kind: PrimitiveKind) => void;
  addPolygons: (items: Array<{ name: string; points: Point[] }>) => void;
  updateSelectedPrimitiveDimensions: (dimensions: { widthMm: number; heightMm: number }) => void;
  updateSelectedPrimitivePoint: (pointIndex: number, point: Point) => void;
  updateSelectedPrimitiveEdgeLength: (edgeIndex: number, lengthMm: number) => void;
  moveSelectedPrimitiveEdgeBy: (edge: {
    startPointIndex: number;
    endPointIndex: number;
  }, delta: Point) => void;
  appendSelectedPrimitivePoint: () => void;
  removeSelectedPrimitivePoint: () => void;
  updateSelectedPrimitiveLayer: (layerId: string) => void;
  rotateSelectedPrimitiveBy: (deltaDeg: number) => void;
  rotateSelectedPrimitiveTo: (angleDeg: number) => void;
  updateSelectedItemPricing: (update: {
    mode?: PricingMode;
    unitPrice?: number;
    wasteRate?: number;
    materialName?: string;
  }) => void;
  updateSelectedItemName: (name: string) => void;
  updateSelectedItemTagColor: (color: string) => void;
  updateProjectBudget: (update: Partial<ProjectBudget>) => void;
  copySelectedItem: () => void;
  duplicateItemById: (itemId: string) => void;
  deleteSelectedItem: () => void;
  undo: () => void;
  moveSelectedItemBy: (delta: Point) => void;
  clearSelection: () => void;
};

export type EditorStoreState = EditorState & EditorActions;

type EditorStoreInitialState = Partial<EditorState>;

const HISTORY_LIMIT = 100;

const defaultLayers: Layer[] = [
  createLayer({ id: 'layer-default', name: 'default', category: 'custom', zIndex: 0 }),
];

const defaultEditorState: EditorState = {
  selectedLayerId: 'layer-default',
  selectedItemIds: [],
  layers: defaultLayers,
  items: [],
  projectBudget: {
    amount: 100_000,
    currency: 'CNY',
  },
};

function normalizeItems(items: PrimitiveItem[] | undefined): PrimitiveItem[] {
  if (!items) {
    return [];
  }

  return items.map((item, index) => ({
    ...item,
    name: item.name ?? `item-${index + 1}`,
    pricing: normalizeItemPricingRule(item.pricing),
    tagColor: item.tagColor ?? DEFAULT_ITEM_TAG_COLOR,
  }));
}

function createLayerId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `layer-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function createItemId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `item-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function normalizeImportedPolygonPoints(points: Point[]): Point[] {
  return points.map((point) => ({
    xMm: point.xMm,
    yMm: point.yMm,
  }));
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

function pointAverage(points: Point[]): Point {
  if (points.length === 0) {
    return { xMm: 0, yMm: 0 };
  }

  const sum = points.reduce(
    (current, point) => ({
      xMm: current.xMm + point.xMm,
      yMm: current.yMm + point.yMm,
    }),
    { xMm: 0, yMm: 0 },
  );

  return {
    xMm: sum.xMm / points.length,
    yMm: sum.yMm / points.length,
  };
}

function rotatePoint(point: Point, center: Point, deltaDeg: number): Point {
  const radians = (deltaDeg * Math.PI) / 180;
  const translatedX = point.xMm - center.xMm;
  const translatedY = point.yMm - center.yMm;

  return {
    xMm:
      center.xMm + translatedX * Math.cos(radians) - translatedY * Math.sin(radians),
    yMm:
      center.yMm + translatedX * Math.sin(radians) + translatedY * Math.cos(radians),
  };
}

function primitiveRotationDeg(points: Point[]): number {
  if (points.length < 2) {
    return 0;
  }

  const first = points[0];
  const second = points[1];
  return (Math.atan2(second.yMm - first.yMm, second.xMm - first.xMm) * 180) / Math.PI;
}

function duplicateItemInState(state: EditorState, sourceItemId: string): Partial<EditorState> {
  const sourceItem = state.items.find((item) => item.id === sourceItemId);

  if (!sourceItem) {
    return {};
  }

  if (isLayerLocked(sourceItem.layerId, state.layers)) {
    return {};
  }

  const copiedItem: PrimitiveItem = {
    ...sourceItem,
    id: createItemId(),
    name: `item-${state.items.length + 1}`,
    points: sourceItem.points.map((point) => ({
      xMm: point.xMm + 20,
      yMm: point.yMm + 20,
    })),
  };

  return {
    items: [...state.items, copiedItem],
    selectedItemIds: [copiedItem.id],
  };
}

function normalizeVector(dx: number, dy: number) {
  const length = Math.hypot(dx, dy);

  if (length === 0) {
    return { x: 0, y: 0 };
  }

  return {
    x: dx / length,
    y: dy / length,
  };
}

function edgeEndPointByLength(start: Point, end: Point, lengthMm: number): Point {
  const direction = normalizeVector(end.xMm - start.xMm, end.yMm - start.yMm);
  const unitDirection =
    direction.x === 0 && direction.y === 0 ? { x: 1, y: 0 } : direction;

  return {
    xMm: start.xMm + unitDirection.x * lengthMm,
    yMm: start.yMm + unitDirection.y * lengthMm,
  };
}

function updateRectCorner(points: Point[], pointIndex: number, point: Point): Point[] {
  if (points.length !== 4) {
    return points;
  }

  if (pointIndex === 0) {
    const opposite = points[2];
    return [
      point,
      { xMm: opposite.xMm, yMm: point.yMm },
      opposite,
      { xMm: point.xMm, yMm: opposite.yMm },
    ];
  }

  if (pointIndex === 1) {
    const opposite = points[3];
    return [
      { xMm: opposite.xMm, yMm: point.yMm },
      point,
      { xMm: point.xMm, yMm: opposite.yMm },
      opposite,
    ];
  }

  if (pointIndex === 2) {
    const opposite = points[0];
    return [
      opposite,
      { xMm: point.xMm, yMm: opposite.yMm },
      point,
      { xMm: opposite.xMm, yMm: point.yMm },
    ];
  }

  if (pointIndex === 3) {
    const opposite = points[1];
    return [
      { xMm: point.xMm, yMm: opposite.yMm },
      opposite,
      { xMm: opposite.xMm, yMm: point.yMm },
      point,
    ];
  }

  return points;
}

function isLayerLocked(layerId: string, layers: Layer[]): boolean {
  return layers.find((layer) => layer.id === layerId)?.locked ?? false;
}

export function createEditorStore(initial: EditorStoreInitialState = {}) {
  const normalizedInitialState: EditorStoreInitialState = {
    ...initial,
    items: normalizeItems(initial.items),
  };

  const historyPast: EditorState[] = [];
  const historyFuture: EditorState[] = [];

  function cloneEditorState(state: EditorState): EditorState {
    return {
      selectedLayerId: state.selectedLayerId,
      selectedItemIds: [...state.selectedItemIds],
      layers: state.layers.map((layer) => ({ ...layer })),
      items: state.items.map((item) => ({
        ...item,
        points: item.points.map((point) => ({ ...point })),
        pricing: item.pricing ? { ...item.pricing } : undefined,
      })),
      projectBudget: { ...state.projectBudget },
    };
  }

  function toEditorState(state: EditorStoreState): EditorState {
    return {
      selectedLayerId: state.selectedLayerId,
      selectedItemIds: state.selectedItemIds,
      layers: state.layers,
      items: state.items,
      projectBudget: state.projectBudget,
    };
  }

  return createStore<EditorStoreState>((set) => {
    function setWithHistory(
      updater: (state: EditorStoreState) => Partial<EditorState>,
    ) {
      set((state) => {
        const partial = updater(state);

        if (Object.keys(partial).length === 0) {
          return {};
        }

        historyPast.push(cloneEditorState(toEditorState(state)));

        if (historyPast.length > HISTORY_LIMIT) {
          historyPast.shift();
        }

        historyFuture.length = 0;

        return partial;
      });
    }

    return {
    ...defaultEditorState,
    ...normalizedInitialState,
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
      setWithHistory((state) => ({
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
    toggleLayerLock: (layerId) => {
      setWithHistory((state) => ({
        layers: state.layers.map((layer) => {
          if (layer.id !== layerId) {
            return layer;
          }

          return {
            ...layer,
            locked: !layer.locked,
          };
        }),
      }));
    },
    addLayer: (name) => {
      setWithHistory((state) => {
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
      setWithHistory((state) => {
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
      setWithHistory((state) => {
        const layerId = state.selectedLayerId ?? state.layers[0]?.id;
        const selectedLayer = state.layers.find((layer) => layer.id === layerId);

        if (!layerId || !selectedLayer || !selectedLayer.visible || selectedLayer.locked) {
          return {};
        }

        const item: PrimitiveItem = {
          id: createItemId(),
          name: `item-${state.items.length + 1}`,
          kind,
          layerId,
          points: defaultPointsByKind(kind),
          pricing: createDefaultItemPricingRule(),
          tagColor: DEFAULT_ITEM_TAG_COLOR,
        };

        return {
          items: [...state.items, item],
          selectedItemIds: [item.id],
        };
      });
    },
    addPolygons: (importedItems) => {
      setWithHistory((state) => {
        if (importedItems.length === 0) {
          return {};
        }

        const layerId = state.selectedLayerId ?? state.layers[0]?.id;
        const selectedLayer = state.layers.find((layer) => layer.id === layerId);

        if (!layerId || !selectedLayer || !selectedLayer.visible || selectedLayer.locked) {
          return {};
        }

        const nextItems = importedItems.map((importedItem, index) => ({
          id: createItemId(),
          name: importedItem.name.trim() || `item-${state.items.length + index + 1}`,
          kind: 'polygon' as const,
          layerId,
          points: normalizeImportedPolygonPoints(importedItem.points),
          pricing: createDefaultItemPricingRule(),
          tagColor: DEFAULT_ITEM_TAG_COLOR,
        }));

        const lastItemId = nextItems[nextItems.length - 1]?.id;

        return {
          items: [...state.items, ...nextItems],
          selectedItemIds: lastItemId ? [lastItemId] : state.selectedItemIds,
        };
      });
    },
    updateSelectedPrimitiveDimensions: ({ widthMm, heightMm }) => {
      setWithHistory((state) => {
        const [selectedItemId] = state.selectedItemIds;

        if (!selectedItemId) {
          return {};
        }

        return {
          items: state.items.map((item) => {
            if (item.id !== selectedItemId || item.kind !== 'rect' || item.points.length !== 4) {
              return item;
            }

            if (isLayerLocked(item.layerId, state.layers)) {
              return item;
            }

            const origin = item.points[0];
            const point1 = item.points[1];
            const point3 = item.points[3];
            const widthDirection = normalizeVector(
              point1.xMm - origin.xMm,
              point1.yMm - origin.yMm,
            );
            const heightDirection = normalizeVector(
              point3.xMm - origin.xMm,
              point3.yMm - origin.yMm,
            );
            const safeWidthDirection =
              widthDirection.x === 0 && widthDirection.y === 0
                ? { x: 1, y: 0 }
                : widthDirection;
            const safeHeightDirection =
              heightDirection.x === 0 && heightDirection.y === 0
                ? { x: 0, y: 1 }
                : heightDirection;
            const safeWidth = Math.max(1, widthMm);
            const safeHeight = Math.max(1, heightMm);
            const nextPoint1 = {
              xMm: origin.xMm + safeWidthDirection.x * safeWidth,
              yMm: origin.yMm + safeWidthDirection.y * safeWidth,
            };
            const nextPoint3 = {
              xMm: origin.xMm + safeHeightDirection.x * safeHeight,
              yMm: origin.yMm + safeHeightDirection.y * safeHeight,
            };

            return {
              ...item,
              points: [
                { xMm: origin.xMm, yMm: origin.yMm },
                nextPoint1,
                {
                  xMm: nextPoint1.xMm + safeHeightDirection.x * safeHeight,
                  yMm: nextPoint1.yMm + safeHeightDirection.y * safeHeight,
                },
                nextPoint3,
              ],
            };
          }),
        };
      });
    },
    updateSelectedPrimitivePoint: (pointIndex, point) => {
      setWithHistory((state) => {
        const [selectedItemId] = state.selectedItemIds;

        if (!selectedItemId) {
          return {};
        }

        return {
          items: state.items.map((item) => {
            if (item.id !== selectedItemId || pointIndex < 0 || pointIndex >= item.points.length) {
              return item;
            }

            if (isLayerLocked(item.layerId, state.layers)) {
              return item;
            }

            if (item.kind === 'rect') {
              return {
                ...item,
                points: updateRectCorner(item.points, pointIndex, point),
              };
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
    updateSelectedPrimitiveEdgeLength: (edgeIndex, lengthMm) => {
      setWithHistory((state) => {
        const [selectedItemId] = state.selectedItemIds;

        if (!selectedItemId || lengthMm < 0) {
          return {};
        }

        return {
          items: state.items.map((item) => {
            if (item.id !== selectedItemId) {
              return item;
            }

            if (isLayerLocked(item.layerId, state.layers)) {
              return item;
            }

            const isPolyline = item.kind === 'polyline';
            const isPolygon = item.kind === 'polygon';

            if (!isPolyline && !isPolygon) {
              return item;
            }

            const edgeCount = isPolyline
              ? Math.max(0, item.points.length - 1)
              : item.points.length;

            if (edgeIndex < 0 || edgeIndex >= edgeCount) {
              return item;
            }

            const startIndex = edgeIndex;
            const endIndex = isPolyline
              ? edgeIndex + 1
              : (edgeIndex + 1) % item.points.length;
            const startPoint = item.points[startIndex];
            const endPoint = item.points[endIndex];

            if (!startPoint || !endPoint) {
              return item;
            }

            const nextPoints = item.points.map((point, index) => {
              if (index !== endIndex) {
                return point;
              }

              return edgeEndPointByLength(startPoint, endPoint, lengthMm);
            });

            return {
              ...item,
              points: nextPoints,
            };
          }),
        };
      });
    },
    moveSelectedPrimitiveEdgeBy: (edge, delta) => {
      setWithHistory((state) => {
        const [selectedItemId] = state.selectedItemIds;

        if (!selectedItemId) {
          return {};
        }

        return {
          items: state.items.map((item) => {
            if (item.id !== selectedItemId) {
              return item;
            }

            if (isLayerLocked(item.layerId, state.layers)) {
              return item;
            }

            if (
              edge.startPointIndex < 0 ||
              edge.startPointIndex >= item.points.length ||
              edge.endPointIndex < 0 ||
              edge.endPointIndex >= item.points.length
            ) {
              return item;
            }

            const updatedIndexSet = new Set([
              edge.startPointIndex,
              edge.endPointIndex,
            ]);

            return {
              ...item,
              points: item.points.map((point, index) => {
                if (!updatedIndexSet.has(index)) {
                  return point;
                }

                return {
                  xMm: point.xMm + delta.xMm,
                  yMm: point.yMm + delta.yMm,
                };
              }),
            };
          }),
        };
      });
    },
    rotateSelectedPrimitiveBy: (deltaDeg) => {
      setWithHistory((state) => {
        const [selectedItemId] = state.selectedItemIds;

        if (!selectedItemId) {
          return {};
        }

        return {
          items: state.items.map((item) => {
            if (item.id !== selectedItemId) {
              return item;
            }

            if (isLayerLocked(item.layerId, state.layers)) {
              return item;
            }

            const center = pointAverage(item.points);
            return {
              ...item,
              points: item.points.map((point) => rotatePoint(point, center, deltaDeg)),
            };
          }),
        };
      });
    },
    rotateSelectedPrimitiveTo: (angleDeg) => {
      setWithHistory((state) => {
        const [selectedItemId] = state.selectedItemIds;

        if (!selectedItemId) {
          return {};
        }

        return {
          items: state.items.map((item) => {
            if (item.id !== selectedItemId || item.points.length < 2) {
              return item;
            }

            if (isLayerLocked(item.layerId, state.layers)) {
              return item;
            }

            const center = pointAverage(item.points);
            const currentAngle = primitiveRotationDeg(item.points);
            const deltaDeg = angleDeg - currentAngle;

            return {
              ...item,
              points: item.points.map((point) => rotatePoint(point, center, deltaDeg)),
            };
          }),
        };
      });
    },
    updateSelectedItemPricing: (update) => {
      setWithHistory((state) => {
        const [selectedItemId] = state.selectedItemIds;

        if (!selectedItemId) {
          return {};
        }

        return {
          items: state.items.map((item) => {
            if (item.id !== selectedItemId) {
              return item;
            }

            if (isLayerLocked(item.layerId, state.layers)) {
              return item;
            }

            const pricing = normalizeItemPricingRule(item.pricing);

            return {
              ...item,
              pricing: {
                ...pricing,
                ...(update.mode !== undefined ? { mode: update.mode } : {}),
                ...(update.unitPrice !== undefined
                  ? { unitPrice: Math.max(0, update.unitPrice) }
                  : {}),
                ...(update.wasteRate !== undefined
                  ? { wasteRate: Math.max(0, update.wasteRate) }
                  : {}),
                ...(update.materialName !== undefined
                  ? { materialName: update.materialName }
                  : {}),
              },
            };
          }),
        };
      });
    },
    updateSelectedItemName: (name) => {
      setWithHistory((state) => {
        const [selectedItemId] = state.selectedItemIds;

        if (!selectedItemId) {
          return {};
        }

        return {
          items: state.items.map((item) => {
            if (item.id !== selectedItemId) {
              return item;
            }

            if (isLayerLocked(item.layerId, state.layers)) {
              return item;
            }

            return {
              ...item,
              name,
            };
          }),
        };
      });
    },
    updateSelectedItemTagColor: (color) => {
      setWithHistory((state) => {
        const [selectedItemId] = state.selectedItemIds;

        if (!selectedItemId) {
          return {};
        }

        return {
          items: state.items.map((item) => {
            if (item.id !== selectedItemId) {
              return item;
            }

            if (isLayerLocked(item.layerId, state.layers)) {
              return item;
            }

            return {
              ...item,
              tagColor: color,
            };
          }),
        };
      });
    },
    updateProjectBudget: (update) => {
      setWithHistory((state) => ({
        projectBudget: {
          amount:
            update.amount === undefined
              ? state.projectBudget.amount
              : Math.max(0, update.amount),
          currency: update.currency ?? state.projectBudget.currency,
        },
      }));
    },
    appendSelectedPrimitivePoint: () => {
      setWithHistory((state) => {
        const [selectedItemId] = state.selectedItemIds;

        if (!selectedItemId) {
          return {};
        }

        return {
          items: state.items.map((item) => {
            if (item.id !== selectedItemId) {
              return item;
            }

            if (isLayerLocked(item.layerId, state.layers)) {
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
      setWithHistory((state) => {
        const [selectedItemId] = state.selectedItemIds;

        if (!selectedItemId) {
          return {};
        }

        return {
          items: state.items.map((item) => {
            if (item.id !== selectedItemId) {
              return item;
            }

            if (isLayerLocked(item.layerId, state.layers)) {
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
      setWithHistory((state) => {
        const [selectedItemId] = state.selectedItemIds;

        if (!selectedItemId) {
          return {};
        }

        return {
          items: state.items.map((item) => {
            if (item.id !== selectedItemId) {
              return item;
            }

            if (isLayerLocked(item.layerId, state.layers)) {
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
    copySelectedItem: () => {
      setWithHistory((state) => {
        const [selectedItemId] = state.selectedItemIds;

        if (!selectedItemId) {
          return {};
        }

        return duplicateItemInState(state, selectedItemId);
      });
    },
    duplicateItemById: (itemId) => {
      setWithHistory((state) => duplicateItemInState(state, itemId));
    },
    deleteSelectedItem: () => {
      setWithHistory((state) => {
        if (state.selectedItemIds.length === 0) {
          return {};
        }

        const selectedItemIdSet = new Set(state.selectedItemIds);
        const deletableItemIdSet = new Set(
          state.items
            .filter(
              (item) =>
                selectedItemIdSet.has(item.id) &&
                !isLayerLocked(item.layerId, state.layers),
            )
            .map((item) => item.id),
        );

        if (deletableItemIdSet.size === 0) {
          return {};
        }

        return {
          items: state.items.filter((item) => !deletableItemIdSet.has(item.id)),
          selectedItemIds: state.selectedItemIds.filter(
            (itemId) => !deletableItemIdSet.has(itemId),
          ),
        };
      });
    },
    undo: () => {
      set((state) => {
        const previousState = historyPast.pop();

        if (!previousState) {
          return {};
        }

        historyFuture.push(cloneEditorState(toEditorState(state)));

        return previousState;
      });
    },
    moveSelectedItemBy: (delta) => {
      setWithHistory((state) => {
        const [selectedItemId] = state.selectedItemIds;

        if (!selectedItemId) {
          return {};
        }

        return {
          items: state.items.map((item) => {
            if (item.id !== selectedItemId) {
              return item;
            }

            if (isLayerLocked(item.layerId, state.layers)) {
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
    };
  });
}
