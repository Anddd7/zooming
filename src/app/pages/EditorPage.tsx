import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  DocumentDuplicateIcon,
  EyeIcon,
  EyeSlashIcon,
  MinusCircleIcon,
  PlusCircleIcon,
  TrashIcon,
} from "@heroicons/react/24/solid";

import { createEditorStore } from "../store/editorStore";
import { CanvasEditor } from "../../engine/canvas/CanvasEditor";
import { polygonAreaMm2 } from "../../domains/geometry/GeometryMeasure";

const EDITOR_STORAGE_KEY = "zooming.editor.snapshot.v1";

type PersistedEditorSnapshot = {
  selectedLayerId: string | null;
  selectedItemIds: string[];
  layers: ReturnType<typeof createEditorStore>["getState"]["layers"];
  items: ReturnType<typeof createEditorStore>["getState"]["items"];
  zoomLevel: number;
};

function loadPersistedEditorSnapshot(): PersistedEditorSnapshot | null {
  try {
    const raw = window.localStorage.getItem(EDITOR_STORAGE_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<PersistedEditorSnapshot>;

    if (!Array.isArray(parsed.layers) || !Array.isArray(parsed.items)) {
      return null;
    }

    return {
      selectedLayerId: parsed.selectedLayerId ?? null,
      selectedItemIds: Array.isArray(parsed.selectedItemIds)
        ? parsed.selectedItemIds
        : [],
      layers: parsed.layers,
      items: parsed.items,
      zoomLevel:
        typeof parsed.zoomLevel === "number" && !Number.isNaN(parsed.zoomLevel)
          ? parsed.zoomLevel
          : 1,
    };
  } catch {
    return null;
  }
}

function itemRotationDeg(points: { xMm: number; yMm: number }[]) {
  if (points.length < 2) {
    return 0;
  }

  const first = points[0];
  const second = points[1];
  return (Math.atan2(second.yMm - first.yMm, second.xMm - first.xMm) * 180) / Math.PI;
}

function segmentLength(a: { xMm: number; yMm: number }, b: { xMm: number; yMm: number }) {
  return Math.hypot(b.xMm - a.xMm, b.yMm - a.yMm);
}

export function EditorPage() {
  const persistedSnapshot = useMemo(loadPersistedEditorSnapshot, []);
  const storeRef = useRef(
    createEditorStore(
      persistedSnapshot
        ? {
            selectedLayerId: persistedSnapshot.selectedLayerId,
            selectedItemIds: persistedSnapshot.selectedItemIds,
            layers: persistedSnapshot.layers,
            items: persistedSnapshot.items,
          }
        : undefined,
    ),
  );
  const store = storeRef.current;
  const state = useSyncExternalStore(
    store.subscribe,
    store.getState,
    store.getState,
  );
  const selectedItem = state.items.find(
    (item) => item.id === state.selectedItemIds[0],
  );
  const sortedLayers = [...state.layers].sort((a, b) => b.zIndex - a.zIndex);
  const [zoomLevel, setZoomLevel] = useState(persistedSnapshot?.zoomLevel ?? 1);
  const [isVertexEditorExpanded, setIsVertexEditorExpanded] = useState(false);

  const iconButtonClass =
    "grid h-8 w-8 place-items-center rounded border border-hairline bg-canvas/80 text-body transition-colors hover:bg-canvas";

  const quickZoomLevels = [1, 0.8, 0.5, 0.1];

  useEffect(() => {
    function persistSnapshot() {
      try {
        const currentState = store.getState();

        const snapshot: PersistedEditorSnapshot = {
          selectedLayerId: currentState.selectedLayerId,
          selectedItemIds: currentState.selectedItemIds,
          layers: currentState.layers,
          items: currentState.items,
          zoomLevel,
        };

        window.localStorage.setItem(EDITOR_STORAGE_KEY, JSON.stringify(snapshot));
      } catch {
        // ignore storage write failures
      }
    }

    const unsubscribe = store.subscribe(() => {
      persistSnapshot();
    });

    persistSnapshot();

    return () => {
      unsubscribe();
    };
  }, [store, zoomLevel]);

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden px-4 pt-3">
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div className="pointer-events-auto absolute left-1/2 top-2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-hairline bg-canvas/70 px-3 py-2 text-sm shadow-sm backdrop-blur">
          <button
            type="button"
            className={iconButtonClass}
            aria-label="Add Line"
            title="Add Line"
            onClick={() => state.addPrimitive("polyline")}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
              <line
                x1="5"
                y1="18"
                x2="19"
                y2="6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <button
            type="button"
            className={iconButtonClass}
            aria-label="Add Rect"
            title="Add Rect"
            onClick={() => state.addPrimitive("rect")}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
              <rect
                x="5"
                y="6"
                width="14"
                height="12"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
              />
            </svg>
          </button>
          <button
            type="button"
            className={iconButtonClass}
            aria-label="Add Polygon"
            title="Add Polygon"
            onClick={() => state.addPrimitive("polygon")}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
              <path
                d="M5 16L9 6L18 8L19 17L8 19Z"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
              />
            </svg>
          </button>
          <button
            type="button"
            className={iconButtonClass}
            aria-label="Copy Selected"
            title="Copy Selected"
            onClick={() => state.copySelectedItem()}
          >
            <DocumentDuplicateIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={iconButtonClass}
            aria-label="Delete Selected"
            title="Delete Selected"
            onClick={() => state.deleteSelectedItem()}
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="pointer-events-auto absolute right-2 top-12 z-10 w-64 rounded-lg border border-hairline bg-canvas/80 p-2 text-xs shadow-sm backdrop-blur">
          <label className="mb-2 block">
            <span className="mb-0.5 block text-[11px]">Quick zoom</span>
            <select
              aria-label="Quick zoom"
              className="w-full rounded border border-hairline bg-canvas/70 px-2 py-1"
              value={String(zoomLevel)}
              onChange={(event) => {
                const nextZoom = Number(event.target.value);

                if (!Number.isNaN(nextZoom)) {
                  setZoomLevel(nextZoom);
                }
              }}
            >
              {quickZoomLevels.map((level) => (
                <option key={level} value={level}>
                  {level}x
                </option>
              ))}
            </select>
          </label>
          <div className="mb-2 flex items-center justify-between font-semibold">
            <span>Layers</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="grid h-6 w-6 place-items-center rounded border border-hairline bg-canvas/70"
                aria-label="Add Layer"
                onClick={() =>
                  state.addLayer(`Layer ${state.layers.length + 1}`)
                }
              >
                <PlusCircleIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="grid h-6 w-6 place-items-center rounded border border-hairline bg-canvas/70"
                aria-label="Delete Selected Layer"
                onClick={() => state.deleteSelectedLayer()}
              >
                <MinusCircleIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="space-y-1">
            {sortedLayers.map((layer) => {
              const isSelected = layer.id === state.selectedLayerId;

              return (
                <div
                  key={layer.id}
                  className={`flex w-full items-center justify-between rounded px-2 py-1 text-left ${
                    isSelected ? "bg-blue-100 text-blue-800" : "bg-canvas/70"
                  }`}
                >
                  <button
                    type="button"
                    aria-label={`Select ${layer.name} layer`}
                    className="min-w-0 flex-1 truncate text-left"
                    onClick={() => state.selectLayer(layer.id)}
                  >
                    {layer.name}
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="grid h-5 w-5 place-items-center rounded border border-hairline bg-canvas/70"
                      aria-label={
                        layer.visible
                          ? `Hide ${layer.name}`
                          : `Show ${layer.name}`
                      }
                      onClick={(event) => {
                        event.stopPropagation();
                        state.toggleLayerVisibility(layer.id);
                      }}
                    >
                      {layer.visible ? (
                        <EyeIcon className="h-3.5 w-3.5" />
                      ) : (
                        <EyeSlashIcon className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <span className="text-[10px] opacity-70">
                      z:{layer.zIndex}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="pointer-events-auto absolute right-2 top-[30rem] z-10 w-64 rounded-lg border border-hairline bg-canvas/80 p-2 text-xs shadow-sm backdrop-blur">
          <div className="font-semibold">Properties</div>
          {selectedItem ? (
            <div className="mt-2 space-y-2">
              <div className="text-[11px] text-ink-muted-48">
                {selectedItem.kind} · {selectedItem.id}
              </div>
              <div className="rounded border border-hairline bg-canvas/70 px-2 py-1 text-[11px] text-ink-muted-48">
                <div className="font-medium text-body">Area (read-only)</div>
                <div className="mt-0.5">
                  {selectedItem.kind === "polyline"
                    ? "N/A"
                    : (() => {
                        const areaMm2 = polygonAreaMm2(selectedItem.points);
                        const areaM2 = areaMm2 / 1_000_000;
                        return `${Math.round(areaMm2)} mm² / ${areaM2.toFixed(3)} m²`;
                      })()}
                </div>
              </div>
              <label className="block">
                <span className="mb-0.5 block">Layer</span>
                <select
                  className="w-full rounded border border-hairline bg-canvas/70 px-2 py-1"
                  value={selectedItem.layerId}
                  onChange={(event) =>
                    state.updateSelectedPrimitiveLayer(event.target.value)
                  }
                >
                  {state.layers.map((layer) => (
                    <option key={layer.id} value={layer.id}>
                      {layer.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="rounded border border-hairline bg-canvas/70 px-2 py-1">
                <div className="mb-1 text-[11px] font-medium">Rotation</div>
                <div className="grid grid-cols-[1fr_auto_auto] items-center gap-1">
                  <input
                    aria-label="Rotation angle"
                    type="number"
                    className="min-w-0 rounded border border-hairline bg-canvas px-2 py-1"
                    value={Math.round(itemRotationDeg(selectedItem.points))}
                    onChange={(event) => {
                      const nextAngle = Number(event.target.value);

                      if (!Number.isNaN(nextAngle)) {
                        state.rotateSelectedPrimitiveTo(nextAngle);
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="whitespace-nowrap rounded border border-hairline bg-canvas px-2 py-1"
                    onClick={() => state.rotateSelectedPrimitiveBy(15)}
                  >
                    +15°
                  </button>
                  <button
                    type="button"
                    className="whitespace-nowrap rounded border border-hairline bg-canvas px-2 py-1"
                    onClick={() => state.rotateSelectedPrimitiveBy(90)}
                  >
                    +90°
                  </button>
                </div>
              </div>
              {selectedItem.kind === "rect" &&
              selectedItem.points.length === 4 ? (
                <div className="grid grid-cols-2 gap-2">
                  <label>
                    <span className="mb-0.5 block">W (mm)</span>
                    <input
                      type="number"
                      className="w-full rounded border border-hairline bg-canvas/70 px-2 py-1"
                      value={Math.round(segmentLength(selectedItem.points[0], selectedItem.points[1]))}
                      onChange={(event) => {
                        const nextWidth = Number(event.target.value);
                        const currentHeight = segmentLength(
                          selectedItem.points[1],
                          selectedItem.points[2],
                        );

                        if (!Number.isNaN(nextWidth)) {
                          state.updateSelectedPrimitiveDimensions({
                            widthMm: nextWidth,
                            heightMm: currentHeight,
                          });
                        }
                      }}
                    />
                  </label>
                  <label>
                    <span className="mb-0.5 block">H (mm)</span>
                    <input
                      type="number"
                      className="w-full rounded border border-hairline bg-canvas/70 px-2 py-1"
                      value={Math.round(segmentLength(selectedItem.points[1], selectedItem.points[2]))}
                      onChange={(event) => {
                        const nextHeight = Number(event.target.value);
                        const currentWidth = segmentLength(
                          selectedItem.points[0],
                          selectedItem.points[1],
                        );

                        if (!Number.isNaN(nextHeight)) {
                          state.updateSelectedPrimitiveDimensions({
                            widthMm: currentWidth,
                            heightMm: nextHeight,
                          });
                        }
                      }}
                    />
                  </label>
                </div>
              ) : null}
              <div className="space-y-1 rounded border border-hairline bg-canvas/70 px-2 py-1">
                <button
                  type="button"
                  aria-label="Vertices"
                  className="flex w-full items-center justify-between text-left text-[11px] font-medium"
                  onClick={() => setIsVertexEditorExpanded((current) => !current)}
                >
                  <span>Vertices</span>
                  <span>{isVertexEditorExpanded ? "−" : "+"}</span>
                </button>
                {isVertexEditorExpanded ? (
                  <div className="space-y-1">
                    {selectedItem.points.map((point, pointIndex) => (
                      <div
                        key={`${selectedItem.id}-point-${pointIndex}`}
                        className="grid grid-cols-2 gap-1"
                      >
                        <input
                          type="number"
                          className="rounded border border-hairline bg-canvas px-2 py-1"
                          value={Math.round(point.xMm)}
                          onChange={(event) => {
                            const nextX = Number(event.target.value);

                            if (!Number.isNaN(nextX)) {
                              state.updateSelectedPrimitivePoint(pointIndex, {
                                xMm: nextX,
                                yMm: point.yMm,
                              });
                            }
                          }}
                        />
                        <input
                          type="number"
                          className="rounded border border-hairline bg-canvas px-2 py-1"
                          value={Math.round(point.yMm)}
                          onChange={(event) => {
                            const nextY = Number(event.target.value);

                            if (!Number.isNaN(nextY)) {
                              state.updateSelectedPrimitivePoint(pointIndex, {
                                xMm: point.xMm,
                                yMm: nextY,
                              });
                            }
                          }}
                        />
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
              {selectedItem.kind === "polyline" ||
              selectedItem.kind === "polygon" ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded border border-hairline bg-canvas/70 px-2 py-1"
                    onClick={() => state.appendSelectedPrimitivePoint()}
                  >
                    + Point
                  </button>
                  <button
                    type="button"
                    className="rounded border border-hairline bg-canvas/70 px-2 py-1"
                    onClick={() => state.removeSelectedPrimitivePoint()}
                  >
                    - Point
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-2 text-[11px] text-ink-muted-48">-</div>
          )}
        </div>
        <CanvasEditor
          items={state.items}
          layers={state.layers}
          zoom={zoomLevel}
          onZoomChange={setZoomLevel}
          selectedItemIds={state.selectedItemIds}
          onSelectItem={(itemId) => state.selectSingleItem(itemId)}
          onSelectItems={(itemIds) => state.selectItems(itemIds)}
          onClearSelection={() => state.selectItems([])}
          onMoveSelectedBy={(delta) => state.moveSelectedItemBy(delta)}
          onRotateSelectedBy={(deltaDeg) => state.rotateSelectedPrimitiveBy(deltaDeg)}
          onMoveVertex={(vertex, point) => {
            const selected = state.items.find((item) => item.id === vertex.itemId);

            if (!selected) {
              return;
            }

            state.selectSingleItem(vertex.itemId);
            state.updateSelectedPrimitivePoint(vertex.pointIndex, point);
          }}
        />
      </div>
    </section>
  );
}
