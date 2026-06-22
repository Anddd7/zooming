import type { PrimitiveItem } from "../../../domains/drawing/PrimitiveItem";
import type { Point } from "../../../domains/geometry/Geometry";
import type { Layer } from "../../../domains/layer/Layer";

type ScreenPoint = {
  x: number;
  y: number;
};

type DrawOptions = {
  worldToScreen: (point: Point) => ScreenPoint;
  selectedItemIds: string[];
};

const POLYLINE_HIT_TOLERANCE_MM = 8;
const SHAPE_EDGE_HIT_TOLERANCE_MM = 4;

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

function squaredDistance(a: Point, b: Point) {
  const dx = a.xMm - b.xMm;
  const dy = a.yMm - b.yMm;
  return dx * dx + dy * dy;
}

function isPointNearSegment(point: Point, start: Point, end: Point, toleranceMm: number) {
  const segmentDx = end.xMm - start.xMm;
  const segmentDy = end.yMm - start.yMm;
  const segmentLengthSquared = segmentDx * segmentDx + segmentDy * segmentDy;

  if (segmentLengthSquared === 0) {
    return squaredDistance(point, start) <= toleranceMm * toleranceMm;
  }

  const t =
    ((point.xMm - start.xMm) * segmentDx + (point.yMm - start.yMm) * segmentDy) /
    segmentLengthSquared;
  const clampedT = Math.max(0, Math.min(1, t));
  const projection = {
    xMm: start.xMm + clampedT * segmentDx,
    yMm: start.yMm + clampedT * segmentDy,
  };

  return squaredDistance(point, projection) <= toleranceMm * toleranceMm;
}

function isPointNearPolyline(point: Point, polyline: Point[], toleranceMm: number) {
  for (let i = 0; i < polyline.length - 1; i += 1) {
    if (isPointNearSegment(point, polyline[i], polyline[i + 1], toleranceMm)) {
      return true;
    }
  }

  return false;
}

export function drawPrimitives(
  ctx: CanvasRenderingContext2D,
  items: PrimitiveItem[],
  layers: Layer[],
  options: DrawOptions,
) {
  const selectedItemIdSet = new Set(options.selectedItemIds);

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

    const isSelected = selectedItemIdSet.has(item.id);
    ctx.strokeStyle = isSelected ? "#2563eb" : "#334155";
    ctx.lineWidth = isSelected ? 2 : 1;
    ctx.stroke();

    if (item.kind === "rect" || item.kind === "polygon") {
      ctx.fillStyle = "rgba(71, 85, 105, 0.1)";
      ctx.fill();
    }
  });
}

function getItemBounds(points: Point[]) {
  const [firstPoint, ...restPoints] = points;

  if (!firstPoint) {
    return null;
  }

  let minX = firstPoint.xMm;
  let maxX = firstPoint.xMm;
  let minY = firstPoint.yMm;
  let maxY = firstPoint.yMm;

  restPoints.forEach((point) => {
    minX = Math.min(minX, point.xMm);
    maxX = Math.max(maxX, point.xMm);
    minY = Math.min(minY, point.yMm);
    maxY = Math.max(maxY, point.yMm);
  });

  return {
    minX,
    minY,
    maxX,
    maxY,
  };
}

function isBoundsIntersecting(
  a: { minX: number; minY: number; maxX: number; maxY: number },
  b: { minX: number; minY: number; maxX: number; maxY: number },
) {
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY;
}

export function hitTestPrimitivesInWorldRect(
  items: PrimitiveItem[],
  layers: Layer[],
  startWorldPoint: Point,
  endWorldPoint: Point,
): string[] {
  const selectionBounds = {
    minX: Math.min(startWorldPoint.xMm, endWorldPoint.xMm),
    minY: Math.min(startWorldPoint.yMm, endWorldPoint.yMm),
    maxX: Math.max(startWorldPoint.xMm, endWorldPoint.xMm),
    maxY: Math.max(startWorldPoint.yMm, endWorldPoint.yMm),
  };

  return items
    .filter((item) => isLayerVisible(item.layerId, layers))
    .filter((item) => {
      const itemBounds = getItemBounds(item.points);

      if (!itemBounds) {
        return false;
      }

      return isBoundsIntersecting(itemBounds, selectionBounds);
    })
    .map((item) => item.id);
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

    if (item.kind === "polyline") {
      if (isPointNearPolyline(worldPoint, item.points, POLYLINE_HIT_TOLERANCE_MM)) {
        return item.id;
      }
      continue;
    }

    if (item.kind === "rect" || item.kind === "polygon") {
      if (isPointInPolygon(worldPoint, item.points)) {
        return item.id;
      }

      const closedPolyline = [...item.points, item.points[0]];
      if (isPointNearPolyline(worldPoint, closedPolyline, SHAPE_EDGE_HIT_TOLERANCE_MM)) {
        return item.id;
      }
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
