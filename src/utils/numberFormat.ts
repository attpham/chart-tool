import { NumberFormatConfig } from '../types/chart';

function applyThousandsSeparator(intPart: string): string {
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatDecimal(value: number, decimalPlaces: number, thousandsSep: boolean): string {
  const negative = value < 0;
  const abs = Math.abs(value);
  const fixed = abs.toFixed(decimalPlaces);

  if (!thousandsSep) {
    return (negative ? '-' : '') + fixed;
  }

  const dotIndex = fixed.indexOf('.');
  const intPart = dotIndex >= 0 ? fixed.slice(0, dotIndex) : fixed;
  const decPart = dotIndex >= 0 ? fixed.slice(dotIndex) : '';
  return (negative ? '-' : '') + applyThousandsSeparator(intPart) + decPart;
}

export function formatNumber(value: number, config: NumberFormatConfig): string {
  const { type, decimalPlaces, thousandsSeparator, currencySymbol, currencyPosition, prefix, suffix } = config;

  switch (type) {
    case 'abbreviated': {
      const abs = Math.abs(value);
      if (abs >= 1e9) {
        return formatDecimal(value / 1e9, decimalPlaces, thousandsSeparator) + 'B';
      }
      if (abs >= 1e6) {
        return formatDecimal(value / 1e6, decimalPlaces, thousandsSeparator) + 'M';
      }
      if (abs >= 1e3) {
        return formatDecimal(value / 1e3, decimalPlaces, thousandsSeparator) + 'K';
      }
      return formatDecimal(value, decimalPlaces, thousandsSeparator);
    }
    case 'currency': {
      const formatted = formatDecimal(value, decimalPlaces, thousandsSeparator);
      return currencyPosition === 'prefix'
        ? currencySymbol + formatted
        : formatted + currencySymbol;
    }
    case 'percent': {
      return formatDecimal(value, decimalPlaces, thousandsSeparator) + '%';
    }
    case 'custom': {
      return prefix + formatDecimal(value, decimalPlaces, thousandsSeparator) + suffix;
    }
    default: // 'raw'
      return formatDecimal(value, decimalPlaces, thousandsSeparator);
  }
}
