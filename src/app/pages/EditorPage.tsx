import { useRef, useSyncExternalStore } from "react";

import { createEditorStore } from "../store/editorStore";
import { CanvasEditor } from "../../engine/canvas/CanvasEditor";

export function EditorPage() {
  const storeRef = useRef(createEditorStore());
  const store = storeRef.current;
  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState);

  return (
    <section>
      <h2 className="text-lg font-semibold">Editor</h2>

      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        <button
          type="button"
          className="rounded border border-hairline px-2 py-1"
          onClick={() => state.addPrimitive("polyline")}
        >
          Add Line
        </button>
        <button
          type="button"
          className="rounded border border-hairline px-2 py-1"
          onClick={() => state.addPrimitive("rect")}
        >
          Add Rect
        </button>
        <button
          type="button"
          className="rounded border border-hairline px-2 py-1"
          onClick={() => state.addPrimitive("polygon")}
        >
          Add Polygon
        </button>
        <button
          type="button"
          className="rounded border border-hairline px-2 py-1"
          onClick={() => state.deleteSelectedItem()}
        >
          Delete Selected
        </button>
      </div>

      <div className="mt-3 space-y-2 text-sm">
        {state.layers.map((layer) => (
          <div key={layer.id} className="flex items-center gap-2">
            <button
              type="button"
              className="rounded border border-hairline px-2 py-1"
              onClick={() => state.selectLayer(layer.id)}
            >
              {layer.name} ({layer.visible ? "visible" : "hidden"})
            </button>
            <button
              type="button"
              className="rounded border border-hairline px-2 py-1"
              onClick={() => state.toggleLayerVisibility(layer.id)}
            >
              {layer.visible ? `Hide ${layer.name}` : `Show ${layer.name}`}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-2 text-xs text-ink-muted-48">
        <span>items: {state.items.length}</span>
        <span className="ml-3">selected: {state.selectedItemIds[0] ?? "none"}</span>
      </div>

      <CanvasEditor
        items={state.items}
        layers={state.layers}
        selectedItemId={state.selectedItemIds[0] ?? null}
        onSelectItem={(itemId) => state.selectSingleItem(itemId)}
        onMoveSelectedBy={(delta) => state.moveSelectedItemBy(delta)}
      />
    </section>
  );
}
