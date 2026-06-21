import { describe, expect, it } from 'vitest';

import { createViewportTransform } from './ViewportTransform';

describe('ViewportTransform', () => {
  it('maps world point to screen point with zoom scale and pan offset', () => {
    const viewport = createViewportTransform({
      pan: { offsetX: 100, offsetY: 40 },
      zoom: { scale: 2 },
    });

    const screenPoint = viewport.worldToScreen({ x: 10, y: 5 });

    expect(screenPoint).toEqual({ x: 120, y: 50 });
  });

  it('maps screen point back to original world point', () => {
    const viewport = createViewportTransform({
      pan: { offsetX: -30, offsetY: 12 },
      zoom: { scale: 1.5 },
    });
    const originalWorldPoint = { x: 80, y: -20 };

    const screenPoint = viewport.worldToScreen(originalWorldPoint);
    const worldPoint = viewport.screenToWorld(screenPoint);

    expect(worldPoint).toEqual(originalWorldPoint);
  });
});
