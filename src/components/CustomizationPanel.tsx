import React, { useState } from 'react';
import { ChartCustomization, ChartType, FontFamily, PointStyle, LegendPosition, PaletteId, DataLabelFormat, DataLabelPosition, NumberFormatType, RadarConfig, ComboConfig, BarShape } from '../types/chart';
import { PALETTES } from '../data/palettes';
import { ColorPicker } from './ColorPicker';
import { ExportButton } from './ExportButton';
import { formatNumber } from '../utils/numberFormat';
import { isProportionChart } from '../utils/chartHelpers';
import { DEFAULT_COLORS } from '../utils/chartDefaults';

interface SectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const Section: React.FC<SectionProps> = ({ title, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-gray-200 dark:border-gray-700 last:border-0">
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="uppercase tracking-wide text-xs">{title}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  );
};

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  unit?: string;
}

const Slider: React.FC<SliderProps> = ({ label, value, min, max, step = 1, onChange, unit = '' }) => (
  <div>
    <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
      <span>{label}</span>
      <span className="font-mono font-medium">{value}{unit}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={e => onChange(Number(e.target.value))}
      className="w-full h-1.5 rounded-full appearance-none bg-gray-200 dark:bg-gray-600 accent-accent"
    />
  </div>
);

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

const Toggle: React.FC<ToggleProps> = ({ label, checked, onChange }) => (
  <label className="flex items-center justify-between cursor-pointer">
    <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
    <div
      className={`relative w-10 h-5 rounded-full transition-colors ${checked ? 'bg-accent' : 'bg-gray-300 dark:bg-gray-600'}`}
      onClick={() => onChange(!checked)}
    >
      <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </div>
  </label>
);

interface FontSectionProps {
  title: string;
  font: ChartCustomization['titleFont'];
  onChange: (key: string, value: unknown) => void;
  fontKey: string;
}

const FontSection: React.FC<FontSectionProps> = ({ title, font, onChange, fontKey }) => {
  const fonts: FontFamily[] = ['Mona Sans', 'Mona Sans Display', 'Mona Sans Mono', 'Inter', 'Roboto', 'Montserrat', 'Lato', 'Georgia'];
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{title}</p>
      <select
        value={font.family}
        onChange={e => onChange(fontKey, { ...font, family: e.target.value })}
        className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
      >
        {fonts.map(f => <option key={f} value={f}>{f}</option>)}
      </select>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400">Size</label>
          <input
            type="number"
            value={font.size}
            onChange={e => onChange(fontKey, { ...font, size: Number(e.target.value) })}
            min={8}
            max={72}
            className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400">Weight</label>
          <select
            value={font.weight}
            onChange={e => onChange(fontKey, { ...font, weight: e.target.value as 'bold' | 'normal' })}
            className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
          >
            <option value="normal">Normal</option>
            <option value="bold">Bold</option>
          </select>
        </div>
      </div>
      <ColorPicker
        label="Color"
        value={font.color}
        onChange={v => onChange(fontKey, { ...font, color: v })}
      />
    </div>
  );
};

interface CustomizationPanelProps {
  chartType: ChartType;
  chartLabels: string[];
  customization: ChartCustomization;
  onUpdateCustomization: <K extends keyof ChartCustomization>(key: K, value: ChartCustomization[K]) => void;
  onUpdateDatasetConfig: (index: number, config: Partial<ChartCustomization['datasetConfigs'][0]>) => void;
  onApplyPalette: (paletteId: PaletteId) => void;
  onExport: () => Promise<void>;
  onExportImage: (format: 'png' | 'jpeg') => void;
}

export const CustomizationPanel: React.FC<CustomizationPanelProps> = ({
  chartType,
  chartLabels,
  customization,
  onUpdateCustomization,
  onUpdateDatasetConfig,
  onApplyPalette,
  onExport,
  onExportImage,
}) => {
  const isCartesian = !['pie', 'doughnut', 'radar', 'polarArea'].includes(chartType);
  const isBar = chartType === 'bar';
  const isCombo = chartType === 'combo';
  const isLineOrArea = chartType === 'line' || chartType === 'area';
  const isRadar = chartType === 'radar';
  const isProportion = isProportionChart(chartType);

  return (
    <div className="h-full overflow-y-auto">
      {/* Export */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-2">
        <ExportButton onExport={onExport} />
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onExportImage('png')}
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            PNG
          </button>
          <button
            onClick={() => onExportImage('jpeg')}
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            JPEG
          </button>
        </div>
      </div>

      {/* General */}
      <Section title="General">
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400">Chart Title</label>
          <input
            value={customization.title}
            onChange={e => onUpdateCustomization('title', e.target.value)}
            className="w-full mt-1 text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
            placeholder="Enter chart title..."
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400">Subtitle</label>
          <input
            value={customization.subtitle}
            onChange={e => onUpdateCustomization('subtitle', e.target.value)}
            className="w-full mt-1 text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
            placeholder="Enter subtitle..."
          />
        </div>
        <Slider
          label="Aspect Ratio"
          value={customization.aspectRatio}
          min={0.5}
          max={4}
          step={0.1}
          onChange={v => onUpdateCustomization('aspectRatio', v)}
        />
        <Toggle
          label="Enable Animations"
          checked={customization.animationEnabled}
          onChange={v => onUpdateCustomization('animationEnabled', v)}
        />
        <Toggle
          label="Show Legend"
          checked={customization.showLegend}
          onChange={v => onUpdateCustomization('showLegend', v)}
        />
        {customization.showLegend && (
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400">Legend Position</label>
            <select
              value={customization.legendPosition}
              onChange={e => onUpdateCustomization('legendPosition', e.target.value as LegendPosition)}
              className="w-full mt-1 text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
            >
              <option value="top">Top</option>
              <option value="bottom">Bottom</option>
              <option value="left">Left</option>
              <option value="right">Right</option>
            </select>
          </div>
        )}
      </Section>

      {/* Theme / Palette */}
      <Section title="Theme">
        <div className="space-y-2">
          {PALETTES.map(palette => (
            <button
              key={palette.id}
              onClick={() => onApplyPalette(palette.id)}
              className={`w-full flex items-center gap-3 p-2 rounded-lg border transition-colors text-left ${
                customization.selectedPalette === palette.id
                  ? 'border-accent bg-accent-1 dark:bg-accent-6/20'
                  : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300 w-14 shrink-0">{palette.name}</span>
              <div className="flex gap-0.5 flex-wrap">
                {palette.colors.slice(0, 8).map((color, i) => (
                  <div
                    key={i}
                    className="w-4 h-4 rounded-sm border border-black/10"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </button>
          ))}
        </div>
      </Section>

      {/* Colors */}
      <Section title="Colors">
        {isProportion ? (
          chartLabels.map((label, i) => (
            <div key={i} className="space-y-1">
              <ColorPicker
                label={label || `Slice ${i + 1}`}
                value={(customization.sliceColors ?? [])[i] ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
                onChange={v => {
                  const updated = [...(customization.sliceColors ?? [])];
                  updated[i] = v;
                  onUpdateCustomization('sliceColors', updated);
                }}
              />
            </div>
          ))
        ) : (
          customization.datasetConfigs.map((cfg, i) => (
            <div key={i} className="space-y-2">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{cfg.label}</p>
              <ColorPicker
                label="Background"
                value={typeof cfg.backgroundColor === 'string' ? cfg.backgroundColor : cfg.backgroundColor[0]}
                onChange={v => onUpdateDatasetConfig(i, { backgroundColor: v })}
              />
              <ColorPicker
                label="Border"
                value={typeof cfg.borderColor === 'string' ? cfg.borderColor : cfg.borderColor[0]}
                onChange={v => onUpdateDatasetConfig(i, { borderColor: v })}
              />
              <Slider
                label="Border Width"
                value={cfg.borderWidth}
                min={0}
                max={10}
                onChange={v => onUpdateDatasetConfig(i, { borderWidth: v })}
                unit="px"
              />
            </div>
          ))
        )}
      </Section>

      {/* Fonts */}
      <Section title="Fonts" defaultOpen={false}>
        <FontSection
          title="Title"
          font={customization.titleFont}
          onChange={(_, v) => onUpdateCustomization('titleFont', v as ChartCustomization['titleFont'])}
          fontKey="titleFont"
        />
        <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
          <FontSection
            title="Subtitle"
            font={customization.subtitleFont}
            onChange={(_, v) => onUpdateCustomization('subtitleFont', v as ChartCustomization['subtitleFont'])}
            fontKey="subtitleFont"
          />
        </div>
        <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
          <FontSection
            title="Axis Labels"
            font={customization.axisLabelFont}
            onChange={(_, v) => onUpdateCustomization('axisLabelFont', v as ChartCustomization['axisLabelFont'])}
            fontKey="axisLabelFont"
          />
        </div>
        <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
          <FontSection
            title="Tick Labels"
            font={customization.tickLabelFont}
            onChange={(_, v) => onUpdateCustomization('tickLabelFont', v as ChartCustomization['tickLabelFont'])}
            fontKey="tickLabelFont"
          />
        </div>
        <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
          <FontSection
            title="Legend"
            font={customization.legendFont}
            onChange={(_, v) => onUpdateCustomization('legendFont', v as ChartCustomization['legendFont'])}
            fontKey="legendFont"
          />
        </div>
      </Section>

      {/* Axes */}
      {isCartesian && (
        <Section title="Axes" defaultOpen={false}>
          <Toggle
            label="Show Gridlines"
            checked={customization.showGridlines}
            onChange={v => onUpdateCustomization('showGridlines', v)}
          />
          <Toggle
            label="Show Axis Labels"
            checked={customization.showAxisLabels}
            onChange={v => onUpdateCustomization('showAxisLabels', v)}
          />
          {customization.showAxisLabels && (
            <>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">X-Axis Label</label>
                <input
                  value={customization.xAxisLabel}
                  onChange={e => onUpdateCustomization('xAxisLabel', e.target.value)}
                  className="w-full mt-1 text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Y-Axis Label</label>
                <input
                  value={customization.yAxisLabel}
                  onChange={e => onUpdateCustomization('yAxisLabel', e.target.value)}
                  className="w-full mt-1 text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                />
              </div>
            </>
          )}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400">Y Min</label>
              <input
                type="number"
                value={customization.yAxisMin ?? ''}
                onChange={e => onUpdateCustomization('yAxisMin', e.target.value === '' ? null : Number(e.target.value))}
                className="w-full mt-1 text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                placeholder="Auto"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400">Y Max</label>
              <input
                type="number"
                value={customization.yAxisMax ?? ''}
                onChange={e => onUpdateCustomization('yAxisMax', e.target.value === '' ? null : Number(e.target.value))}
                className="w-full mt-1 text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                placeholder="Auto"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400">Y Step</label>
              <input
                type="number"
                value={customization.yAxisStepSize ?? ''}
                onChange={e => onUpdateCustomization('yAxisStepSize', e.target.value === '' ? null : Number(e.target.value))}
                className="w-full mt-1 text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                placeholder="Auto"
                min={0.1}
                step={0.1}
              />
            </div>
          </div>
        </Section>
      )}

      {/* Bar Chart Options */}
      {(isBar || isCombo) && (
        <Section title="Bar Options" defaultOpen={false}>
          <Slider
            label="Border Radius"
            value={customization.barConfig.borderRadius}
            min={0}
            max={30}
            onChange={v => onUpdateCustomization('barConfig', { ...customization.barConfig, borderRadius: v })}
            unit="px"
          />
          <Toggle
            label="Grouped (vs Stacked)"
            checked={customization.barConfig.grouped}
            onChange={v => onUpdateCustomization('barConfig', { ...customization.barConfig, grouped: v, ...(v ? { stacked100: false } : {}) })}
          />
          {(isBar || isCombo) && !customization.barConfig.grouped && (
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-500 dark:text-gray-400">100% Stacked</label>
              <input
                type="checkbox"
                checked={customization.barConfig.stacked100}
                onChange={e => onUpdateCustomization('barConfig', {
                  ...customization.barConfig,
                  stacked100: e.target.checked,
                })}
              />
            </div>
          )}
          {isBar && (
            <Toggle
              label="Horizontal"
              checked={customization.barConfig.horizontal}
              onChange={v => onUpdateCustomization('barConfig', { ...customization.barConfig, horizontal: v })}
            />
          )}
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400">Bar Shape</label>
            <select
              value={customization.barConfig.shape ?? 'rectangle'}
              onChange={e => onUpdateCustomization('barConfig', { ...customization.barConfig, shape: e.target.value as BarShape })}
              className="w-full mt-1 text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
            >
              <option value="rectangle">Rectangle</option>
              <option value="rounded-pill">Rounded Pill</option>
              <option value="chevron">Chevron</option>
              <option value="hexagon">Hexagon</option>
              <option value="diamond">Diamond</option>
              <option value="triangle">Triangle</option>
            </select>
          </div>
        </Section>
      )}

      {/* Combo Options */}
      {isCombo && (
        <Section title="Combo Options" defaultOpen={false}>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400">Line Dataset</label>
            <select
              value={customization.comboConfig.lineDatasetIndex}
              onChange={e => onUpdateCustomization('comboConfig', { ...customization.comboConfig, lineDatasetIndex: Number(e.target.value) } as ComboConfig)}
              className="w-full mt-1 text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
            >
              <option value={-1}>Last Dataset</option>
              {customization.datasetConfigs.map((cfg, i) => (
                <option key={i} value={i}>{cfg.label}</option>
              ))}
            </select>
          </div>
          <Slider
            label="Line Tension"
            value={customization.comboConfig.lineTension}
            min={0}
            max={1}
            step={0.05}
            onChange={v => onUpdateCustomization('comboConfig', { ...customization.comboConfig, lineTension: v } as ComboConfig)}
          />
          <Slider
            label="Point Radius"
            value={customization.comboConfig.linePointRadius}
            min={0}
            max={20}
            onChange={v => onUpdateCustomization('comboConfig', { ...customization.comboConfig, linePointRadius: v } as ComboConfig)}
            unit="px"
          />
          <Toggle
            label="Fill Under Line"
            checked={customization.comboConfig.lineFill}
            onChange={v => onUpdateCustomization('comboConfig', { ...customization.comboConfig, lineFill: v } as ComboConfig)}
          />
        </Section>
      )}

      {/* Radar Options */}
      {isRadar && (
        <Section title="Radar Options" defaultOpen={false}>
          <Toggle
            label="Fill"
            checked={customization.radarConfig.fill}
            onChange={v => onUpdateCustomization('radarConfig', { ...customization.radarConfig, fill: v } as RadarConfig)}
          />
          <Slider
            label="Line Tension"
            value={customization.radarConfig.tension}
            min={0}
            max={1}
            step={0.05}
            onChange={v => onUpdateCustomization('radarConfig', { ...customization.radarConfig, tension: v } as RadarConfig)}
          />
          <Slider
            label="Point Radius"
            value={customization.radarConfig.pointRadius}
            min={0}
            max={20}
            onChange={v => onUpdateCustomization('radarConfig', { ...customization.radarConfig, pointRadius: v } as RadarConfig)}
            unit="px"
          />
        </Section>
      )}

      {/* Line / Area Options */}
      {isLineOrArea && (
        <Section title="Line Options" defaultOpen={false}>
          <Slider
            label="Line Tension"
            value={customization.lineConfig.tension}
            min={0}
            max={1}
            step={0.05}
            onChange={v => onUpdateCustomization('lineConfig', { ...customization.lineConfig, tension: v })}
          />
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400">Point Style</label>
            <select
              value={customization.lineConfig.pointStyle}
              onChange={e => onUpdateCustomization('lineConfig', { ...customization.lineConfig, pointStyle: e.target.value as PointStyle })}
              className="w-full mt-1 text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
            >
              {(['circle', 'cross', 'crossRot', 'dash', 'line', 'rect', 'rectRounded', 'rectRot', 'star', 'triangle'] as PointStyle[]).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <Slider
            label="Point Radius"
            value={customization.lineConfig.pointRadius}
            min={0}
            max={20}
            onChange={v => onUpdateCustomization('lineConfig', { ...customization.lineConfig, pointRadius: v })}
            unit="px"
          />
          <Toggle
            label="Fill Area"
            checked={customization.lineConfig.fill}
            onChange={v => onUpdateCustomization('lineConfig', { ...customization.lineConfig, fill: v })}
          />
        </Section>
      )}

      {/* Data Labels */}
      <Section title="Data Labels" defaultOpen={false}>
        <Toggle
          label="Show Data Labels"
          checked={customization.showDataLabels}
          onChange={v => onUpdateCustomization('showDataLabels', v)}
        />
        {customization.showDataLabels && (
          <>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400">Position</label>
              <select
                value={customization.dataLabelPosition}
                onChange={e => onUpdateCustomization('dataLabelPosition', e.target.value as DataLabelPosition)}
                className="w-full mt-1 text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                <option value="end">End (Outside)</option>
                <option value="center">Center</option>
                <option value="start">Start (Inside)</option>
                <option value="auto">Auto</option>
              </select>
            </div>
            {!isProportion ? null : (
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Format</label>
                <select
                  value={customization.dataLabelFormat}
                  onChange={e => onUpdateCustomization('dataLabelFormat', e.target.value as DataLabelFormat)}
                  className="w-full mt-1 text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                >
                  <option value="value">Value</option>
                  <option value="percentage">Percentage</option>
                  <option value="valueAndPercentage">Value + Percentage</option>
                </select>
              </div>
            )}
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400">Decimal Places</label>
              <input
                type="number"
                value={customization.numberFormat.decimalPlaces}
                onChange={e => onUpdateCustomization('numberFormat', { ...customization.numberFormat, decimalPlaces: Number(e.target.value) })}
                min={0}
                max={6}
                className="w-full mt-1 text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Label Font</p>
              <select
                value={customization.dataLabelFont.family}
                onChange={e => onUpdateCustomization('dataLabelFont', { ...customization.dataLabelFont, family: e.target.value as FontFamily })}
                className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                {(['Mona Sans', 'Mona Sans Display', 'Mona Sans Mono', 'Inter', 'Roboto', 'Montserrat', 'Lato', 'Georgia'] as FontFamily[]).map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">Size</label>
                  <input
                    type="number"
                    value={customization.dataLabelFont.size}
                    onChange={e => onUpdateCustomization('dataLabelFont', { ...customization.dataLabelFont, size: Number(e.target.value) })}
                    min={8}
                    max={32}
                    className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">Weight</label>
                  <select
                    value={customization.dataLabelFont.weight}
                    onChange={e => onUpdateCustomization('dataLabelFont', { ...customization.dataLabelFont, weight: e.target.value as 'bold' | 'normal' })}
                    className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  >
                    <option value="normal">Normal</option>
                    <option value="bold">Bold</option>
                  </select>
                </div>
              </div>
              <ColorPicker
                label="Color"
                value={customization.dataLabelFont.color}
                onChange={v => onUpdateCustomization('dataLabelFont', { ...customization.dataLabelFont, color: v })}
              />
            </div>
          </>
        )}
      </Section>

      {/* Number Format */}
      <Section title="Number Format" defaultOpen={false}>
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400">Format Type</label>
          <select
            value={customization.numberFormat.type}
            onChange={e => onUpdateCustomization('numberFormat', { ...customization.numberFormat, type: e.target.value as NumberFormatType })}
            className="w-full mt-1 text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
          >
            <option value="raw">Raw Number</option>
            <option value="currency">Currency</option>
            <option value="percent">Percent</option>
            <option value="abbreviated">Abbreviated (K / M / B)</option>
            <option value="custom">Custom Prefix / Suffix</option>
          </select>
        </div>

        {customization.numberFormat.type === 'currency' && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Symbol</label>
                <input
                  value={customization.numberFormat.currencySymbol}
                  onChange={e => onUpdateCustomization('numberFormat', { ...customization.numberFormat, currencySymbol: e.target.value })}
                  className="w-full mt-1 text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  placeholder="$"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Position</label>
                <select
                  value={customization.numberFormat.currencyPosition}
                  onChange={e => onUpdateCustomization('numberFormat', { ...customization.numberFormat, currencyPosition: e.target.value as 'prefix' | 'suffix' })}
                  className="w-full mt-1 text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                >
                  <option value="prefix">Prefix</option>
                  <option value="suffix">Suffix</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {customization.numberFormat.type === 'custom' && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400">Prefix</label>
              <input
                value={customization.numberFormat.prefix}
                onChange={e => onUpdateCustomization('numberFormat', { ...customization.numberFormat, prefix: e.target.value })}
                className="w-full mt-1 text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                placeholder="e.g. €"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400">Suffix</label>
              <input
                value={customization.numberFormat.suffix}
                onChange={e => onUpdateCustomization('numberFormat', { ...customization.numberFormat, suffix: e.target.value })}
                className="w-full mt-1 text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                placeholder="e.g.  units"
              />
            </div>
          </div>
        )}

        <Slider
          label="Decimal Places"
          value={customization.numberFormat.decimalPlaces}
          min={0}
          max={6}
          onChange={v => onUpdateCustomization('numberFormat', { ...customization.numberFormat, decimalPlaces: v })}
        />

        <Toggle
          label="Thousands Separator"
          checked={customization.numberFormat.thousandsSeparator}
          onChange={v => onUpdateCustomization('numberFormat', { ...customization.numberFormat, thousandsSeparator: v })}
        />

        {/* Live preview */}
        <div className="mt-1">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Preview</p>
          <div className="flex gap-2 text-xs font-mono text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/50 rounded px-2 py-1.5">
            {[1234567, -42500, 0.75].map(n => (
              <span key={n} className="border-r border-gray-200 dark:border-gray-700 pr-2 last:border-0 last:pr-0">
                {formatNumber(n, customization.numberFormat)}
              </span>
            ))}
          </div>
        </div>
      </Section>

      {/* Padding */}
      <Section title="Padding" defaultOpen={false}>
        <Slider
          label="Top"
          value={customization.paddingTop}
          min={0}
          max={100}
          onChange={v => onUpdateCustomization('paddingTop', v)}
          unit="px"
        />
        <Slider
          label="Bottom"
          value={customization.paddingBottom}
          min={0}
          max={100}
          onChange={v => onUpdateCustomization('paddingBottom', v)}
          unit="px"
        />
        <Slider
          label="Left"
          value={customization.paddingLeft}
          min={0}
          max={100}
          onChange={v => onUpdateCustomization('paddingLeft', v)}
          unit="px"
        />
        <Slider
          label="Right"
          value={customization.paddingRight}
          min={0}
          max={100}
          onChange={v => onUpdateCustomization('paddingRight', v)}
          unit="px"
        />
      </Section>
    </div>
  );
};
