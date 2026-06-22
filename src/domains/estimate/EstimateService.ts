import type { PrimitiveItem } from "../drawing/PrimitiveItem";
import { normalizeItemPricingRule } from "../drawing/PrimitiveItem";
import { polygonAreaMm2, polygonPerimeterMm, polylineLengthMm } from "../geometry/GeometryMeasure";

export type ItemMeasurement = {
  lengthMm: number;
  areaMm2: number;
};

export type ItemEstimate = {
  itemId: string;
  layerId: string;
  measurement: ItemMeasurement;
  quantity: number;
  cost: number;
};

export type LayerEstimateSummary = {
  layerId: string;
  totalCost: number;
};

export type EstimateSummary = {
  itemEstimates: ItemEstimate[];
  layerSummaries: LayerEstimateSummary[];
  totalCost: number;
};

export function measurePrimitiveItem(item: PrimitiveItem): ItemMeasurement {
  const areaMm2 = item.kind === "polyline" ? 0 : polygonAreaMm2(item.points);
  const lengthMm =
    item.kind === "polyline" ? polylineLengthMm(item.points) : polygonPerimeterMm(item.points);

  return {
    lengthMm,
    areaMm2,
  };
}

export function computeItemEstimate(item: PrimitiveItem): ItemEstimate {
  const pricing = normalizeItemPricingRule(item.pricing);
  const measurement = measurePrimitiveItem(item);

  const wasteRate = Math.max(0, pricing.wasteRate);
  const wasteFactor = 1 + wasteRate;

  if (pricing.mode === "none") {
    return {
      itemId: item.id,
      layerId: item.layerId,
      measurement,
      quantity: 0,
      cost: 0,
    };
  }

  if (pricing.mode === "fixed") {
    return {
      itemId: item.id,
      layerId: item.layerId,
      measurement,
      quantity: 1,
      cost: Math.max(0, pricing.unitPrice),
    };
  }

  const baseQuantity =
    pricing.mode === "perLength"
      ? measurement.lengthMm
      : pricing.mode === "perArea"
        ? measurement.areaMm2
        : pricing.mode === "perAreaM2"
          ? measurement.areaMm2 / 1_000_000
        : measurement.areaMm2;
  const quantity = baseQuantity * wasteFactor;
  const cost = quantity * Math.max(0, pricing.unitPrice);

  return {
    itemId: item.id,
    layerId: item.layerId,
    measurement,
    quantity,
    cost,
  };
}

export function summarizeEstimate(items: PrimitiveItem[]): EstimateSummary {
  const itemEstimates = items.map(computeItemEstimate);
  const layerCostMap = new Map<string, number>();

  itemEstimates.forEach((itemEstimate) => {
    layerCostMap.set(
      itemEstimate.layerId,
      (layerCostMap.get(itemEstimate.layerId) ?? 0) + itemEstimate.cost,
    );
  });

  const layerSummaries: LayerEstimateSummary[] = [...layerCostMap.entries()]
    .map(([layerId, totalCost]) => ({
      layerId,
      totalCost,
    }))
    .sort((a, b) => a.layerId.localeCompare(b.layerId));

  return {
    itemEstimates,
    layerSummaries,
    totalCost: itemEstimates.reduce((sum, itemEstimate) => sum + itemEstimate.cost, 0),
  };
}
