export type Point = {
  xMm: number;
  yMm: number;
};

export type Polyline = Point[];

export type Polygon = Point[];

export type Rect = {
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
};
