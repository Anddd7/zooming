import { useRef, useSyncExternalStore } from "react";

import { createEditorStore } from "../store/editorStore";
import { CanvasEditor } from "../../engine/canvas/CanvasEditor";

export function EditorPage() {
  const storeRef = useRef(createEditorStore());
  const store = storeRef.current;
  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState);
  const floorPlanLayer = state.layers.find((layer) => layer.id === "layer-floorplan");
  const furnitureLayer = state.layers.find((layer) => layer.id === "layer-furniture");

  const layerToggleButtonClass =
    "rounded border px-3 py-1.5 text-xs font-medium transition-colors";

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden px-4 pt-3">
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div className="pointer-events-auto absolute left-1/2 top-2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-hairline bg-canvas/70 px-3 py-2 text-sm shadow-sm backdrop-blur">
          <button
            type="button"
            className="rounded border border-hairline bg-canvas/80 px-2 py-1"
            onClick={() => state.addPrimitive("polyline")}
          >
            Add Line
          </button>
          <button
            type="button"
            className="rounded border border-hairline bg-canvas/80 px-2 py-1"
            onClick={() => state.addPrimitive("rect")}
          >
            Add Rect
          </button>
          <button
            type="button"
            className="rounded border border-hairline bg-canvas/80 px-2 py-1"
            onClick={() => state.addPrimitive("polygon")}
          >
            Add Polygon
          </button>
          <button
            type="button"
            className="rounded border border-hairline bg-canvas/80 px-2 py-1"
            onClick={() => state.deleteSelectedItem()}
          >
            Delete Selected
          </button>
          <button
            type="button"
            aria-pressed={floorPlanLayer?.visible ?? false}
            className={`${layerToggleButtonClass} ${
              floorPlanLayer?.visible
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-hairline bg-canvas/80 text-body"
            }`}
            onClick={() => floorPlanLayer && state.toggleLayerVisibility(floorPlanLayer.id)}
          >
            Floor Plan
          </button>
          <button
            type="button"
            aria-pressed={furnitureLayer?.visible ?? false}
            className={`${layerToggleButtonClass} ${
              furnitureLayer?.visible
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-hairline bg-canvas/80 text-body"
            }`}
            onClick={() => furnitureLayer && state.toggleLayerVisibility(furnitureLayer.id)}
          >
            Furniture
          </button>
        </div>
        <CanvasEditor
          items={state.items}
          layers={state.layers}
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
