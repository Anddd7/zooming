import { describe, expect, it } from 'vitest';

import { createEditorStore } from './editorStore';

describe('createEditorStore', () => {
  it('uses default state values', () => {
    const store = createEditorStore();

    expect(store.getState().selectedLayerId).toBe('layer-default');
    expect(store.getState().selectedItemIds).toEqual([]);
    expect(store.getState().items).toEqual([]);
    expect(store.getState().layers).toHaveLength(1);
    expect(store.getState().layers[0].zIndex).toBe(0);
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

    store.getState().toggleLayerVisibility('layer-default');

    expect(store.getState().layers[0].visible).toBe(false);
  });

  it('addPrimitive creates item in currently selected layer and selects it', () => {
    const store = createEditorStore();

    store.getState().addPrimitive('rect');

    const createdItem = store.getState().items[0];
    expect(createdItem.kind).toBe('rect');
    expect(createdItem.layerId).toBe('layer-default');
    expect(store.getState().selectedItemIds).toEqual([createdItem.id]);
  });

  it('addPrimitive does nothing when selected layer is hidden', () => {
    const store = createEditorStore();
    store.getState().toggleLayerVisibility('layer-default');

    store.getState().addPrimitive('rect');

    expect(store.getState().items).toEqual([]);
  });

  it('addPolygons creates polygon items in selected layer and selects last imported item', () => {
    const store = createEditorStore();

    store.getState().addPolygons([
      {
        name: '卧室A',
        points: [
          { xMm: 100, yMm: 100 },
          { xMm: 300, yMm: 100 },
          { xMm: 300, yMm: 260 },
          { xMm: 100, yMm: 260 },
        ],
      },
      {
        name: '厨房',
        points: [
          { xMm: 320, yMm: 100 },
          { xMm: 520, yMm: 100 },
          { xMm: 520, yMm: 260 },
          { xMm: 320, yMm: 260 },
        ],
      },
    ]);

    const items = store.getState().items;
    expect(items).toHaveLength(2);
    expect(items[0].kind).toBe('polygon');
    expect(items[0].name).toBe('卧室A');
    expect(items[0].layerId).toBe('layer-default');
    expect(items[1].name).toBe('厨房');
    expect(store.getState().selectedItemIds).toEqual([items[1].id]);
  });

  it('addPolygons does nothing when selected layer is hidden', () => {
    const store = createEditorStore();
    store.getState().toggleLayerVisibility('layer-default');

    store.getState().addPolygons([
      {
        name: '过道',
        points: [
          { xMm: 1, yMm: 1 },
          { xMm: 2, yMm: 1 },
          { xMm: 2, yMm: 2 },
        ],
      },
    ]);

    expect(store.getState().items).toEqual([]);
  });

  it('addLayer appends custom layer and selects it', () => {
    const store = createEditorStore();

    store.getState().addLayer('Lighting');

    const addedLayer = store.getState().layers[1];
    expect(addedLayer.name).toBe('Lighting');
    expect(addedLayer.category).toBe('custom');
    expect(addedLayer.zIndex).toBe(1);
    expect(store.getState().selectedLayerId).toBe(addedLayer.id);
  });

  it('addLayer uses unique uuid-like id for each layer even with same name', () => {
    const store = createEditorStore();

    store.getState().addLayer('Layer');
    store.getState().addLayer('Layer');

    const layerIds = store.getState().layers.map((layer) => layer.id);
    const uniqueLayerIds = new Set(layerIds);

    expect(uniqueLayerIds.size).toBe(layerIds.length);
  });

  it('updateSelectedPrimitiveDimensions updates selected rect width and height', () => {
    const store = createEditorStore();

    store.getState().addPrimitive('rect');
    store.getState().updateSelectedPrimitiveDimensions({ widthMm: 200, heightMm: 80 });

    expect(store.getState().items[0].points).toEqual([
      { xMm: 140, yMm: 140 },
      { xMm: 340, yMm: 140 },
      { xMm: 340, yMm: 220 },
      { xMm: 140, yMm: 220 },
    ]);
  });

  it('updateSelectedPrimitivePoint updates selected polygon vertex', () => {
    const store = createEditorStore();

    store.getState().addPrimitive('polygon');
    store.getState().updateSelectedPrimitivePoint(1, { xMm: 300, yMm: 150 });

    expect(store.getState().items[0].points[1]).toEqual({ xMm: 300, yMm: 150 });
  });

  it('updateSelectedPrimitivePoint keeps rect axis-aligned rectangle shape', () => {
    const store = createEditorStore();

    store.getState().addPrimitive('rect');
    store.getState().updateSelectedPrimitivePoint(0, { xMm: 100, yMm: 120 });

    expect(store.getState().items[0].points).toEqual([
      { xMm: 100, yMm: 120 },
      { xMm: 320, yMm: 120 },
      { xMm: 320, yMm: 260 },
      { xMm: 100, yMm: 260 },
    ]);
  });

  it('updateSelectedPrimitiveEdgeLength updates polyline edge length by moving edge end', () => {
    const store = createEditorStore();

    store.getState().addPrimitive('polyline');
    store.getState().updateSelectedPrimitiveEdgeLength(0, 200);

    const points = store.getState().items[0].points;
    const edgeLength = Math.hypot(
      points[1].xMm - points[0].xMm,
      points[1].yMm - points[0].yMm,
    );

    expect(Math.round(edgeLength)).toBe(200);
  });

  it('updateSelectedPrimitiveEdgeLength updates polygon edge length by moving next vertex', () => {
    const store = createEditorStore();

    store.getState().addPrimitive('polygon');
    store.getState().updateSelectedPrimitiveEdgeLength(0, 180);

    const points = store.getState().items[0].points;
    const edgeLength = Math.hypot(
      points[1].xMm - points[0].xMm,
      points[1].yMm - points[0].yMm,
    );

    expect(Math.round(edgeLength)).toBe(180);
  });

  it('moveSelectedPrimitiveEdgeBy moves both edge endpoints together', () => {
    const store = createEditorStore();

    store.getState().addPrimitive('rect');
    store.getState().moveSelectedPrimitiveEdgeBy(
      {
        startPointIndex: 0,
        endPointIndex: 1,
      },
      { xMm: 0, yMm: 20 },
    );

    const points = store.getState().items[0].points;
    expect(points[0]).toEqual({ xMm: 140, yMm: 160 });
    expect(points[1]).toEqual({ xMm: 320, yMm: 160 });
    expect(points[2]).toEqual({ xMm: 320, yMm: 260 });
    expect(points[3]).toEqual({ xMm: 140, yMm: 260 });
  });

  it('copySelectedItem duplicates selected primitive with offset and new id', () => {
    const store = createEditorStore();

    store.getState().addPrimitive('rect');
    const originalId = store.getState().items[0].id;
    store.getState().copySelectedItem();

    expect(store.getState().items).toHaveLength(2);
    expect(store.getState().items[1].id).not.toBe(originalId);
    expect(store.getState().selectedItemIds).toEqual([store.getState().items[1].id]);
    expect(store.getState().items[1].name).toBe('item-2');
    expect(store.getState().items[1].points[0]).toEqual({ xMm: 160, yMm: 160 });
  });

  it('rotateSelectedPrimitiveBy rotates selected primitive around center', () => {
    const store = createEditorStore();

    store.getState().addPrimitive('polyline');
    const before = store.getState().items[0].points[0];

    store.getState().rotateSelectedPrimitiveBy(90);

    const after = store.getState().items[0].points[0];
    expect(after.xMm).not.toBe(before.xMm);
    expect(after.yMm).not.toBe(before.yMm);
  });

  it('rotateSelectedPrimitiveTo rotates selected primitive to target angle', () => {
    const store = createEditorStore();

    store.getState().addPrimitive('rect');
    store.getState().rotateSelectedPrimitiveTo(45);

    const points = store.getState().items[0].points;
    expect(points[0].xMm).not.toBe(140);
    expect(points[0].yMm).not.toBe(140);
  });

  it('deleteSelectedItem removes selected primitive', () => {
    const store = createEditorStore();

    store.getState().addPrimitive('polygon');
    store.getState().deleteSelectedItem();

    expect(store.getState().items).toHaveLength(0);
    expect(store.getState().selectedItemIds).toEqual([]);
  });

  it('deleteSelectedItem removes all selected primitives together', () => {
    const store = createEditorStore();

    store.getState().addPrimitive('rect');
    store.getState().addPrimitive('polygon');
    const ids = store.getState().items.map((item) => item.id);
    store.getState().selectItems(ids);

    store.getState().deleteSelectedItem();

    expect(store.getState().items).toHaveLength(0);
    expect(store.getState().selectedItemIds).toEqual([]);
  });

  it('undo reverts latest mutating action', () => {
    const store = createEditorStore();

    store.getState().addPrimitive('rect');
    expect(store.getState().items).toHaveLength(1);

    store.getState().undo();

    expect(store.getState().items).toHaveLength(0);
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
