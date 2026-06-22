import type { Point } from "../geometry/Geometry";

export type PrimitiveKind = "polyline" | "rect" | "polygon";
export type PricingMode =
  | "none"
  | "fixed"
  | "perLength"
  | "perArea"
  | "perAreaM2";

export type ItemPricingRule = {
  mode: PricingMode;
  unitPrice: number;
  wasteRate: number;
  materialName: string;
};

export const DEFAULT_ITEM_TAG_COLOR = "#64748b";

export function createDefaultItemPricingRule(): ItemPricingRule {
  return {
    mode: "none",
    unitPrice: 0,
    wasteRate: 0,
    materialName: "",
  };
}

export function normalizeItemPricingRule(
  pricing: Partial<ItemPricingRule> | null | undefined,
): ItemPricingRule {
  return {
    ...createDefaultItemPricingRule(),
    ...(pricing ?? {}),
  };
}

export type PrimitiveItem = {
  id: string;
  name?: string;
  kind: PrimitiveKind;
  layerId: string;
  points: Point[];
  pricing?: ItemPricingRule;
  tagColor?: string;
  lineWidth?: number;
};
