import React, { useId } from 'react';
import { PictorialConfig } from '../types/chart';
import { PICTORIAL_SHAPES } from '../data/pictorialShapes';

interface PictorialChartProps {
  value: number;
  config: PictorialConfig;
  isDarkMode: boolean;
}

export const PictorialChart: React.FC<PictorialChartProps> = ({ value, config, isDarkMode }) => {
  const shape = PICTORIAL_SHAPES[config.shape];
  const clampedValue = Math.min(100, Math.max(0, value));

  const descriptorColor = isDarkMode ? '#9ca3af' : '#6b7280';

  const textBlock = config.showLabel ? (
    <div className="flex flex-col justify-center shrink-0" style={{ minWidth: 120 }}>
      <span
        className="font-bold leading-none"
        style={{ fontSize: config.labelSize, color: config.activeColor }}
      >
        {Math.round(clampedValue)}%
      </span>
      {config.descriptor && (
        <span
          className="mt-2 leading-snug"
          style={{ fontSize: config.descriptorSize, color: descriptorColor, maxWidth: 200 }}
        >
          {config.descriptor}
        </span>
      )}
    </div>
  ) : null;

  const visual = config.mode === 'fill'
    ? <FillMode value={clampedValue} config={config} shape={shape} />
    : <GridMode value={clampedValue} config={config} shape={shape} />;

  return (
    <div className="flex items-center gap-8 p-4 w-full h-full justify-center">
      {config.labelPosition === 'left' && textBlock}
      {visual}
      {config.labelPosition === 'right' && textBlock}
    </div>
  );
};

interface ModeProps {
  value: number;
  config: PictorialConfig;
  shape: { path: string; viewBox: string; label: string };
}

const FillMode: React.FC<ModeProps> = ({ value, config, shape }) => {
  const size = 180;
  const id = useId();
  const clipId = `fill-clip-${id}`;

  // Parse viewBox to get the coordinate space dimensions
  const [, , vbWidth, vbHeight] = shape.viewBox.split(' ').map(Number);

  const clipRect = config.fillDirection === 'up'
    ? {
        x: 0,
        y: vbHeight - (vbHeight * value / 100),
        width: vbWidth,
        height: vbHeight * value / 100,
      }
    : {
        x: 0,
        y: 0,
        width: vbWidth * value / 100,
        height: vbHeight,
      };

  return (
    <svg
      viewBox={shape.viewBox}
      width={size}
      height={size}
      style={{ display: 'block' }}
      aria-label={`${Math.round(value)}% filled ${config.shape}`}
    >
      {/* Background (unfilled) */}
      <path d={shape.path} fill={config.inactiveColor} />
      {/* Foreground (filled) with clip */}
      <defs>
        <clipPath id={clipId}>
          <rect
            x={clipRect.x}
            y={clipRect.y}
            width={clipRect.width}
            height={clipRect.height}
          />
        </clipPath>
      </defs>
      <path d={shape.path} fill={config.activeColor} clipPath={`url(#${clipId})`} />
    </svg>
  );
};

const GridMode: React.FC<ModeProps> = ({ value, config, shape }) => {
  const iconSize = 24;
  const total = 100;
  const cols = Math.max(1, config.gridColumns);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, ${iconSize}px)`,
        gap: 4,
      }}
      aria-label={`${Math.round(value)} of 100 icons filled`}
    >
      {Array.from({ length: total }, (_, i) => (
        <svg
          key={i}
          viewBox={shape.viewBox}
          width={iconSize}
          height={iconSize}
          style={{ display: 'block' }}
        >
          <path
            d={shape.path}
            fill={i < value ? config.activeColor : config.inactiveColor}
          />
        </svg>
      ))}
    </div>
  );
};
