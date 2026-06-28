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

export function mergeCellStyle(currentStyle, nextStyle) {
  if (nextStyle == null) return undefined;
  const merged = {...(currentStyle || {}), ...nextStyle};
  for (const [key, value] of Object.entries(merged)) {
    if (value == null || value === '') delete merged[key];
  }
  return Object.keys(merged).length ? merged : undefined;
}

function clonePlainRecord(record) {
  return record && typeof record === 'object' ? {...record} : record;
}

function cloneRange(range) {
  return range ? {r1: range.r1, c1: range.c1, r2: range.r2, c2: range.c2} : null;
}

function rangeRulesFromStore(store) {
  if (!store) return [];
  if (store instanceof Map) return Array.from(store.values());
  if (Array.isArray(store)) return store;
  if (typeof store === 'object') return Object.values(store);
  return [];
}

export function cloneRangeStyleRule(rule = {}) {
  const range = cloneRange(rule.range);
  return {
    ...rule,
    range,
    style: clonePlainRecord(rule.style),
    replace: Boolean(rule.replace),
  };
}

export function cloneRangeFormatRule(rule = {}) {
  const range = cloneRange(rule.range);
  return {
    ...rule,
    range,
    format: clonePlainRecord(rule.format),
    replace: Boolean(rule.replace),
  };
}

export function rangeContainsCell(range, row, col) {
  return Boolean(range)
    && row >= range.r1
    && row <= range.r2
    && col >= range.c1
    && col <= range.c2;
}

export function getRangeStyleForCell(sheet, row, col) {
  let style;
  for (const rule of rangeRulesFromStore(sheet?.rangeStyles)) {
    if (!rangeContainsCell(rule.range, row, col)) continue;
    style = rule.replace
      ? mergeCellStyle(undefined, rule.style)
      : mergeCellStyle(style, rule.style);
  }
  return style;
}

export function getRangeFormatForCell(sheet, row, col) {
  let format;
  for (const rule of rangeRulesFromStore(sheet?.rangeFormats)) {
    if (!rangeContainsCell(rule.range, row, col)) continue;
    format = rule.replace
      ? mergeCellFormat(undefined, rule.format)
      : mergeCellFormat(format, rule.format);
  }
  return format;
}

export function getEffectiveCellStyle(sheet, row, col, cellStyle) {
  const rangeStyle = getRangeStyleForCell(sheet, row, col);
  return cellStyle == null ? rangeStyle : mergeCellStyle(rangeStyle, cellStyle);
}

export function getEffectiveCellFormat(sheet, row, col, cellFormat) {
  const rangeFormat = getRangeFormatForCell(sheet, row, col);
  return cellFormat == null ? rangeFormat : mergeCellFormat(rangeFormat, cellFormat);
}
