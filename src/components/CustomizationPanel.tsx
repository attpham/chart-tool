import React, { useState } from 'react';
import { ChartCustomization, ChartType, FontFamily, PointStyle, LegendPosition, PaletteId } from '../types/chart';
import { PALETTES } from '../data/palettes';
import { ColorPicker } from './ColorPicker';
import { ExportButton } from './ExportButton';

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
      className="w-full h-1.5 rounded-full appearance-none bg-gray-200 dark:bg-gray-600 accent-indigo-500"
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
      className={`relative w-10 h-5 rounded-full transition-colors ${checked ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-600'}`}
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
  customization: ChartCustomization;
  onUpdateCustomization: <K extends keyof ChartCustomization>(key: K, value: ChartCustomization[K]) => void;
  onUpdateDatasetConfig: (index: number, config: Partial<ChartCustomization['datasetConfigs'][0]>) => void;
  onApplyPalette: (paletteId: PaletteId) => void;
  onExport: () => Promise<void>;
}

export const CustomizationPanel: React.FC<CustomizationPanelProps> = ({
  chartType,
  customization,
  onUpdateCustomization,
  onUpdateDatasetConfig,
  onApplyPalette,
  onExport,
}) => {
  const isCartesian = !['pie', 'doughnut'].includes(chartType);
  const isBar = chartType === 'bar';
  const isLineOrArea = chartType === 'line' || chartType === 'area';

  return (
    <div className="h-full overflow-y-auto">
      {/* Export */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <ExportButton onExport={onExport} />
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
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
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
        {customization.datasetConfigs.map((cfg, i) => (
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
        ))}
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
        </Section>
      )}

      {/* Bar Chart Options */}
      {isBar && (
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
            onChange={v => onUpdateCustomization('barConfig', { ...customization.barConfig, grouped: v })}
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
