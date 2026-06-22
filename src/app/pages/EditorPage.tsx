import {
  useEffect,
  useMemo,
  useCallback,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  DocumentDuplicateIcon,
  EyeIcon,
  EyeSlashIcon,
  LockClosedIcon,
  LockOpenIcon,
  MinusCircleIcon,
  PlusCircleIcon,
  TrashIcon,
} from "@heroicons/react/24/solid";

import { createEditorStore } from "../store/editorStore";
import { CanvasEditor } from "../../engine/canvas/CanvasEditor";
import { polygonAreaMm2 } from "../../domains/geometry/GeometryMeasure";
import {
  computeItemEstimate,
  summarizeEstimate,
} from "../../domains/estimate/EstimateService";
import { DEFAULT_ITEM_TAG_COLOR } from "../../domains/drawing/PrimitiveItem";
import {
  normalizeItemPricingRule,
  type PricingMode,
} from "../../domains/drawing/PrimitiveItem";

const EDITOR_STORAGE_KEY = "zooming.editor.snapshot.v1";

type PersistedEditorSnapshot = {
  selectedLayerId: string | null;
  selectedItemIds: string[];
  layers: ReturnType<typeof createEditorStore>["getState"]["layers"];
  items: ReturnType<typeof createEditorStore>["getState"]["items"];
  projectBudget: ReturnType<
    typeof createEditorStore
  >["getState"]["projectBudget"];
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
      projectBudget:
        parsed.projectBudget &&
        typeof parsed.projectBudget.amount === "number" &&
        typeof parsed.projectBudget.currency === "string"
          ? parsed.projectBudget
          : { amount: 100_000, currency: "CNY" },
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
  return (
    (Math.atan2(second.yMm - first.yMm, second.xMm - first.xMm) * 180) / Math.PI
  );
}

function segmentLength(
  a: { xMm: number; yMm: number },
  b: { xMm: number; yMm: number },
) {
  return Math.hypot(b.xMm - a.xMm, b.yMm - a.yMm);
}

function formatCurrency(value: number, currency: string) {
  return `${currency} ${value.toFixed(2)}`;
}

function formatQuantity(mode: PricingMode, quantity: number) {
  if (mode === "none") {
    return "-";
  }

  if (mode === "fixed") {
    return "1";
  }

  if (mode === "perLength") {
    return `${quantity.toFixed(2)} mm`;
  }

  if (mode === "perArea") {
    return `${quantity.toFixed(2)} mm²`;
  }

  if (mode === "perAreaM2") {
    return `${quantity.toFixed(4)} m²`;
  }

  return `${quantity.toFixed(2)} mm²`;
}

function pricingUnit(mode: PricingMode) {
  if (mode === "none") {
    return "-";
  }

  if (mode === "fixed") {
    return "item";
  }

  if (mode === "perLength") {
    return "mm";
  }

  if (mode === "perArea") {
    return "mm²";
  }

  if (mode === "perAreaM2") {
    return "m²";
  }

  return "-";
}

function formatPlainPrice(value: number) {
  return value.toFixed(2);
}

function formatPlainTotal(value: number) {
  const rounded = Math.round(value);

  if (Math.abs(value - rounded) < 1e-6) {
    return String(rounded);
  }

  return value.toFixed(2);
}

function formatEstimateQuality(mode: PricingMode, quantity: number) {
  if (mode === "fixed") {
    return "1";
  }

  const unit = pricingUnit(mode);
  const compactValue = Number(quantity.toFixed(4)).toString();

  return `${compactValue}(${unit})`;
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
            projectBudget: persistedSnapshot.projectBudget,
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
  const [isMaterialExpanded, setIsMaterialExpanded] = useState(false);
  const [isPositionExpanded, setIsPositionExpanded] = useState(false);
  const [isTagExpanded, setIsTagExpanded] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const estimateSummary = useMemo(
    () => summarizeEstimate(state.items),
    [state.items],
  );
  const selectedItemEstimate = useMemo(() => {
    if (!selectedItem) {
      return null;
    }

    return computeItemEstimate(selectedItem);
  }, [selectedItem]);
  const selectedItemPricing = useMemo(
    () => normalizeItemPricingRule(selectedItem?.pricing),
    [selectedItem],
  );
  const selectedItemTagColor = selectedItem?.tagColor ?? DEFAULT_ITEM_TAG_COLOR;
  const selectedItemLayer = selectedItem
    ? state.layers.find((layer) => layer.id === selectedItem.layerId)
    : null;
  const isSelectedItemLayerLocked = selectedItemLayer?.locked ?? false;
  const overBudget = estimateSummary.totalCost > state.projectBudget.amount;
  const estimateByItemId = useMemo(
    () =>
      new Map(
        estimateSummary.itemEstimates.map((estimate) => [
          estimate.itemId,
          estimate,
        ]),
      ),
    [estimateSummary.itemEstimates],
  );

  useEffect(() => {
    if (!selectedItem) {
      setIsEditingTitle(false);
      setTitleDraft("");
      return;
    }

    if (!isEditingTitle) {
      setTitleDraft(selectedItem.name ?? "");
    }
  }, [selectedItem, isEditingTitle]);

  const commitTitleEdit = useCallback(() => {
    if (!selectedItem) {
      return;
    }

    state.updateSelectedItemName(
      titleDraft.trim() || selectedItem.name || "item",
    );
    setIsEditingTitle(false);
  }, [selectedItem, state, titleDraft]);

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
          projectBudget: currentState.projectBudget,
          zoomLevel,
        };

        window.localStorage.setItem(
          EDITOR_STORAGE_KEY,
          JSON.stringify(snapshot),
        );
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
                        layer.locked
                          ? `Unlock ${layer.name}`
                          : `Lock ${layer.name}`
                      }
                      onClick={(event) => {
                        event.stopPropagation();
                        state.toggleLayerLock(layer.id);
                      }}
                    >
                      {layer.locked ? (
                        <LockClosedIcon className="h-3.5 w-3.5" />
                      ) : (
                        <LockOpenIcon className="h-3.5 w-3.5" />
                      )}
                    </button>
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
        <div className="pointer-events-auto absolute right-2 top-[15rem] z-10 w-64 rounded-lg border border-hairline bg-canvas/80 p-2 text-xs shadow-sm backdrop-blur">
          {selectedItem ? (
            isEditingTitle ? (
              <input
                aria-label="Item Title"
                className="w-full rounded border border-hairline bg-canvas/70 px-2 py-1 text-sm font-semibold"
                value={titleDraft}
                autoFocus
                disabled={isSelectedItemLayerLocked}
                onChange={(event) => setTitleDraft(event.target.value)}
                onBlur={commitTitleEdit}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    commitTitleEdit();
                  }

                  if (event.key === "Escape") {
                    setIsEditingTitle(false);
                    setTitleDraft(selectedItem.name ?? "");
                  }
                }}
              />
            ) : (
              <button
                type="button"
                className="w-full truncate text-left text-sm font-semibold"
                title="Click to edit alias"
                onClick={() => {
                  if (isSelectedItemLayerLocked) {
                    return;
                  }

                  setTitleDraft(selectedItem.name ?? "");
                  setIsEditingTitle(true);
                }}
              >
                {selectedItem.name ?? "item"}
              </button>
            )
          ) : (
            <div className="font-semibold">Properties</div>
          )}
          {selectedItem ? (
            <div className="mt-2 space-y-2">
              {isSelectedItemLayerLocked ? (
                <div className="rounded border border-hairline bg-amber-50 px-2 py-1 text-[11px] text-amber-700">
                  Layer locked: editing disabled.
                </div>
              ) : null}
              <div className="rounded border border-hairline bg-canvas/70 px-2 py-1 text-[11px] text-ink-muted-48">
                <div className="font-medium text-body">Cost</div>
                <div className="mt-0.5">
                  {selectedItem.kind === "polyline"
                    ? "N/A"
                    : (() => {
                        const areaMm2 = polygonAreaMm2(selectedItem.points);
                        const areaM2 = areaMm2 / 1_000_000;
                        return `${Math.round(areaMm2)} mm² / ${areaM2.toFixed(3)} m²`;
                      })()}
                </div>
                <div>
                  {formatCurrency(
                    selectedItemEstimate?.cost ?? 0,
                    state.projectBudget.currency,
                  )}
                </div>
              </div>
              <div className="rounded border border-hairline bg-canvas/70 px-2 py-1">
                <button
                  type="button"
                  className="flex w-full items-center justify-between text-left text-[11px] font-medium"
                  onClick={() => setIsMaterialExpanded((current) => !current)}
                >
                  <span>Material & Pricing</span>
                  <span>{isMaterialExpanded ? "−" : "+"}</span>
                </button>
                {isMaterialExpanded ? (
                  <div className="mt-1 space-y-1">
                    <label className="block">
                      <span className="mb-0.5 block">Material</span>
                      <input
                        aria-label="Material"
                        className="w-full rounded border border-hairline bg-canvas px-2 py-1"
                        value={selectedItemPricing.materialName}
                        disabled={isSelectedItemLayerLocked}
                        onChange={(event) =>
                          state.updateSelectedItemPricing({
                            materialName: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="block">
                      <span className="mb-0.5 block">Pricing Mode</span>
                      <select
                        aria-label="Pricing Mode"
                        className="w-full rounded border border-hairline bg-canvas px-2 py-1"
                        value={selectedItemPricing.mode}
                        disabled={isSelectedItemLayerLocked}
                        onChange={(event) =>
                          state.updateSelectedItemPricing({
                            mode: event.target.value as PricingMode,
                          })
                        }
                      >
                        <option value="none">none</option>
                        <option value="fixed">fixed</option>
                        <option value="perLength">perLength</option>
                        <option value="perArea">perArea</option>
                        <option value="perAreaM2">perAreaM2</option>
                      </select>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <label>
                        <span className="mb-0.5 block">Price</span>
                        <input
                          aria-label="Price"
                          type="number"
                          className="w-full rounded border border-hairline bg-canvas px-2 py-1"
                          value={selectedItemPricing.unitPrice}
                          disabled={isSelectedItemLayerLocked}
                          onChange={(event) => {
                            const nextValue = Number(event.target.value);

                            if (!Number.isNaN(nextValue)) {
                              state.updateSelectedItemPricing({
                                unitPrice: nextValue,
                              });
                            }
                          }}
                        />
                      </label>
                      <label>
                        <span className="mb-0.5 block">Waste Rate</span>
                        <input
                          aria-label="Waste Rate"
                          type="number"
                          step="0.01"
                          className="w-full rounded border border-hairline bg-canvas px-2 py-1"
                          value={selectedItemPricing.wasteRate}
                          disabled={isSelectedItemLayerLocked}
                          onChange={(event) => {
                            const nextValue = Number(event.target.value);

                            if (!Number.isNaN(nextValue)) {
                              state.updateSelectedItemPricing({
                                wasteRate: nextValue,
                              });
                            }
                          }}
                        />
                      </label>
                    </div>
                    {selectedItemEstimate ? (
                      <div className="rounded border border-hairline bg-canvas/70 px-2 py-1 text-[11px] text-ink-muted-48">
                        <div className="font-medium text-body">Estimate</div>
                        <div className="mt-0.5">
                          Qty:{" "}
                          {formatQuantity(
                            selectedItemPricing.mode,
                            selectedItemEstimate.quantity,
                          )}
                        </div>
                        <div>
                          Cost:{" "}
                          {formatCurrency(
                            selectedItemEstimate.cost,
                            state.projectBudget.currency,
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <div className="rounded border border-hairline bg-canvas/70 px-2 py-1">
                <button
                  type="button"
                  className="flex w-full items-center justify-between text-left text-[11px] font-medium"
                  onClick={() => setIsPositionExpanded((current) => !current)}
                >
                  <span>Position</span>
                  <span>{isPositionExpanded ? "−" : "+"}</span>
                </button>
                {isPositionExpanded ? (
                  <div className="mt-1 space-y-2">
                    <label className="block">
                      <span className="mb-0.5 block">Layer</span>
                      <select
                        className="w-full rounded border border-hairline bg-canvas px-2 py-1"
                        value={selectedItem.layerId}
                        disabled={isSelectedItemLayerLocked}
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
                    <div className="mt-1 space-y-2">
                      <div className="mb-1 text-[11px] font-medium">
                        Rotation
                      </div>
                      <div className="grid grid-cols-[1fr_auto_auto] items-center gap-1">
                        <input
                          aria-label="Rotation angle"
                          type="number"
                          className="min-w-0 rounded border border-hairline bg-canvas/70 px-2 py-1"
                          value={Math.round(
                            itemRotationDeg(selectedItem.points),
                          )}
                          disabled={isSelectedItemLayerLocked}
                          onChange={(event) => {
                            const nextAngle = Number(event.target.value);

                            if (!Number.isNaN(nextAngle)) {
                              state.rotateSelectedPrimitiveTo(nextAngle);
                            }
                          }}
                        />
                        <button
                          type="button"
                          className="whitespace-nowrap rounded border border-hairline bg-canvas/70 px-2 py-1"
                          disabled={isSelectedItemLayerLocked}
                          onClick={() => state.rotateSelectedPrimitiveBy(15)}
                        >
                          +15°
                        </button>
                        <button
                          type="button"
                          className="whitespace-nowrap rounded border border-hairline bg-canvas/70 px-2 py-1"
                          disabled={isSelectedItemLayerLocked}
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
                            className="w-full rounded border border-hairline bg-canvas px-2 py-1"
                            value={Math.round(
                              segmentLength(
                                selectedItem.points[0],
                                selectedItem.points[1],
                              ),
                            )}
                            disabled={isSelectedItemLayerLocked}
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
                            className="w-full rounded border border-hairline bg-canvas px-2 py-1"
                            value={Math.round(
                              segmentLength(
                                selectedItem.points[1],
                                selectedItem.points[2],
                              ),
                            )}
                            disabled={isSelectedItemLayerLocked}
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
                    <div className="text-[11px] font-medium">Vertices</div>
                    {selectedItem.points.map((point, pointIndex) => (
                      <div
                        key={`${selectedItem.id}-point-${pointIndex}`}
                        className="grid grid-cols-2 gap-1"
                      >
                        <input
                          type="number"
                          className="rounded border border-hairline bg-canvas px-2 py-1"
                          value={Math.round(point.xMm)}
                          disabled={isSelectedItemLayerLocked}
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
                          disabled={isSelectedItemLayerLocked}
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
                    {selectedItem.kind === "polyline" ||
                    selectedItem.kind === "polygon" ? (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="rounded border border-hairline bg-canvas px-2 py-1"
                          disabled={isSelectedItemLayerLocked}
                          onClick={() => state.appendSelectedPrimitivePoint()}
                        >
                          + Point
                        </button>
                        <button
                          type="button"
                          className="rounded border border-hairline bg-canvas px-2 py-1"
                          disabled={isSelectedItemLayerLocked}
                          onClick={() => state.removeSelectedPrimitivePoint()}
                        >
                          - Point
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <div className="rounded border border-hairline bg-canvas/70 px-2 py-1">
                <button
                  type="button"
                  className="flex w-full items-center justify-between text-left text-[11px] font-medium"
                  onClick={() => setIsTagExpanded((current) => !current)}
                >
                  <span>Tag</span>
                  <span>{isTagExpanded ? "−" : "+"}</span>
                </button>
                {isTagExpanded ? (
                  <div className="mt-1">
                    <label className="block">
                      <span className="mb-0.5 block">Color</span>
                      <input
                        aria-label="Tag Color"
                        type="color"
                        className="h-8 w-full rounded border border-hairline bg-canvas p-1"
                        value={selectedItemTagColor}
                        disabled={isSelectedItemLayerLocked}
                        onChange={(event) =>
                          state.updateSelectedItemTagColor(event.target.value)
                        }
                      />
                    </label>
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="mt-2 text-[11px] text-ink-muted-48">-</div>
          )}
        </div>
        <div className="pointer-events-auto absolute bottom-2 left-2 z-10 rounded-xl border border-hairline bg-canvas/80 p-2 text-xs shadow-sm backdrop-blur">
          <button
            type="button"
            aria-label="Budget"
            className="rounded border border-hairline bg-canvas/70 px-3 py-1.5 font-medium"
            onClick={() => setIsBudgetModalOpen(true)}
          >
            Budget
          </button>
        </div>
        {isBudgetModalOpen ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/20 p-4">
            <div className="w-full max-w-3xl rounded-lg border border-hairline bg-canvas p-3 shadow-md">
              <div className="mb-3 flex items-center justify-between">
                <div className="font-semibold">Estimation / Budget</div>
                <button
                  type="button"
                  aria-label="Close Budget"
                  className="rounded border border-hairline bg-canvas/70 px-2 py-1"
                  onClick={() => setIsBudgetModalOpen(false)}
                >
                  Close
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="mb-0.5 block">Budget Amount</span>
                  <input
                    aria-label="Budget Amount"
                    type="number"
                    className="w-full rounded border border-hairline bg-canvas/70 px-2 py-1"
                    value={state.projectBudget.amount}
                    onChange={(event) => {
                      const nextAmount = Number(event.target.value);

                      if (!Number.isNaN(nextAmount)) {
                        state.updateProjectBudget({ amount: nextAmount });
                      }
                    }}
                  />
                </label>
                <label className="block">
                  <span className="mb-0.5 block">Currency</span>
                  <input
                    aria-label="Budget Currency"
                    className="w-full rounded border border-hairline bg-canvas/70 px-2 py-1"
                    value={state.projectBudget.currency}
                    onChange={(event) =>
                      state.updateProjectBudget({
                        currency: event.target.value.toUpperCase(),
                      })
                    }
                  />
                </label>
              </div>
              <div className="mt-2 rounded border border-hairline bg-canvas/70 px-2 py-1 text-[11px]">
                <div>
                  Current Estimation:{" "}
                  {formatCurrency(
                    estimateSummary.totalCost,
                    state.projectBudget.currency,
                  )}
                </div>
                <div>
                  Budget:{" "}
                  {formatCurrency(
                    state.projectBudget.amount,
                    state.projectBudget.currency,
                  )}
                </div>
                <div
                  className={overBudget ? "text-red-600" : "text-emerald-700"}
                >
                  {overBudget ? "Over Budget" : "Within Budget"}
                </div>
              </div>
              <div className="mt-3 rounded border border-hairline bg-canvas/70 p-2 text-[11px]">
                <div className="mb-2 font-medium text-body">
                  Estimation Details
                </div>
                <div className="max-h-72 overflow-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-hairline">
                        <th className="px-1 py-1 font-medium">item</th>
                        <th className="px-1 py-1 font-medium">material</th>
                        <th className="px-1 py-1 font-medium">price</th>
                        <th className="px-1 py-1 font-medium">quality</th>
                        <th className="px-1 py-1 font-medium">total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.items.length === 0 ? (
                        <tr>
                          <td
                            className="px-1 py-2 text-ink-muted-48"
                            colSpan={5}
                          >
                            -
                          </td>
                        </tr>
                      ) : (
                        state.items
                          .filter((item) => normalizeItemPricingRule(item.pricing).mode !== "none")
                          .map((item) => {
                          const itemPricing = normalizeItemPricingRule(
                            item.pricing,
                          );
                          const itemEstimate = estimateByItemId.get(item.id);

                          return (
                            <tr
                              key={item.id}
                              className="border-b border-hairline/60"
                            >
                              <td className="px-1 py-1">
                                {item.name ?? item.id}
                              </td>
                              <td className="px-1 py-1">
                                {itemPricing.materialName || "-"}
                              </td>
                              <td className="px-1 py-1">
                                {formatPlainPrice(itemPricing.unitPrice)}
                              </td>
                              <td className="px-1 py-1">
                                {formatEstimateQuality(
                                  itemPricing.mode,
                                  itemEstimate?.quantity ?? 0,
                                )}
                              </td>
                              <td className="px-1 py-1">
                                {formatPlainTotal(itemEstimate?.cost ?? 0)}
                              </td>
                            </tr>
                          );
                          })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ) : null}
        <CanvasEditor
          items={state.items}
          layers={state.layers}
          zoom={zoomLevel}
          onZoomChange={setZoomLevel}
          selectedItemIds={state.selectedItemIds}
          onSelectItem={(itemId) => state.selectSingleItem(itemId)}
          onSelectItems={(itemIds) => state.selectItems(itemIds)}
          onClearSelection={() => state.selectItems([])}
          onMoveSelectedBy={(delta) => {
            const selected = state.items.find((item) => item.id === state.selectedItemIds[0]);
            const selectedLayer = selected
              ? state.layers.find((layer) => layer.id === selected.layerId)
              : null;

            if (selectedLayer?.locked) {
              return;
            }

            state.moveSelectedItemBy(delta);
          }}
          onRotateSelectedBy={(deltaDeg) =>
            state.rotateSelectedPrimitiveBy(deltaDeg)
          }
          onMoveVertex={(vertex, point) => {
            const selected = state.items.find(
              (item) => item.id === vertex.itemId,
            );
            const selectedLayer = selected
              ? state.layers.find((layer) => layer.id === selected.layerId)
              : null;

            if (!selected || selectedLayer?.locked) {
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
