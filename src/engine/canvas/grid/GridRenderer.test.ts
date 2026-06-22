import { describe, expect, it, vi } from "vitest";

import { drawGrid } from "./GridRenderer";

function createMockContext() {
  return {
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    set strokeStyle(_: string) {},
    set lineWidth(_: number) {},
  } as unknown as CanvasRenderingContext2D;
}

describe("drawGrid", () => {
  it("draws vertical and horizontal grid lines in canvas bounds", () => {
    const ctx = createMockContext();

    drawGrid(ctx, {
      width: 400,
      height: 200,
      pan: { offsetX: 20, offsetY: 10 },
      scale: 1,
      spacingMm: 500,
    });

    expect(ctx.beginPath).toHaveBeenCalledTimes(1);
    expect(ctx.moveTo).toHaveBeenCalled();
    expect(ctx.lineTo).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalledTimes(1);
  });
});
