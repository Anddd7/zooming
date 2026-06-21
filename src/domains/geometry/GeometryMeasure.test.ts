import assert from 'node:assert/strict';
import { test } from 'vitest';

import type { Point, Rect } from './Geometry';
import { polygonAreaMm2, polylineLengthMm, rectAreaMm2 } from './GeometryMeasure';

test('polyline simple segment length', () => {
  const points: Point[] = [
    { xMm: 0, yMm: 0 },
    { xMm: 3, yMm: 4 },
  ];

  const lengthMm = polylineLengthMm(points);

  assert.equal(lengthMm, 5);
});

test('polyline multi-segment length', () => {
  const points: Point[] = [
    { xMm: 0, yMm: 0 },
    { xMm: 3, yMm: 4 },
    { xMm: 6, yMm: 8 },
  ];

  const lengthMm = polylineLengthMm(points);

  assert.equal(lengthMm, 10);
});

test('polygon area rectangle path', () => {
  const points: Point[] = [
    { xMm: 0, yMm: 0 },
    { xMm: 10, yMm: 0 },
    { xMm: 10, yMm: 20 },
    { xMm: 0, yMm: 20 },
  ];

  const areaMm2 = polygonAreaMm2(points);

  assert.equal(areaMm2, 200);
});

test('rect area', () => {
  const rect: Rect = {
    xMm: 100,
    yMm: 200,
    widthMm: 30,
    heightMm: 40,
  };

  const areaMm2 = rectAreaMm2(rect);

  assert.equal(areaMm2, 1200);
});
