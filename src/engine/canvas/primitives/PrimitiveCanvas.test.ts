import { describe, expect, it, vi } from "vitest";

import type { PrimitiveItem } from "../../../domains/drawing/PrimitiveItem";
import type { Layer } from "../../../domains/layer/Layer";
import {
  drawPrimitives,
  hitTestPrimitive,
  hitTestPrimitivesInWorldRect,
  movePrimitive,
} from "./PrimitiveCanvas";

function createMockContext() {
  return {
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    set strokeStyle(_: string) {},
    set lineWidth(_: number) {},
    set fillStyle(_: string) {},
  } as unknown as CanvasRenderingContext2D;
}

const visibleLayer: Layer = {
  id: "layer-floorplan",
  name: "Floor Plan",
  category: "floorplan",
  visible: true,
  locked: false,
  opacity: 1,
};

const hiddenLayer: Layer = {
  ...visibleLayer,
  id: "layer-hidden",
  visible: false,
};

describe("drawPrimitives", () => {
  it("draws only primitives in visible layers", () => {
    const ctx = createMockContext();
    const items: PrimitiveItem[] = [
      {
        id: "item-1",
        kind: "polyline",
        layerId: visibleLayer.id,
        points: [
          { xMm: 0, yMm: 0 },
          { xMm: 100, yMm: 0 },
        ],
      },
      {
        id: "item-2",
        kind: "rect",
        layerId: hiddenLayer.id,
        points: [
          { xMm: 0, yMm: 0 },
          { xMm: 100, yMm: 0 },
          { xMm: 100, yMm: 100 },
          { xMm: 0, yMm: 100 },
        ],
      },
    ];

    drawPrimitives(ctx, items, [visibleLayer, hiddenLayer], {
      worldToScreen: (point) => ({ x: point.xMm, y: point.yMm }),
      selectedItemIds: [],
    });

    expect(ctx.stroke).toHaveBeenCalledTimes(1);
  });
});

describe("hitTestPrimitive", () => {
  it("returns primitive id when click is inside rect", () => {
    const items: PrimitiveItem[] = [
      {
        id: "rect-1",
        kind: "rect",
        layerId: visibleLayer.id,
        points: [
          { xMm: 100, yMm: 100 },
          { xMm: 300, yMm: 100 },
          { xMm: 300, yMm: 240 },
          { xMm: 100, yMm: 240 },
        ],
      },
    ];

    const hitId = hitTestPrimitive(items, [visibleLayer], { xMm: 120, yMm: 120 });

    expect(hitId).toBe("rect-1");
  });

  it("returns primitive id when click is on rect boundary", () => {
    const items: PrimitiveItem[] = [
      {
        id: "rect-2",
        kind: "rect",
        layerId: visibleLayer.id,
        points: [
          { xMm: 100, yMm: 100 },
          { xMm: 300, yMm: 100 },
          { xMm: 300, yMm: 240 },
          { xMm: 100, yMm: 240 },
        ],
      },
    ];

    const hitId = hitTestPrimitive(items, [visibleLayer], { xMm: 100, yMm: 160 });

    expect(hitId).toBe("rect-2");
  });

  it("returns polyline id when click is near line segment", () => {
    const items: PrimitiveItem[] = [
      {
        id: "line-1",
        kind: "polyline",
        layerId: visibleLayer.id,
        points: [
          { xMm: 100, yMm: 100 },
          { xMm: 300, yMm: 100 },
        ],
      },
    ];

    const hitId = hitTestPrimitive(items, [visibleLayer], { xMm: 220, yMm: 104 });

    expect(hitId).toBe("line-1");
  });

  it("returns primitive id when click is near polygon edge", () => {
    const items: PrimitiveItem[] = [
      {
        id: "poly-1",
        kind: "polygon",
        layerId: visibleLayer.id,
        points: [
          { xMm: 100, yMm: 100 },
          { xMm: 240, yMm: 100 },
          { xMm: 220, yMm: 200 },
        ],
      },
    ];

    const hitId = hitTestPrimitive(items, [visibleLayer], { xMm: 170, yMm: 103 });

    expect(hitId).toBe("poly-1");
  });

  it("returns null when click is far from polyline", () => {
    const items: PrimitiveItem[] = [
      {
        id: "line-2",
        kind: "polyline",
        layerId: visibleLayer.id,
        points: [
          { xMm: 100, yMm: 100 },
          { xMm: 300, yMm: 100 },
        ],
      },
    ];

    const hitId = hitTestPrimitive(items, [visibleLayer], { xMm: 220, yMm: 130 });

    expect(hitId).toBeNull();
  });
});

describe("movePrimitive", () => {
  it("moves all points by delta", () => {
    const item: PrimitiveItem = {
      id: "poly-1",
      kind: "polygon",
      layerId: visibleLayer.id,
      points: [
        { xMm: 10, yMm: 20 },
        { xMm: 40, yMm: 20 },
        { xMm: 30, yMm: 50 },
      ],
    };

    const moved = movePrimitive(item, { xMm: 5, yMm: -10 });

    expect(moved.points).toEqual([
      { xMm: 15, yMm: 10 },
      { xMm: 45, yMm: 10 },
      { xMm: 35, yMm: 40 },
    ]);
  });
});

describe("hitTestPrimitivesInWorldRect", () => {
  it("returns item ids intersecting selection bounds", () => {
    const items: PrimitiveItem[] = [
      {
        id: "rect-1",
        kind: "rect",
        layerId: visibleLayer.id,
        points: [
          { xMm: 100, yMm: 100 },
          { xMm: 200, yMm: 100 },
          { xMm: 200, yMm: 200 },
          { xMm: 100, yMm: 200 },
        ],
      },
      {
        id: "rect-2",
        kind: "rect",
        layerId: visibleLayer.id,
        points: [
          { xMm: 400, yMm: 400 },
          { xMm: 500, yMm: 400 },
          { xMm: 500, yMm: 500 },
          { xMm: 400, yMm: 500 },
        ],
      },
    ];

    const selectedIds = hitTestPrimitivesInWorldRect(
      items,
      [visibleLayer],
      { xMm: 50, yMm: 50 },
      { xMm: 250, yMm: 260 },
    );

    expect(selectedIds).toEqual(["rect-1"]);
  });
});
