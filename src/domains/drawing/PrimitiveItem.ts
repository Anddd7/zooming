import type { Point } from "../geometry/Geometry";

export type PrimitiveKind = "polyline" | "rect" | "polygon";

export type PrimitiveItem = {
  id: string;
  kind: PrimitiveKind;
  layerId: string;
  points: Point[];
};
