import { useRef, useState, useSyncExternalStore } from "react";
import {
  BeakerIcon,
  EyeIcon,
  EyeSlashIcon,
  MinusCircleIcon,
  PlusCircleIcon,
  RectangleGroupIcon,
  SlashIcon,
  TrashIcon,
} from "@heroicons/react/24/solid";

import { createEditorStore } from "../store/editorStore";
import { CanvasEditor } from "../../engine/canvas/CanvasEditor";

export function EditorPage() {
  const storeRef = useRef(createEditorStore());
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
  const selectedLayer = state.layers.find(
    (layer) => layer.id === state.selectedLayerId,
  );
  const [zoomLevel, setZoomLevel] = useState(1);

  const iconButtonClass =
    "grid h-8 w-8 place-items-center rounded border border-hairline bg-canvas/80 text-body transition-colors hover:bg-canvas";

  const quickZoomLevels = [1, 0.8, 0.5, 0.1];

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden px-4 pt-3">
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div className="pointer-events-auto absolute left-1/2 top-2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-hairline bg-canvas/70 px-3 py-2 text-sm shadow-sm backdrop-blur">
          <button
            type="button"
            className={iconButtonClass}
            aria-label="Add Line"
            onClick={() => state.addPrimitive("polyline")}
          >
            <SlashIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={iconButtonClass}
            aria-label="Add Rect"
            onClick={() => state.addPrimitive("rect")}
          >
            <RectangleGroupIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={iconButtonClass}
            aria-label="Add Polygon"
            onClick={() => state.addPrimitive("polygon")}
          >
            <BeakerIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={iconButtonClass}
            aria-label="Delete Selected"
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
          {selectedLayer ? (
            <div className="mt-1 text-[11px] text-ink-muted-48">
              editing layer: {selectedLayer.name}
            </div>
          ) : null}
          {selectedItem ? (
            <div className="mt-2 space-y-2">
              <div className="text-[11px] text-ink-muted-48">
                {selectedItem.kind} · {selectedItem.id}
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
              {selectedItem.kind === "rect" &&
              selectedItem.points.length === 4 ? (
                <div className="grid grid-cols-2 gap-2">
                  <label>
                    <span className="mb-0.5 block">W (mm)</span>
                    <input
                      type="number"
                      className="w-full rounded border border-hairline bg-canvas/70 px-2 py-1"
                      value={Math.round(
                        selectedItem.points[1].xMm - selectedItem.points[0].xMm,
                      )}
                      onChange={(event) => {
                        const nextWidth = Number(event.target.value);
                        const currentHeight =
                          selectedItem.points[2].yMm -
                          selectedItem.points[1].yMm;

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
                      value={Math.round(
                        selectedItem.points[2].yMm - selectedItem.points[1].yMm,
                      )}
                      onChange={(event) => {
                        const nextHeight = Number(event.target.value);
                        const currentWidth =
                          selectedItem.points[1].xMm -
                          selectedItem.points[0].xMm;

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
              <div className="space-y-1">
                {selectedItem.points.map((point, pointIndex) => (
                  <div
                    key={`${selectedItem.id}-point-${pointIndex}`}
                    className="grid grid-cols-2 gap-1"
                  >
                    <input
                      type="number"
                      className="rounded border border-hairline bg-canvas/70 px-2 py-1"
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
                      className="rounded border border-hairline bg-canvas/70 px-2 py-1"
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
            <div className="mt-2 text-[11px] text-ink-muted-48">
              Select shape to edit dimensions/points
            </div>
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
        />
      </div>
    </section>
  );
}
