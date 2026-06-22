import assert from "node:assert/strict";
import { test } from "vitest";

import type { PrimitiveItem } from "../drawing/PrimitiveItem";
import { computeItemEstimate, measurePrimitiveItem, summarizeEstimate } from "./EstimateService";

test("measurePrimitiveItem computes polygon perimeter and area", () => {
  const item: PrimitiveItem = {
    id: "item-1",
    kind: "rect",
    layerId: "layer-a",
    points: [
      { xMm: 0, yMm: 0 },
      { xMm: 2000, yMm: 0 },
      { xMm: 2000, yMm: 1000 },
      { xMm: 0, yMm: 1000 },
    ],
    pricing: {
      mode: "perArea",
      unitPrice: 0,
      wasteRate: 0,
      materialName: "Tile",
    },
  };

  const measurement = measurePrimitiveItem(item);

  assert.equal(measurement.lengthMm, 6000);
  assert.equal(measurement.areaMm2, 2_000_000);
});

test("computeItemEstimate handles fixed mode", () => {
  const item: PrimitiveItem = {
    id: "item-fixed",
    kind: "polyline",
    layerId: "layer-a",
    points: [
      { xMm: 0, yMm: 0 },
      { xMm: 1000, yMm: 0 },
    ],
    pricing: {
      mode: "fixed",
      unitPrice: 88,
      wasteRate: 0.5,
      materialName: "Baseboard",
    },
  };

  const estimate = computeItemEstimate(item);

  assert.equal(estimate.quantity, 1);
  assert.equal(estimate.cost, 88);
});

test("computeItemEstimate handles perLength with waste", () => {
  const item: PrimitiveItem = {
    id: "item-length",
    kind: "polyline",
    layerId: "layer-a",
    points: [
      { xMm: 0, yMm: 0 },
      { xMm: 3000, yMm: 0 },
    ],
    pricing: {
      mode: "perLength",
      unitPrice: 0.2,
      wasteRate: 0.1,
      materialName: "Skirting",
    },
  };

  const estimate = computeItemEstimate(item);

  assert.ok(Math.abs(estimate.quantity - 3300) < 1e-6);
  assert.ok(Math.abs(estimate.cost - 660) < 1e-6);
});

test("computeItemEstimate handles perAreaM2", () => {
  const item: PrimitiveItem = {
    id: "item-area-m2",
    kind: "rect",
    layerId: "layer-a",
    points: [
      { xMm: 0, yMm: 0 },
      { xMm: 2000, yMm: 0 },
      { xMm: 2000, yMm: 1000 },
      { xMm: 0, yMm: 1000 },
    ],
    pricing: {
      mode: "perAreaM2",
      unitPrice: 120,
      wasteRate: 0,
      materialName: "Tile",
    },
  };

  const estimate = computeItemEstimate(item);

  assert.ok(Math.abs(estimate.quantity - 2) < 1e-6);
  assert.ok(Math.abs(estimate.cost - 240) < 1e-6);
});

test("computeItemEstimate handles none mode", () => {
  const item: PrimitiveItem = {
    id: "item-none",
    kind: "rect",
    layerId: "layer-a",
    points: [
      { xMm: 0, yMm: 0 },
      { xMm: 1000, yMm: 0 },
      { xMm: 1000, yMm: 1000 },
      { xMm: 0, yMm: 1000 },
    ],
    pricing: {
      mode: "none",
      unitPrice: 999,
      wasteRate: 0.2,
      materialName: "Ignore",
    },
  };

  const estimate = computeItemEstimate(item);

  assert.equal(estimate.quantity, 0);
  assert.equal(estimate.cost, 0);
});

test("summarizeEstimate aggregates by layer and total", () => {
  const items: PrimitiveItem[] = [
    {
      id: "item-1",
      kind: "polyline",
      layerId: "layer-a",
      points: [
        { xMm: 0, yMm: 0 },
        { xMm: 1000, yMm: 0 },
      ],
      pricing: {
        mode: "perLength",
        unitPrice: 0.2,
        wasteRate: 0,
        materialName: "Cable",
      },
    },
    {
      id: "item-2",
      kind: "rect",
      layerId: "layer-b",
      points: [
        { xMm: 0, yMm: 0 },
        { xMm: 1000, yMm: 0 },
        { xMm: 1000, yMm: 1000 },
        { xMm: 0, yMm: 1000 },
      ],
      pricing: {
        mode: "perArea",
        unitPrice: 0.001,
        wasteRate: 0,
        materialName: "Paint",
      },
    },
  ];

  const summary = summarizeEstimate(items);

  assert.equal(summary.itemEstimates.length, 2);
  assert.equal(summary.layerSummaries.length, 2);
  assert.equal(summary.totalCost, 1200);
  assert.deepEqual(summary.layerSummaries, [
    { layerId: "layer-a", totalCost: 200 },
    { layerId: "layer-b", totalCost: 1000 },
  ]);
});
