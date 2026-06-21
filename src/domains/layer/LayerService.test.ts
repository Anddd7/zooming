import assert from 'node:assert/strict';
import { test } from 'vitest';

import type { Layer } from './Layer';
import { createLayer, toggleLayerLock, toggleLayerVisibility } from './LayerService';

test('createLayer applies default visible/locked/opacity', () => {
  const layer = createLayer({
    id: 'layer-001',
    name: 'Floor Plan',
    category: 'floorplan',
  });

  assert.equal(layer.visible, true);
  assert.equal(layer.locked, false);
  assert.equal(layer.opacity, 1);
});

test('toggleLayerVisibility flips visible only', () => {
  const layer: Layer = {
    id: 'layer-002',
    name: 'Furniture',
    category: 'furniture',
    visible: true,
    locked: false,
    opacity: 0.75,
  };

  const toggled = toggleLayerVisibility(layer);

  assert.notEqual(toggled, layer);
  assert.equal(toggled.visible, false);
  assert.equal(toggled.locked, layer.locked);
  assert.equal(toggled.opacity, layer.opacity);
  assert.equal(layer.visible, true);
});

test('toggleLayerLock flips locked only', () => {
  const layer: Layer = {
    id: 'layer-003',
    name: 'Base Build',
    category: 'baseBuild',
    visible: true,
    locked: false,
    opacity: 0.6,
  };

  const toggled = toggleLayerLock(layer);

  assert.notEqual(toggled, layer);
  assert.equal(toggled.locked, true);
  assert.equal(toggled.visible, layer.visible);
  assert.equal(toggled.opacity, layer.opacity);
  assert.equal(layer.locked, false);
});
