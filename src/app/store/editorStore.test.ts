import { describe, expect, it } from 'vitest';

import { createEditorStore } from './editorStore';

describe('createEditorStore', () => {
  it('uses default state values', () => {
    const store = createEditorStore();

    expect(store.getState().selectedLayerId).toBeNull();
    expect(store.getState().selectedItemIds).toEqual([]);
  });

  it('selectLayer sets layer id', () => {
    const store = createEditorStore();

    store.getState().selectLayer('layer-1');

    expect(store.getState().selectedLayerId).toBe('layer-1');
  });

  it('selectSingleItem replaces selection with one id', () => {
    const store = createEditorStore({ selectedItemIds: ['item-1', 'item-2'] });

    store.getState().selectSingleItem('item-3');

    expect(store.getState().selectedItemIds).toEqual(['item-3']);
  });

  it('clearSelection clears item ids and layer id', () => {
    const store = createEditorStore({
      selectedLayerId: 'layer-1',
      selectedItemIds: ['item-1'],
    });

    store.getState().clearSelection();

    expect(store.getState().selectedLayerId).toBeNull();
    expect(store.getState().selectedItemIds).toEqual([]);
  });
});
