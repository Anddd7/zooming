import type { PrimitiveItem } from "../../../domains/drawing/PrimitiveItem";
import type { Point } from "../../../domains/geometry/Geometry";
import type { Layer } from "../../../domains/layer/Layer";

type ScreenPoint = {
  x: number;
  y: number;
};

type DrawOptions = {
  worldToScreen: (point: Point) => ScreenPoint;
  selectedItemId: string | null;
};

function isLayerVisible(layerId: string, layers: Layer[]) {
  const layer = layers.find((candidate) => candidate.id === layerId);
  return layer?.visible ?? false;
}

function isPointInPolygon(point: Point, polygon: Point[]) {
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const xi = polygon[i].xMm;
    const yi = polygon[i].yMm;
    const xj = polygon[j].xMm;
    const yj = polygon[j].yMm;

    const intersects =
      yi > point.yMm !== yj > point.yMm &&
      point.xMm < ((xj - xi) * (point.yMm - yi)) / (yj - yi) + xi;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

export function drawPrimitives(
  ctx: CanvasRenderingContext2D,
  items: PrimitiveItem[],
  layers: Layer[],
  options: DrawOptions,
) {
  items.forEach((item) => {
    if (!isLayerVisible(item.layerId, layers) || item.points.length === 0) {
      return;
    }

    const [firstPoint, ...restPoints] = item.points;
    const firstScreenPoint = options.worldToScreen(firstPoint);

    ctx.beginPath();
    ctx.moveTo(firstScreenPoint.x, firstScreenPoint.y);

    restPoints.forEach((point) => {
      const screenPoint = options.worldToScreen(point);
      ctx.lineTo(screenPoint.x, screenPoint.y);
    });

    if (item.kind === "rect" || item.kind === "polygon") {
      ctx.closePath();
    }

    const isSelected = options.selectedItemId === item.id;
    ctx.strokeStyle = isSelected ? "#2563eb" : "#334155";
    ctx.lineWidth = isSelected ? 2 : 1;
    ctx.stroke();

    if (item.kind === "rect" || item.kind === "polygon") {
      ctx.fillStyle = "rgba(71, 85, 105, 0.1)";
      ctx.fill();
    }
  });
}

export function hitTestPrimitive(
  items: PrimitiveItem[],
  layers: Layer[],
  worldPoint: Point,
): string | null {
  for (let i = items.length - 1; i >= 0; i -= 1) {
    const item = items[i];

    if (!isLayerVisible(item.layerId, layers)) {
      continue;
    }

    if ((item.kind === "rect" || item.kind === "polygon") && isPointInPolygon(worldPoint, item.points)) {
      return item.id;
    }
  }

  return null;
}

export function movePrimitive(item: PrimitiveItem, delta: Point): PrimitiveItem {
  return {
    ...item,
    points: item.points.map((point) => ({
      xMm: point.xMm + delta.xMm,
      yMm: point.yMm + delta.yMm,
    })),
  };
}
