import pptxgen from 'pptxgenjs';
import { Chart as ChartJS } from 'chart.js';
import { ChartCustomization, ChartType, BarShape } from '../types/chart';
import { formatNumber } from './numberFormat';
import { isProportionChart } from './chartHelpers';

// PptxGenJS ShapeType enum values are plain strings at runtime.
// Define them explicitly to avoid CJS/ESM interop issues with Vite.
const SHAPE_LINE = 'line' as pptxgen.SHAPE_NAME;
const SHAPE_RECT = 'rect' as pptxgen.SHAPE_NAME;
const SHAPE_ELLIPSE = 'ellipse' as pptxgen.SHAPE_NAME;

// ── Slide layout constants ────────────────────────────────────────────────────
/** The chart canvas content is mapped to this area on the slide (all in inches). */
const AREA_X = 0.5;
const AREA_Y = 0.5;
const AREA_W = 9.0;
const AREA_H = 6.5;

// ── Border-width conversion constants ────────────────────────────────────────
/** Minimum border width in PowerPoint points. */
const MIN_BORDER_PT = 0.5;
/** Scale factor converting Chart.js border-width pixels to PowerPoint points. */
const BORDER_WIDTH_SCALE = 0.75;

// ── Arc sampling constant ─────────────────────────────────────────────────────
/**
 * Number of polygon line segments per radian when approximating arc curves.
 * 30 steps/radian ≈ one segment every 2°, which produces visually smooth curves.
 */
const ARC_STEPS_PER_RADIAN = 30;

// ── Coordinate conversion ─────────────────────────────────────────────────────

/** Canvas pixel x → slide inch x */
function px2x(px: number, W: number): number {
  return AREA_X + (px / W) * AREA_W;
}

/** Canvas pixel y → slide inch y */
function px2y(py: number, H: number): number {
  return AREA_Y + (py / H) * AREA_H;
}

/** Canvas pixel width → slide inch width */
function px2w(px: number, W: number): number {
  return (px / W) * AREA_W;
}

/** Canvas pixel height → slide inch height */
function px2h(py: number, H: number): number {
  return (py / H) * AREA_H;
}

/** Chart.js pixel font size → PowerPoint point size (1 pt = 4/3 px) */
function pxToPt(px: number): number {
  return Math.round(px * 0.75);
}

// ── Color normalization ───────────────────────────────────────────────────────

/**
 * Convert any CSS color (hex, rgba, rgb) to a 6-character uppercase hex string
 * without a leading '#', as required by PptxGenJS.
 */
function toHex(color: string): string {
  if (!color) return '000000';
  if (color.startsWith('#')) {
    const h = color.slice(1);
    if (h.length === 3) return h.split('').map(c => c + c).join('').toUpperCase();
    if (h.length >= 6) return h.slice(0, 6).toUpperCase();
  }
  const m = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (m) {
    return [m[1], m[2], m[3]]
      .map(n => parseInt(n).toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
  }
  return '000000';
}

/**
 * Resolve a dataset background/border color (may be string or string[]) to a
 * 6-char hex, always choosing the first value when an array is provided.
 */
function hexNoHash(c: string | string[]): string {
  const s = Array.isArray(c) ? c[0] : c;
  return toHex(s ?? '000000');
}

/**
 * Convert a potentially semi-transparent grid/border color to a solid hex that
 * looks reasonable on a white slide background.
 * Defaults to light gray when the source is semi-transparent.
 */
function resolveGridColor(rawColor: unknown): string {
  if (typeof rawColor !== 'string') return 'E5E7EB';
  // Semi-transparent white (dark-mode grid) → use light gray on white slide
  if (rawColor.includes('255,255,255')) return 'E5E7EB';
  // Semi-transparent black → approximate on white background
  if (rawColor.startsWith('rgba')) return 'E5E7EB';
  return toHex(rawColor);
}

// ── Shape drawing helpers ─────────────────────────────────────────────────────

/**
 * Add a straight line between two slide-absolute positions.
 * Handles all directional combinations via flipH / flipV.
 */
function addLine(
  slide: pptxgen.Slide,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  ptWidth: number,
  dashType: 'solid' | 'dash' | 'sysDash' = 'solid',
): void {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const w = Math.abs(dx);
  const h = Math.abs(dy);
  if (w < 0.0005 && h < 0.0005) return; // skip zero-length lines
  slide.addShape(SHAPE_LINE, {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    w: Math.max(w, 0.001),
    h: Math.max(h, 0.001),
    // flipH inverts horizontal direction; flipV inverts vertical direction.
    // Together they let PptxGenJS draw lines in any of the four diagonal quadrants.
    flipH: dx < 0,
    flipV: dy < 0,
    line: { color, width: ptWidth, dashType, type: 'solid' },
    fill: { type: 'none' },
  });
}

/**
 * Add a filled closed polygon using PptxGenJS custGeom.
 * @param absPoints    Array of points in slide-absolute inch coordinates.
 * @param fillHex      6-char hex fill colour (no '#').
 * @param transparency 0–100 (percentage transparent; 0 = opaque).
 * @param borderHex    Optional 6-char hex border colour.  When omitted (or empty) no border is drawn.
 * @param borderPt     Border width in points.  Only used when borderHex is provided.
 */
function addPolygon(
  slide: pptxgen.Slide,
  absPoints: { x: number; y: number }[],
  fillHex: string,
  transparency = 0,
  borderHex?: string,
  borderPt = 0,
): void {
  if (absPoints.length < 3) return;
  const xs = absPoints.map(p => p.x);
  const ys = absPoints.map(p => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  const w = maxX - minX;
  const h = maxY - minY;
  if (w < 0.001 || h < 0.001) return;

  // custGeom points are shape-local (relative to the shape's top-left), in inches.
  const pts = absPoints.map((p, i) => ({
    x: p.x - minX,
    y: p.y - minY,
    ...(i === 0 ? { moveTo: true } : {}),
  }));
  // Close the path
  (pts as Array<{ x: number; y: number; moveTo?: boolean; close?: boolean }>).push(
    { x: 0, y: 0, close: true },
  );

  const lineOpts = borderHex && borderPt > 0
    ? { color: borderHex, width: borderPt }
    : { type: 'none' as const };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  slide.addShape('custGeom' as pptxgen.SHAPE_NAME, {
    x: minX,
    y: minY,
    w,
    h,
    fill: { color: fillHex, transparency },
    line: lineOpts,
    points: pts,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}

// ── Grid lines ────────────────────────────────────────────────────────────────

function addCartesianGridLines(
  slide: pptxgen.Slide,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  c: any,
  W: number,
  H: number,
  ca: { left: number; top: number; right: number; bottom: number },
): void {
  const caLeft = px2x(ca.left, W);
  const caRight = px2x(ca.right, W);
  const caTop = px2y(ca.top, H);
  const caBottom = px2y(ca.bottom, H);

  const rawGridColor =
    c.scales?.x?.options?.grid?.color ??
    c.scales?.y?.options?.grid?.color ??
    'rgba(0,0,0,0.08)';
  const gridHex = resolveGridColor(rawGridColor);

  // Horizontal grid lines — one per y-tick
  const yScale = c.scales?.y;
  if (yScale) {
    for (let i = 0; i < (yScale.ticks?.length ?? 0); i++) {
      const y = px2y(yScale.getPixelForTick(i), H);
      addLine(slide, caLeft, y, caRight, y, gridHex, 0.5);
    }
  }

  // Vertical grid lines — one per x-tick
  const xScale = c.scales?.x;
  if (xScale) {
    for (let i = 0; i < (xScale.ticks?.length ?? 0); i++) {
      const x = px2x(xScale.getPixelForTick(i), W);
      addLine(slide, x, caTop, x, caBottom, gridHex, 0.5);
    }
  }
}

// ── Axis border lines ─────────────────────────────────────────────────────────

function addAxisBorders(
  slide: pptxgen.Slide,
  W: number,
  H: number,
  ca: { left: number; top: number; right: number; bottom: number },
): void {
  const axisColor = 'D1D5DB'; // Tailwind gray-300, good neutral for white slides
  const caLeft = px2x(ca.left, W);
  const caRight = px2x(ca.right, W);
  const caTop = px2y(ca.top, H);
  const caBottom = px2y(ca.bottom, H);

  addLine(slide, caLeft, caBottom, caRight, caBottom, axisColor, 1); // x-axis
  addLine(slide, caLeft, caTop, caLeft, caBottom, axisColor, 1);     // y-axis
}

// ── Dataset shapes ────────────────────────────────────────────────────────────

/** Generate PPTX freeform points (in slide inches) for a custom bar shape. */
function barShapePoints(
  shape: BarShape,
  x: number,  // slide left edge of bar (inches)
  y: number,  // slide top edge of bar (inches)
  w: number,  // bar width (inches)
  h: number,  // bar height (inches)
  horizontal: boolean,
): { x: number; y: number }[] {
  const left = x;
  const right = x + w;
  const top = y;
  const bottom = y + h;
  const midX = (left + right) / 2;
  const midY = (top + bottom) / 2;

  switch (shape) {
    case 'rounded-pill':
      // PptxGenJS does not directly support elliptical arcs in freeform.
      // Approximate as a regular rectangle with large radius handled elsewhere.
      return [
        { x: left, y: top },
        { x: right, y: top },
        { x: right, y: bottom },
        { x: left, y: bottom },
      ];

    case 'chevron': {
      const ARROW_RATIO = 0.2;
      if (horizontal) {
        const arrowSize = h * ARROW_RATIO;
        return [
          { x: left + arrowSize, y: top },
          { x: right - arrowSize, y: top },
          { x: right, y: midY },
          { x: right - arrowSize, y: bottom },
          { x: left + arrowSize, y: bottom },
          { x: left, y: midY },
        ];
      } else {
        const arrowSize = w * ARROW_RATIO;
        return [
          { x: left, y: bottom - arrowSize },
          { x: midX, y: top },
          { x: right, y: bottom - arrowSize },
          { x: right, y: bottom },
          { x: midX + arrowSize, y: bottom },
          { x: midX, y: bottom - arrowSize },
          { x: midX - arrowSize, y: bottom },
          { x: left, y: bottom },
        ];
      }
    }

    case 'hexagon': {
      if (horizontal) {
        const indent = h * 0.25;
        return [
          { x: left + indent, y: top },
          { x: right - indent, y: top },
          { x: right, y: midY },
          { x: right - indent, y: bottom },
          { x: left + indent, y: bottom },
          { x: left, y: midY },
        ];
      } else {
        const indent = w * 0.25;
        return [
          { x: midX, y: top },
          { x: right, y: top + indent },
          { x: right, y: bottom - indent },
          { x: midX, y: bottom },
          { x: left, y: bottom - indent },
          { x: left, y: top + indent },
        ];
      }
    }

    case 'diamond':
      return [
        { x: midX, y: top },
        { x: right, y: midY },
        { x: midX, y: bottom },
        { x: left, y: midY },
      ];

    case 'triangle':
      if (horizontal) {
        return [
          { x: left, y: top },
          { x: right, y: midY },
          { x: left, y: bottom },
        ];
      } else {
        return [
          { x: left, y: bottom },
          { x: midX, y: top },
          { x: right, y: bottom },
        ];
      }

    default:
      return [];
  }
}

function addBarDataset(
  slide: pptxgen.Slide,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  elements: any[],
  W: number,
  H: number,
  fillHex: string,
  borderHex: string,
  borderPt: number,
  borderRadiusPx: number,
  shape: BarShape = 'rectangle',
): void {
  for (const el of elements) {
    if (el.x == null || el.base == null) continue;
    const barW = Math.abs(el.width ?? 0);
    if (barW <= 0) continue;
    const top = Math.min(el.y, el.base);
    const height = Math.abs(el.base - el.y);
    if (height <= 0) continue;

    const x = px2x(el.x - barW / 2, W);
    const y = px2y(top, H);
    const w = px2w(barW, W);
    const h = px2h(height, H);

    if (shape !== 'rectangle') {
      const points = barShapePoints(shape, x, y, w, h, false);
      if (points.length > 0) {
        slide.addShape('freeform' as pptxgen.SHAPE_NAME, {
          points,
          fill: { color: fillHex },
          line: { color: borderHex, width: borderPt },
        });
        continue;
      }
    }

    const rectRadius = borderRadiusPx > 0 ? px2w(borderRadiusPx, W) : undefined;
    slide.addShape(SHAPE_RECT, {
      x,
      y,
      w,
      h,
      fill: { color: fillHex },
      line: { color: borderHex, width: borderPt },
      ...(rectRadius != null ? { rectRadius } : {}),
    });
  }
}

function addHorizontalBarDataset(
  slide: pptxgen.Slide,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  elements: any[],
  W: number,
  H: number,
  fillHex: string,
  borderHex: string,
  borderPt: number,
  borderRadiusPx: number,
  shape: BarShape = 'rectangle',
): void {
  for (const el of elements) {
    // For horizontal bars: el.x is the value end, el.base is the baseline,
    // el.y is the bar center, el.height is the bar thickness.
    if (el.y == null || el.base == null) continue;
    const barH = Math.abs(el.height ?? 0);
    if (barH <= 0) continue;
    const left = Math.min(el.x, el.base);
    const width = Math.abs(el.base - el.x);
    if (width <= 0) continue;

    const x = px2x(left, W);
    const y = px2y(el.y - barH / 2, H);
    const w = px2w(width, W);
    const h = px2h(barH, H);

    if (shape !== 'rectangle') {
      const points = barShapePoints(shape, x, y, w, h, true);
      if (points.length > 0) {
        slide.addShape('freeform' as pptxgen.SHAPE_NAME, {
          points,
          fill: { color: fillHex },
          line: { color: borderHex, width: borderPt },
        });
        continue;
      }
    }

    const rectRadius = borderRadiusPx > 0 ? px2h(borderRadiusPx, H) : undefined;
    slide.addShape(SHAPE_RECT, {
      x,
      y,
      w,
      h,
      fill: { color: fillHex },
      line: { color: borderHex, width: borderPt },
      ...(rectRadius != null ? { rectRadius } : {}),
    });
  }
}

function addLineDataset(
  slide: pptxgen.Slide,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  elements: any[],
  W: number,
  H: number,
  borderHex: string,
  borderPt: number,
): void {
  for (let j = 1; j < elements.length; j++) {
    const prev = elements[j - 1];
    const curr = elements[j];
    if (prev.skip || curr.skip) continue;
    addLine(
      slide,
      px2x(prev.x, W), px2y(prev.y, H),
      px2x(curr.x, W), px2y(curr.y, H),
      borderHex,
      borderPt,
    );
  }
}

function addAreaFill(
  slide: pptxgen.Slide,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  elements: any[],
  ca: { left: number; top: number; right: number; bottom: number },
  W: number,
  H: number,
  fillHex: string,
): void {
  const pts = elements
    .filter(el => !el.skip)
    .map(el => ({ x: px2x(el.x, W), y: px2y(el.y, H) }));
  if (pts.length < 2) return;

  const baseline = px2y(ca.bottom, H);
  const polygonPts = [
    ...pts,
    { x: pts[pts.length - 1].x, y: baseline },
    { x: pts[0].x, y: baseline },
  ];
  // Use 70% transparency so the fill is at 30% opacity, matching Chart.js area rendering
  addPolygon(slide, polygonPts, fillHex, 70);
}

function addPointDataset(
  slide: pptxgen.Slide,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  elements: any[],
  W: number,
  H: number,
  borderHex: string,
  fillHex: string,
  pointRadiusPx: number,
  borderPt: number,
): void {
  if (pointRadiusPx <= 0) return;
  const pointW = px2w(pointRadiusPx * 2, W);
  const pointH = px2h(pointRadiusPx * 2, H);

  for (const el of elements) {
    if (el.skip) continue;
    slide.addShape(SHAPE_ELLIPSE, {
      x: px2x(el.x, W) - pointW / 2,
      y: px2y(el.y, H) - pointH / 2,
      w: pointW,
      h: pointH,
      fill: { color: fillHex },
      line: { color: borderHex, width: borderPt },
    });
  }
}

function addScatterDataset(
  slide: pptxgen.Slide,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  elements: any[],
  W: number,
  H: number,
  fillHex: string,
  borderHex: string,
  borderPt: number,
  pointRadiusPx: number,
): void {
  const r = pointRadiusPx > 0 ? pointRadiusPx : 4;
  const pointW = px2w(r * 2, W);
  const pointH = px2h(r * 2, H);

  for (const el of elements) {
    if (el.skip) continue;
    slide.addShape(SHAPE_ELLIPSE, {
      x: px2x(el.x, W) - pointW / 2,
      y: px2y(el.y, H) - pointH / 2,
      w: pointW,
      h: pointH,
      fill: { color: fillHex },
      line: { color: borderHex, width: borderPt },
    });
  }
}

// ── Pie / doughnut shapes ─────────────────────────────────────────────────────

/**
 * Approximate a single pie slice or doughnut segment as a filled polygon and
 * add it to the slide.
 *
 * The arc is sampled at small angular steps so the curve looks smooth.
 */
function addPieSlice(
  slide: pptxgen.Slide,
  cx: number,       // centre x in slide inches
  cy: number,       // centre y in slide inches
  outerR: number,   // outer radius in slide inches
  innerR: number,   // inner radius in slide inches (0 for pie)
  startAngle: number, // radians
  endAngle: number,   // radians
  fillHex: string,
  borderHex: string,
  borderPt: number,
): void {
  const angleSpan = endAngle - startAngle;
  const numSteps = Math.max(Math.ceil(Math.abs(angleSpan) * ARC_STEPS_PER_RADIAN), 2);

  const outerPoints: { x: number; y: number }[] = [];
  for (let i = 0; i <= numSteps; i++) {
    const angle = startAngle + (angleSpan * i) / numSteps;
    outerPoints.push({
      x: cx + Math.cos(angle) * outerR,
      y: cy + Math.sin(angle) * outerR,
    });
  }

  let polygonPoints: { x: number; y: number }[];

  if (innerR <= 0) {
    // Pie slice: centre → outer arc → back to centre (close)
    polygonPoints = [{ x: cx, y: cy }, ...outerPoints];
  } else {
    // Doughnut segment: outer arc forward + inner arc reversed
    const innerPoints: { x: number; y: number }[] = [];
    for (let i = numSteps; i >= 0; i--) {
      const angle = startAngle + (angleSpan * i) / numSteps;
      innerPoints.push({
        x: cx + Math.cos(angle) * innerR,
        y: cy + Math.sin(angle) * innerR,
      });
    }
    polygonPoints = [...outerPoints, ...innerPoints];
  }

  addPolygon(slide, polygonPoints, fillHex, 0, borderHex, borderPt);
}

/**
 * Decompose all arc elements in dataset 0 of a pie or doughnut chart into
 * individual native PowerPoint polygon shapes.
 */
function addPieDoughnutDataset(
  slide: pptxgen.Slide,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  chartInstance: ChartJS,
  W: number,
  H: number,
): void {
  const meta = chartInstance.getDatasetMeta(0);

  for (let j = 0; j < meta.data.length; j++) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const el = meta.data[j] as any;

    const cx = el.x as number;
    const cy = el.y as number;
    const startAngle = el.startAngle as number;
    const endAngle = el.endAngle as number;
    const outerRadius = el.outerRadius as number;
    const innerRadius = (el.innerRadius as number) ?? 0;

    if (outerRadius <= 0) continue;

    // Resolve colours from the arc element's own resolved options
    const fillColor: string = el.options?.backgroundColor ?? '#CCCCCC';
    const borderColor: string = el.options?.borderColor ?? '#FFFFFF';
    const borderWidth: number = el.options?.borderWidth ?? 2;

    // Average the horizontal and vertical scale factors so that the rendered
    // circle stays round even when the slide aspect ratio (AREA_W/AREA_H)
    // differs from the canvas aspect ratio (W/H).
    const scaleAvg = ((AREA_W / W) + (AREA_H / H)) / 2;
    const outerR = outerRadius * scaleAvg;
    const innerR = innerRadius * scaleAvg;
    const slideCx = px2x(cx, W);
    const slideCy = px2y(cy, H);

    addPieSlice(
      slide,
      slideCx, slideCy,
      outerR, innerR,
      startAngle, endAngle,
      toHex(fillColor),
      toHex(borderColor),
      Math.max(MIN_BORDER_PT, borderWidth * BORDER_WIDTH_SCALE),
    );
  }
}

// ── Radar / Polar Area shapes ─────────────────────────────────────────────────

/**
 * Export a radar chart as native PowerPoint shapes.
 * Draws concentric polygon grid, angle lines, dataset filled polygons, and point markers.
 */
function addRadarDatasets(
  slide: pptxgen.Slide,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  chartInstance: ChartJS,
  customization: ChartCustomization,
  W: number,
  H: number,
): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = chartInstance as any;
  const scale = c.scales?.r;
  if (!scale) return;

  const cx = px2x(scale.xCenter, W);
  const cy = px2y(scale.yCenter, H);
  const scaleAvg = ((AREA_W / W) + (AREA_H / H)) / 2;

  const numAxes = chartInstance.data.labels?.length ?? 0;
  if (numAxes < 3) return;

  // Draw concentric polygon grid rings
  if (customization.showGridlines) {
    const gridColor = resolveGridColor('rgba(0,0,0,0.08)');
    const tickCount = scale.ticks?.length ?? 5;
    for (let t = 1; t <= tickCount; t++) {
      const r = scale.getDistanceFromCenterForValue(scale.ticks[t - 1]?.value ?? t) * scaleAvg;
      if (r <= 0) continue;
      const pts: { x: number; y: number }[] = [];
      for (let i = 0; i < numAxes; i++) {
        const angle = (Math.PI * 2 * i) / numAxes - Math.PI / 2;
        pts.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
      }
      // Draw polygon ring edges
      for (let i = 0; i < pts.length; i++) {
        const next = pts[(i + 1) % pts.length];
        addLine(slide, pts[i].x, pts[i].y, next.x, next.y, gridColor, 0.5);
      }
    }
    // Draw angle lines from center to outer ring
    const outerR = scale.drawingArea * scaleAvg;
    for (let i = 0; i < numAxes; i++) {
      const angle = (Math.PI * 2 * i) / numAxes - Math.PI / 2;
      const edgeX = cx + Math.cos(angle) * outerR;
      const edgeY = cy + Math.sin(angle) * outerR;
      addLine(slide, cx, cy, edgeX, edgeY, gridColor, 0.5);
    }
  }

  // Draw each dataset as a polygon
  const numDatasets = chartInstance.data.datasets.length;
  for (let di = 0; di < numDatasets; di++) {
    const meta = chartInstance.getDatasetMeta(di);
    const cfg = customization.datasetConfigs[di] ?? customization.datasetConfigs[0];
    if (!cfg) continue;

    const fillHex = hexNoHash(cfg.backgroundColor);
    const borderHex = hexNoHash(cfg.borderColor);
    const borderPt = Math.max(MIN_BORDER_PT, cfg.borderWidth * BORDER_WIDTH_SCALE);

    const pts: { x: number; y: number }[] = meta.data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((el: any) => !el.skip && el.x != null)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((el: any) => ({ x: px2x(el.x, W), y: px2y(el.y, H) }));

    if (pts.length >= 3) {
      addPolygon(slide, pts, fillHex, 70, borderHex, borderPt);
      // Draw border lines
      for (let i = 0; i < pts.length; i++) {
        const next = pts[(i + 1) % pts.length];
        addLine(slide, pts[i].x, pts[i].y, next.x, next.y, borderHex, borderPt);
      }
    }

    // Draw point markers
    const pointR = 3 * scaleAvg;
    const pointW = pointR * 2;
    for (const pt of pts) {
      slide.addShape(SHAPE_ELLIPSE, {
        x: pt.x - pointW / 2,
        y: pt.y - pointW / 2,
        w: pointW,
        h: pointW,
        fill: { color: fillHex },
        line: { color: borderHex, width: borderPt },
      });
    }
  }
}

/**
 * Export a polar area chart as native PowerPoint shapes (wedge segments with varying radii).
 */
function addPolarAreaDatasets(
  slide: pptxgen.Slide,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  chartInstance: ChartJS,
  W: number,
  H: number,
): void {
  const meta = chartInstance.getDatasetMeta(0);
  const scaleAvg = ((AREA_W / W) + (AREA_H / H)) / 2;

  for (let j = 0; j < meta.data.length; j++) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const el = meta.data[j] as any;
    const cx = px2x(el.x, W);
    const cy = px2y(el.y, H);
    const startAngle: number = el.startAngle ?? 0;
    const endAngle: number = el.endAngle ?? 0;
    const outerRadius: number = el.outerRadius ?? 0;
    if (outerRadius <= 0) continue;

    const outerR = outerRadius * scaleAvg;
    const fillColor: string = el.options?.backgroundColor ?? '#CCCCCC';
    const borderColor: string = el.options?.borderColor ?? '#FFFFFF';
    const borderWidth: number = el.options?.borderWidth ?? 2;

    addPieSlice(
      slide,
      cx, cy,
      outerR, 0,
      startAngle, endAngle,
      toHex(fillColor),
      toHex(borderColor),
      Math.max(MIN_BORDER_PT, borderWidth * BORDER_WIDTH_SCALE),
    );
  }
}

// ── Data labels ───────────────────────────────────────────────────────────────

/**
 * Returns a readable hex label color for a given background hex.
 * Uses perceived luminance: white text on dark backgrounds, dark text on light.
 */
function autoContrastColor(bgHex: string, fallback: string): string {
  const h = bgHex.replace('#', '');
  if (h.length < 6) return fallback;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5 ? 'FFFFFF' : fallback;
}

/**
 * Format a numeric value according to data label settings.
 */
function formatDataLabel(
  value: number,
  customization: ChartCustomization,
  total: number,
  isPieOrDoughnut: boolean,
): string {
  const formatted = formatNumber(value, customization.numberFormat);
  if (isPieOrDoughnut && customization.dataLabelFormat !== 'value') {
    const pct = total > 0
      ? ((value / total) * 100).toFixed(customization.numberFormat.decimalPlaces)
      : '0';
    if (customization.dataLabelFormat === 'percentage') return `${pct}%`;
    if (customization.dataLabelFormat === 'valueAndPercentage') return `${formatted} (${pct}%)`;
  }
  return formatted;
}

/**
 * Add data labels for cartesian chart types (bar, line, area, scatter).
 * Labels are positioned above each data point / bar top.
 */
function addCartesianDataLabels(
  slide: pptxgen.Slide,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  chartInstance: ChartJS,
  customization: ChartCustomization,
  chartType: ChartType,
  W: number,
  H: number,
): void {
  if (!customization.showDataLabels) return;

  const { dataLabelFont, dataLabelPosition } = customization;
  const fontFace = dataLabelFont.family;
  const fontSize = pxToPt(dataLabelFont.size);
  const bold = dataLabelFont.weight === 'bold';
  const fallbackColor = toHex(dataLabelFont.color);

  const labelH = 0.25;
  const labelW = 0.7;
  const offsetAbove = 0.08; // gap between element and label
  const offsetInside = -0.25; // label inside the bar (center position)

  const numDatasets = chartInstance.data.datasets.length;

  for (let di = 0; di < numDatasets; di++) {
    const meta = chartInstance.getDatasetMeta(di);
    const cfg = customization.datasetConfigs[di] ?? customization.datasetConfigs[0];
    const bgHex = cfg ? hexNoHash(cfg.backgroundColor) : fallbackColor;

    for (let pi = 0; pi < meta.data.length; pi++) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const el = meta.data[pi] as any;
      if (el.skip || el.x == null || el.y == null) continue;

      const rawValue = chartInstance.data.datasets[di].data[pi];
      const value = typeof rawValue === 'number' ? rawValue
        : (rawValue as { y?: number } | null)?.y ?? 0;

      const labelText = formatDataLabel(value, customization, 0, false);

      let labelX = px2x(el.x, W) - labelW / 2;
      let labelY: number;

      if (chartType === 'bar') {
        const top = Math.min(el.y, el.base);
        const barH = Math.abs(el.base - el.y);
        if (dataLabelPosition === 'start') {
          // Bottom of bar (inside near base)
          labelY = px2y(top + barH, H) - labelH - offsetAbove;
        } else if (dataLabelPosition === 'center') {
          labelY = px2y(top + barH / 2, H) - labelH / 2 + offsetInside / 2;
        } else {
          // 'end' (default) or 'auto': above the bar
          labelY = px2y(top, H) - labelH - offsetAbove;
        }
        // Auto-contrast: white on dark bar fills
        const color = autoContrastColor(bgHex, fallbackColor);
        slide.addText(labelText, {
          x: labelX,
          y: labelY,
          w: labelW,
          h: labelH,
          fontFace,
          fontSize,
          bold,
          color,
          align: 'center',
          valign: 'middle',
        });
      } else {
        // Line, area, scatter: label above the point
        let offsetY: number;
        if (dataLabelPosition === 'start') {
          offsetY = offsetAbove + labelH;
        } else if (dataLabelPosition === 'center') {
          offsetY = 0;
        } else {
          offsetY = -offsetAbove;
        }
        labelY = px2y(el.y, H) + offsetY - labelH;
        slide.addText(labelText, {
          x: labelX,
          y: labelY,
          w: labelW,
          h: labelH,
          fontFace,
          fontSize,
          bold,
          color: fallbackColor,
          align: 'center',
          valign: 'middle',
        });
      }
    }
  }
}

/**
 * Add data labels for pie / doughnut charts.
 * Labels are positioned at the midpoint of each slice.
 */
function addPieDataLabels(
  slide: pptxgen.Slide,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  chartInstance: ChartJS,
  customization: ChartCustomization,
  W: number,
  H: number,
): void {
  if (!customization.showDataLabels) return;

  const { dataLabelFont, dataLabelPosition } = customization;
  const fontFace = dataLabelFont.family;
  const fontSize = pxToPt(dataLabelFont.size);
  const bold = dataLabelFont.weight === 'bold';
  const fallbackColor = toHex(dataLabelFont.color);

  const meta = chartInstance.getDatasetMeta(0);
  const values = chartInstance.data.datasets[0].data.map(v =>
    typeof v === 'number' ? v : 0
  );
  const total = values.reduce((sum, v) => sum + v, 0);
  const scaleAvg = ((AREA_W / W) + (AREA_H / H)) / 2;

  const labelW = 0.8;
  const labelH = 0.3;

  for (let j = 0; j < meta.data.length; j++) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const el = meta.data[j] as any;
    const startAngle: number = el.startAngle ?? 0;
    const endAngle: number = el.endAngle ?? 0;
    const outerRadius: number = el.outerRadius ?? 0;
    const innerRadius: number = el.innerRadius ?? 0;
    const cx = px2x(el.x, W);
    const cy = px2y(el.y, H);

    if (outerRadius <= 0) continue;

    const midAngle = (startAngle + endAngle) / 2;
    const outerR = outerRadius * scaleAvg;
    const innerR = innerRadius * scaleAvg;

    // Choose radius based on position setting
    let labelR: number;
    if (dataLabelPosition === 'end') {
      labelR = outerR * 1.15; // outside the slice
    } else if (dataLabelPosition === 'start') {
      labelR = (innerR > 0 ? innerR : 0) + outerR * 0.25;
    } else {
      // center or auto
      labelR = (outerR + Math.max(innerR, 0)) / 2;
    }

    const labelCx = cx + Math.cos(midAngle) * labelR;
    const labelCy = cy + Math.sin(midAngle) * labelR;

    const value = values[j] ?? 0;
    const labelText = formatDataLabel(value, customization, total, true);

    // Auto-contrast color: use fill color to determine text color
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fillColor: string = (el.options?.backgroundColor as string) ?? '';
    const fillHex = fillColor ? toHex(fillColor) : '';
    const color = fillHex && dataLabelPosition !== 'end'
      ? autoContrastColor(fillHex, fallbackColor)
      : fallbackColor;

    slide.addText(labelText, {
      x: labelCx - labelW / 2,
      y: labelCy - labelH / 2,
      w: labelW,
      h: labelH,
      fontFace,
      fontSize,
      bold,
      color,
      align: 'center',
      valign: 'middle',
    });
  }
}

// ── Text elements ─────────────────────────────────────────────────────────────

function addTickLabels(
  slide: pptxgen.Slide,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  c: any,
  customization: ChartCustomization,
  W: number,
  H: number,
): void {
  const { tickLabelFont } = customization;
  const fontFace = tickLabelFont.family;
  const fontSize = pxToPt(tickLabelFont.size);
  const bold = tickLabelFont.weight === 'bold';
  const color = toHex(tickLabelFont.color);
  const lineHeightIn = px2h(tickLabelFont.size * 1.6, H);
  const ca = c.chartArea;

  // X-axis tick labels — centred below each tick mark
  const xScale = c.scales?.x;
  if (xScale?.ticks?.length) {
    // Width: half the gap between ticks (or fallback to 1")
    const tickGapW =
      xScale.ticks.length > 1
        ? px2w(
            Math.abs(xScale.getPixelForTick(1) - xScale.getPixelForTick(0)),
            W,
          )
        : 1;
    const tickW = Math.max(tickGapW * 0.95, 0.5);
    const yPos = px2y(ca.bottom + 4, H);

    for (let i = 0; i < xScale.ticks.length; i++) {
      const tick = xScale.ticks[i];
      const label = Array.isArray(tick.label)
        ? tick.label[0]
        : (tick.label ?? String(tick.value ?? ''));
      if (!label) continue;
      const xPos = px2x(xScale.getPixelForTick(i), W) - tickW / 2;
      slide.addText(String(label), {
        x: xPos,
        y: yPos,
        w: tickW,
        h: lineHeightIn,
        fontFace,
        fontSize,
        bold,
        color,
        align: 'center',
        valign: 'top',
        wrap: false,
      });
    }
  }

  // Y-axis tick labels — right-aligned to the left of the y-axis
  const yScale = c.scales?.y;
  if (yScale?.ticks?.length) {
    const tickLabelW = px2w(ca.left - (yScale.left ?? 0), W);
    const safeTickW = Math.max(tickLabelW, 0.5);

    for (let i = 0; i < yScale.ticks.length; i++) {
      const tick = yScale.ticks[i];
      const label = Array.isArray(tick.label)
        ? tick.label[0]
        : (tick.label ?? String(tick.value ?? ''));
      if (!label) continue;
      const yPos = px2y(yScale.getPixelForTick(i), H) - lineHeightIn / 2;
      const xPos = px2x(ca.left, W) - safeTickW - px2w(4, W);
      slide.addText(String(label), {
        x: xPos,
        y: yPos,
        w: safeTickW,
        h: lineHeightIn,
        fontFace,
        fontSize,
        bold,
        color,
        align: 'right',
        valign: 'middle',
        wrap: false,
      });
    }
  }
}

function addAxisLabels(
  slide: pptxgen.Slide,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  c: any,
  customization: ChartCustomization,
  W: number,
  H: number,
): void {
  if (!customization.showAxisLabels) return;

  const { axisLabelFont } = customization;
  const fontFace = axisLabelFont.family;
  const fontSize = pxToPt(axisLabelFont.size);
  const bold = axisLabelFont.weight === 'bold';
  const color = toHex(axisLabelFont.color);
  const ca = c.chartArea;

  // X-axis label — centred horizontally, below the tick labels
  if (customization.xAxisLabel) {
    const centerX = px2x((ca.left + ca.right) / 2, W);
    const labelH = 0.35;
    const labelW = 4;
    const scaleBottom = c.scales?.x?.bottom != null
      ? px2y(c.scales.x.bottom, H)
      : px2y(ca.bottom + 40, H);
    slide.addText(customization.xAxisLabel, {
      x: centerX - labelW / 2,
      y: scaleBottom - labelH - 0.05,
      w: labelW,
      h: labelH,
      fontFace,
      fontSize,
      bold,
      color,
      align: 'center',
      valign: 'middle',
    });
  }

  // Y-axis label — rotated 270° (reads bottom-to-top), centred vertically
  if (customization.yAxisLabel) {
    // The unrotated text box has:
    //   w = visual "height" of the label (spans the chart area height after rotation)
    //   h = visual "width" of the label (one line of text)
    // The box centre does not move on rotation, so we position using the visual centre.
    const caHeightIn = px2h(ca.bottom - ca.top, H);
    const visualCenterY = px2y((ca.top + ca.bottom) / 2, H);
    const labelH = 0.35; // one line height (becomes the visual label width after rotation)
    const scaleLeftIn = c.scales?.y?.left != null
      ? px2x(c.scales.y.left, W)
      : AREA_X;

    slide.addText(customization.yAxisLabel, {
      // Centre the unrotated box so its visual centre lands at (scaleLeftIn, visualCenterY)
      x: scaleLeftIn,
      y: visualCenterY - caHeightIn / 2,
      w: caHeightIn,
      h: labelH,
      fontFace,
      fontSize,
      bold,
      color,
      align: 'center',
      valign: 'middle',
      rotate: 270,
    });
  }
}

function addChartTitle(
  slide: pptxgen.Slide,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  c: any,
  customization: ChartCustomization,
  W: number,
  H: number,
  ca: { left: number; top: number; right: number; bottom: number },
): void {
  const { title, titleFont } = customization;
  if (!title) return;

  const fontFace = titleFont.family;
  const fontSize = pxToPt(titleFont.size);
  const bold = titleFont.weight === 'bold';
  const color = toHex(titleFont.color);

  // Use the title block's actual bounds if available; fall back to the area above the chart.
  const tb = c.titleBlock;
  let titleY: number;
  let titleH: number;

  if (tb?.bottom != null && tb.top != null) {
    titleY = px2y(tb.top, H);
    titleH = Math.max(px2h(tb.bottom - tb.top, H), 0.3);
  } else {
    titleY = AREA_Y;
    titleH = Math.max(px2h(ca.top, H) * 0.8, 0.3);
  }

  slide.addText(title, {
    x: AREA_X,
    y: titleY,
    w: AREA_W,
    h: titleH,
    fontFace,
    fontSize,
    bold,
    color,
    align: 'center',
    valign: 'middle',
  });
}

function addLegend(
  slide: pptxgen.Slide,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  c: any,
  customization: ChartCustomization,
  W: number,
  H: number,
): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const legend = c.legend as any;
  if (!legend?.legendItems?.length) return;

  const { legendFont } = customization;
  const fontFace = legendFont.family;
  const fontSize = pxToPt(legendFont.size);
  const bold = legendFont.weight === 'bold';
  const color = toHex(legendFont.color);

  const legTop = px2y(legend.top ?? 0, H);
  const legLeft = px2x(legend.left ?? 0, W);
  const legWidth = px2w((legend.right ?? W) - (legend.left ?? 0), W);
  const legHeight = px2h((legend.bottom ?? H) - (legend.top ?? 0), H);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: Array<any> = legend.legendItems;
  const itemCount = items.length;
  if (itemCount === 0) return;

  const isVertical =
    customization.legendPosition === 'left' ||
    customization.legendPosition === 'right';

  // Size of the colour swatch square (matches font height)
  const swatchSize = px2w(legendFont.size, W);
  const swatchSizeH = px2h(legendFont.size, H);
  const lineH = Math.max(swatchSizeH, 0.22);

  // Space allocated per item
  const itemStep = isVertical ? legHeight / itemCount : legWidth / itemCount;
  const textGap = 0.06; // gap between swatch and label text

  items.forEach((item, i) => {
    // Resolve the colour swatch: for line/area datasets the fillStyle might be
    // nearly transparent (e.g. 'rgba(r,g,b,0.1)'), so prefer the strokeStyle.
    const rawFill =
      typeof item.fillStyle === 'string' ? item.fillStyle : '';
    const rawStroke =
      typeof item.strokeStyle === 'string' ? item.strokeStyle : '';
    // Match the alpha value at the end of an rgba() string (e.g. 0.1, 0.3).
    const alphaMatch = rawFill.match(/rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)/);
    const isTransparentFill =
      alphaMatch != null && parseFloat(alphaMatch[1]) < 0.5;
    const sourceColor = isTransparentFill
      ? (rawStroke || rawFill)
      : rawFill;
    const swatchHex = sourceColor ? toHex(sourceColor) : 'CCCCCC';

    let itemX: number;
    let itemY: number;

    if (isVertical) {
      itemX = legLeft;
      itemY = legTop + i * itemStep + (itemStep - lineH) / 2;
    } else {
      itemX = legLeft + i * itemStep;
      itemY = legTop + (legHeight - lineH) / 2;
    }

    // Colour swatch
    slide.addShape(SHAPE_RECT, {
      x: itemX,
      y: itemY + (lineH - swatchSizeH) / 2,
      w: swatchSize,
      h: swatchSizeH,
      fill: { color: swatchHex },
      line: { type: 'none' },
    });

    // Label text
    const textW = Math.max(itemStep - swatchSize - textGap - 0.05, 0.3);
    slide.addText(String(item.text ?? ''), {
      x: itemX + swatchSize + textGap,
      y: itemY,
      w: textW,
      h: lineH,
      fontFace,
      fontSize,
      bold,
      color,
      align: 'left',
      valign: 'middle',
    });
  });
}

// ── Main export function ──────────────────────────────────────────────────────

/**
 * Export the current chart to a PowerPoint (.pptx) file.
 *
 * All supported chart types (bar, line, area, scatter, pie, doughnut) are
 * decomposed into native PowerPoint shapes and editable text boxes for a
 * fully WYSIWYG, editable result.
 */
export async function exportToPptx(
  chartInstance: ChartJS,
  customization: ChartCustomization,
  chartType: ChartType,
): Promise<void> {
  const pptx = new pptxgen();
  const slide = pptx.addSlide();
  const title = customization.title || 'Chart';

  if (isProportionChart(chartType)) {
    // ── Fully-editable decomposition for pie / doughnut / polar area ─────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = chartInstance as any;
    const W: number = c.width;
    const H: number = c.height;

    if (!W || !H) {
      throw new Error(
        `Chart dimensions not available (W=${W}, H=${H}). ` +
        'Ensure the chart is visible before exporting.',
      );
    }

    const ca = c.chartArea ?? { left: 0, top: 0, right: W, bottom: H };

    if (chartType === 'polarArea') {
      addPolarAreaDatasets(slide, chartInstance, W, H);
    } else {
      addPieDoughnutDataset(slide, chartInstance, W, H);
    }

    addChartTitle(slide, c, customization, W, H, ca);

    if (customization.showLegend) {
      addLegend(slide, c, customization, W, H);
    }

    addPieDataLabels(slide, chartInstance, customization, W, H);

  } else if (chartType === 'radar') {
    // ── Fully-editable decomposition for radar ───────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = chartInstance as any;
    const W: number = c.width;
    const H: number = c.height;

    if (!W || !H) {
      throw new Error(
        `Chart dimensions not available (W=${W}, H=${H}). ` +
        'Ensure the chart is visible before exporting.',
      );
    }

    const ca = c.chartArea ?? { left: 0, top: 0, right: W, bottom: H };

    addRadarDatasets(slide, chartInstance, customization, W, H);
    addChartTitle(slide, c, customization, W, H, ca);

    if (customization.showLegend) {
      addLegend(slide, c, customization, W, H);
    }

  } else {
    // ── Fully-editable decomposition for cartesian chart types ───────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = chartInstance as any;
    const W: number = c.width;
    const H: number = c.height;
    const ca = c.chartArea as {
      left: number;
      top: number;
      right: number;
      bottom: number;
    };

    if (!ca || !W || !H) {
      throw new Error(
        `Chart dimensions not available (W=${W}, H=${H}, chartArea=${!!ca}). ` +
        'Ensure the chart is visible before exporting.',
      );
    }

    // 1. Grid lines (rendered first, behind everything else)
    if (customization.showGridlines && c.scales) {
      addCartesianGridLines(slide, c, W, H, ca);
    }

    // 2. Axis border lines
    addAxisBorders(slide, W, H, ca);

    // 3. Dataset shapes — drawn in dataset order so later datasets appear on top
    const numDatasets = chartInstance.data.datasets.length;
    for (let di = 0; di < numDatasets; di++) {
      const meta = chartInstance.getDatasetMeta(di);
      const cfg =
        customization.datasetConfigs[di] ?? customization.datasetConfigs[0];
      if (!cfg) continue;

      const borderHex = hexNoHash(cfg.borderColor);
      const fillHex = hexNoHash(cfg.backgroundColor);
      const borderPt = Math.max(0.5, cfg.borderWidth * 0.75);

      switch (chartType) {
        case 'bar':
          if (customization.barConfig.horizontal) {
            addHorizontalBarDataset(
              slide,
              meta.data,
              W, H,
              fillHex, borderHex, borderPt,
              customization.barConfig.borderRadius,
              customization.barConfig.shape ?? 'rectangle',
            );
          } else {
            addBarDataset(
              slide,
              meta.data,
              W, H,
              fillHex, borderHex, borderPt,
              customization.barConfig.borderRadius,
              customization.barConfig.shape ?? 'rectangle',
            );
          }
          break;

        case 'combo': {
          const dsCount = chartInstance.data.datasets.length;
          const lineIdx = customization.comboConfig.lineDatasetIndex < 0 || customization.comboConfig.lineDatasetIndex >= dsCount
            ? dsCount - 1
            : customization.comboConfig.lineDatasetIndex;
          if (di === lineIdx) {
            addLineDataset(slide, meta.data, W, H, borderHex, borderPt);
            addPointDataset(
              slide, meta.data, W, H,
              borderHex, fillHex,
              customization.comboConfig.linePointRadius,
              borderPt,
            );
          } else {
            addBarDataset(
              slide,
              meta.data,
              W, H,
              fillHex, borderHex, borderPt,
              customization.barConfig.borderRadius,
              customization.barConfig.shape ?? 'rectangle',
            );
          }
          break;
        }

        case 'line':
          addLineDataset(slide, meta.data, W, H, borderHex, borderPt);
          addPointDataset(
            slide, meta.data, W, H,
            borderHex, fillHex,
            customization.lineConfig.pointRadius,
            borderPt,
          );
          break;

        case 'area':
          // Area fill drawn first (behind the line)
          addAreaFill(slide, meta.data, ca, W, H, fillHex);
          addLineDataset(slide, meta.data, W, H, borderHex, borderPt);
          addPointDataset(
            slide, meta.data, W, H,
            borderHex, fillHex,
            customization.lineConfig.pointRadius,
            borderPt,
          );
          break;

        case 'scatter':
          addScatterDataset(
            slide, meta.data, W, H,
            fillHex, borderHex, borderPt,
            customization.lineConfig.pointRadius,
          );
          break;
      }
    }

    // 4. Tick labels
    addTickLabels(slide, c, customization, W, H);

    // 5. Axis labels
    addAxisLabels(slide, c, customization, W, H);

    // 6. Chart title
    addChartTitle(slide, c, customization, W, H, ca);

    // 7. Legend
    if (customization.showLegend) {
      addLegend(slide, c, customization, W, H);
    }

    // 8. Data labels
    addCartesianDataLabels(slide, chartInstance, customization, chartType, W, H);
  }

  await pptx.writeFile({ fileName: `${title}.pptx` });
}
