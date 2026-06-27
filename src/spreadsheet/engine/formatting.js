import {toNumber} from '../model/formulas.js';

export const NumberFormatType = {
  GENERAL: 'general',
  NUMBER: 'number',
  CURRENCY: 'currency',
  PERCENT: 'percent',
  DATE: 'date',
  TEXT: 'text',
};

function asDate(value) {
  if (value instanceof Date) return value;
  if (typeof value === 'number') return new Date(Math.round((value - 25569) * 86400 * 1000));
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatNumber(value, options = {}) {
  const number = toNumber(value);
  const minimumFractionDigits = options.minimumFractionDigits ?? options.decimals ?? 0;
  const maximumFractionDigits = options.maximumFractionDigits ?? options.decimals ?? 2;
  return new Intl.NumberFormat(options.locale || 'en-US', {
    minimumFractionDigits,
    maximumFractionDigits,
    useGrouping: options.useGrouping !== false,
  }).format(number);
}

export function formatValue(value, format = {}, options = {}) {
  const type = format?.type || NumberFormatType.GENERAL;
  const locale = format.locale || options.locale || 'en-US';
  if (value == null) return '';
  if (type === NumberFormatType.TEXT) return String(value);
  if (type === NumberFormatType.NUMBER) return formatNumber(value, {...format, locale});
  if (type === NumberFormatType.CURRENCY) {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: format.currency || options.currency || 'USD',
      minimumFractionDigits: format.minimumFractionDigits ?? format.decimals ?? 2,
      maximumFractionDigits: format.maximumFractionDigits ?? format.decimals ?? 2,
    }).format(toNumber(value));
  }
  if (type === NumberFormatType.PERCENT) {
    return new Intl.NumberFormat(locale, {
      style: 'percent',
      minimumFractionDigits: format.minimumFractionDigits ?? format.decimals ?? 0,
      maximumFractionDigits: format.maximumFractionDigits ?? format.decimals ?? 2,
    }).format(toNumber(value));
  }
  if (type === NumberFormatType.DATE) {
    const date = asDate(value);
    if (!date) return String(value);
    return new Intl.DateTimeFormat(locale, format.dateStyle ? {dateStyle: format.dateStyle} : {
      year: format.year || 'numeric',
      month: format.month || 'short',
      day: format.day || 'numeric',
    }).format(date);
  }
  return String(value);
}

export function mergeCellFormat(currentFormat, nextFormat) {
  if (nextFormat == null) return undefined;
  return {...(currentFormat || {}), ...nextFormat};
}
