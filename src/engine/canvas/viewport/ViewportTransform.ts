export type Point = {
  x: number;
  y: number;
};

export type ViewportTransformParams = {
  pan: {
    offsetX: number;
    offsetY: number;
  };
  zoom: {
    scale: number;
  };
};

export type ViewportTransform = {
  worldToScreen: (point: Point) => Point;
  screenToWorld: (point: Point) => Point;
};

export function createViewportTransform(
  params: ViewportTransformParams,
): ViewportTransform {
  const { offsetX, offsetY } = params.pan;
  const { scale } = params.zoom;

  return {
    worldToScreen(point) {
      return {
        x: point.x * scale + offsetX,
        y: point.y * scale + offsetY,
      };
    },
    screenToWorld(point) {
      return {
        x: (point.x - offsetX) / scale,
        y: (point.y - offsetY) / scale,
      };
    },
  };
}
