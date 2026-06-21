import { createStore } from 'zustand/vanilla';

type EditorState = {
  selectedLayerId: string | null;
  selectedItemIds: string[];
};

type EditorActions = {
  selectLayer: (layerId: string | null) => void;
  selectSingleItem: (itemId: string) => void;
  clearSelection: () => void;
};

export type EditorStoreState = EditorState & EditorActions;

type EditorStoreInitialState = Partial<EditorState>;

const defaultEditorState: EditorState = {
  selectedLayerId: null,
  selectedItemIds: [],
};

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
    clearSelection: () => {
      set({ selectedLayerId: null, selectedItemIds: [] });
    },
  }));
}
