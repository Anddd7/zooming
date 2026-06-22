export type DrawGridParams = {
  width: number;
  height: number;
  pan: {
    offsetX: number;
    offsetY: number;
  };
  scale: number;
  spacingMm: number;
};

export function drawGrid(ctx: CanvasRenderingContext2D, params: DrawGridParams) {
  const spacingPx = params.spacingMm * params.scale;

  if (spacingPx <= 0) {
    return;
  }

  const startX = ((params.pan.offsetX % spacingPx) + spacingPx) % spacingPx;
  const startY = ((params.pan.offsetY % spacingPx) + spacingPx) % spacingPx;

  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 1;
  ctx.beginPath();

  for (let x = startX; x <= params.width; x += spacingPx) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, params.height);
  }

  for (let y = startY; y <= params.height; y += spacingPx) {
    ctx.moveTo(0, y);
    ctx.lineTo(params.width, y);
  }

  ctx.stroke();
}
