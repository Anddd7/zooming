import { describe, expect, it } from 'vitest';

import { createEditorStore } from './editorStore';

describe('createEditorStore', () => {
  it('uses default state values', () => {
    const store = createEditorStore();

    expect(store.getState().selectedLayerId).toBe('layer-floorplan');
    expect(store.getState().selectedItemIds).toEqual([]);
    expect(store.getState().items).toEqual([]);
    expect(store.getState().layers).toHaveLength(2);
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

  it('selectItems sets all selected ids', () => {
    const store = createEditorStore();

    store.getState().selectItems(['item-1', 'item-2']);

    expect(store.getState().selectedItemIds).toEqual(['item-1', 'item-2']);
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

  it('toggleLayerVisibility flips a layer visible flag', () => {
    const store = createEditorStore();

    store.getState().toggleLayerVisibility('layer-floorplan');

    expect(store.getState().layers[0].visible).toBe(false);
  });

  it('addPrimitive creates item in currently selected layer and selects it', () => {
    const store = createEditorStore();

    store.getState().addPrimitive('rect');

    const createdItem = store.getState().items[0];
    expect(createdItem.kind).toBe('rect');
    expect(createdItem.layerId).toBe('layer-floorplan');
    expect(store.getState().selectedItemIds).toEqual([createdItem.id]);
  });

  it('deleteSelectedItem removes selected primitive', () => {
    const store = createEditorStore();

    store.getState().addPrimitive('polygon');
    store.getState().deleteSelectedItem();

    expect(store.getState().items).toHaveLength(0);
    expect(store.getState().selectedItemIds).toEqual([]);
  });

  it('moveSelectedItemBy moves selected primitive points', () => {
    const store = createEditorStore();

    store.getState().addPrimitive('rect');
    const beforeMovePoint = store.getState().items[0].points[0];

    store.getState().moveSelectedItemBy({ xMm: 10, yMm: -20 });

    const afterMovePoint = store.getState().items[0].points[0];
    expect(afterMovePoint.xMm).toBe(beforeMovePoint.xMm + 10);
    expect(afterMovePoint.yMm).toBe(beforeMovePoint.yMm - 20);
  });
});
