import pptxgen from 'pptxgenjs';
import { Chart as ChartJS } from 'chart.js';
import { ChartCustomization, ChartType } from '../types/chart';

// ── Slide layout constants ────────────────────────────────────────────────────
/** The chart canvas content is mapped to this area on the slide (all in inches). */
const AREA_X = 0.5;
const AREA_Y = 0.5;
const AREA_W = 9.0;
const AREA_H = 6.5;

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
  slide.addShape(pptxgen.ShapeType.line, {
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
 * @param absPoints  Array of points in slide-absolute inch coordinates.
 * @param fillHex    6-char hex fill colour (no '#').
 * @param transparency  0–100 (percentage transparent; 0 = opaque).
 */
function addPolygon(
  slide: pptxgen.Slide,
  absPoints: { x: number; y: number }[],
  fillHex: string,
  transparency = 0,
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  slide.addShape('custGeom' as pptxgen.SHAPE_NAME, {
    x: minX,
    y: minY,
    w,
    h,
    fill: { color: fillHex, transparency },
    line: { type: 'none' },
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
    const rectRadius = borderRadiusPx > 0 ? px2w(borderRadiusPx, W) : undefined;

    slide.addShape(pptxgen.ShapeType.rect, {
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
    slide.addShape(pptxgen.ShapeType.ellipse, {
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
    slide.addShape(pptxgen.ShapeType.ellipse, {
      x: px2x(el.x, W) - pointW / 2,
      y: px2y(el.y, H) - pointH / 2,
      w: pointW,
      h: pointH,
      fill: { color: fillHex },
      line: { color: borderHex, width: borderPt },
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
    // nearly transparent, so prefer the strokeStyle in those cases.
    const rawFill =
      typeof item.fillStyle === 'string' ? item.fillStyle : '';
    const rawStroke =
      typeof item.strokeStyle === 'string' ? item.strokeStyle : '';
    const isTransparentFill = rawFill.includes('rgba') && /0\.\d/.test(rawFill);
    const swatchHex = toHex(isTransparentFill ? rawStroke || rawFill : rawFill) || 'CCCCCC';

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
    slide.addShape(pptxgen.ShapeType.rect, {
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
 * For cartesian chart types (bar, line, area, scatter) all elements are
 * decomposed into native PowerPoint shapes and editable text boxes for a
 * fully WYSIWYG, editable result.
 *
 * For pie and doughnut charts a PNG image fallback is used (Phase 2 will add
 * full native support for those types).
 */
export async function exportToPptx(
  chartInstance: ChartJS,
  customization: ChartCustomization,
  chartType: ChartType,
): Promise<void> {
  const pptx = new pptxgen();
  const slide = pptx.addSlide();
  const title = customization.title || 'Chart';

  if (chartType === 'pie' || chartType === 'doughnut') {
    // ── PNG fallback for pie / doughnut (Phase 2 will decompose these too) ──
    const imageData = chartInstance.canvas.toDataURL('image/png');
    slide.addText(title, {
      x: 0.5,
      y: 0.25,
      w: 9,
      h: 0.75,
      fontSize: 24,
      bold: true,
      color: '363636',
      align: 'center',
    });
    slide.addImage({ data: imageData, x: 0.5, y: 1.25, w: 9, h: 5.5 });
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
      throw new Error('Chart has not been rendered yet. Ensure the chart is visible before exporting.');
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
          addBarDataset(
            slide,
            meta.data,
            W, H,
            fillHex, borderHex, borderPt,
            customization.barConfig.borderRadius,
          );
          break;

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
  }

  await pptx.writeFile({ fileName: `${title}.pptx` });
}
