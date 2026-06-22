import type { Point, Rect } from './Geometry';

export function polylineLengthMm(points: Point[]): number {
  let lengthMm = 0;

  for (let i = 1; i < points.length; i += 1) {
    const previous = points[i - 1];
    const current = points[i];

    const deltaX = current.xMm - previous.xMm;
    const deltaY = current.yMm - previous.yMm;

    lengthMm += Math.hypot(deltaX, deltaY);
  }

  return lengthMm;
}

export function polygonAreaMm2(points: Point[]): number {
  if (points.length < 3) {
    return 0;
  }

  let twiceSignedArea = 0;

  for (let i = 0; i < points.length; i += 1) {
    const current = points[i];
    const next = points[(i + 1) % points.length];

    twiceSignedArea += current.xMm * next.yMm - next.xMm * current.yMm;
  }

  return Math.abs(twiceSignedArea) / 2;
}

export function polygonPerimeterMm(points: Point[]): number {
  if (points.length < 2) {
    return 0;
  }

  return polylineLengthMm([...points, points[0]]);
}

export function rectAreaMm2(rect: Rect): number {
  return rect.widthMm * rect.heightMm;
}
