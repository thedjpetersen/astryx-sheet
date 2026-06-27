import {cellAddress, cellKey, columnName, parseCellAddress, parseRange} from './address.js';
import {defaultCellValue} from './defaultData.js';

export const FORMULA_CATALOG = Object.freeze([
  {name: 'SUM', category: 'Math', picker: true},
  {name: 'AVERAGE', category: 'Statistical', picker: true},
  {name: 'MIN', category: 'Statistical', picker: true},
  {name: 'MAX', category: 'Statistical', picker: true},
  {name: 'COUNT', category: 'Statistical', picker: true},
  {name: 'COUNTA', category: 'Statistical', picker: true},
  {name: 'COUNTBLANK', category: 'Statistical', picker: true},
  {name: 'AVERAGEA', category: 'Statistical', picker: true},
  {name: 'MEDIAN', category: 'Statistical', picker: true},
  {name: 'MODE.SNGL', category: 'Statistical', picker: true},
  {name: 'GEOMEAN', category: 'Statistical', picker: true},
  {name: 'HARMEAN', category: 'Statistical', picker: true},
  {name: 'LARGE', category: 'Statistical', picker: true},
  {name: 'SMALL', category: 'Statistical', picker: true},
  {name: 'RANK', category: 'Statistical', picker: true},
  {name: 'RANK.EQ', category: 'Statistical', picker: false},
  {name: 'RANK.AVG', category: 'Statistical', picker: false},
  {name: 'PERCENTILE.INC', category: 'Statistical', picker: true},
  {name: 'PERCENTILE.EXC', category: 'Statistical', picker: false},
  {name: 'QUARTILE.INC', category: 'Statistical', picker: true},
  {name: 'QUARTILE.EXC', category: 'Statistical', picker: false},
  {name: 'STDEV.S', category: 'Statistical', picker: true},
  {name: 'STDEV.P', category: 'Statistical', picker: false},
  {name: 'VAR.S', category: 'Statistical', picker: false},
  {name: 'VAR.P', category: 'Statistical', picker: false},
  {name: 'CORREL', category: 'Statistical', picker: true},
  {name: 'COVARIANCE.P', category: 'Statistical', picker: false},
  {name: 'COVARIANCE.S', category: 'Statistical', picker: false},
  {name: 'SLOPE', category: 'Statistical', picker: true},
  {name: 'INTERCEPT', category: 'Statistical', picker: true},
  {name: 'RSQ', category: 'Statistical', picker: false},
  {name: 'FORECAST.LINEAR', category: 'Statistical', picker: true},
  {name: 'FORECAST', category: 'Statistical', picker: false},
  {name: 'SUMPRODUCT', category: 'Math', picker: true},
  {name: 'PRODUCT', category: 'Math', picker: true},
  {name: 'SUMSQ', category: 'Math', picker: true},
  {name: 'PMT', category: 'Financial', picker: true},
  {name: 'PV', category: 'Financial', picker: true},
  {name: 'FV', category: 'Financial', picker: true},
  {name: 'NPER', category: 'Financial', picker: true},
  {name: 'RATE', category: 'Financial', picker: true},
  {name: 'IPMT', category: 'Financial', picker: true},
  {name: 'PPMT', category: 'Financial', picker: true},
  {name: 'NPV', category: 'Financial', picker: true},
  {name: 'IRR', category: 'Financial', picker: true},
  {name: 'XNPV', category: 'Financial', picker: true},
  {name: 'XIRR', category: 'Financial', picker: true},
  {name: 'SUMIF', category: 'Math', picker: true},
  {name: 'COUNTIF', category: 'Statistical', picker: true},
  {name: 'AVERAGEIF', category: 'Statistical', picker: true},
  {name: 'SUMIFS', category: 'Math', picker: true},
  {name: 'COUNTIFS', category: 'Statistical', picker: true},
  {name: 'AVERAGEIFS', category: 'Statistical', picker: true},
  {name: 'MINIFS', category: 'Statistical', picker: true},
  {name: 'MAXIFS', category: 'Statistical', picker: true},
  {name: 'XLOOKUP', category: 'Lookup', picker: true},
  {name: 'LOOKUP', category: 'Lookup', picker: true},
  {name: 'VLOOKUP', category: 'Lookup', picker: true},
  {name: 'HLOOKUP', category: 'Lookup', picker: true},
  {name: 'INDEX', category: 'Lookup', picker: true},
  {name: 'MATCH', category: 'Lookup', picker: true},
  {name: 'XMATCH', category: 'Lookup', picker: true},
  {name: 'FILTER', category: 'Dynamic Array', picker: true},
  {name: 'UNIQUE', category: 'Dynamic Array', picker: true},
  {name: 'SORT', category: 'Dynamic Array', picker: true},
  {name: 'SEQUENCE', category: 'Dynamic Array', picker: true},
  {name: 'TRANSPOSE', category: 'Dynamic Array', picker: true},
  {name: 'HSTACK', category: 'Dynamic Array', picker: true},
  {name: 'VSTACK', category: 'Dynamic Array', picker: true},
  {name: 'TAKE', category: 'Dynamic Array', picker: true},
  {name: 'DROP', category: 'Dynamic Array', picker: true},
  {name: 'CHOOSECOLS', category: 'Dynamic Array', picker: true},
  {name: 'CHOOSEROWS', category: 'Dynamic Array', picker: true},
  {name: 'ROW', category: 'Reference', picker: true},
  {name: 'COLUMN', category: 'Reference', picker: true},
  {name: 'ROWS', category: 'Reference', picker: true},
  {name: 'COLUMNS', category: 'Reference', picker: true},
  {name: 'ADDRESS', category: 'Reference', picker: true},
  {name: 'INDIRECT', category: 'Reference', picker: true},
  {name: 'OFFSET', category: 'Reference', picker: true},
  {name: 'LET', category: 'Logical', picker: true},
  {name: 'IF', category: 'Logical', picker: true},
  {name: 'IFS', category: 'Logical', picker: true},
  {name: 'SWITCH', category: 'Logical', picker: false},
  {name: 'CHOOSE', category: 'Lookup', picker: false},
  {name: 'IFERROR', category: 'Logical', picker: true},
  {name: 'IFNA', category: 'Logical', picker: false},
  {name: 'TRUE', category: 'Logical', picker: false},
  {name: 'FALSE', category: 'Logical', picker: false},
  {name: 'AND', category: 'Logical', picker: false},
  {name: 'OR', category: 'Logical', picker: false},
  {name: 'XOR', category: 'Logical', picker: false},
  {name: 'NOT', category: 'Logical', picker: false},
  {name: 'ISERROR', category: 'Information', picker: true},
  {name: 'ISERR', category: 'Information', picker: false},
  {name: 'ISNA', category: 'Information', picker: false},
  {name: 'ISBLANK', category: 'Information', picker: false},
  {name: 'ISNUMBER', category: 'Information', picker: false},
  {name: 'ISTEXT', category: 'Information', picker: false},
  {name: 'ISLOGICAL', category: 'Information', picker: false},
  {name: 'ISNONTEXT', category: 'Information', picker: false},
  {name: 'ISEVEN', category: 'Information', picker: false},
  {name: 'ISODD', category: 'Information', picker: false},
  {name: 'ISFORMULA', category: 'Information', picker: false},
  {name: 'FORMULATEXT', category: 'Information', picker: false},
  {name: 'N', category: 'Information', picker: false},
  {name: 'T', category: 'Information', picker: false},
  {name: 'NA', category: 'Information', picker: false},
  {name: 'TYPE', category: 'Information', picker: false},
  {name: 'ERROR.TYPE', category: 'Information', picker: false},
  {name: 'ROUND', category: 'Math', picker: true},
  {name: 'MROUND', category: 'Math', picker: true},
  {name: 'ROUNDUP', category: 'Math', picker: false},
  {name: 'ROUNDDOWN', category: 'Math', picker: false},
  {name: 'QUOTIENT', category: 'Math', picker: false},
  {name: 'ABS', category: 'Math', picker: false},
  {name: 'SQRT', category: 'Math', picker: false},
  {name: 'POWER', category: 'Math', picker: false},
  {name: 'EXP', category: 'Math', picker: false},
  {name: 'LN', category: 'Math', picker: false},
  {name: 'LOG', category: 'Math', picker: false},
  {name: 'LOG10', category: 'Math', picker: false},
  {name: 'PI', category: 'Math', picker: true},
  {name: 'SIN', category: 'Math', picker: false},
  {name: 'COS', category: 'Math', picker: false},
  {name: 'TAN', category: 'Math', picker: false},
  {name: 'RADIANS', category: 'Math', picker: false},
  {name: 'DEGREES', category: 'Math', picker: false},
  {name: 'MOD', category: 'Math', picker: false},
  {name: 'INT', category: 'Math', picker: false},
  {name: 'TRUNC', category: 'Math', picker: false},
  {name: 'EVEN', category: 'Math', picker: false},
  {name: 'ODD', category: 'Math', picker: false},
  {name: 'SIGN', category: 'Math', picker: false},
  {name: 'CEILING', category: 'Math', picker: false},
  {name: 'FLOOR', category: 'Math', picker: false},
  {name: 'FACT', category: 'Math', picker: false},
  {name: 'FACTDOUBLE', category: 'Math', picker: false},
  {name: 'GCD', category: 'Math', picker: false},
  {name: 'LCM', category: 'Math', picker: false},
  {name: 'COMBIN', category: 'Math', picker: false},
  {name: 'PERMUT', category: 'Math', picker: false},
  {name: 'DATE', category: 'Date', picker: true},
  {name: 'TIME', category: 'Date', picker: true},
  {name: 'DATEVALUE', category: 'Date', picker: true},
  {name: 'TIMEVALUE', category: 'Date', picker: true},
  {name: 'YEAR', category: 'Date', picker: true},
  {name: 'MONTH', category: 'Date', picker: true},
  {name: 'DAY', category: 'Date', picker: true},
  {name: 'HOUR', category: 'Date', picker: true},
  {name: 'MINUTE', category: 'Date', picker: true},
  {name: 'SECOND', category: 'Date', picker: true},
  {name: 'WEEKNUM', category: 'Date', picker: true},
  {name: 'ISOWEEKNUM', category: 'Date', picker: true},
  {name: 'DAYS', category: 'Date', picker: true},
  {name: 'DAYS360', category: 'Date', picker: true},
  {name: 'YEARFRAC', category: 'Date', picker: true},
  {name: 'DATEDIF', category: 'Date', picker: true},
  {name: 'WEEKDAY', category: 'Date', picker: true},
  {name: 'NETWORKDAYS', category: 'Date', picker: true},
  {name: 'NETWORKDAYS.INTL', category: 'Date', picker: true},
  {name: 'WORKDAY', category: 'Date', picker: true},
  {name: 'WORKDAY.INTL', category: 'Date', picker: true},
  {name: 'EDATE', category: 'Date', picker: false},
  {name: 'EOMONTH', category: 'Date', picker: false},
  {name: 'TODAY', category: 'Date', picker: false},
  {name: 'NOW', category: 'Date', picker: false},
  {name: 'RAND', category: 'Math', picker: false},
  {name: 'RANDBETWEEN', category: 'Math', picker: false},
  {name: 'LEN', category: 'Text', picker: true},
  {name: 'TRIM', category: 'Text', picker: false},
  {name: 'UPPER', category: 'Text', picker: false},
  {name: 'LOWER', category: 'Text', picker: false},
  {name: 'PROPER', category: 'Text', picker: true},
  {name: 'LEFT', category: 'Text', picker: true},
  {name: 'RIGHT', category: 'Text', picker: true},
  {name: 'MID', category: 'Text', picker: true},
  {name: 'FIND', category: 'Text', picker: false},
  {name: 'SEARCH', category: 'Text', picker: false},
  {name: 'CHAR', category: 'Text', picker: false},
  {name: 'CODE', category: 'Text', picker: false},
  {name: 'VALUE', category: 'Text', picker: false},
  {name: 'NUMBERVALUE', category: 'Text', picker: true},
  {name: 'EXACT', category: 'Text', picker: false},
  {name: 'REPT', category: 'Text', picker: false},
  {name: 'CLEAN', category: 'Text', picker: false},
  {name: 'REPLACE', category: 'Text', picker: false},
  {name: 'SUBSTITUTE', category: 'Text', picker: false},
  {name: 'FIXED', category: 'Text', picker: false},
  {name: 'DOLLAR', category: 'Text', picker: false},
  {name: 'TEXT', category: 'Text', picker: true},
  {name: 'TEXTBEFORE', category: 'Text', picker: true},
  {name: 'TEXTAFTER', category: 'Text', picker: true},
  {name: 'TEXTJOIN', category: 'Text', picker: true},
  {name: 'CONCAT', category: 'Text', picker: true},
]);

export const VOLATILE_FORMULA_FUNCTIONS = Object.freeze(['TODAY', 'NOW', 'RAND', 'RANDBETWEEN', 'INDIRECT', 'OFFSET']);
const VOLATILE_FORMULA_PATTERN = new RegExp(`\\b(?:${VOLATILE_FORMULA_FUNCTIONS.join('|')})\\s*\\(`, 'i');
const FORMULA_FUNCTION_NAME_SET = new Set(FORMULA_CATALOG.map((item) => item.name));
const FORMULA_REFERENCE_COLORS = Object.freeze(['blue', 'green', 'purple', 'orange', 'teal', 'pink']);
const COMMON_FORMULA_SUGGESTION_NAMES = new Set([
  'SUM',
  'AVERAGE',
  'MIN',
  'MAX',
  'COUNT',
  'COUNTA',
  'SUMIF',
  'SUMIFS',
  'COUNTIF',
  'COUNTIFS',
  'IF',
  'IFERROR',
  'XLOOKUP',
  'VLOOKUP',
  'INDEX',
  'MATCH',
  'FILTER',
  'UNIQUE',
  'SORT',
  'ROUND',
  'ROUNDUP',
  'ROUNDDOWN',
  'TEXT',
  'TODAY',
  'NOW',
]);

export function listFormulaFunctions(options = {}) {
  const functions = options.pickerOnly ? FORMULA_CATALOG.filter((item) => item.picker !== false) : FORMULA_CATALOG;
  return options.category ? functions.filter((item) => item.category === options.category) : functions;
}

const FORMULA_HELP = Object.freeze({
  SUM: {signature: 'SUM(number1, [number2], ...)', description: 'Adds numbers from values, cells, or ranges.'},
  AVERAGE: {signature: 'AVERAGE(number1, [number2], ...)', description: 'Returns the arithmetic mean of numeric values.'},
  MIN: {signature: 'MIN(number1, [number2], ...)', description: 'Returns the smallest numeric value.'},
  MAX: {signature: 'MAX(number1, [number2], ...)', description: 'Returns the largest numeric value.'},
  COUNT: {signature: 'COUNT(value1, [value2], ...)', description: 'Counts numeric values.'},
  COUNTA: {signature: 'COUNTA(value1, [value2], ...)', description: 'Counts non-empty values.'},
  COUNTBLANK: {signature: 'COUNTBLANK(range)', description: 'Counts empty cells in a range.'},
  AVERAGEA: {signature: 'AVERAGEA(value1, [value2], ...)', description: 'Returns the average while counting text and logical values.'},
  MEDIAN: {signature: 'MEDIAN(number1, [number2], ...)', description: 'Returns the median numeric value.'},
  'MODE.SNGL': {signature: 'MODE.SNGL(number1, [number2], ...)', description: 'Returns the most frequently occurring value.'},
  GEOMEAN: {signature: 'GEOMEAN(number1, [number2], ...)', description: 'Returns the geometric mean of positive values.'},
  HARMEAN: {signature: 'HARMEAN(number1, [number2], ...)', description: 'Returns the harmonic mean of positive values.'},
  LARGE: {signature: 'LARGE(array, k)', description: 'Returns the kth largest value in a data set.'},
  SMALL: {signature: 'SMALL(array, k)', description: 'Returns the kth smallest value in a data set.'},
  RANK: {signature: 'RANK(number, ref, [order])', description: 'Returns the rank of a number in a list.'},
  'RANK.EQ': {signature: 'RANK.EQ(number, ref, [order])', description: 'Returns the rank of a number in a list.'},
  'RANK.AVG': {signature: 'RANK.AVG(number, ref, [order])', description: 'Returns the average rank when values are tied.'},
  'PERCENTILE.INC': {signature: 'PERCENTILE.INC(array, k)', description: 'Returns the inclusive kth percentile of values.'},
  'PERCENTILE.EXC': {signature: 'PERCENTILE.EXC(array, k)', description: 'Returns the exclusive kth percentile of values.'},
  'QUARTILE.INC': {signature: 'QUARTILE.INC(array, quartile)', description: 'Returns an inclusive quartile of a data set.'},
  'QUARTILE.EXC': {signature: 'QUARTILE.EXC(array, quartile)', description: 'Returns an exclusive quartile of a data set.'},
  SUMIF: {signature: 'SUMIF(range, criterion, [sum_range])', description: 'Adds values whose paired cells match one condition.'},
  SUMIFS: {signature: 'SUMIFS(sum_range, criteria_range1, criterion1, [criteria_range2, criterion2], ...)', description: 'Adds values that match multiple conditions.'},
  COUNTIF: {signature: 'COUNTIF(range, criterion)', description: 'Counts cells that match one condition.'},
  COUNTIFS: {signature: 'COUNTIFS(criteria_range1, criterion1, [criteria_range2, criterion2], ...)', description: 'Counts cells that match multiple conditions.'},
  AVERAGEIF: {signature: 'AVERAGEIF(range, criterion, [average_range])', description: 'Averages values whose paired cells match one condition.'},
  AVERAGEIFS: {signature: 'AVERAGEIFS(average_range, criteria_range1, criterion1, [criteria_range2, criterion2], ...)', description: 'Averages values that match multiple conditions.'},
  MINIFS: {signature: 'MINIFS(min_range, criteria_range1, criterion1, [criteria_range2, criterion2], ...)', description: 'Returns the minimum value that matches multiple conditions.'},
  MAXIFS: {signature: 'MAXIFS(max_range, criteria_range1, criterion1, [criteria_range2, criterion2], ...)', description: 'Returns the maximum value that matches multiple conditions.'},
  XLOOKUP: {signature: 'XLOOKUP(search_key, lookup_range, result_range, [missing], [match_mode], [search_mode])', description: 'Finds a value in one range and returns the paired result.'},
  VLOOKUP: {signature: 'VLOOKUP(search_key, range, index, [is_sorted])', description: 'Searches the first column of a range and returns a column from the matched row.'},
  HLOOKUP: {signature: 'HLOOKUP(search_key, range, index, [is_sorted])', description: 'Searches the first row of a range and returns a row from the matched column.'},
  LOOKUP: {signature: 'LOOKUP(search_key, lookup_range, [result_range])', description: 'Returns the nearest matching value from a sorted lookup vector.'},
  INDEX: {signature: 'INDEX(reference, row, [column])', description: 'Returns a value at a row and column inside a range.'},
  MATCH: {signature: 'MATCH(search_key, range, [search_type])', description: 'Returns the relative position of a matched value.'},
  XMATCH: {signature: 'XMATCH(search_key, lookup_range, [match_mode], [search_mode])', description: 'Returns a matched position with exact, wildcard, or reverse search modes.'},
  FILTER: {signature: 'FILTER(array, include, [if_empty])', description: 'Returns rows or columns from an array that match a Boolean include vector.'},
  UNIQUE: {signature: 'UNIQUE(array, [by_col], [exactly_once])', description: 'Returns unique rows or columns from an array.'},
  SORT: {signature: 'SORT(array, [sort_index], [sort_order], [by_col])', description: 'Sorts rows or columns in an array by a selected index.'},
  SEQUENCE: {signature: 'SEQUENCE(rows, [columns], [start], [step])', description: 'Generates a rectangular numeric sequence.'},
  TRANSPOSE: {signature: 'TRANSPOSE(array)', description: 'Flips rows and columns in an array.'},
  HSTACK: {signature: 'HSTACK(array1, [array2], ...)', description: 'Appends arrays horizontally into one wider dynamic array.'},
  VSTACK: {signature: 'VSTACK(array1, [array2], ...)', description: 'Appends arrays vertically into one taller dynamic array.'},
  TAKE: {signature: 'TAKE(array, rows, [columns])', description: 'Returns rows or columns from the start or end of an array.'},
  DROP: {signature: 'DROP(array, rows, [columns])', description: 'Excludes rows or columns from the start or end of an array.'},
  CHOOSECOLS: {signature: 'CHOOSECOLS(array, col_num1, [col_num2], ...)', description: 'Returns selected columns from an array in the requested order.'},
  CHOOSEROWS: {signature: 'CHOOSEROWS(array, row_num1, [row_num2], ...)', description: 'Returns selected rows from an array in the requested order.'},
  ROW: {signature: 'ROW([reference])', description: 'Returns the row number for a reference or the current cell.'},
  COLUMN: {signature: 'COLUMN([reference])', description: 'Returns the column number for a reference or the current cell.'},
  ROWS: {signature: 'ROWS(range)', description: 'Returns the number of rows in a reference.'},
  COLUMNS: {signature: 'COLUMNS(range)', description: 'Returns the number of columns in a reference.'},
  ADDRESS: {signature: 'ADDRESS(row, column, [abs_type], [use_a1], [sheet])', description: 'Creates a cell reference as text.'},
  INDIRECT: {signature: 'INDIRECT(reference_text, [use_a1])', description: 'Returns the value or range described by reference text.'},
  OFFSET: {signature: 'OFFSET(reference, rows, columns, [height], [width])', description: 'Returns a reference shifted from a starting cell or range.'},
  LET: {signature: 'LET(name1, value1, calculation_or_name2, [value2], ...)', description: 'Assigns names to intermediate formula results and returns a final calculation.'},
  IF: {signature: 'IF(condition, value_if_true, value_if_false)', description: 'Returns one value when a condition is true and another when false.'},
  IFS: {signature: 'IFS(condition1, value1, [condition2, value2], ...)', description: 'Checks conditions in order and returns the first matching value.'},
  IFERROR: {signature: 'IFERROR(value, value_if_error)', description: 'Returns a fallback when a formula evaluates to an error.'},
  IFNA: {signature: 'IFNA(value, value_if_na)', description: 'Returns a fallback when a formula evaluates to #N/A.'},
  TRUE: {signature: 'TRUE()', description: 'Returns the logical value TRUE.'},
  FALSE: {signature: 'FALSE()', description: 'Returns the logical value FALSE.'},
  SWITCH: {signature: 'SWITCH(expression, case1, value1, ..., [default])', description: 'Matches an expression against cases and returns the paired value.'},
  CHOOSE: {signature: 'CHOOSE(index, value1, [value2], ...)', description: 'Returns a value selected by one-based index.'},
  AND: {signature: 'AND(logical1, [logical2], ...)', description: 'Returns TRUE when every argument is true.'},
  OR: {signature: 'OR(logical1, [logical2], ...)', description: 'Returns TRUE when at least one argument is true.'},
  XOR: {signature: 'XOR(logical1, [logical2], ...)', description: 'Returns TRUE when an odd number of arguments are true.'},
  NOT: {signature: 'NOT(logical)', description: 'Reverses a logical value.'},
  ROUND: {signature: 'ROUND(value, places)', description: 'Rounds a number to a specified number of decimal places.'},
  MROUND: {signature: 'MROUND(value, factor)', description: 'Rounds a number to the nearest multiple.'},
  PI: {signature: 'PI()', description: 'Returns the mathematical constant pi.'},
  PRODUCT: {signature: 'PRODUCT(number1, [number2], ...)', description: 'Multiplies numeric values.'},
  SUMPRODUCT: {signature: 'SUMPRODUCT(array1, [array2], ...)', description: 'Multiplies corresponding entries and sums the products.'},
  DATE: {signature: 'DATE(year, month, day)', description: 'Returns the serial number for a date.'},
  TIME: {signature: 'TIME(hour, minute, second)', description: 'Returns the serial fraction for a time.'},
  WEEKDAY: {signature: 'WEEKDAY(date, [type])', description: 'Returns the day of week for a date.'},
  WEEKNUM: {signature: 'WEEKNUM(date, [type])', description: 'Returns the week number for a date.'},
  ISOWEEKNUM: {signature: 'ISOWEEKNUM(date)', description: 'Returns the ISO week number for a date.'},
  DAYS: {signature: 'DAYS(end_date, start_date)', description: 'Returns the number of days between two dates.'},
  DAYS360: {signature: 'DAYS360(start_date, end_date, [method])', description: 'Returns days between dates using a 360-day year.'},
  YEARFRAC: {signature: 'YEARFRAC(start_date, end_date, [basis])', description: 'Returns the fraction of a year between two dates.'},
  DATEDIF: {signature: 'DATEDIF(start_date, end_date, unit)', description: 'Returns the difference between two dates in the requested unit.'},
  NETWORKDAYS: {signature: 'NETWORKDAYS(start_date, end_date, [holidays])', description: 'Counts workdays between two dates.'},
  'NETWORKDAYS.INTL': {signature: 'NETWORKDAYS.INTL(start_date, end_date, [weekend], [holidays])', description: 'Counts workdays with custom weekend rules.'},
  WORKDAY: {signature: 'WORKDAY(start_date, days, [holidays])', description: 'Returns a date offset by workdays.'},
  'WORKDAY.INTL': {signature: 'WORKDAY.INTL(start_date, days, [weekend], [holidays])', description: 'Returns a workday offset with custom weekend rules.'},
  TODAY: {signature: 'TODAY()', description: 'Returns the current date serial value.'},
  NOW: {signature: 'NOW()', description: 'Returns the current date and time serial value.'},
  RAND: {signature: 'RAND()', description: 'Returns a random number between 0 and 1.'},
  RANDBETWEEN: {signature: 'RANDBETWEEN(bottom, top)', description: 'Returns a random integer between two bounds.'},
  LEFT: {signature: 'LEFT(text, [num_chars])', description: 'Returns characters from the start of text.'},
  RIGHT: {signature: 'RIGHT(text, [num_chars])', description: 'Returns characters from the end of text.'},
  MID: {signature: 'MID(text, start_num, num_chars)', description: 'Returns characters from the middle of text.'},
  FIND: {signature: 'FIND(find_text, within_text, [start_num])', description: 'Returns the case-sensitive position of text inside text.'},
  SEARCH: {signature: 'SEARCH(find_text, within_text, [start_num])', description: 'Returns the case-insensitive position of text inside text.'},
  TEXT: {signature: 'TEXT(value, format)', description: 'Formats a value as text with a number or date pattern.'},
  TEXTJOIN: {signature: 'TEXTJOIN(delimiter, ignore_empty, text1, [text2], ...)', description: 'Combines text values with a delimiter.'},
  CONCAT: {signature: 'CONCAT(value1, [value2], ...)', description: 'Combines text values without a delimiter.'},
  TEXTBEFORE: {signature: 'TEXTBEFORE(text, delimiter, [instance], [match_mode], [match_end], [if_not_found])', description: 'Returns text before a delimiter.'},
  TEXTAFTER: {signature: 'TEXTAFTER(text, delimiter, [instance], [match_mode], [match_end], [if_not_found])', description: 'Returns text after a delimiter.'},
  NUMBERVALUE: {signature: 'NUMBERVALUE(text, [decimal_separator], [group_separator])', description: 'Converts localized numeric text to a number.'},
  PMT: {signature: 'PMT(rate, number_of_periods, present_value, [future_value], [type])', description: 'Returns the payment for a loan or annuity.'},
  PV: {signature: 'PV(rate, number_of_periods, payment, [future_value], [type])', description: 'Returns the present value of an investment or annuity.'},
  FV: {signature: 'FV(rate, number_of_periods, payment, [present_value], [type])', description: 'Returns the future value of an investment or annuity.'},
  NPER: {signature: 'NPER(rate, payment, present_value, [future_value], [type])', description: 'Returns the number of periods for an investment or loan.'},
  RATE: {signature: 'RATE(number_of_periods, payment, present_value, [future_value], [type], [guess])', description: 'Returns the interest rate per period.'},
  IPMT: {signature: 'IPMT(rate, period, number_of_periods, present_value, [future_value], [type])', description: 'Returns the interest payment for a period.'},
  PPMT: {signature: 'PPMT(rate, period, number_of_periods, present_value, [future_value], [type])', description: 'Returns the principal payment for a period.'},
  NPV: {signature: 'NPV(rate, value1, [value2], ...)', description: 'Returns the net present value of cash flows.'},
  IRR: {signature: 'IRR(values, [guess])', description: 'Returns the internal rate of return for periodic cash flows.'},
  XNPV: {signature: 'XNPV(rate, values, dates)', description: 'Returns net present value for irregular dated cash flows.'},
  XIRR: {signature: 'XIRR(values, dates, [guess])', description: 'Returns internal rate of return for irregular dated cash flows.'},
  NA: {signature: 'NA()', description: 'Returns the #N/A error value.'},
  CORREL: {signature: 'CORREL(data_y, data_x)', description: 'Returns the correlation coefficient for paired data.'},
  SLOPE: {signature: 'SLOPE(data_y, data_x)', description: 'Returns the slope of the linear regression line.'},
  FORECAST: {signature: 'FORECAST(x, data_y, data_x)', description: 'Predicts a y value for x from a linear trend.'},
  'FORECAST.LINEAR': {signature: 'FORECAST.LINEAR(x, data_y, data_x)', description: 'Predicts a y value for x from a linear trend.'},
  'STDEV.S': {signature: 'STDEV.S(value1, [value2], ...)', description: 'Estimates standard deviation from a sample.'},
  'STDEV.P': {signature: 'STDEV.P(value1, [value2], ...)', description: 'Calculates standard deviation for a population.'},
});

const FORMULA_ARGUMENT_HELP = Object.freeze({
  array: {description: 'A range, spilled array, or expression that returns a rectangular set of values.'},
  average_range: {description: 'The cells to average after every criteria range and criterion pair matches.'},
  basis: {description: 'The day-count basis used for year fraction calculations.'},
  bottom: {description: 'The lowest integer that RANDBETWEEN can return.'},
  calculation_or_name: {description: 'Either the final calculation to return, or the next local name in a LET name/value pair.'},
  col_num: {description: 'A one-based column position to return. Negative values count back from the end.'},
  column: {description: 'The one-based column number or reference column to use.'},
  columns: {description: 'The number of columns to return. This value must be at least 1 when supplied.'},
  condition: {description: 'A logical test that resolves to TRUE or FALSE.'},
  criterion: {description: 'A condition such as 10, ">10", "Ada", or a cell containing a condition.'},
  criteria_range: {description: 'A range evaluated against its paired criterion. Criteria ranges should use the same shape.'},
  data_x: {description: 'Known x values paired with the y values.'},
  data_y: {description: 'Known y values paired with the x values.'},
  date: {description: 'A date serial value, date text, or cell that contains a date.'},
  dates: {description: 'Date values paired with the cash-flow values.'},
  day: {description: 'The day number to use when building a date.'},
  days: {description: 'The number of workdays to move forward or backward.'},
  delimiter: {description: 'The text that marks where to split or join values.'},
  decimal_separator: {description: 'The character used as the decimal separator in the source text.'},
  end_date: {description: 'The ending date for the date calculation.'},
  factor: {description: 'The multiple to round to.'},
  find_text: {description: 'The text to find.'},
  format: {description: 'A number or date format pattern, such as "0.00" or "yyyy-mm-dd".'},
  future_value: {description: 'The optional cash balance wanted after the final payment.'},
  group_separator: {description: 'The character used to group thousands in the source text.'},
  guess: {description: 'An optional starting estimate for the iterative rate calculation.'},
  height: {description: 'The number of rows in the returned reference.'},
  holidays: {description: 'Optional dates that should be treated as non-working days.'},
  hour: {description: 'The hour value to use when building a time.'},
  if_empty: {description: 'The value to return when FILTER finds no matching rows or columns.'},
  if_not_found: {description: 'The fallback value to return when the delimiter is not found.'},
  ignore_empty: {description: 'TRUE skips blank text arguments; FALSE keeps them.'},
  include: {description: 'A Boolean row or column vector that decides which values from the array are returned.'},
  index: {description: 'A one-based position that selects which value, row, or column to return.'},
  instance: {description: 'Which delimiter occurrence to use. Negative values count from the end.'},
  is_sorted: {description: 'FALSE requires an exact lookup; TRUE allows approximate lookup in sorted data.'},
  k: {description: 'The one-based rank to return from the data set.'},
  lookup_range: {description: 'The one-dimensional row or column to search. It must align with the result range.'},
  match_end: {description: 'Controls whether the end of text can count as a delimiter match.'},
  match_mode: {description: 'Controls exact, approximate, or wildcard matching.'},
  match_type: {description: 'Controls exact or approximate matching for MATCH.'},
  max_range: {description: 'The cells to search for the maximum value after criteria match.'},
  method: {description: 'FALSE uses the US 30/360 method; TRUE uses the European 30/360 method.'},
  min_range: {description: 'The cells to search for the minimum value after criteria match.'},
  minute: {description: 'The minute value to use when building a time.'},
  missing: {description: 'The fallback value to return when no lookup match is found.'},
  month: {description: 'The month number to use when building a date.'},
  name: {description: 'A local LET variable name. It must start with a letter and cannot be a cell reference.'},
  number: {description: 'A number, cell, range, or expression to include in the calculation.'},
  number_of_periods: {description: 'The total number of payment periods.'},
  num_chars: {description: 'The number of characters to return. This value must be zero or greater.'},
  order: {description: 'Use 0 for descending rank or 1 for ascending rank.'},
  payment: {description: 'The payment made each period.'},
  period: {description: 'The one-based period for the payment calculation.'},
  places: {description: 'The number of digits to keep. Negative values round to the left of the decimal point.'},
  present_value: {description: 'The current value of the loan, investment, or annuity.'},
  quartile: {description: 'The quartile to return. Inclusive quartiles use 0 through 4; exclusive quartiles use 1 through 3.'},
  range: {description: 'A cell range or reference used by the function.'},
  rate: {description: 'The interest or discount rate per period.'},
  ref: {description: 'The list of numbers used to rank a value.'},
  reference: {description: 'A cell or range reference.'},
  result_range: {description: 'The row, column, or range that returns values for the matching lookup position.'},
  row: {description: 'The one-based row number or reference row to use.'},
  row_num: {description: 'A one-based row position to return. Negative values count back from the end.'},
  rows: {description: 'The number of rows to return. This value must be at least 1 when supplied.'},
  search_key: {description: 'The value to find in the lookup range.'},
  search_mode: {description: 'Controls forward, reverse, or binary search order.'},
  second: {description: 'The second value to use when building a time.'},
  start: {description: 'The first value in the generated sequence.'},
  start_date: {description: 'The beginning date for the date calculation.'},
  start_num: {description: 'The one-based character position where the text search or extraction starts.'},
  step: {description: 'The amount to add between generated sequence values.'},
  sum_range: {description: 'The cells to add after every criteria range and criterion pair matches.'},
  text: {description: 'The text value, cell, or range to read.'},
  text1: {description: 'The first text value or range to combine.'},
  top: {description: 'The highest integer that RANDBETWEEN can return.'},
  type: {description: 'Use 0 for payments due at period end, or 1 for payments due at period beginning.'},
  unit: {description: 'The date interval unit to return, such as "Y", "M", "D", "MD", "YM", or "YD".'},
  value: {description: 'A value, cell, range, or expression.'},
  value_if_error: {description: 'The fallback value to return when the first argument is an error.'},
  value_if_false: {description: 'The value to return when the condition is FALSE.'},
  value_if_na: {description: 'The fallback value to return when the first argument is #N/A.'},
  value_if_true: {description: 'The value to return when the condition is TRUE.'},
  width: {description: 'The number of columns in the returned reference.'},
  within_text: {description: 'The text to search within.'},
  x: {description: 'The x value to evaluate against the known trend.'},
  year: {description: 'The year number to use when building a date.'},
});

const FORMULA_FUNCTION_ARGUMENT_HELP = Object.freeze({
  ADDRESS: {
    abs_type: {description: 'Reference style: 1 absolute, 2 absolute row, 3 absolute column, 4 relative.'},
    use_a1: {description: 'TRUE returns A1-style text; FALSE returns R1C1-style text.'},
    sheet: {description: 'Optional sheet name to include in the generated reference.'},
  },
  FILTER: {
    include: {description: 'A Boolean row or column vector with the same height or width as the filtered array.'},
  },
  CHOOSECOLS: {
    col_num: {description: 'Select one or more one-based columns. Negative values select columns from the right edge.'},
  },
  CHOOSEROWS: {
    row_num: {description: 'Select one or more one-based rows. Negative values select rows from the bottom edge.'},
  },
  DROP: {
    rows: {description: 'Positive values remove rows from the top; negative values remove rows from the bottom; zero leaves rows unchanged.'},
    columns: {description: 'Positive values remove columns from the left; negative values remove columns from the right; zero leaves columns unchanged.'},
  },
  INDEX: {
    row: {description: 'The one-based row inside the reference. Use 0 to return an entire column when supported.'},
    column: {description: 'The one-based column inside the reference. Use 0 to return an entire row when supported.'},
  },
  LET: {
    calculation_or_name: {description: 'Enter the final formula result here, or continue with another LET name/value pair.'},
  },
  MATCH: {
    match_type: {
      description: 'Use 0 for exact match, 1 for largest value less than or equal, or -1 for smallest value greater than or equal.',
      options: ['0 exact match', '1 next smaller in ascending data', '-1 next larger in descending data'],
    },
  },
  NETWORKDAYS_INTL: {
    weekend: {
      description: 'A weekend code or seven-character 0/1 pattern where 1 marks non-working days.',
      options: ['1 Saturday/Sunday', '11 Sunday only', '17 Saturday only', '"0000011" pattern'],
    },
  },
  SORT: {
    sort_index: {description: 'The one-based row or column inside the array to sort by.'},
    sort_order: {description: 'Use 1 for ascending order or -1 for descending order.', options: ['1 ascending', '-1 descending']},
    by_col: {description: 'FALSE sorts rows by a column; TRUE sorts columns by a row.'},
  },
  TAKE: {
    rows: {description: 'Positive values return rows from the top; negative values return rows from the bottom.'},
    columns: {description: 'Positive values return columns from the left; negative values return columns from the right.'},
  },
  TEXTAFTER: {
    match_mode: {description: 'Use 0 for case-sensitive delimiter matching or 1 for case-insensitive matching.', options: ['0 case-sensitive', '1 case-insensitive']},
    match_end: {description: 'Use 1 to allow the end of text to match when the delimiter is not found.', options: ['0 exact delimiter only', '1 match end of text']},
  },
  TEXTBEFORE: {
    match_mode: {description: 'Use 0 for case-sensitive delimiter matching or 1 for case-insensitive matching.', options: ['0 case-sensitive', '1 case-insensitive']},
    match_end: {description: 'Use 1 to allow the end of text to match when the delimiter is not found.', options: ['0 exact delimiter only', '1 match end of text']},
  },
  UNIQUE: {
    by_col: {description: 'FALSE compares rows; TRUE compares columns.'},
    exactly_once: {description: 'TRUE returns only values that appear exactly once.'},
  },
  VLOOKUP: {
    index: {description: 'The one-based column number in the lookup range to return.'},
  },
  HLOOKUP: {
    index: {description: 'The one-based row number in the lookup range to return.'},
  },
  WEEKDAY: {
    type: {
      description: 'Choose the numbering system for the returned weekday.',
      options: ['1 Sunday=1', '2 Monday=1', '3 Monday=0', '11-17 custom starts'],
    },
  },
  WEEKNUM: {
    type: {
      description: 'Choose the week numbering system and week start day.',
      options: ['1 Sunday start', '2 Monday start', '21 ISO week number'],
    },
  },
  WORKDAY_INTL: {
    weekend: {
      description: 'A weekend code or seven-character 0/1 pattern where 1 marks non-working days.',
      options: ['1 Saturday/Sunday', '11 Sunday only', '17 Saturday only', '"0000011" pattern'],
    },
  },
  XLOOKUP: {
    lookup_range: {description: 'The one-dimensional row or column to search. It must contain the same number of cells as result_range.'},
    result_range: {description: 'The row, column, or array that returns values from the matching lookup position.'},
    match_mode: {
      description: 'Use 0 for exact match, -1 for exact or next smaller, 1 for exact or next larger, or 2 for wildcard match.',
      options: ['0 exact match', '-1 exact or next smaller', '1 exact or next larger', '2 wildcard match'],
    },
    search_mode: {
      description: 'Use 1 to search first-to-last, -1 last-to-first, 2 binary ascending, or -2 binary descending.',
      options: ['1 first to last', '-1 last to first', '2 binary ascending', '-2 binary descending'],
    },
  },
  XMATCH: {
    match_mode: {
      description: 'Use 0 for exact match, -1 for exact or next smaller, 1 for exact or next larger, or 2 for wildcard match.',
      options: ['0 exact match', '-1 exact or next smaller', '1 exact or next larger', '2 wildcard match'],
    },
    search_mode: {
      description: 'Use 1 to search first-to-last, -1 last-to-first, 2 binary ascending, or -2 binary descending.',
      options: ['1 first to last', '-1 last to first', '2 binary ascending', '-2 binary descending'],
    },
  },
  YEARFRAC: {
    basis: {description: 'Day-count basis: 0 US 30/360, 1 actual/actual, 2 actual/360, 3 actual/365, 4 European 30/360.'},
  },
});

function defaultFormulaDescription(category) {
  if (category === 'Lookup') return 'Looks up or returns values from a range.';
  if (category === 'Reference') return 'Returns information about a cell or range reference.';
  if (category === 'Logical') return 'Evaluates logical conditions and returns a result.';
  if (category === 'Text') return 'Transforms, parses, or combines text values.';
  if (category === 'Date') return 'Creates, parses, or calculates date and time values.';
  if (category === 'Financial') return 'Calculates finance and cash-flow values.';
  if (category === 'Statistical') return 'Calculates summary statistics for data.';
  return 'Calculates a spreadsheet value from the provided arguments.';
}

export function getFormulaFunctionHelp(name, context = {}) {
  const formulaName = String(name || '').toUpperCase();
  const catalogItem = FORMULA_CATALOG.find((item) => item.name === formulaName) || {name: formulaName, category: 'Math'};
  const help = FORMULA_HELP[formulaName] || {};
  return {
    name: formulaName,
    category: catalogItem.category,
    picker: catalogItem.picker !== false,
    signature: help.signature || `${formulaName}(value1, [value2], ...)`,
    description: help.description || defaultFormulaDescription(catalogItem.category),
    example: createFormulaTemplate(formulaName, context),
  };
}

function splitSignatureArguments(signature) {
  const source = String(signature ?? '');
  const openIndex = source.indexOf('(');
  const closeIndex = source.lastIndexOf(')');
  if (openIndex < 0 || closeIndex <= openIndex) return [];
  const args = [];
  let current = '';
  let optionalDepth = 0;
  for (const ch of source.slice(openIndex + 1, closeIndex)) {
    if (ch === '[') optionalDepth++;
    if (ch === ']') optionalDepth = Math.max(0, optionalDepth - 1);
    if (ch === ',' && optionalDepth === 0) {
      args.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim()) args.push(current.trim());
  return args;
}

function cleanSignatureArgumentName(argument) {
  return String(argument ?? '').replace(/^\[/, '').replace(/\]$/, '').trim();
}

function normalizeFormulaArgumentHelpKey(argument) {
  const label = cleanSignatureArgumentName(argument)
    .replace(/\.\.\.$/, '')
    .split(',')[0]
    .trim()
    .toLowerCase();
  if (!label) return '';
  if (/^(?:condition|criteria_range|criterion|logical|name|number|text|value)\d+$/.test(label)) {
    return label.replace(/\d+$/, '');
  }
  return label.replace(/\d+$/, '');
}

function normalizeFormulaArgumentFunctionKey(name) {
  return String(name || '').toUpperCase().replace(/\./g, '_');
}

function formulaArgumentHelpForName(functionName, argumentName) {
  const argument = cleanSignatureArgumentName(argumentName);
  const key = normalizeFormulaArgumentHelpKey(argument);
  if (!argument || !key) return null;
  const functionHelp = FORMULA_FUNCTION_ARGUMENT_HELP[normalizeFormulaArgumentFunctionKey(functionName)] || {};
  const entry = functionHelp[argument.toLowerCase()] || functionHelp[key] || FORMULA_ARGUMENT_HELP[argument.toLowerCase()] || FORMULA_ARGUMENT_HELP[key];
  if (!entry?.description) return null;
  return {
    argument,
    description: entry.description,
    ...(entry.options?.length ? {options: entry.options} : {}),
  };
}

function resolvedSignatureActiveIndex(args, activeArgumentIndex) {
  if (!args.length || activeArgumentIndex < 0) return -1;
  if (activeArgumentIndex < args.length) return activeArgumentIndex;
  let variadicIndex = -1;
  for (let index = args.length - 1; index >= 0; index--) {
    if (args[index].variadic) {
      variadicIndex = index;
      break;
    }
  }
  return variadicIndex >= 0 ? variadicIndex : args.length - 1;
}

export function getFormulaSignatureParts(signature, activeArgumentIndex = -1) {
  const source = String(signature ?? '');
  const openIndex = source.indexOf('(');
  const closeIndex = source.lastIndexOf(')');
  const name = (openIndex >= 0 ? source.slice(0, openIndex) : source).trim();
  const args = splitSignatureArguments(source).map((argument) => {
    const raw = argument.trim();
    const label = cleanSignatureArgumentName(raw);
    return {
      raw,
      label,
      optional: raw.startsWith('[') && raw.endsWith(']'),
      variadic: raw === '...' || raw.endsWith('...'),
      active: false,
    };
  });
  const activeIndex = resolvedSignatureActiveIndex(args, activeArgumentIndex);
  if (activeIndex >= 0) args[activeIndex] = {...args[activeIndex], active: true};
  return {
    name,
    arguments: args,
    activeArgumentIndex: activeIndex,
    hasCall: openIndex >= 0 && closeIndex > openIndex,
  };
}

function formulaArgumentRuleForFunction(name) {
  const functionName = String(name || '').toUpperCase();
  if (!FORMULA_FUNCTION_NAME_SET.has(functionName)) return null;
  const parts = getFormulaSignatureParts(getFormulaFunctionHelp(functionName).signature);
  if (!parts.hasCall) return null;
  let min = 0;
  let max = 0;
  let variadic = false;
  for (const argument of parts.arguments) {
    if (argument.variadic) {
      variadic = true;
      continue;
    }
    if (!argument.optional && !variadic) min++;
    max++;
  }
  return {min, max: variadic ? Infinity : max};
}

function formulaArgumentCountText(count) {
  return `${count} argument${count === 1 ? '' : 's'}`;
}

function formulaArgumentExpectationText(rule) {
  if (!rule) return '';
  if (rule.min === 0 && rule.max === 0) return 'no arguments';
  if (rule.max === Infinity) return `at least ${formulaArgumentCountText(rule.min)}`;
  if (rule.min === rule.max) return formulaArgumentCountText(rule.min);
  if (rule.min === 0) return `at most ${formulaArgumentCountText(rule.max)}`;
  return `${rule.min} to ${formulaArgumentCountText(rule.max)}`;
}

function formulaPatternedArgumentLabel(name, argumentIndex) {
  const functionName = String(name || '').toUpperCase();
  const index = Number(argumentIndex);
  if (!Number.isFinite(index) || index < 0) return '';
  if (functionName === 'COUNTIFS') {
    const pairIndex = Math.floor(index / 2) + 1;
    return index % 2 === 0 ? `criteria_range${pairIndex}` : `criterion${pairIndex}`;
  }
  if (['SUMIFS', 'AVERAGEIFS', 'MINIFS', 'MAXIFS'].includes(functionName)) {
    if (index === 0) {
      if (functionName === 'SUMIFS') return 'sum_range';
      if (functionName === 'AVERAGEIFS') return 'average_range';
      if (functionName === 'MINIFS') return 'min_range';
      return 'max_range';
    }
    const pairIndex = Math.floor((index - 1) / 2) + 1;
    return (index - 1) % 2 === 0 ? `criteria_range${pairIndex}` : `criterion${pairIndex}`;
  }
  if (functionName === 'IFS') {
    const pairIndex = Math.floor(index / 2) + 1;
    return index % 2 === 0 ? `condition${pairIndex}` : `value${pairIndex}`;
  }
  if (functionName === 'LET') {
    if (index === 0) return 'name1';
    if (index === 1) return 'value1';
    const pairIndex = Math.floor(index / 2) + 1;
    return index % 2 === 0 ? `calculation_or_name${pairIndex}` : `value${pairIndex}`;
  }
  return '';
}

function formulaStructuredArgumentDiagnostic(call) {
  const functionName = String(call?.name || '').toUpperCase();
  const count = Number(call?.argumentCount || 0);
  if (functionName === 'COUNTIFS' && count >= 2 && count % 2 !== 0) {
    return {
      severity: 'warning',
      code: 'FUNCTION_ARGUMENT_PAIRS',
      message: 'COUNTIFS expects criteria ranges and criteria in pairs.',
      functionName,
      argumentCount: count,
    };
  }
  if (['SUMIFS', 'AVERAGEIFS', 'MINIFS', 'MAXIFS'].includes(functionName) && count >= 3 && (count - 1) % 2 !== 0) {
    return {
      severity: 'warning',
      code: 'FUNCTION_ARGUMENT_PAIRS',
      message: `${functionName} expects criteria ranges and criteria in pairs after the value range.`,
      functionName,
      argumentCount: count,
    };
  }
  if (functionName === 'IFS' && count >= 2 && count % 2 !== 0) {
    return {
      severity: 'warning',
      code: 'FUNCTION_ARGUMENT_PAIRS',
      message: 'IFS expects condition and value arguments in pairs.',
      functionName,
      argumentCount: count,
    };
  }
  if (functionName === 'LET' && count >= 3 && count % 2 === 0) {
    return {
      severity: 'warning',
      code: 'FUNCTION_ARGUMENT_FINAL_CALCULATION',
      message: 'LET expects name/value pairs followed by a final calculation.',
      functionName,
      argumentCount: count,
    };
  }
  return null;
}

function formulaClosedFunctionCalls(formula) {
  const source = String(formula ?? '');
  if (!source.trimStart().startsWith('=')) return [];
  const calls = [];
  const stack = [];
  let pendingName = null;

  for (let index = source.indexOf('=') + 1; index < source.length; index++) {
    const ch = source[index];
    if (ch === '"') {
      index++;
      while (index < source.length) {
        if (source[index] === '"' && source[index + 1] === '"') {
          index += 2;
          continue;
        }
        if (source[index] === '"') break;
        index++;
      }
      pendingName = null;
      continue;
    }
    if (ch === "'") {
      const quotedSheet = consumeFormulaQuotedSheetName(source, index);
      if (quotedSheet) {
        index = quotedSheet.end - 1;
        pendingName = null;
        continue;
      }
    }
    if (/[A-Za-z_]/.test(ch)) {
      const match = /^[A-Za-z_][A-Za-z0-9_.]*/.exec(source.slice(index));
      if (match) {
        pendingName = {name: match[0].toUpperCase(), start: index, end: index + match[0].length};
        index += match[0].length - 1;
        continue;
      }
    }
    if (ch === '(') {
      const callName = pendingName && /^\s*$/.test(source.slice(pendingName.end, index)) ? pendingName.name : '';
      stack.push({name: callName, start: pendingName?.start ?? index, argStart: index + 1});
      pendingName = null;
      continue;
    }
    if (ch === ')') {
      const frame = stack.pop();
      if (frame?.name) {
        const argText = source.slice(frame.argStart, index);
        calls.push({
          name: frame.name,
          argText,
          args: argText.trim() ? splitFormulaArgs(argText) : [],
          start: frame.start,
          end: index + 1,
        });
      }
      pendingName = null;
      continue;
    }
    if (!/\s/.test(ch)) pendingName = null;
  }
  return calls;
}

function formulaRangeReferenceForDiagnostics(arg, context = {}) {
  const text = String(arg ?? '').trim();
  if (!text) return null;
  const namedRange = normalizedNamedRanges(context.namedRanges, context.sheetId)
    .find((range) => String(range.name || '').toUpperCase() === text.toUpperCase());
  if (namedRange?.range) return {sheetName: namedRange.sheetId || null, range: namedRange.range};
  const parsed = parseRangeReference(text, {
    currentSheetName: context.activeSheetName || context.sheetName,
    rowCount: context.sheetRowCount || context.rowCount,
    colCount: context.sheetColCount || context.colCount,
  });
  return parsed && !isErrorValue(parsed) ? parsed : null;
}

function formulaRangeShape(reference) {
  if (!reference?.range) return null;
  return {
    rows: reference.range.r2 - reference.range.r1 + 1,
    cols: reference.range.c2 - reference.range.c1 + 1,
  };
}

function formulaRangeCellCount(shape) {
  return shape ? shape.rows * shape.cols : 0;
}

function formulaRangeShapeText(shape) {
  return shape ? `${shape.rows}x${shape.cols}` : '';
}

function sameFormulaRangeShape(left, right) {
  return Boolean(left && right && left.rows === right.rows && left.cols === right.cols);
}

function formulaRangeCompatibilityDiagnostics(formula, context = {}) {
  const diagnostics = [];
  for (const call of formulaClosedFunctionCalls(formula)) {
    if (call.args.length < 2) continue;
    const addShapeDiagnostic = (message) => diagnostics.push({
      severity: 'warning',
      code: 'FUNCTION_RANGE_SHAPE',
      message,
      functionName: call.name,
      start: call.start,
      end: call.end,
    });
    if (call.name === 'COUNTIFS') {
      const ranges = call.args.filter((_arg, index) => index % 2 === 0).map((arg) => formulaRangeReferenceForDiagnostics(arg, context)).filter(Boolean);
      const firstShape = formulaRangeShape(ranges[0]);
      const mismatched = ranges.find((range) => !sameFormulaRangeShape(firstShape, formulaRangeShape(range)));
      if (firstShape && mismatched) {
        addShapeDiagnostic(`COUNTIFS criteria ranges must have the same shape; found ${formulaRangeShapeText(firstShape)} and ${formulaRangeShapeText(formulaRangeShape(mismatched))}.`);
      }
      continue;
    }
    if (['SUMIFS', 'AVERAGEIFS', 'MINIFS', 'MAXIFS'].includes(call.name)) {
      const rangeArgs = [call.args[0], ...call.args.slice(1).filter((_arg, index) => index % 2 === 0)];
      const ranges = rangeArgs.map((arg) => formulaRangeReferenceForDiagnostics(arg, context)).filter(Boolean);
      const firstShape = formulaRangeShape(ranges[0]);
      const mismatched = ranges.find((range) => !sameFormulaRangeShape(firstShape, formulaRangeShape(range)));
      if (firstShape && mismatched) {
        addShapeDiagnostic(`${call.name} value and criteria ranges must have the same shape; found ${formulaRangeShapeText(firstShape)} and ${formulaRangeShapeText(formulaRangeShape(mismatched))}.`);
      }
      continue;
    }
    if (call.name === 'XLOOKUP' && call.args.length >= 3) {
      const lookupShape = formulaRangeShape(formulaRangeReferenceForDiagnostics(call.args[1], context));
      const resultShape = formulaRangeShape(formulaRangeReferenceForDiagnostics(call.args[2], context));
      if (lookupShape && resultShape && formulaRangeCellCount(lookupShape) !== formulaRangeCellCount(resultShape)) {
        diagnostics.push({
          severity: 'warning',
          code: 'FUNCTION_RANGE_SIZE',
          message: `XLOOKUP lookup and result ranges must contain the same number of cells; found ${formulaRangeCellCount(lookupShape)} and ${formulaRangeCellCount(resultShape)}.`,
          functionName: call.name,
          start: call.start,
          end: call.end,
        });
      }
      continue;
    }
    if (call.name === 'SUMPRODUCT') {
      const ranges = call.args.map((arg) => formulaRangeReferenceForDiagnostics(arg, context)).filter(Boolean);
      if (ranges.length < 2) continue;
      const firstShape = formulaRangeShape(ranges[0]);
      const mismatched = ranges.find((range) => !sameFormulaRangeShape(firstShape, formulaRangeShape(range)));
      if (firstShape && mismatched) {
        addShapeDiagnostic(`SUMPRODUCT arrays must have the same shape; found ${formulaRangeShapeText(firstShape)} and ${formulaRangeShapeText(formulaRangeShape(mismatched))}.`);
      }
    }
  }
  return diagnostics;
}

function formulaStaticNumberArgument(arg) {
  const text = String(arg ?? '').trim();
  if (!text) return null;
  const valueText = isQuoted(text) ? unquote(text) : text;
  return /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:E[+-]?\d+)?$/i.test(valueText.trim()) ? Number(valueText) : null;
}

function formulaStaticBooleanArgument(arg) {
  const text = String(arg ?? '').trim();
  if (!text) return null;
  const valueText = isQuoted(text) ? unquote(text) : text;
  if (/^TRUE$/i.test(valueText)) return true;
  if (/^FALSE$/i.test(valueText)) return false;
  const numericValue = formulaStaticNumberArgument(valueText);
  return numericValue == null ? null : numericValue !== 0;
}

function formulaStaticTextArgument(arg) {
  const text = String(arg ?? '').trim();
  return isQuoted(text) ? unquote(text) : null;
}

function allowedWeekendCodeValues() {
  return [1, 2, 3, 4, 5, 6, 7, 11, 12, 13, 14, 15, 16, 17];
}

function formulaOptionValueDiagnostics(formula) {
  const diagnostics = [];
  const addModeDiagnostic = (call, argumentIndex, argumentName, allowedValues) => {
    if (call.args[argumentIndex] == null) return;
    const value = formulaStaticNumberArgument(call.args[argumentIndex]);
    if (value == null) return;
    const normalizedValue = Math.trunc(value);
    if (allowedValues.includes(normalizedValue)) return;
    diagnostics.push({
      severity: 'warning',
      code: 'FUNCTION_OPTION_VALUE',
      message: `${call.name} ${argumentName} must be ${allowedValues.join(', ')}; found ${call.args[argumentIndex]}.`,
      functionName: call.name,
      argumentName,
      value: call.args[argumentIndex],
      allowedValues,
      start: call.start,
      end: call.end,
    });
  };
  const addWeekendDiagnostic = (call, argumentIndex) => {
    if (call.args[argumentIndex] == null) return;
    const rawArg = call.args[argumentIndex];
    const textValue = formulaStaticTextArgument(rawArg);
    if (textValue != null) {
      const trimmed = textValue.trim();
      const validPattern = /^[01]{7}$/.test(trimmed) && trimmed.includes('0');
      const numericValue = formulaStaticNumberArgument(rawArg);
      if (validPattern || (numericValue != null && allowedWeekendCodeValues().includes(Math.trunc(numericValue)))) return;
      diagnostics.push({
        severity: 'warning',
        code: 'FUNCTION_OPTION_VALUE',
        message: `${call.name} weekend must be a valid weekend code or 7-character 0/1 pattern; found ${rawArg}.`,
        functionName: call.name,
        argumentName: 'weekend',
        value: rawArg,
        allowedValues: [...allowedWeekendCodeValues(), '0/1 pattern'],
        start: call.start,
        end: call.end,
      });
      return;
    }
    addModeDiagnostic(call, argumentIndex, 'weekend', allowedWeekendCodeValues());
  };

  for (const call of formulaClosedFunctionCalls(formula)) {
    if (call.name === 'WEEKNUM') {
      addModeDiagnostic(call, 1, 'return_type', [1, 2, 11, 12, 13, 14, 15, 16, 17, 21]);
      continue;
    }
    if (call.name === 'WEEKDAY') {
      addModeDiagnostic(call, 1, 'return_type', [1, 2, 3, 11, 12, 13, 14, 15, 16, 17]);
      continue;
    }
    if (call.name === 'YEARFRAC') {
      addModeDiagnostic(call, 2, 'basis', [0, 1, 2, 3, 4]);
      continue;
    }
    if (call.name === 'NETWORKDAYS.INTL' || call.name === 'WORKDAY.INTL') {
      addWeekendDiagnostic(call, 2);
      continue;
    }
    if (call.name === 'MATCH') {
      addModeDiagnostic(call, 2, 'match_type', [-1, 0, 1]);
      continue;
    }
    if (call.name === 'XMATCH') {
      addModeDiagnostic(call, 2, 'match_mode', [-1, 0, 1, 2]);
      addModeDiagnostic(call, 3, 'search_mode', [1, -1, 2, -2]);
      continue;
    }
    if (call.name === 'XLOOKUP') {
      addModeDiagnostic(call, 4, 'match_mode', [-1, 0, 1, 2]);
      addModeDiagnostic(call, 5, 'search_mode', [1, -1, 2, -2]);
      continue;
    }
    if (call.name === 'SORT') {
      addModeDiagnostic(call, 2, 'sort_order', [1, -1]);
      const sortIndex = formulaStaticNumberArgument(call.args[1]);
      if (sortIndex != null && Math.trunc(sortIndex) < 1) {
        diagnostics.push({
          severity: 'warning',
          code: 'FUNCTION_OPTION_VALUE',
          message: `SORT sort_index must be at least 1; found ${call.args[1]}.`,
          functionName: call.name,
          argumentName: 'sort_index',
          value: call.args[1],
          allowedValues: ['>=1'],
          start: call.start,
          end: call.end,
        });
      }
    }
  }
  return diagnostics;
}

function formulaReferenceIndexDiagnostics(formula, context = {}) {
  const diagnostics = [];
  const addIndexDiagnostic = (call, argumentName, rawValue, max, errorCode = 'FUNCTION_REFERENCE_INDEX') => {
    diagnostics.push({
      severity: 'warning',
      code: errorCode,
      message: `${call.name} ${argumentName} must be between 1 and ${max}; found ${rawValue}.`,
      functionName: call.name,
      argumentName,
      value: rawValue,
      min: 1,
      max,
      start: call.start,
      end: call.end,
    });
  };
  const addSignedIndexDiagnostic = (call, argumentName, rawValue, max) => {
    diagnostics.push({
      severity: 'warning',
      code: 'FUNCTION_REFERENCE_INDEX',
      message: `${call.name} ${argumentName} must be between 1 and ${max}, or -${max} and -1; found ${rawValue}.`,
      functionName: call.name,
      argumentName,
      value: rawValue,
      min: -max,
      max,
      start: call.start,
      end: call.end,
    });
  };

  for (const call of formulaClosedFunctionCalls(formula)) {
    if (call.name === 'INDEX') {
      const shape = formulaRangeShape(formulaRangeReferenceForDiagnostics(call.args[0], context));
      if (!shape) continue;
      const rowValue = formulaStaticNumberArgument(call.args[1] ?? 1);
      const colValue = call.args[2] == null ? null : formulaStaticNumberArgument(call.args[2]);
      if (rowValue == null && colValue == null) continue;
      if (shape.rows === 1 && call.args[2] == null) {
        const columnIndex = Math.trunc(rowValue ?? 1);
        if (columnIndex < 1 || columnIndex > shape.cols) addIndexDiagnostic(call, 'column_num', call.args[1] ?? '1', shape.cols);
        continue;
      }
      const rowIndex = Math.trunc(rowValue ?? 1);
      const colIndex = Math.trunc(colValue ?? 1);
      if (rowIndex < 1 || rowIndex > shape.rows) addIndexDiagnostic(call, 'row_num', call.args[1] ?? '1', shape.rows);
      if (colIndex < 1 || colIndex > shape.cols) addIndexDiagnostic(call, 'column_num', call.args[2] ?? '1', shape.cols);
      continue;
    }
    if (call.name === 'VLOOKUP') {
      const shape = formulaRangeShape(formulaRangeReferenceForDiagnostics(call.args[1], context));
      const colValue = formulaStaticNumberArgument(call.args[2]);
      if (!shape || colValue == null) continue;
      const colIndex = Math.trunc(colValue);
      if (colIndex < 1 || colIndex > shape.cols) addIndexDiagnostic(call, 'index', call.args[2], shape.cols);
      continue;
    }
    if (call.name === 'HLOOKUP') {
      const shape = formulaRangeShape(formulaRangeReferenceForDiagnostics(call.args[1], context));
      const rowValue = formulaStaticNumberArgument(call.args[2]);
      if (!shape || rowValue == null) continue;
      const rowIndex = Math.trunc(rowValue);
      if (rowIndex < 1 || rowIndex > shape.rows) addIndexDiagnostic(call, 'index', call.args[2], shape.rows);
      continue;
    }
    if (call.name === 'SORT') {
      const shape = formulaRangeShape(formulaRangeReferenceForDiagnostics(call.args[0], context));
      const sortIndexValue = formulaStaticNumberArgument(call.args[1] ?? 1);
      if (!shape || sortIndexValue == null) continue;
      const byCol = formulaStaticBooleanArgument(call.args[3]) ?? false;
      const maxIndex = byCol ? shape.rows : shape.cols;
      const sortIndex = Math.trunc(sortIndexValue);
      if (sortIndex > maxIndex) addIndexDiagnostic(call, 'sort_index', call.args[1] ?? '1', maxIndex, 'FUNCTION_OPTION_VALUE');
      continue;
    }
    if (call.name === 'CHOOSECOLS' || call.name === 'CHOOSEROWS') {
      const shape = formulaRangeShape(formulaRangeReferenceForDiagnostics(call.args[0], context));
      if (!shape) continue;
      const maxIndex = call.name === 'CHOOSECOLS' ? shape.cols : shape.rows;
      const argumentName = call.name === 'CHOOSECOLS' ? 'col_num' : 'row_num';
      for (let index = 1; index < call.args.length; index++) {
        const rawValue = formulaStaticNumberArgument(call.args[index]);
        if (rawValue == null) continue;
        const selectedIndex = Math.trunc(rawValue);
        if (selectedIndex === 0 || Math.abs(selectedIndex) > maxIndex) {
          addSignedIndexDiagnostic(call, argumentName, call.args[index], maxIndex);
        }
      }
    }
  }
  return diagnostics;
}

function formulaArgumentDomainDiagnostics(formula, context = {}) {
  const diagnostics = [];
  const addDomainDiagnostic = (call, argumentName, rawValue, expectation, errorCode = 'FUNCTION_ARGUMENT_DOMAIN') => {
    diagnostics.push({
      severity: 'warning',
      code: errorCode,
      message: `${call.name} ${argumentName} ${expectation}; found ${rawValue}.`,
      functionName: call.name,
      argumentName,
      value: rawValue,
      start: call.start,
      end: call.end,
    });
  };
  const addMinimumDiagnostic = (call, argumentIndex, argumentName, minimum) => {
    if (call.args[argumentIndex] == null) return;
    const value = formulaStaticNumberArgument(call.args[argumentIndex]);
    if (value == null || Math.trunc(value) >= minimum) return;
    addDomainDiagnostic(call, argumentName, call.args[argumentIndex], `must be at least ${minimum}`);
  };
  const addNonNegativeDiagnostic = (call, argumentIndex, argumentName) => {
    if (call.args[argumentIndex] == null) return;
    const value = formulaStaticNumberArgument(call.args[argumentIndex]);
    if (value == null || Math.trunc(value) >= 0) return;
    addDomainDiagnostic(call, argumentName, call.args[argumentIndex], 'must be zero or greater');
  };

  for (const call of formulaClosedFunctionCalls(formula)) {
    if (call.name === 'SEQUENCE') {
      addMinimumDiagnostic(call, 0, 'rows', 1);
      addMinimumDiagnostic(call, 1, 'columns', 1);
      continue;
    }
    if (call.name === 'TAKE') {
      const rows = formulaStaticNumberArgument(call.args[1]);
      const columns = formulaStaticNumberArgument(call.args[2]);
      if (rows != null && Math.trunc(rows) === 0) addDomainDiagnostic(call, 'rows', call.args[1], 'cannot be zero');
      if (columns != null && Math.trunc(columns) === 0) addDomainDiagnostic(call, 'columns', call.args[2], 'cannot be zero');
      continue;
    }
    if (call.name === 'LARGE' || call.name === 'SMALL') {
      addMinimumDiagnostic(call, 1, 'k', 1);
      const k = formulaStaticNumberArgument(call.args[1]);
      const shape = formulaRangeShape(formulaRangeReferenceForDiagnostics(call.args[0], context));
      const maxCount = formulaRangeCellCount(shape);
      if (k != null && maxCount > 0 && Math.trunc(k) > maxCount) {
        addDomainDiagnostic(call, 'k', call.args[1], `cannot exceed ${maxCount}`);
      }
      continue;
    }
    if (call.name === 'PERCENTILE' || call.name === 'PERCENTILE.INC' || call.name === 'PERCENTILE.EXC') {
      const k = formulaStaticNumberArgument(call.args[1]);
      if (k == null) continue;
      const exclusive = call.name === 'PERCENTILE.EXC';
      const valid = exclusive ? k > 0 && k < 1 : k >= 0 && k <= 1;
      if (!valid) addDomainDiagnostic(call, 'k', call.args[1], exclusive ? 'must be greater than 0 and less than 1' : 'must be between 0 and 1');
      continue;
    }
    if (call.name === 'QUARTILE' || call.name === 'QUARTILE.INC' || call.name === 'QUARTILE.EXC') {
      const quartile = formulaStaticNumberArgument(call.args[1]);
      if (quartile == null) continue;
      const index = Math.trunc(quartile);
      const exclusive = call.name === 'QUARTILE.EXC';
      const valid = index === quartile && (exclusive ? index > 0 && index < 4 : index >= 0 && index <= 4);
      if (!valid) addDomainDiagnostic(call, 'quartile', call.args[1], exclusive ? 'must be 1, 2, or 3' : 'must be an integer from 0 to 4');
      continue;
    }
    if (['PMT', 'PV', 'FV', 'NPER', 'RATE'].includes(call.name)) {
      addModeDiagnosticForDomain(call, 4, 'type', [0, 1], diagnostics);
      continue;
    }
    if (call.name === 'IPMT' || call.name === 'PPMT') {
      addModeDiagnosticForDomain(call, 5, 'type', [0, 1], diagnostics);
      const period = formulaStaticNumberArgument(call.args[1]);
      const periods = formulaStaticNumberArgument(call.args[2]);
      if (period != null && Math.trunc(period) < 1) addDomainDiagnostic(call, 'period', call.args[1], 'must be at least 1');
      if (period != null && periods != null && Math.trunc(period) > Math.trunc(periods)) {
        addDomainDiagnostic(call, 'period', call.args[1], `cannot exceed ${Math.trunc(periods)}`);
      }
      continue;
    }
    if (call.name === 'RANDBETWEEN') {
      const bottom = formulaStaticNumberArgument(call.args[0]);
      const top = formulaStaticNumberArgument(call.args[1]);
      if (bottom != null && top != null && Math.ceil(bottom) > Math.floor(top)) {
        addDomainDiagnostic(call, 'bottom', call.args[0], `must be less than or equal to ${call.args[1]}`);
      }
      continue;
    }
    if (call.name === 'LEFT' || call.name === 'RIGHT') {
      addNonNegativeDiagnostic(call, 1, 'num_chars');
      continue;
    }
    if (call.name === 'MID') {
      addMinimumDiagnostic(call, 1, 'start_num', 1);
      addNonNegativeDiagnostic(call, 2, 'num_chars');
      continue;
    }
    if (call.name === 'FIND' || call.name === 'SEARCH') {
      addMinimumDiagnostic(call, 2, 'start_num', 1);
      const startNum = formulaStaticNumberArgument(call.args[2] ?? 1);
      const text = formulaStaticTextArgument(call.args[1]);
      if (startNum != null && text != null && Math.trunc(startNum) > text.length) {
        addDomainDiagnostic(call, 'start_num', call.args[2] ?? '1', `cannot exceed text length ${text.length}`);
      }
    }
  }
  return diagnostics;
}

function addModeDiagnosticForDomain(call, argumentIndex, argumentName, allowedValues, diagnostics) {
  if (call.args[argumentIndex] == null) return;
  const value = formulaStaticNumberArgument(call.args[argumentIndex]);
  if (value == null || allowedValues.includes(Math.trunc(value))) return;
  diagnostics.push({
    severity: 'warning',
    code: 'FUNCTION_ARGUMENT_DOMAIN',
    message: `${call.name} ${argumentName} must be ${allowedValues.join(' or ')}; found ${call.args[argumentIndex]}.`,
    functionName: call.name,
    argumentName,
    value: call.args[argumentIndex],
    allowedValues,
    start: call.start,
    end: call.end,
  });
}

function formulaCallStack(formula, cursorPosition) {
  const source = String(formula ?? '');
  const cursor = Math.max(0, Math.min(source.length, cursorPosition == null ? source.length : cursorPosition));
  const stack = [];
  let pendingName = null;
  let quoted = false;
  for (let index = 0; index < cursor; index++) {
    const ch = source[index];
    if (ch === '"') {
      if (quoted && source[index + 1] === '"') {
        index++;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (quoted) continue;
    if (/[A-Za-z_]/.test(ch)) {
      const match = /^[A-Za-z_][A-Za-z0-9_.]*/.exec(source.slice(index));
      if (match) {
        pendingName = {name: match[0].toUpperCase(), end: index + match[0].length};
        index += match[0].length - 1;
        continue;
      }
    }
    if (ch === '(') {
      const callName = pendingName && /^\s*$/.test(source.slice(pendingName.end, index)) ? pendingName.name : '';
      stack.push({name: callName, argumentIndex: 0});
      pendingName = null;
      continue;
    }
    if (ch === ',') {
      if (stack.length) stack[stack.length - 1].argumentIndex += 1;
      pendingName = null;
      continue;
    }
    if (ch === ')') {
      stack.pop();
      pendingName = null;
      continue;
    }
    if (!/\s/.test(ch)) pendingName = null;
  }
  return stack;
}

export function getFormulaEditorHint(formula, cursorPosition, context = {}) {
  const source = String(formula ?? '');
  const cursor = Math.max(0, Math.min(source.length, cursorPosition == null ? source.length : cursorPosition));
  const isFormula = source.trimStart().startsWith('=');
  if (!isFormula) {
    return {
      isFormula: false,
      functionName: '',
      argumentIndex: -1,
      arguments: [],
      activeArgument: '',
      activeArgumentHelp: null,
      help: null,
    };
  }
  const activeCall = formulaCallStack(source, cursor).filter((item) => item.name).at(-1);
  const tokenMatch = /([A-Z][A-Z0-9_.]*)$/i.exec(source.slice(0, cursor));
  const functionName = activeCall?.name || tokenMatch?.[1]?.toUpperCase() || '';
  const help = functionName ? getFormulaFunctionHelp(functionName, context) : null;
  const args = help ? splitSignatureArguments(help.signature) : [];
  const argumentIndex = activeCall ? activeCall.argumentIndex : -1;
  const patternedArgument = formulaPatternedArgumentLabel(functionName, argumentIndex);
  const activeArgument = patternedArgument || (argumentIndex >= 0 ? cleanSignatureArgumentName(args[Math.min(argumentIndex, Math.max(0, args.length - 1))] || '') : '');
  return {
    isFormula: true,
    functionName,
    argumentIndex,
    arguments: args,
    activeArgument,
    activeArgumentHelp: activeArgument ? formulaArgumentHelpForName(functionName, activeArgument) : null,
    help,
  };
}

function formulaEditorTokenAtCursor(formula, cursorPosition, context = {}) {
  const source = String(formula ?? '');
  const cursor = Math.max(0, Math.min(source.length, cursorPosition == null ? source.length : cursorPosition));
  return tokenizeFormulaEditorDraft(source, context).find((token) => token.start < cursor && cursor <= token.end) || null;
}

function formulaReferenceDraftSegment(source, cursor) {
  const segment = String(source ?? '').slice(0, cursor).split(/[=+\-*/^&(<>,;]/).at(-1)?.trim() || '';
  if (/^(?:'(?:(?:'')|[^'])+'|[A-Za-z_][A-Za-z0-9_.]*)!/.test(segment)) return true;
  return /(?:\$?[A-Z]{1,3}\$?\d+|\$?[A-Z]{1,3}|\$?\d+):\$?[A-Z]{1,3}\$?\d*$/i.test(segment);
}

function activeFormulaIdentifier(formula, cursorPosition, context = {}) {
  const source = String(formula ?? '');
  const cursor = Math.max(0, Math.min(source.length, cursorPosition == null ? source.length : cursorPosition));
  if (!source.trimStart().startsWith('=')) return '';
  const cursorToken = formulaEditorTokenAtCursor(source, cursor, context);
  if (cursorToken && ['reference', 'namedRange', 'string', 'number', 'boolean', 'error'].includes(cursorToken.type)) return '';
  if (formulaReferenceDraftSegment(source, cursor)) return '';
  const match = /([A-Z_][A-Z0-9_.]*)$/i.exec(source.slice(0, cursor));
  return match ? match[1] : source.trim() === '=' ? '' : '';
}

function activeFormulaSheetIdentifier(formula, cursorPosition, context = {}) {
  const source = String(formula ?? '');
  const cursor = Math.max(0, Math.min(source.length, cursorPosition == null ? source.length : cursorPosition));
  if (!source.trimStart().startsWith('=')) return '';
  const cursorToken = formulaEditorTokenAtCursor(source, cursor, context);
  if (cursorToken && ['string', 'number', 'boolean', 'error', 'namedRange'].includes(cursorToken.type)) return '';
  const segment = source.slice(0, cursor).split(/[=+\-*/^&(<>,;]/).at(-1)?.trim() || '';
  const quotedSegment = /^'((?:''|[^'])*)$/i.exec(segment);
  const simpleSegment = /^[A-Za-z_][A-Za-z0-9_.]*$/i.test(segment) ? segment : '';
  const text = quotedSegment ? quotedSegment[1].replace(/''/g, "'") : simpleSegment;
  if (!text) return '';
  const needle = text.toUpperCase();
  return normalizedFormulaSheets(context.sheets).some((sheet) => sheet.name.toUpperCase().includes(needle)) ? text : '';
}

function normalizedNamedRanges(input, sheetId = null) {
  const ranges = input instanceof Map ? Array.from(input.values()) : Array.isArray(input) ? input : [];
  return ranges.filter((range) => (
    range?.name && !(range.scope === 'sheet' && range.sheetId && sheetId && range.sheetId !== sheetId)
  ));
}

function namedRangeReferenceSummary(namedRange) {
  if (!namedRange?.range) return 'Named range';
  const reference = `${cellAddress(namedRange.range.r1, namedRange.range.c1)}:${cellAddress(namedRange.range.r2, namedRange.range.c2)}`;
  return namedRange.sheetId ? `${namedRange.sheetId}!${reference}` : reference;
}

function normalizedFormulaSheets(input) {
  const sheets = input instanceof Map ? Array.from(input.values()) : Array.isArray(input) ? input : [];
  return sheets.filter((sheet) => sheet?.name);
}

function formulaSheetQualifier(sheetName) {
  const text = String(sheetName ?? '');
  if (!text) return '';
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(text) ? text : `'${text.replace(/'/g, "''")}'`;
}

function rankedByToken(items, token) {
  const needle = String(token || '').toUpperCase();
  if (!needle) return items;
  const matchClass = (name) => name === needle ? 0 : name.startsWith(needle) ? 1 : 2;
  const typeRank = (item, name, match) => {
    if (match === 0) return item.type === 'function' ? 0 : 1;
    if (item.type === 'function' && COMMON_FORMULA_SUGGESTION_NAMES.has(name)) return 0;
    if (item.type === 'namedRange' || item.type === 'sheet') return 1;
    return 2;
  };
  return items
    .map((item, index) => ({item, index, name: item.name.toUpperCase()}))
    .filter(({name}) => name.includes(needle))
    .map((entry) => ({...entry, match: matchClass(entry.name)}))
    .sort((a, b) => (
      a.match - b.match ||
      typeRank(a.item, a.name, a.match) - typeRank(b.item, b.name, b.match) ||
      a.index - b.index
    ))
    .map(({item}) => item);
}

function formulaNameDistance(left, right) {
  const a = String(left || '').toUpperCase();
  const b = String(right || '').toUpperCase();
  const previous = Array.from({length: b.length + 1}, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    let lastDiagonal = previous[0];
    previous[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const oldDiagonal = previous[j];
      previous[j] = Math.min(
        previous[j] + 1,
        previous[j - 1] + 1,
        lastDiagonal + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      lastDiagonal = oldDiagonal;
    }
  }
  return previous[b.length];
}

function closestFormulaFunctionName(name) {
  const source = String(name || '').toUpperCase();
  if (!source) return '';
  const candidates = FORMULA_CATALOG
    .map((item, index) => ({name: item.name, index, distance: formulaNameDistance(source, item.name)}))
    .sort((a, b) => a.distance - b.distance || a.index - b.index);
  const best = candidates[0];
  if (!best) return '';
  const threshold = source.length <= 4 ? 1 : 2;
  return best.distance <= threshold ? best.name : '';
}

function closestFormulaNamedRangeName(name, context = {}) {
  const source = String(name || '').toUpperCase();
  if (!source) return '';
  const candidates = normalizedNamedRanges(context.namedRanges, context.sheetId)
    .map((item, index) => ({name: item.name, index, distance: formulaNameDistance(source, item.name)}))
    .sort((a, b) => a.distance - b.distance || a.index - b.index);
  const best = candidates[0];
  if (!best) return '';
  const threshold = source.length <= 4 ? 1 : 2;
  return best.distance <= threshold ? best.name : '';
}

function closestFormulaSheetName(name, context = {}) {
  const source = String(name || '').toUpperCase();
  if (!source) return '';
  const candidates = normalizedFormulaSheets(context.sheets)
    .map((item, index) => ({name: item.name, index, distance: formulaNameDistance(source, item.name)}))
    .sort((a, b) => a.distance - b.distance || a.index - b.index);
  const best = candidates[0];
  if (!best) return '';
  const threshold = source.length <= 4 ? 1 : 2;
  return best.distance <= threshold ? best.name : '';
}

export function getFormulaEditorSuggestions(formula, cursorPosition, context = {}) {
  const source = String(formula ?? '');
  if (!source.trimStart().startsWith('=')) return [];
  const token = activeFormulaIdentifier(source, cursorPosition, context) || activeFormulaSheetIdentifier(source, cursorPosition, context);
  if (!token && source.trim() !== '=') return [];
  const functions = listFormulaFunctions().map((item) => {
    const help = getFormulaFunctionHelp(item.name, context);
    return {
      type: 'function',
      name: item.name,
      label: item.name,
      detail: item.category,
      signature: help.signature,
      description: help.description,
    };
  });
  const namedRanges = normalizedNamedRanges(context.namedRanges, context.sheetId).map((range) => ({
    type: 'namedRange',
    name: range.name,
    label: range.name,
    detail: range.scope === 'sheet' ? 'Sheet named range' : 'Named range',
    signature: namedRangeReferenceSummary(range),
    description: range.comment || 'Named range',
  }));
  const sheets = normalizedFormulaSheets(context.sheets).map((sheet) => ({
    type: 'sheet',
    name: sheet.name,
    label: sheet.name,
    detail: sheet.id && sheet.id === context.sheetId ? 'Current sheet' : 'Sheet',
    signature: `${formulaSheetQualifier(sheet.name)}!A1`,
    description: 'Sheet reference',
  }));
  return rankedByToken([...functions, ...namedRanges, ...sheets], token);
}

export function completeFormulaIdentifierDraft(formula, identifier, cursorPosition, options = {}) {
  const source = String(formula ?? '');
  const cursor = Math.max(0, Math.min(source.length, cursorPosition == null ? source.length : cursorPosition));
  const name = String(identifier || '');
  const suffix = options.suffix || '';
  const before = source.slice(0, cursor);
  const after = source.slice(cursor);
  const tokenMatch = /([A-Z_][A-Z0-9_.]*)$/i.exec(before);
  if (tokenMatch) {
    const prefix = before.slice(0, tokenMatch.index);
    const value = `${prefix}${name}${suffix}${after}`;
    return {value, cursor: prefix.length + name.length + suffix.length};
  }
  if (!before.trimStart().startsWith('=')) {
    const value = `=${name}${suffix}${after}`;
    return {value, cursor: name.length + suffix.length + 1};
  }
  const prefix = before;
  const spacer = prefix === '=' || /[(,+\-*/^&\s]$/.test(prefix) ? '' : '';
  const value = `${prefix}${spacer}${name}${suffix}${after}`;
  return {value, cursor: prefix.length + spacer.length + name.length + suffix.length};
}

export function completeFormulaFunctionDraft(formula, name, cursorPosition, options = {}) {
  const source = String(formula ?? '');
  const cursor = Math.max(0, Math.min(source.length, cursorPosition == null ? source.length : cursorPosition));
  const after = source.slice(cursor);
  const suffix = options.pairedParentheses
    ? /^\s*\(/.test(after)
      ? ''
      : /^\s*\)/.test(after)
        ? '('
        : '()'
    : '(';
  const next = completeFormulaIdentifierDraft(source, String(name || '').toUpperCase(), cursor, {suffix});
  return options.pairedParentheses && suffix === '()' ? {...next, cursor: next.cursor - 1} : next;
}

export function completeFormulaSheetNameDraft(formula, sheetName, cursorPosition) {
  const source = String(formula ?? '');
  const cursor = Math.max(0, Math.min(source.length, cursorPosition == null ? source.length : cursorPosition));
  const qualifier = formulaSheetQualifier(sheetName);
  const before = source.slice(0, cursor);
  const after = source.slice(cursor);
  const draftMatch = /(?:'(?:(?:'')|[^'])*|[A-Za-z_][A-Za-z0-9_.]*)$/i.exec(before);
  if (draftMatch) {
    const prefix = before.slice(0, draftMatch.index);
    const value = `${prefix}${qualifier}!${after}`;
    return {value, cursor: prefix.length + qualifier.length + 1};
  }
  return completeFormulaIdentifierDraft(source, qualifier, cursor, {suffix: '!'});
}

export function replaceFormulaFunctionNameDraft(formula, functionName, replacement, cursorPosition) {
  const source = String(formula ?? '');
  const targetName = String(functionName || '').toUpperCase();
  const replacementName = String(replacement || '').toUpperCase();
  if (!targetName || !replacementName || !source.trimStart().startsWith('=')) return null;
  const cursor = Math.max(0, Math.min(source.length, cursorPosition == null ? source.length : cursorPosition));
  for (let index = 0; index < source.length;) {
    const ch = source[index];
    if (ch === '"') {
      index++;
      while (index < source.length) {
        if (source[index] === '"' && source[index + 1] === '"') {
          index += 2;
          continue;
        }
        if (source[index] === '"') {
          index++;
          break;
        }
        index++;
      }
      continue;
    }
    if (ch === "'") {
      const quotedSheet = consumeFormulaQuotedSheetName(source, index);
      if (quotedSheet) {
        index = quotedSheet.end;
        continue;
      }
    }
    if (/[A-Za-z_]/.test(ch)) {
      const match = /^[A-Za-z_][A-Za-z0-9_.]*/.exec(source.slice(index));
      if (match) {
        const name = match[0];
        const nextIndex = index + name.length;
        const after = source.slice(nextIndex);
        if (name.toUpperCase() === targetName && /^\s*\(/.test(after)) {
          const value = `${source.slice(0, index)}${replacementName}${source.slice(nextIndex)}`;
          const delta = replacementName.length - name.length;
          const nextCursor = cursor <= index ? cursor : cursor <= nextIndex ? index + replacementName.length : cursor + delta;
          return {value, cursor: Math.max(0, Math.min(value.length, nextCursor))};
        }
        index = nextIndex;
        continue;
      }
    }
    index++;
  }
  return null;
}

function identifierTokenLooksQualified(source, token) {
  const before = source.slice(0, token.start).trimEnd();
  const after = source.slice(token.end).trimStart();
  return before.endsWith('!') || after.startsWith('!');
}

export function replaceFormulaIdentifierNameDraft(formula, identifier, replacement, cursorPosition, context = {}) {
  const source = String(formula ?? '');
  const targetName = String(identifier || '').toUpperCase();
  const replacementName = String(replacement || '');
  if (!targetName || !replacementName || !source.trimStart().startsWith('=')) return null;
  const cursor = Math.max(0, Math.min(source.length, cursorPosition == null ? source.length : cursorPosition));
  for (const token of tokenizeFormulaEditorDraft(source, context)) {
    if (token.type !== 'identifier') continue;
    if (token.value.toUpperCase() !== targetName) continue;
    if (/^\s*\(/.test(source.slice(token.end))) continue;
    if (identifierTokenLooksQualified(source, token)) continue;
    const value = `${source.slice(0, token.start)}${replacementName}${source.slice(token.end)}`;
    const delta = replacementName.length - token.value.length;
    const nextCursor = cursor <= token.start ? cursor : cursor <= token.end ? token.start + replacementName.length : cursor + delta;
    return {value, cursor: Math.max(0, Math.min(value.length, nextCursor))};
  }
  return null;
}

export function replaceFormulaSheetReferenceDraft(formula, sheetName, replacement, cursorPosition, context = {}) {
  const source = String(formula ?? '');
  const targetName = String(sheetName || '').toUpperCase();
  const replacementQualifier = formulaSheetQualifier(replacement);
  if (!targetName || !replacementQualifier || !source.trimStart().startsWith('=')) return null;
  const cursor = Math.max(0, Math.min(source.length, cursorPosition == null ? source.length : cursorPosition));
  for (const token of tokenizeFormulaEditorDraft(source, context)) {
    if (token.type !== 'reference') continue;
    const {qualifier, core} = splitFormulaReferenceQualifier(token.value);
    if (!qualifier) continue;
    if (formulaSheetNameFromQualifier(qualifier).toUpperCase() !== targetName) continue;
    const replacementText = `${replacementQualifier}!${core}`;
    const value = `${source.slice(0, token.start)}${replacementText}${source.slice(token.end)}`;
    const delta = replacementText.length - token.value.length;
    const nextCursor = cursor <= token.start ? cursor : cursor <= token.end ? token.start + replacementText.length : cursor + delta;
    return {value, cursor: Math.max(0, Math.min(value.length, nextCursor))};
  }
  return null;
}

export function formulaReferenceForSelection(selection) {
  if (!selection) return '';
  const start = cellAddress(selection.r1, selection.c1);
  const end = cellAddress(selection.r2, selection.c2);
  return start === end ? start : `${start}:${end}`;
}

export function insertFormulaReferenceDraft(formula, reference, cursorPosition) {
  const source = String(formula ?? '');
  const refText = String(reference || '');
  if (!source.trimStart().startsWith('=')) {
    return {value: `=${refText}`, cursor: refText.length + 1};
  }
  const cursor = Math.max(0, Math.min(source.length, cursorPosition == null ? source.length : cursorPosition));
  const activeReference = getFormulaReferenceTokenAtCursor(source, cursor);
  const before = source.slice(0, activeReference?.start ?? cursor);
  const after = source.slice(activeReference?.end ?? cursor);
  const value = `${before}${refText}${after}`;
  return {value, cursor: before.length + refText.length};
}

export function getFormulaReferenceTokenAtCursor(formula, cursorPosition) {
  const source = String(formula ?? '');
  if (!source.trimStart().startsWith('=')) return null;
  const cursor = Math.max(0, Math.min(source.length, cursorPosition == null ? source.length : cursorPosition));
  return tokenizeFormulaEditorDraft(source).find((token) => (
    token.type === 'reference' && token.start <= cursor && cursor <= token.end
  )) || null;
}

function cycleFormulaCellReferencePart(part) {
  const match = /^(\$?)([A-Z]{1,3})(\$?)(\d+)(#?)$/i.exec(part);
  if (!match) return null;
  const [, colAbsMark, colText, rowAbsMark, rowText, spillMark] = match;
  const colAbs = colAbsMark === '$';
  const rowAbs = rowAbsMark === '$';
  let nextColAbs = false;
  let nextRowAbs = false;
  if (!colAbs && !rowAbs) {
    nextColAbs = true;
    nextRowAbs = true;
  } else if (colAbs && rowAbs) {
    nextColAbs = false;
    nextRowAbs = true;
  } else if (!colAbs && rowAbs) {
    nextColAbs = true;
    nextRowAbs = false;
  }
  return `${nextColAbs ? '$' : ''}${colText}${nextRowAbs ? '$' : ''}${rowText}${spillMark}`;
}

function cycleFormulaColumnReferencePart(part) {
  const match = /^(\$?)([A-Z]{1,3})$/i.exec(part);
  if (!match) return null;
  return `${match[1] === '$' ? '' : '$'}${match[2]}`;
}

function cycleFormulaRowReferencePart(part) {
  const match = /^(\$?)(\d+)$/i.exec(part);
  if (!match) return null;
  return `${match[1] === '$' ? '' : '$'}${match[2]}`;
}

function cycleFormulaReferencePart(part) {
  return cycleFormulaCellReferencePart(part) || cycleFormulaColumnReferencePart(part) || cycleFormulaRowReferencePart(part);
}

function splitFormulaReferenceQualifier(reference) {
  const text = String(reference ?? '');
  const bangIndex = text.lastIndexOf('!');
  if (bangIndex < 0) return {qualifier: '', core: text};
  return {qualifier: text.slice(0, bangIndex + 1), core: text.slice(bangIndex + 1)};
}

function formulaSheetNameFromQualifier(qualifier) {
  const text = String(qualifier ?? '');
  if (!text.endsWith('!')) return '';
  const rawName = text.slice(0, -1);
  if (rawName.startsWith("'") && rawName.endsWith("'")) {
    return rawName.slice(1, -1).replace(/''/g, "'");
  }
  return rawName;
}

function sameFormulaSheetQualifier(qualifier, context = {}) {
  const sheetName = formulaSheetNameFromQualifier(qualifier);
  if (!sheetName) return true;
  const normalized = sheetName.toUpperCase();
  return [context.sheetId, context.sheetName, context.activeSheetName]
    .filter(Boolean)
    .some((value) => String(value).toUpperCase() === normalized);
}

function formulaReferenceRangeForToken(token, context = {}) {
  const {qualifier, core} = splitFormulaReferenceQualifier(token.value);
  if (!sameFormulaSheetQualifier(qualifier, context)) return null;
  const spillReference = core.endsWith('#') && !core.includes(':');
  const referenceCore = spillReference ? core.slice(0, -1) : core;
  if (spillReference) {
    const cell = parseCellAddress(referenceCore);
    const spillRange = cell ? context.getSpillRangeForCell?.(formulaSheetNameFromQualifier(qualifier), cell.row, cell.col, token.value) : null;
    if (spillRange) return spillRange;
  }
  return parseRange(referenceCore, {
    allowWholeReference: true,
    rowCount: context.sheetRowCount || context.rowCount,
    colCount: context.sheetColCount || context.colCount,
  });
}

function clampFormulaHighlightRange(range, context = {}) {
  if (!range) return null;
  const rowCount = context.sheetRowCount || context.rowCount;
  const colCount = context.sheetColCount || context.colCount;
  let {r1, r2, c1, c2} = range;
  if (rowCount != null) {
    if (r2 < 0 || r1 >= rowCount) return null;
    r1 = Math.max(0, Math.min(rowCount - 1, r1));
    r2 = Math.max(0, Math.min(rowCount - 1, r2));
  }
  if (colCount != null) {
    if (c2 < 0 || c1 >= colCount) return null;
    c1 = Math.max(0, Math.min(colCount - 1, c1));
    c2 = Math.max(0, Math.min(colCount - 1, c2));
  }
  return {r1, r2, c1, c2};
}

export function getFormulaEditorReferenceHighlights(formula, context = {}) {
  if (!String(formula ?? '').trimStart().startsWith('=')) return [];
  const namedRanges = normalizedNamedRanges(context.namedRanges, context.sheetId);
  const namedRangeByName = new Map(namedRanges.map((range) => [range.name.toUpperCase(), range]));
  return tokenizeFormulaEditorDraft(formula, context)
    .map((token) => {
      if (token.type === 'reference') {
        const range = clampFormulaHighlightRange(formulaReferenceRangeForToken(token, context), context);
        return range ? {type: 'reference', reference: token.value, range, color: token.color || 'blue'} : null;
      }
      if (token.type === 'namedRange') {
        const namedRange = namedRangeByName.get(String(token.value || '').toUpperCase());
        if (!namedRange?.range) return null;
        if (namedRange.sheetId && context.sheetId && namedRange.sheetId !== context.sheetId) return null;
        const range = clampFormulaHighlightRange(namedRange.range, context);
        return range ? {type: 'namedRange', reference: token.value, range, color: token.color || 'blue'} : null;
      }
      return null;
    })
    .filter(Boolean);
}

export function cycleFormulaReferenceDraft(formula, cursorPosition) {
  const source = String(formula ?? '');
  const token = getFormulaReferenceTokenAtCursor(source, cursorPosition);
  if (!token) return null;
  const {qualifier, core} = splitFormulaReferenceQualifier(token.value);
  const rangeParts = core.split(':');
  if (rangeParts.length !== 1 && rangeParts.length !== 2) return null;
  const cycledParts = rangeParts.map((part) => cycleFormulaReferencePart(part));
  if (cycledParts.some((part) => !part)) return null;
  const nextCore = rangeParts.length === 2 ? cycledParts.join(':') : cycledParts[0];
  const replacement = `${qualifier}${nextCore}`;
  const value = `${source.slice(0, token.start)}${replacement}${source.slice(token.end)}`;
  return {value, cursor: token.start + replacement.length};
}

function consumeFormulaQuotedSheetName(source, index) {
  if (source[index] !== "'") return null;
  let cursor = index + 1;
  while (cursor < source.length) {
    if (source[cursor] === "'" && source[cursor + 1] === "'") {
      cursor += 2;
      continue;
    }
    if (source[cursor] === "'") {
      return source[cursor + 1] === '!' ? {value: source.slice(index, cursor + 2), end: cursor + 2} : null;
    }
    cursor++;
  }
  return null;
}

function consumeFormulaReferenceToken(source, index) {
  let cursor = index;
  const quotedSheet = consumeFormulaQuotedSheetName(source, cursor);
  if (quotedSheet) {
    cursor = quotedSheet.end;
  } else {
    const sheetMatch = /^[A-Za-z_][A-Za-z0-9_.]*!/.exec(source.slice(cursor));
    if (sheetMatch) cursor += sheetMatch[0].length;
  }
  const core = source.slice(cursor);
  const referenceMatch = /^(?:\$?[A-Z]{1,3}\$?\d+:\$?[A-Z]{1,3}\$?\d+|\$?[A-Z]{1,3}\$?\d+#?|\$?[A-Z]{1,3}:\$?[A-Z]{1,3}|\$?\d+:\$?\d+)/i.exec(core);
  if (!referenceMatch) return null;
  const end = cursor + referenceMatch[0].length;
  if (/[A-Z0-9_.]/i.test(source[end] || '')) return null;
  return {value: source.slice(index, end), end};
}

function formulaTokenColor(value, colorMap) {
  const key = String(value || '').toUpperCase();
  if (!colorMap.has(key)) colorMap.set(key, FORMULA_REFERENCE_COLORS[colorMap.size % FORMULA_REFERENCE_COLORS.length]);
  return colorMap.get(key);
}

export function tokenizeFormulaEditorDraft(formula, context = {}) {
  const source = String(formula ?? '');
  if (!source.trimStart().startsWith('=')) {
    return source ? [{type: 'text', value: source, start: 0, end: source.length}] : [];
  }
  const namedRangeNames = new Set(normalizedNamedRanges(context.namedRanges, context.sheetId).map((range) => range.name.toUpperCase()));
  const colorMap = new Map();
  const tokens = [];
  let index = 0;
  const push = (type, value, start, extra = {}) => tokens.push({type, value, start, end: start + value.length, ...extra});

  while (index < source.length) {
    const start = index;
    const rest = source.slice(index);
    const whitespace = /^\s+/.exec(rest);
    if (whitespace) {
      push('space', whitespace[0], start);
      index += whitespace[0].length;
      continue;
    }
    if (source[index] === '"') {
      index++;
      while (index < source.length) {
        if (source[index] === '"' && source[index + 1] === '"') {
          index += 2;
          continue;
        }
        if (source[index] === '"') {
          index++;
          break;
        }
        index++;
      }
      push('string', source.slice(start, index), start);
      continue;
    }
    const errorMatch = /^#(?:DIV\/0!|N\/A|NAME\?|NULL!|NUM!|REF!|VALUE!)/i.exec(rest);
    if (errorMatch) {
      push('error', errorMatch[0], start);
      index += errorMatch[0].length;
      continue;
    }
    const reference = consumeFormulaReferenceToken(source, index);
    if (reference) {
      push('reference', reference.value, start, {color: formulaTokenColor(reference.value, colorMap)});
      index = reference.end;
      continue;
    }
    const numberMatch = /^(?:\d+(?:\.\d*)?|\.\d+)(?:E[+-]?\d+)?%?/i.exec(rest);
    if (numberMatch) {
      push('number', numberMatch[0], start);
      index += numberMatch[0].length;
      continue;
    }
    const identifierMatch = /^[A-Za-z_][A-Za-z0-9_.]*/.exec(rest);
    if (identifierMatch) {
      const name = identifierMatch[0];
      const upperName = name.toUpperCase();
      const after = source.slice(index + name.length);
      const type = namedRangeNames.has(upperName)
        ? 'namedRange'
        : FORMULA_FUNCTION_NAME_SET.has(upperName) && /^\s*\(/.test(after)
          ? 'function'
          : upperName === 'TRUE' || upperName === 'FALSE'
            ? 'boolean'
            : 'identifier';
      const extra = type === 'namedRange' ? {color: formulaTokenColor(name, colorMap)} : {};
      push(type, name, start, extra);
      index += name.length;
      continue;
    }
    if (source[index] === '(' || source[index] === ')') {
      push('paren', source[index], start);
      index++;
      continue;
    }
    if (source[index] === ',' || source[index] === ';') {
      push('delimiter', source[index], start);
      index++;
      continue;
    }
    if (/^[=+\-*/^&%<>]/.test(source[index])) {
      const operatorMatch = /^(?:>=|<=|<>|[=+\-*/^&%<>])/.exec(rest);
      push('operator', operatorMatch[0], start);
      index += operatorMatch[0].length;
      continue;
    }
    push('unknown', source[index], start);
    index++;
  }
  return tokens;
}

function formulaFunctionCallArgumentCounts(formula) {
  const source = String(formula ?? '');
  if (!source.trimStart().startsWith('=')) return [];
  const calls = [];
  const stack = [];
  let pendingName = null;
  const markArgumentContent = () => {
    if (stack.length) stack[stack.length - 1].hasArgumentContent = true;
  };
  const finishFrame = (frame, closed) => {
    if (!frame?.name) return;
    calls.push({
      name: frame.name,
      argumentCount: frame.hasArgumentContent ? frame.argumentIndex + 1 : frame.argumentIndex,
      closed,
    });
  };

  for (let index = source.indexOf('=') + 1; index < source.length; index++) {
    const ch = source[index];
    if (ch === '"') {
      markArgumentContent();
      index++;
      while (index < source.length) {
        if (source[index] === '"' && source[index + 1] === '"') {
          index += 2;
          continue;
        }
        if (source[index] === '"') break;
        index++;
      }
      pendingName = null;
      continue;
    }
    if (ch === "'") {
      const quotedSheet = consumeFormulaQuotedSheetName(source, index);
      if (quotedSheet) {
        markArgumentContent();
        index = quotedSheet.end - 1;
        pendingName = null;
        continue;
      }
    }
    if (/[A-Za-z_]/.test(ch)) {
      const match = /^[A-Za-z_][A-Za-z0-9_.]*/.exec(source.slice(index));
      if (match) {
        markArgumentContent();
        pendingName = {name: match[0].toUpperCase(), end: index + match[0].length};
        index += match[0].length - 1;
        continue;
      }
    }
    if (ch === '(') {
      const callName = pendingName && /^\s*$/.test(source.slice(pendingName.end, index)) ? pendingName.name : '';
      stack.push({name: callName, argumentIndex: 0, hasArgumentContent: false});
      pendingName = null;
      continue;
    }
    if (ch === ',') {
      if (stack.length) {
        const frame = stack[stack.length - 1];
        frame.argumentIndex += 1;
        frame.hasArgumentContent = false;
      }
      pendingName = null;
      continue;
    }
    if (ch === ')') {
      const frame = stack.pop();
      finishFrame(frame, true);
      if (stack.length && frame) stack[stack.length - 1].hasArgumentContent = true;
      pendingName = null;
      continue;
    }
    if (!/\s/.test(ch)) {
      markArgumentContent();
      pendingName = null;
    }
  }

  for (const frame of stack) finishFrame(frame, false);
  return calls;
}

function formulaUnknownNameDiagnostics(formula, context = {}) {
  const source = String(formula ?? '');
  const namedRanges = normalizedNamedRanges(context.namedRanges, context.sheetId);
  if (!namedRanges.length) return [];
  const knownNames = new Set(namedRanges.map((item) => item.name.toUpperCase()));
  const diagnostics = [];
  const seen = new Set();
  for (const token of tokenizeFormulaEditorDraft(source, context)) {
    if (token.type !== 'identifier') continue;
    const name = String(token.value || '');
    const upperName = name.toUpperCase();
    if (seen.has(upperName)) continue;
    if (knownNames.has(upperName) || FORMULA_FUNCTION_NAME_SET.has(upperName)) continue;
    if (/^\s*\(/.test(source.slice(token.end))) continue;
    if (identifierTokenLooksQualified(source, token)) continue;
    const suggestion = closestFormulaNamedRangeName(name, context);
    if (!suggestion) continue;
    seen.add(upperName);
    diagnostics.push({
      severity: 'error',
      code: 'UNKNOWN_NAME',
      message: `Unknown name ${name}. Did you mean ${suggestion}?`,
      name,
      suggestion,
      start: token.start,
      end: token.end,
    });
  }
  return diagnostics;
}

function formulaUnknownSheetDiagnostics(formula, context = {}) {
  const source = String(formula ?? '');
  const sheets = normalizedFormulaSheets(context.sheets);
  if (!sheets.length) return [];
  const knownSheets = new Set(sheets.flatMap((sheet) => [sheet.id, sheet.name].filter(Boolean).map((value) => String(value).toUpperCase())));
  const diagnostics = [];
  const seen = new Set();
  for (const token of tokenizeFormulaEditorDraft(source, context)) {
    if (token.type !== 'reference') continue;
    const {qualifier} = splitFormulaReferenceQualifier(token.value);
    if (!qualifier) continue;
    const sheetName = formulaSheetNameFromQualifier(qualifier);
    const upperName = sheetName.toUpperCase();
    if (!sheetName || knownSheets.has(upperName) || seen.has(upperName)) continue;
    const suggestion = closestFormulaSheetName(sheetName, context);
    if (!suggestion) continue;
    seen.add(upperName);
    diagnostics.push({
      severity: 'error',
      code: 'UNKNOWN_SHEET',
      message: `Unknown sheet ${sheetName}. Did you mean ${suggestion}?`,
      sheetName,
      suggestion,
      start: token.start,
      end: token.start + Math.max(0, qualifier.length - 1),
    });
  }
  return diagnostics;
}

function formulaInvalidReferenceDiagnostics(formula, context = {}) {
  const source = String(formula ?? '');
  const sheets = normalizedFormulaSheets(context.sheets);
  const knownSheets = new Set(sheets.flatMap((sheet) => [sheet.id, sheet.name].filter(Boolean).map((value) => String(value).toUpperCase())));
  const diagnostics = [];
  const seen = new Set();
  const options = {
    currentSheetName: context.activeSheetName || context.sheetName,
    rowCount: context.sheetRowCount || context.rowCount,
    colCount: context.sheetColCount || context.colCount,
  };
  for (const token of tokenizeFormulaEditorDraft(source, context)) {
    if (token.type !== 'reference') continue;
    const {qualifier} = splitFormulaReferenceQualifier(token.value);
    const sheetName = qualifier ? formulaSheetNameFromQualifier(qualifier) : '';
    if (sheetName && sheets.length && !knownSheets.has(sheetName.toUpperCase())) continue;
    const parsed = parseRangeReference(token.value, options);
    if (parsed !== '#REF!') continue;
    const key = token.value.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    diagnostics.push({
      severity: 'error',
      code: 'INVALID_REFERENCE',
      message: `Reference ${token.value} is outside the sheet bounds.`,
      reference: token.value,
      start: token.start,
      end: token.end,
    });
  }
  return diagnostics;
}

export function diagnoseFormulaDraft(formula, preview = null, context = {}) {
  const source = String(formula ?? '');
  const text = source.trim();
  if (!text.startsWith('=')) return [];
  const diagnostics = [];
  const body = source.slice(source.indexOf('=') + 1);
  let quoted = false;
  let depth = 0;
  const unknownFunctions = new Set();

  for (let index = 0; index < body.length; index++) {
    const ch = body[index];
    if (ch === '"') {
      if (quoted && body[index + 1] === '"') {
        index++;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (quoted) continue;
    if (/[A-Za-z_]/.test(ch)) {
      const match = /^[A-Za-z_][A-Za-z0-9_.]*/.exec(body.slice(index));
      if (match) {
        const name = match[0].toUpperCase();
        const after = body.slice(index + match[0].length);
        if (/^\s*\(/.test(after) && !FORMULA_FUNCTION_NAME_SET.has(name)) unknownFunctions.add(name);
        index += match[0].length - 1;
        continue;
      }
    }
    if (ch === '(') depth++;
    if (ch === ')') {
      if (depth === 0) {
        diagnostics.push({severity: 'error', code: 'UNEXPECTED_CLOSING_PAREN', message: 'Unexpected closing parenthesis.'});
      } else {
        depth--;
      }
    }
  }

  if (quoted) diagnostics.push({severity: 'error', code: 'UNTERMINATED_STRING', message: 'Missing closing quote.'});
  if (depth > 0) diagnostics.push({severity: 'warning', code: 'MISSING_CLOSING_PAREN', message: `Missing ${depth} closing parenthesis${depth === 1 ? '' : 'es'}.`});
  for (const name of unknownFunctions) {
    const suggestion = closestFormulaFunctionName(name);
    diagnostics.push({
      severity: 'error',
      code: 'UNKNOWN_FUNCTION',
      message: suggestion ? `Unknown function ${name}. Did you mean ${suggestion}?` : `Unknown function ${name}.`,
      functionName: name,
      ...(suggestion ? {suggestion} : {}),
    });
  }
  if (!preview || preview.error === '#NAME?' || context.checkUnknownNames) {
    diagnostics.push(...formulaUnknownNameDiagnostics(source, context));
  }
  if (!preview || preview.error === '#REF!' || context.checkUnknownSheets) {
    diagnostics.push(...formulaUnknownSheetDiagnostics(source, context));
  }
  if (!preview || preview.error === '#REF!' || context.checkInvalidReferences) {
    diagnostics.push(...formulaInvalidReferenceDiagnostics(source, context));
  }
  diagnostics.push(...formulaRangeCompatibilityDiagnostics(source, context));
  diagnostics.push(...formulaOptionValueDiagnostics(source));
  diagnostics.push(...formulaReferenceIndexDiagnostics(source, context));
  diagnostics.push(...formulaArgumentDomainDiagnostics(source, context));
  for (const call of formulaFunctionCallArgumentCounts(source)) {
    if (unknownFunctions.has(call.name)) continue;
    const rule = formulaArgumentRuleForFunction(call.name);
    if (!rule) continue;
    if (call.argumentCount < rule.min || call.argumentCount > rule.max) {
      diagnostics.push({
        severity: 'warning',
        code: 'FUNCTION_ARGUMENT_COUNT',
        message: `${call.name} expects ${formulaArgumentExpectationText(rule)}; found ${formulaArgumentCountText(call.argumentCount)}.`,
        functionName: call.name,
        argumentCount: call.argumentCount,
        expectedMin: rule.min,
        expectedMax: rule.max,
      });
    }
    const structuredDiagnostic = formulaStructuredArgumentDiagnostic(call);
    if (structuredDiagnostic) diagnostics.push(structuredDiagnostic);
  }
  if (/=\s*$/.test(source)) {
    diagnostics.push({severity: 'warning', code: 'EMPTY_FORMULA', message: 'Enter a formula expression.'});
  } else if (/[,+\-*/^&]\s*$/.test(body)) {
    diagnostics.push({severity: 'warning', code: 'TRAILING_OPERATOR', message: 'Formula ends with an operator or separator.'});
  }
  if (preview?.error && !diagnostics.some((item) => item.code === preview.error) && !(preview.error === '#NAME?' && diagnostics.some((item) => item.code === 'UNKNOWN_FUNCTION' || item.code === 'UNKNOWN_NAME')) && !(preview.error === '#REF!' && diagnostics.some((item) => item.code === 'UNKNOWN_SHEET' || item.code === 'INVALID_REFERENCE' || item.code === 'FUNCTION_REFERENCE_INDEX')) && !(preview.error === '#VALUE!' && diagnostics.some((item) => item.code === 'FUNCTION_RANGE_SHAPE' || item.code === 'FUNCTION_RANGE_SIZE' || item.code === 'FUNCTION_OPTION_VALUE' || item.code === 'FUNCTION_ARGUMENT_DOMAIN')) && !(preview.error === '#NUM!' && diagnostics.some((item) => item.code === 'FUNCTION_OPTION_VALUE' || item.code === 'FUNCTION_ARGUMENT_DOMAIN'))) {
    diagnostics.push({severity: 'error', code: preview.error, message: `Formula evaluates to ${preview.error}.`});
  }
  return diagnostics;
}

export function isFormulaVolatile(formula) {
  const text = String(formula ?? '').replace(/"(?:""|[^"])*"/g, '');
  return VOLATILE_FORMULA_PATTERN.test(text);
}

export function createFormulaTemplate(name, context = {}) {
  const formulaName = String(name || '').toUpperCase();
  const range = context.range || 'A1:B2';
  const firstCell = context.firstCell || 'A1';
  const lastCell = context.lastCell || firstCell;
  const firstColumnRange = context.firstColumnRange || range;
  const lastColumnRange = context.lastColumnRange || range;
  const lastColumnIndex = context.lastColumnIndex || 1;
  const rowCount = context.rowCount || 1;
  const cashFlowRange = context.cashFlowRange || firstColumnRange;
  const cashFlowDateRange = context.cashFlowDateRange || context.dateRange || lastColumnRange;
  const formulaCell = context.formulaCell || firstCell;
  const templates = {
    SUM: `=SUM(${range})`,
    AVERAGE: `=AVERAGE(${range})`,
    MIN: `=MIN(${range})`,
    MAX: `=MAX(${range})`,
    COUNT: `=COUNT(${range})`,
    COUNTA: `=COUNTA(${range})`,
    COUNTIF: `=COUNTIF(${range},">0")`,
    COUNTIFS: `=COUNTIFS(${range},">0")`,
    COUNTBLANK: `=COUNTBLANK(${range})`,
    AVERAGEA: `=AVERAGEA(${range})`,
    MEDIAN: `=MEDIAN(${range})`,
    'STDEV.P': `=STDEV.P(${range})`,
    'VAR.S': `=VAR.S(${range})`,
    'VAR.P': `=VAR.P(${range})`,
    SUMIF: `=SUMIF(${range},">0",${range})`,
    AVERAGEIF: `=AVERAGEIF(${range},">0",${range})`,
    SUMIFS: `=SUMIFS(${range},${range},">0")`,
    AVERAGEIFS: `=AVERAGEIFS(${range},${range},">0")`,
    MINIFS: `=MINIFS(${range},${range},">0")`,
    MAXIFS: `=MAXIFS(${range},${range},">0")`,
    XLOOKUP: `=XLOOKUP(${firstCell},${firstColumnRange},${lastColumnRange},"")`,
    LOOKUP: `=LOOKUP(${firstCell},${firstColumnRange},${lastColumnRange})`,
    VLOOKUP: `=VLOOKUP(${firstCell},${range},${lastColumnIndex},FALSE)`,
    HLOOKUP: `=HLOOKUP(${firstCell},${range},${Math.max(1, rowCount)},FALSE)`,
    INDEX: `=INDEX(${range},1,1)`,
    MATCH: `=MATCH(${firstCell},${range},0)`,
    XMATCH: `=XMATCH(${firstCell},${range},0)`,
    FILTER: `=FILTER(${firstColumnRange},${firstColumnRange}>0)`,
    UNIQUE: `=UNIQUE(${firstColumnRange})`,
    SORT: `=SORT(${range},1,1)`,
    SEQUENCE: `=SEQUENCE(${Math.max(1, rowCount)},${Math.max(1, lastColumnIndex)})`,
    TRANSPOSE: `=TRANSPOSE(${range})`,
    HSTACK: `=HSTACK(${firstColumnRange},${lastColumnRange})`,
    VSTACK: `=VSTACK(${firstColumnRange},${lastColumnRange})`,
    TAKE: `=TAKE(${range},${Math.min(2, Math.max(1, rowCount))})`,
    DROP: `=DROP(${range},1)`,
    CHOOSECOLS: `=CHOOSECOLS(${range},1,${Math.max(1, lastColumnIndex)})`,
    CHOOSEROWS: `=CHOOSEROWS(${range},1,${Math.max(1, rowCount)})`,
    ROW: `=ROW(${firstCell})`,
    COLUMN: `=COLUMN(${firstCell})`,
    ROWS: `=ROWS(${range})`,
    COLUMNS: `=COLUMNS(${range})`,
    ADDRESS: `=ADDRESS(ROW(${firstCell}),COLUMN(${firstCell}))`,
    INDIRECT: `=INDIRECT("${firstCell}")`,
    OFFSET: `=OFFSET(${firstCell},1,0)`,
    LET: `=LET(value,${firstCell},value*2)`,
    IF: `=IF(${firstCell}>0,"yes","no")`,
    IFS: `=IFS(${firstCell}>0,"positive",${firstCell}=0,"zero")`,
    SWITCH: `=SWITCH(${firstCell},${firstCell},"match","other")`,
    CHOOSE: `=CHOOSE(1,${firstCell},${lastCell})`,
    IFERROR: `=IFERROR(${firstCell},"")`,
    IFNA: '=IFNA(NA(),"fallback")',
    TRUE: '=TRUE()',
    FALSE: '=FALSE()',
    AND: `=AND(${firstCell}>0,${lastCell}>0)`,
    OR: `=OR(${firstCell}>0,${lastCell}>0)`,
    XOR: `=XOR(${firstCell}>0,${lastCell}>0)`,
    NOT: `=NOT(${firstCell}>0)`,
    ISERROR: '=ISERROR(1/0)',
    ISERR: '=ISERR(1/0)',
    ISNA: '=ISNA(NA())',
    ISBLANK: `=ISBLANK(${firstCell})`,
    ISNUMBER: `=ISNUMBER(${firstCell})`,
    ISTEXT: `=ISTEXT(${firstCell})`,
    ISLOGICAL: '=ISLOGICAL(TRUE)',
    ISNONTEXT: `=ISNONTEXT(${firstCell})`,
    ISEVEN: `=ISEVEN(${firstCell})`,
    ISODD: `=ISODD(${firstCell})`,
    ISFORMULA: `=ISFORMULA(${firstCell})`,
    FORMULATEXT: `=FORMULATEXT(${formulaCell})`,
    N: `=N(${firstCell})`,
    T: `=T(${firstCell})`,
    NA: '=NA()',
    TYPE: `=TYPE(${firstCell})`,
    'ERROR.TYPE': '=ERROR.TYPE(1/0)',
    ROUND: `=ROUND(${firstCell},0)`,
    ROUNDUP: `=ROUNDUP(${firstCell},0)`,
    ROUNDDOWN: `=ROUNDDOWN(${firstCell},0)`,
    ABS: `=ABS(${firstCell})`,
    SQRT: `=SQRT(ABS(${firstCell}))`,
    POWER: `=POWER(${firstCell},2)`,
    EXP: '=EXP(1)',
    LN: `=LN(ABS(${firstCell}))`,
    SIN: `=SIN(${firstCell})`,
    COS: `=COS(${firstCell})`,
    TAN: `=TAN(${firstCell})`,
    MOD: `=MOD(${firstCell},2)`,
    INT: `=INT(${firstCell})`,
    TRUNC: `=TRUNC(${firstCell},0)`,
    SIGN: `=SIGN(${firstCell})`,
    CEILING: `=CEILING(${firstCell},1)`,
    FLOOR: `=FLOOR(${firstCell},1)`,
    DATE: '=DATE(2026,1,1)',
    TIME: '=TIME(9,30,0)',
    DATEVALUE: '=DATEVALUE("2026-01-01")',
    TIMEVALUE: '=TIMEVALUE("9:30 AM")',
    EDATE: '=EDATE(DATE(2026,1,1),1)',
    EOMONTH: '=EOMONTH(DATE(2026,1,1),1)',
    TODAY: '=TODAY()',
    NOW: '=NOW()',
    RAND: '=RAND()',
    YEAR: `=YEAR(${firstCell})`,
    MONTH: `=MONTH(${firstCell})`,
    DAY: `=DAY(${firstCell})`,
    HOUR: `=HOUR(${firstCell})`,
    MINUTE: `=MINUTE(${firstCell})`,
    SECOND: `=SECOND(${firstCell})`,
    WEEKNUM: `=WEEKNUM(${firstCell},2)`,
    ISOWEEKNUM: `=ISOWEEKNUM(${firstCell})`,
    DAYS: `=DAYS(${lastCell},${firstCell})`,
    DAYS360: `=DAYS360(${firstCell},${lastCell})`,
    YEARFRAC: `=YEARFRAC(${firstCell},${lastCell},1)`,
    DATEDIF: `=DATEDIF(${firstCell},${lastCell},"D")`,
    WEEKDAY: `=WEEKDAY(${firstCell},2)`,
    NETWORKDAYS: `=NETWORKDAYS(${firstCell},${lastCell})`,
    'NETWORKDAYS.INTL': `=NETWORKDAYS.INTL(${firstCell},${lastCell},1)`,
    WORKDAY: `=WORKDAY(${firstCell},5)`,
    'WORKDAY.INTL': `=WORKDAY.INTL(${firstCell},5,1)`,
    LEN: '=LEN("ada lovelace")',
    TRIM: '=TRIM("  ada   lovelace  ")',
    UPPER: '=UPPER("ada")',
    LOWER: '=LOWER("ADA")',
    PROPER: `=PROPER(${firstCell})`,
    LEFT: `=LEFT(${firstCell},3)`,
    RIGHT: `=RIGHT(${firstCell},3)`,
    MID: `=MID(${firstCell},1,3)`,
    FIND: '=FIND("a","ada")',
    SEARCH: '=SEARCH("A","ada")',
    CHAR: '=CHAR(65)',
    CODE: `=CODE(${firstCell})`,
    VALUE: '=VALUE("123")',
    NUMBERVALUE: `=NUMBERVALUE(${firstCell})`,
    EXACT: '=EXACT("Ada","Ada")',
    REPT: '=REPT("x",3)',
    REPLACE: '=REPLACE("abcdef",2,3,"X")',
    SUBSTITUTE: '=SUBSTITUTE("a-b-a","a","x")',
    TEXT: `=TEXT(${firstCell},"#,##0.00")`,
    FIXED: `=FIXED(${firstCell},2)`,
    DOLLAR: `=DOLLAR(${firstCell},2)`,
    CLEAN: `=CLEAN(${firstCell})`,
    TEXTBEFORE: '=TEXTBEFORE("ada lovelace"," ")',
    TEXTAFTER: '=TEXTAFTER("ada lovelace"," ")',
    TEXTJOIN: `=TEXTJOIN(", ",TRUE,${range})`,
    CONCAT: `=CONCAT(${firstCell},${lastCell})`,
    SUMPRODUCT: `=SUMPRODUCT(${range},${range})`,
    PRODUCT: `=PRODUCT(${range})`,
    SUMSQ: `=SUMSQ(${range})`,
    PI: '=PI()',
    MROUND: `=MROUND(${firstCell},5)`,
    QUOTIENT: `=QUOTIENT(${firstCell},2)`,
    EVEN: `=EVEN(${firstCell})`,
    ODD: `=ODD(${firstCell})`,
    FACT: `=FACT(${firstCell})`,
    FACTDOUBLE: `=FACTDOUBLE(${firstCell})`,
    GCD: '=GCD(12,8)',
    LCM: '=LCM(12,8)',
    COMBIN: `=COMBIN(${firstCell},2)`,
    PERMUT: `=PERMUT(${firstCell},2)`,
    LOG: `=LOG(${firstCell},10)`,
    LOG10: `=LOG10(${firstCell})`,
    RADIANS: `=RADIANS(${firstCell})`,
    DEGREES: `=DEGREES(${firstCell})`,
    PMT: `=PMT(5%/12,60,${firstCell})`,
    PV: `=PV(5%/12,60,-500)`,
    FV: `=FV(5%/12,60,-500)`,
    NPER: `=NPER(5%/12,-500,${firstCell})`,
    RATE: '=RATE(12,-100,1000)',
    IPMT: `=IPMT(5%/12,1,60,${firstCell})`,
    PPMT: `=PPMT(5%/12,1,60,${firstCell})`,
    NPV: `=NPV(10%,${range})`,
    IRR: `=IRR(${cashFlowRange})`,
    XNPV: `=XNPV(10%,${firstColumnRange},${lastColumnRange})`,
    XIRR: `=XIRR(${cashFlowRange},${cashFlowDateRange})`,
    LARGE: `=LARGE(${range},1)`,
    SMALL: `=SMALL(${range},1)`,
    RANK: `=RANK(${firstCell},${range})`,
    'RANK.EQ': `=RANK.EQ(${firstCell},${range})`,
    'RANK.AVG': `=RANK.AVG(${firstCell},${range})`,
    'MODE.SNGL': '=MODE.SNGL(1,1,2)',
    GEOMEAN: '=GEOMEAN(1,2,4)',
    HARMEAN: '=HARMEAN(1,2,4)',
    CORREL: `=CORREL(${firstColumnRange},${lastColumnRange})`,
    'COVARIANCE.P': `=COVARIANCE.P(${firstColumnRange},${lastColumnRange})`,
    'COVARIANCE.S': `=COVARIANCE.S(${firstColumnRange},${lastColumnRange})`,
    SLOPE: `=SLOPE(${lastColumnRange},${firstColumnRange})`,
    INTERCEPT: `=INTERCEPT(${lastColumnRange},${firstColumnRange})`,
    RSQ: `=RSQ(${lastColumnRange},${firstColumnRange})`,
    'FORECAST.LINEAR': `=FORECAST.LINEAR(${firstCell},${lastColumnRange},${firstColumnRange})`,
    FORECAST: `=FORECAST(${firstCell},${lastColumnRange},${firstColumnRange})`,
    'PERCENTILE.INC': `=PERCENTILE.INC(${range},0.9)`,
    'PERCENTILE.EXC': `=PERCENTILE.EXC(${range},0.9)`,
    'QUARTILE.INC': `=QUARTILE.INC(${range},3)`,
    'QUARTILE.EXC': `=QUARTILE.EXC(${range},3)`,
    'STDEV.S': `=STDEV.S(${range})`,
    RANDBETWEEN: '=RANDBETWEEN(1,100)',
  };
  return templates[formulaName] || `=${formulaName}(${range})`;
}

export function toNumber(value) {
  value = formulaScalarValue(value);
  if (typeof value === 'number') return value;
  const text = String(value ?? '').replace(/[$,]/g, '').trim();
  if (text === '') return 0;
  const n = Number(text);
  return Number.isFinite(n) ? n : 0;
}

export function formatFormulaResult(value) {
  value = formulaScalarValue(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return '#NUM!';
    return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
  }
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  return String(value ?? '');
}

function isQuoted(value) {
  const text = String(value ?? '').trim();
  if (!text.startsWith('"')) return false;
  for (let index = 1; index < text.length; index++) {
    if (text[index] !== '"') continue;
    if (text[index + 1] === '"') {
      index++;
      continue;
    }
    return index === text.length - 1;
  }
  return false;
}

function unquote(value) {
  return String(value ?? '').trim().replace(/^"|"$/g, '').replace(/""/g, '"');
}

function splitFormulaArgs(text) {
  const args = [];
  let current = '';
  let depth = 0;
  let quoted = false;
  const source = String(text ?? '');
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (ch === '"') {
      current += ch;
      if (quoted && source[i + 1] === '"') {
        current += source[++i];
      } else {
        quoted = !quoted;
      }
    } else if (!quoted && ch === '(') {
      depth++;
      current += ch;
    } else if (!quoted && ch === ')') {
      depth = Math.max(0, depth - 1);
      current += ch;
    } else if (!quoted && depth === 0 && ch === ',') {
      args.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim() || source.endsWith(',')) args.push(current.trim());
  return args;
}

function findComparison(text) {
  const operators = ['>=', '<=', '<>', '>', '<', '='];
  let quoted = false;
  let depth = 0;
  const source = String(text ?? '');
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (ch === '"') {
      if (quoted && source[i + 1] === '"') i++;
      else quoted = !quoted;
    } else if (!quoted && ch === '(') {
      depth++;
    } else if (!quoted && ch === ')') {
      depth = Math.max(0, depth - 1);
    } else if (!quoted && depth === 0) {
      for (const operator of operators) {
        if (source.slice(i, i + operator.length) === operator) {
          return {operator, left: source.slice(0, i).trim(), right: source.slice(i + operator.length).trim()};
        }
      }
    }
  }
  return null;
}

function isNumericLike(value) {
  if (value == null || value === '') return false;
  if (typeof value === 'number') return Number.isFinite(value);
  const number = Number(String(value).replace(/[$,%\s,]/g, ''));
  return Number.isFinite(number);
}

const ERROR_VALUE_PATTERN = /^(#NULL!|#DIV\/0!|#VALUE!|#REF!|#NAME\?|#NUM!|#N\/A|#GETTING_DATA|#CYCLE!|#SPILL!|#CALC!)$/;

function isErrorValue(value) {
  return typeof value === 'string' && ERROR_VALUE_PATTERN.test(value);
}

const ERROR_TYPE_CODES = Object.freeze({
  '#NULL!': 1,
  '#DIV/0!': 2,
  '#VALUE!': 3,
  '#REF!': 4,
  '#NAME?': 5,
  '#NUM!': 6,
  '#N/A': 7,
  '#GETTING_DATA': 8,
});

function firstErrorValue(values) {
  return values.find(isErrorValue) || null;
}

function normalizeNumericResult(value, infiniteError = '#NUM!') {
  if (typeof value !== 'number') return value;
  if (Number.isNaN(value)) return '#NUM!';
  if (!Number.isFinite(value)) return infiniteError;
  return value;
}

function normalizeReference(ref) {
  return String(ref ?? '').replace(/\$/g, '').trim();
}

function unquoteSheetName(sheetName) {
  const text = String(sheetName ?? '').trim();
  if (/^'[\s\S]*'$/.test(text)) return text.slice(1, -1).replace(/''/g, "'");
  return text;
}

function parseReferenceParts(text) {
  const source = String(text ?? '').trim();
  const match = /^(?:(('[^']*(?:''[^']*)*')|([A-Za-z_][A-Za-z0-9_]*))!)?([\s\S]+)$/.exec(source);
  if (!match) return {sheetName: null, ref: source};
  return {
    sheetName: match[2] || match[3] ? unquoteSheetName(match[2] || match[3]) : null,
    ref: match[4],
  };
}

function qualifiedReferenceKey(sheetName, row, col, fallbackSheetName = '') {
  return `${sheetName || fallbackSheetName || ''}!${cellKey(row, col)}`;
}

function quoteSheetForReference(sheetName) {
  const text = String(sheetName ?? '');
  if (!text) return '';
  const escaped = text.replace(/'/g, "''");
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(text) ? `${text}!` : `'${escaped}'!`;
}

function addressReference(rowNumber, columnNumber, absType = 1, useA1 = true, sheetName = '') {
  const row = Math.trunc(rowNumber);
  const col = Math.trunc(columnNumber);
  const type = Math.trunc(absType);
  if (row < 1 || col < 1 || type < 1 || type > 4) return '#VALUE!';
  const prefix = quoteSheetForReference(sheetName);
  if (!useA1) {
    const rowRef = type === 3 || type === 4 ? `R[${row}]` : `R${row}`;
    const colRef = type === 2 || type === 4 ? `C[${col}]` : `C${col}`;
    return `${prefix}${rowRef}${colRef}`;
  }
  const absoluteRow = type === 1 || type === 2;
  const absoluteCol = type === 1 || type === 3;
  return `${prefix}${absoluteCol ? '$' : ''}${columnName(col - 1)}${absoluteRow ? '$' : ''}${row}`;
}

function r1c1ReferenceToA1(reference, origin = null) {
  const parts = parseReferenceParts(reference);
  const match = /^R(?:\[(-?\d+)\]|(-?\d+))?C(?:\[(-?\d+)\]|(-?\d+))?$/i.exec(String(parts.ref ?? '').trim());
  if (!match) return '#REF!';
  const relativeRow = match[1] != null;
  const relativeCol = match[3] != null;
  if ((relativeRow || relativeCol || match[2] == null || match[4] == null) && !origin) return '#REF!';
  const row = relativeRow
    ? origin.row + Number(match[1])
    : match[2] == null ? origin.row : Number(match[2]) - 1;
  const col = relativeCol
    ? origin.col + Number(match[3])
    : match[4] == null ? origin.col : Number(match[4]) - 1;
  if (row < 0 || col < 0) return '#REF!';
  return `${quoteSheetForReference(parts.sheetName)}${columnName(col)}${row + 1}`;
}

function isCellReference(text) {
  const {ref} = parseReferenceParts(text);
  return /^\$?[A-Z]+\$?\d+$/i.test(String(ref ?? '').trim());
}

function parseRangeReference(text, options = {}) {
  const startParts = parseReferenceParts(text);
  const rangeText = String(startParts.ref ?? '').trim();
  if (/^\$?[A-Z]+\$?\d+#$/i.test(rangeText)) {
    const point = parseCellAddress(normalizeReference(rangeText.slice(0, -1)));
    if (!point) return null;
    const spillRange = options.getSpillRangeForCell?.(startParts.sheetName || options.currentSheetName, point.row, point.col);
    return spillRange || '#REF!';
  }
  const [startRef, endText] = rangeText.split(/\s*:\s*/);
  const endParts = parseReferenceParts(endText || startRef);
  const sheetName = startParts.sheetName || endParts.sheetName || null;
  const hasRangeSeparator = rangeText.includes(':');
  const normalizedRange = hasRangeSeparator
    ? `${normalizeReference(startRef)}:${normalizeReference(endParts.ref)}`
    : normalizeReference(startRef);
  const dimensions = options.getSheetDimensionsForSheet?.(sheetName || options.currentSheetName) || {};
  const range = parseRange(normalizedRange, {
    allowWholeReference: hasRangeSeparator,
    rowCount: dimensions.rowCount || options.rowCount,
    colCount: dimensions.colCount || options.colCount,
  });
  if (!range) return null;
  const rowCount = dimensions.rowCount || options.rowCount;
  const colCount = dimensions.colCount || options.colCount;
  if (range.r1 < 0 || range.c1 < 0) return '#REF!';
  if (rowCount != null && range.r2 >= rowCount) return '#REF!';
  if (colCount != null && range.c2 >= colCount) return '#REF!';
  return {sheetName, range};
}

function parseCellReference(text, options = {}) {
  const parts = parseReferenceParts(text);
  const point = parseCellAddress(normalizeReference(parts.ref));
  if (!point) return null;
  const dimensions = options.getSheetDimensionsForSheet?.(parts.sheetName || options.currentSheetName) || {};
  const rowCount = dimensions.rowCount || options.rowCount;
  const colCount = dimensions.colCount || options.colCount;
  if (point.row < 0 || point.col < 0) return '#REF!';
  if (rowCount != null && point.row >= rowCount) return '#REF!';
  if (colCount != null && point.col >= colCount) return '#REF!';
  return {...point, sheetName: parts.sheetName};
}

function replaceCellReferences(text, replacer, options = {}) {
  const source = String(text ?? '');
  return source.replace(/"(?:""|[^"])*"|[^"]+/g, (part) => {
    if (part.startsWith('"')) return part;
    return part.replace(/(?:'[^']*(?:''[^']*)*'|[A-Za-z_][A-Za-z0-9_]*)!\$?[A-Z]+\$?\d+|\$?[A-Z]+\$?\d+/g, (token) => {
      const ref = parseCellReference(token, options);
      if (isErrorValue(ref)) return ref;
      return ref ? replacer(ref, token) : token;
    });
  });
}

function compareValues(a, b) {
  const numeric = isNumericLike(a) && isNumericLike(b);
  if (numeric) return toNumber(a) - toNumber(b);
  return String(a ?? '').localeCompare(String(b ?? ''), undefined, {numeric: true, sensitivity: 'base'});
}

function valuesEqual(a, b) {
  if (isNumericLike(a) && isNumericLike(b)) return toNumber(a) === toNumber(b);
  if (typeof a === 'boolean' || typeof b === 'boolean') return Boolean(a) === Boolean(b);
  return String(a ?? '').toLowerCase() === String(b ?? '').toLowerCase();
}

function wildcardToRegExp(pattern) {
  const escaped = String(pattern ?? '')
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\\\*/g, '\\*')
    .replace(/\\\?/g, '\\?')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp(`^${escaped}$`, 'i');
}

function matchesCriterion(value, criterion) {
  const text = String(criterion ?? '').trim();
  const match = /^(>=|<=|<>|>|<|=)([\s\S]*)$/.exec(text);
  const operator = match ? match[1] : '=';
  const operand = match ? match[2].trim() : criterion;
  if ((operator === '=' || operator === '<>') && /[*?]/.test(String(operand ?? ''))) {
    const matched = wildcardToRegExp(operand).test(String(value ?? ''));
    return operator === '<>' ? !matched : matched;
  }
  if (['>=', '<=', '>', '<'].includes(operator) && isNumericLike(operand) && !isNumericLike(value)) return false;
  const comparison = compareValues(value, operand);
  if (operator === '>=') return comparison >= 0;
  if (operator === '<=') return comparison <= 0;
  if (operator === '<>') return !valuesEqual(value, operand);
  if (operator === '>') return comparison > 0;
  if (operator === '<') return comparison < 0;
  return valuesEqual(value, operand);
}

function isFalseLike(value) {
  if (value === false) return true;
  if (value === true) return false;
  const text = String(value ?? '').trim().toUpperCase();
  if (text === 'FALSE') return true;
  if (text === 'TRUE') return false;
  return isNumericLike(value) && toNumber(value) === 0;
}

function properCaseText(value) {
  let capitalizeNext = true;
  return String(value ?? '').toLowerCase().replace(/./g, (ch) => {
    if (/[a-z]/i.test(ch)) {
      const next = capitalizeNext ? ch.toUpperCase() : ch;
      capitalizeNext = false;
      return next;
    }
    capitalizeNext = true;
    return ch;
  });
}

function cleanText(value) {
  return String(value ?? '').replace(/[\x00-\x1F]/g, '');
}

function escapeRegExp(value) {
  return String(value ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function numberValueFromText(value, decimalSeparator = '.', groupSeparator = ',') {
  const decimal = String(decimalSeparator ?? '.');
  const group = String(groupSeparator ?? ',');
  if (!decimal || decimal === group) return '#VALUE!';
  let source = String(value ?? '').trim().replace(/\s+/g, '');
  if (!source) return '#VALUE!';
  const percentCount = (source.match(/%/g) || []).length;
  source = source.replace(/%/g, '');
  if (group) source = source.replace(new RegExp(escapeRegExp(group), 'g'), '');
  if (decimal !== '.') {
    const pieces = source.split(decimal);
    if (pieces.length > 2) return '#VALUE!';
    source = pieces.join('.');
  } else if ((source.match(/\./g) || []).length > 1) {
    return '#VALUE!';
  }
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(source)) return '#VALUE!';
  return normalizeNumericResult(Number(source) / (100 ** percentCount));
}

function roundToDecimalPlaces(value, decimals = 0) {
  const places = Math.trunc(decimals);
  if (places >= 0) {
    const factor = 10 ** places;
    return normalizeNumericResult(Math.round(value * factor) / factor);
  }
  const factor = 10 ** Math.abs(places);
  return normalizeNumericResult(Math.round(value / factor) * factor);
}

function addGroupingSeparators(value) {
  return String(value ?? '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatFixedText(value, decimals = 2, useGrouping = true) {
  const places = Math.trunc(decimals);
  const rounded = roundToDecimalPlaces(value, places);
  if (isErrorValue(rounded)) return rounded;
  const precision = Math.max(0, places);
  const sign = rounded < 0 ? '-' : '';
  const [whole, fraction] = Math.abs(rounded).toFixed(precision).split('.');
  const grouped = useGrouping ? addGroupingSeparators(whole) : whole;
  return `${sign}${grouped}${fraction ? `.${fraction}` : ''}`;
}

function formatDollarText(value, decimals = 2) {
  const places = Math.trunc(decimals);
  const rounded = roundToDecimalPlaces(value, places);
  if (isErrorValue(rounded)) return rounded;
  const body = formatFixedText(Math.abs(rounded), places, true);
  return rounded < 0 ? `($${body})` : `$${body}`;
}

function decimalPlacesFromFormat(format) {
  const decimalIndex = String(format ?? '').indexOf('.');
  if (decimalIndex < 0) return 0;
  const match = /[0#]+/.exec(String(format).slice(decimalIndex + 1));
  return match ? match[0].length : 0;
}

function formatDatePattern(value, format) {
  const date = serialToDate(value);
  if (!date) return '#VALUE!';
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const year = date.getUTCFullYear();
  return String(format ?? '').replace(/yyyy|yy|mmmm|mmm|mm|m|dd|d/gi, (token) => {
    const lower = token.toLowerCase();
    if (lower === 'yyyy') return String(year).padStart(4, '0');
    if (lower === 'yy') return String(year).slice(-2);
    if (lower === 'mmmm') return monthNames[month - 1];
    if (lower === 'mmm') return monthNames[month - 1].slice(0, 3);
    if (lower === 'mm') return String(month).padStart(2, '0');
    if (lower === 'm') return String(month);
    if (lower === 'dd') return String(day).padStart(2, '0');
    return String(day);
  });
}

function formatNumberPattern(value, format) {
  const number = toNumber(value);
  if (!Number.isFinite(number)) return '#VALUE!';
  const sections = String(format ?? '').split(';');
  const rawSection = number < 0 && sections[1] ? sections[1] : number === 0 && sections[2] ? sections[2] : sections[0];
  const section = rawSection || '0';
  const percent = section.includes('%');
  const currency = section.includes('$');
  const places = decimalPlacesFromFormat(section);
  const grouped = section.includes(',');
  const scaled = number * (percent ? 100 : 1);
  const rounded = roundToDecimalPlaces(scaled, places);
  if (isErrorValue(rounded)) return rounded;
  const body = formatFixedText(Math.abs(rounded), places, grouped);
  let result = `${currency ? '$' : ''}${body}${percent ? '%' : ''}`;
  if (rounded < 0) {
    result = section.includes('(') && section.includes(')') ? `(${result})` : `-${result}`;
  }
  return result;
}

function textWithFormat(value, format) {
  const pattern = String(format ?? '');
  if (!pattern) return '#VALUE!';
  if (pattern.includes('@')) return pattern.replace(/@/g, String(value ?? ''));
  if (/[ymd]/i.test(pattern) && !/[0#]/.test(pattern)) return formatDatePattern(value, pattern);
  if (/[0#]/.test(pattern)) return formatNumberPattern(value, pattern);
  return pattern;
}

function findDelimiterIndexes(text, delimiter, matchMode = 0) {
  const source = String(text ?? '');
  const needle = String(delimiter ?? '');
  if (!needle) return [];
  const haystack = matchMode === 1 ? source.toLowerCase() : source;
  const target = matchMode === 1 ? needle.toLowerCase() : needle;
  const indexes = [];
  let position = 0;
  while (position <= haystack.length) {
    const index = haystack.indexOf(target, position);
    if (index < 0) break;
    indexes.push(index);
    position = index + target.length;
  }
  return indexes;
}

function textBeforeAfter(text, delimiter, instance, matchMode = 0, matchEnd = false, ifNotFound = undefined, after = false) {
  const source = String(text ?? '');
  const target = String(delimiter ?? '');
  const instanceNumber = Math.trunc(instance);
  if (!target || instanceNumber === 0) return '#VALUE!';
  const indexes = findDelimiterIndexes(source, target, matchMode);
  const position = instanceNumber > 0 ? indexes[instanceNumber - 1] : indexes[indexes.length + instanceNumber];
  if (position == null) {
    if (matchEnd) return after ? '' : source;
    return ifNotFound == null ? '#N/A' : ifNotFound;
  }
  return after ? source.slice(position + target.length) : source.slice(0, position);
}

function findLookupIndex(values, lookupValue, matchMode = 0, searchMode = 1) {
  const source = searchMode === -1 ? [...values].reverse() : values;
  const toOriginalIndex = (index) => (searchMode === -1 ? values.length - 1 - index : index);
  if (matchMode === 2) {
    const pattern = wildcardToRegExp(lookupValue);
    const index = source.findIndex((value) => pattern.test(String(value ?? '')));
    return index >= 0 ? toOriginalIndex(index) : -1;
  }
  const exactIndex = source.findIndex((value) => valuesEqual(value, lookupValue));
  if (exactIndex >= 0) return toOriginalIndex(exactIndex);
  if (matchMode === -1) {
    let bestIndex = -1;
    for (let index = 0; index < source.length; index++) {
      if (compareValues(source[index], lookupValue) <= 0) bestIndex = index;
    }
    return bestIndex >= 0 ? toOriginalIndex(bestIndex) : -1;
  }
  if (matchMode === 1) {
    const index = source.findIndex((value) => compareValues(value, lookupValue) >= 0);
    return index >= 0 ? toOriginalIndex(index) : -1;
  }
  return -1;
}

function varianceForValues(values, sample = true) {
  if (isErrorValue(values)) return values;
  const count = values.length;
  if (count < (sample ? 2 : 1)) return '#DIV/0!';
  const mean = values.reduce((sum, value) => sum + value, 0) / count;
  const squaredDiffs = values.reduce((sum, value) => sum + ((value - mean) ** 2), 0);
  return squaredDiffs / (sample ? count - 1 : count);
}

function modeSingle(values) {
  if (isErrorValue(values)) return values;
  const counts = new Map();
  let bestValue = null;
  let bestCount = 1;
  for (const value of values) {
    const key = String(value);
    const count = (counts.get(key)?.count || 0) + 1;
    if (!counts.has(key)) counts.set(key, {value, count});
    else counts.get(key).count = count;
    if (count > bestCount) {
      bestValue = counts.get(key).value;
      bestCount = count;
    }
  }
  return bestCount > 1 ? bestValue : '#N/A';
}

function rankForValues(value, values, descending = true, averageTies = false) {
  if (isErrorValue(values)) return values;
  const matches = values.filter((item) => item === value).length;
  if (!matches) return '#N/A';
  const betterCount = values.filter((item) => descending ? item > value : item < value).length;
  const rank = betterCount + 1;
  return averageTies ? rank + (matches - 1) / 2 : rank;
}

function geometricMean(values) {
  if (isErrorValue(values)) return values;
  if (!values.length || values.some((value) => value <= 0)) return '#NUM!';
  return normalizeNumericResult(Math.exp(values.reduce((sum, value) => sum + Math.log(value), 0) / values.length));
}

function harmonicMean(values) {
  if (isErrorValue(values)) return values;
  if (!values.length || values.some((value) => value <= 0)) return '#NUM!';
  return normalizeNumericResult(values.length / values.reduce((sum, value) => sum + 1 / value, 0));
}

function pairedNumericValues(xValues, yValues) {
  const error = firstErrorValue([...xValues, ...yValues]);
  if (error) return error;
  if (xValues.length !== yValues.length) return '#N/A';
  const pairs = [];
  for (let index = 0; index < xValues.length; index++) {
    if (isNumericLike(xValues[index]) && isNumericLike(yValues[index])) pairs.push([toNumber(xValues[index]), toNumber(yValues[index])]);
  }
  return pairs;
}

function covarianceForPairs(pairs, sample = false) {
  if (isErrorValue(pairs)) return pairs;
  const count = pairs.length;
  if (count < (sample ? 2 : 1)) return '#DIV/0!';
  const xMean = pairs.reduce((sum, pair) => sum + pair[0], 0) / count;
  const yMean = pairs.reduce((sum, pair) => sum + pair[1], 0) / count;
  const covariance = pairs.reduce((sum, pair) => sum + ((pair[0] - xMean) * (pair[1] - yMean)), 0);
  return normalizeNumericResult(covariance / (sample ? count - 1 : count));
}

function correlationForPairs(pairs) {
  if (isErrorValue(pairs)) return pairs;
  if (pairs.length < 2) return '#DIV/0!';
  const covariance = covarianceForPairs(pairs, false);
  if (isErrorValue(covariance)) return covariance;
  const xVariance = varianceForValues(pairs.map((pair) => pair[0]), false);
  const yVariance = varianceForValues(pairs.map((pair) => pair[1]), false);
  if (isErrorValue(xVariance)) return xVariance;
  if (isErrorValue(yVariance)) return yVariance;
  if (xVariance === 0 || yVariance === 0) return '#DIV/0!';
  return normalizeNumericResult(covariance / Math.sqrt(xVariance * yVariance));
}

function regressionStatsForPairs(pairs) {
  if (isErrorValue(pairs)) return pairs;
  const count = pairs.length;
  if (count < 2) return '#DIV/0!';
  const xMean = pairs.reduce((sum, pair) => sum + pair[0], 0) / count;
  const yMean = pairs.reduce((sum, pair) => sum + pair[1], 0) / count;
  const xSquaredDiffs = pairs.reduce((sum, pair) => sum + ((pair[0] - xMean) ** 2), 0);
  if (xSquaredDiffs === 0) return '#DIV/0!';
  const xyDiffs = pairs.reduce((sum, pair) => sum + ((pair[0] - xMean) * (pair[1] - yMean)), 0);
  const slope = xyDiffs / xSquaredDiffs;
  return {
    slope: normalizeNumericResult(slope),
    intercept: normalizeNumericResult(yMean - slope * xMean),
  };
}

function percentileForSortedValues(values, percentile, exclusive = false) {
  if (isErrorValue(values)) return values;
  if (!values.length || percentile < 0 || percentile > 1 || (exclusive && (percentile <= 0 || percentile >= 1))) return '#NUM!';
  if (values.length === 1) return exclusive ? '#NUM!' : values[0];
  const rank = exclusive ? percentile * (values.length + 1) : percentile * (values.length - 1) + 1;
  if (rank < 1 || rank > values.length) return '#NUM!';
  const lowerIndex = Math.floor(rank) - 1;
  const upperIndex = Math.ceil(rank) - 1;
  if (lowerIndex === upperIndex) return values[lowerIndex];
  return values[lowerIndex] + (rank - Math.floor(rank)) * (values[upperIndex] - values[lowerIndex]);
}

function quartileForSortedValues(values, quartile, exclusive = false) {
  const quartileIndex = Math.trunc(quartile);
  if (quartileIndex !== quartile || quartileIndex < 0 || quartileIndex > 4 || (exclusive && (quartileIndex === 0 || quartileIndex === 4))) return '#NUM!';
  return percentileForSortedValues(values, quartileIndex / 4, exclusive);
}

function truncateNumber(value, digits = 0) {
  const factor = 10 ** digits;
  return (value < 0 ? Math.ceil(value * factor) : Math.floor(value * factor)) / factor;
}

function moduloWithDivisorSign(number, divisor) {
  if (divisor === 0) return '#DIV/0!';
  return normalizeNumericResult(number - divisor * Math.floor(number / divisor), '#DIV/0!');
}

function roundToMultiple(number, multiple) {
  if (multiple === 0) return 0;
  if ((number < 0 && multiple > 0) || (number > 0 && multiple < 0)) return '#NUM!';
  const quotient = Math.abs(number / multiple);
  const rounded = Math.floor(quotient + 0.5);
  return normalizeNumericResult(Math.sign(number || multiple) * rounded * Math.abs(multiple));
}

function roundToParity(value, parity) {
  if (value === 0) return 0;
  const sign = value < 0 ? -1 : 1;
  const magnitude = Math.ceil(Math.abs(value));
  const remainder = magnitude % 2;
  const adjusted = parity === 'even'
    ? magnitude + (remainder === 0 ? 0 : 1)
    : magnitude + (remainder === 1 ? 0 : 1);
  return sign * adjusted;
}

function factorial(value) {
  const n = Math.trunc(value);
  if (n < 0 || n > 170) return '#NUM!';
  let result = 1;
  for (let index = 2; index <= n; index++) result *= index;
  return result;
}

function doubleFactorial(value) {
  const n = Math.trunc(value);
  if (n < 0 || n > 300) return '#NUM!';
  let result = 1;
  for (let index = n; index > 1; index -= 2) {
    result *= index;
    if (!Number.isFinite(result)) return '#NUM!';
  }
  return result;
}

function greatestCommonDivisor(values) {
  if (isErrorValue(values)) return values;
  const integers = values.map((value) => Math.trunc(value));
  if (integers.some((value) => value < 0)) return '#NUM!';
  const gcdPair = (a, b) => {
    let x = a;
    let y = b;
    while (y !== 0) {
      const next = x % y;
      x = y;
      y = next;
    }
    return Math.abs(x);
  };
  return integers.reduce((current, value) => gcdPair(current, value), 0);
}

function leastCommonMultiple(values) {
  if (isErrorValue(values)) return values;
  const integers = values.map((value) => Math.trunc(value));
  if (integers.some((value) => value < 0)) return '#NUM!';
  if (!integers.length) return 0;
  if (integers.some((value) => value === 0)) return 0;
  const gcdPair = (a, b) => {
    let x = a;
    let y = b;
    while (y !== 0) {
      const next = x % y;
      x = y;
      y = next;
    }
    return Math.abs(x);
  };
  return integers.reduce((current, value) => normalizeNumericResult(Math.abs(current * value) / gcdPair(current, value)), 1);
}

function combinations(count, chosen) {
  const n = Math.trunc(count);
  const k = Math.trunc(chosen);
  if (n < 0 || k < 0 || k > n) return '#NUM!';
  const iterations = Math.min(k, n - k);
  if (iterations > 100000) return '#NUM!';
  let result = 1;
  for (let index = 1; index <= iterations; index++) {
    result *= (n - iterations + index) / index;
    if (!Number.isFinite(result)) return '#NUM!';
  }
  return normalizeNumericResult(result);
}

function permutations(count, chosen) {
  const n = Math.trunc(count);
  const k = Math.trunc(chosen);
  if (n < 0 || k < 0 || k > n || k > 100000) return '#NUM!';
  let result = 1;
  for (let index = 0; index < k; index++) {
    result *= n - index;
    if (!Number.isFinite(result)) return '#NUM!';
  }
  return normalizeNumericResult(result);
}

function normalizePaymentType(value) {
  if (isErrorValue(value)) return value;
  return value === 0 || value === 1 ? value : '#NUM!';
}

function paymentForLoan(rate, periods, presentValue, futureValue = 0, type = 0) {
  if (periods === 0) return '#NUM!';
  if (rate === 0) return -(presentValue + futureValue) / periods;
  const compound = (1 + rate) ** periods;
  return -(rate * (futureValue + presentValue * compound)) / ((1 + rate * type) * (compound - 1));
}

function presentValueForLoan(rate, periods, payment, futureValue = 0, type = 0) {
  if (rate === 0) return -(futureValue + payment * periods);
  const compound = (1 + rate) ** periods;
  return -(futureValue + payment * (1 + rate * type) * ((compound - 1) / rate)) / compound;
}

function futureValueForLoan(rate, periods, payment, presentValue = 0, type = 0) {
  if (rate === 0) return -(presentValue + payment * periods);
  const compound = (1 + rate) ** periods;
  return -(presentValue * compound + payment * (1 + rate * type) * ((compound - 1) / rate));
}

function periodsForLoan(rate, payment, presentValue, futureValue = 0, type = 0) {
  if (rate === 0) return payment === 0 ? '#NUM!' : -(presentValue + futureValue) / payment;
  if (rate <= -1) return '#NUM!';
  const adjustedPayment = payment * (1 + rate * type);
  const numerator = adjustedPayment - futureValue * rate;
  const denominator = presentValue * rate + adjustedPayment;
  if (denominator === 0 || numerator / denominator <= 0) return '#NUM!';
  return Math.log(numerator / denominator) / Math.log(1 + rate);
}

function loanEquation(rate, periods, payment, presentValue, futureValue = 0, type = 0) {
  if (rate === 0) return presentValue + payment * periods + futureValue;
  if (rate <= -1) return Number.NaN;
  const compound = (1 + rate) ** periods;
  return presentValue * compound + payment * (1 + rate * type) * ((compound - 1) / rate) + futureValue;
}

function rateForLoan(periods, payment, presentValue, futureValue = 0, type = 0, guess = 0.1) {
  if (periods <= 0) return '#NUM!';
  let rate = Number.isFinite(guess) ? guess : 0.1;
  for (let iteration = 0; iteration < 100; iteration++) {
    const value = loanEquation(rate, periods, payment, presentValue, futureValue, type);
    if (!Number.isFinite(value)) return '#NUM!';
    if (Math.abs(value) < 1e-10) return rate;
    const step = Math.max(1e-7, Math.abs(rate) * 1e-7);
    const upper = loanEquation(rate + step, periods, payment, presentValue, futureValue, type);
    const lower = loanEquation(rate - step, periods, payment, presentValue, futureValue, type);
    const derivative = (upper - lower) / (2 * step);
    if (!Number.isFinite(derivative) || derivative === 0) return '#NUM!';
    const nextRate = rate - value / derivative;
    if (!Number.isFinite(nextRate) || nextRate <= -1) return '#NUM!';
    if (Math.abs(nextRate - rate) < 1e-12) return nextRate;
    rate = nextRate;
  }
  return '#NUM!';
}

function interestPaymentForLoan(rate, period, periods, presentValue, futureValue = 0, type = 0) {
  const payment = paymentForLoan(rate, periods, presentValue, futureValue, type);
  if (isErrorValue(payment)) return payment;
  const targetPeriod = Math.trunc(period);
  const totalPeriods = Math.trunc(periods);
  if (targetPeriod < 1 || targetPeriod > totalPeriods || totalPeriods <= 0) return '#NUM!';
  if (rate === 0) return 0;
  if (type === 1 && targetPeriod === 1) return 0;
  let balance = presentValue;
  for (let currentPeriod = 1; currentPeriod <= targetPeriod; currentPeriod++) {
    let interest = 0;
    if (type === 1) {
      balance += payment;
      interest = currentPeriod === 1 ? 0 : balance * rate;
      balance += interest;
    } else {
      interest = balance * rate;
      balance += interest + payment;
    }
    if (currentPeriod === targetPeriod) return normalizeNumericResult(-interest);
  }
  return '#NUM!';
}

function principalPaymentForLoan(rate, period, periods, presentValue, futureValue = 0, type = 0) {
  const payment = paymentForLoan(rate, periods, presentValue, futureValue, type);
  if (isErrorValue(payment)) return payment;
  const interest = interestPaymentForLoan(rate, period, periods, presentValue, futureValue, type);
  if (isErrorValue(interest)) return interest;
  return normalizeNumericResult(payment - interest);
}

function netPresentValue(rate, values) {
  if (rate <= -1) return '#NUM!';
  return values.reduce((total, value, index) => total + value / ((1 + rate) ** (index + 1)), 0);
}

function irregularCashFlowPairs(values, dates) {
  const error = firstErrorValue([...values, ...dates]);
  if (error) return error;
  if (values.length !== dates.length || values.length === 0) return '#NUM!';
  const pairs = [];
  for (let index = 0; index < values.length; index++) {
    if (!isNumericLike(values[index])) return '#VALUE!';
    const serial = normalizeDateSerial(dates[index]);
    if (isErrorValue(serial)) return serial;
    pairs.push({value: toNumber(values[index]), date: serial});
  }
  return pairs;
}

function extendedNetPresentValue(rate, pairs) {
  if (isErrorValue(pairs)) return pairs;
  if (rate <= -1) return '#NUM!';
  const start = pairs[0].date;
  return pairs.reduce((total, pair) => total + pair.value / ((1 + rate) ** ((pair.date - start) / 365)), 0);
}

function extendedInternalRateOfReturn(pairs, guess = 0.1) {
  if (isErrorValue(pairs)) return pairs;
  if (!pairs.length || !pairs.some((pair) => pair.value > 0) || !pairs.some((pair) => pair.value < 0)) return '#NUM!';
  if (!Number.isFinite(guess) || guess <= -1) return '#NUM!';

  let rate = guess;
  const start = pairs[0].date;
  for (let iteration = 0; iteration < 100; iteration++) {
    let value = 0;
    let derivative = 0;
    const denominator = 1 + rate;
    if (denominator <= 0) return '#NUM!';
    for (const pair of pairs) {
      const years = (pair.date - start) / 365;
      const powered = denominator ** years;
      value += pair.value / powered;
      derivative += (-years * pair.value) / (denominator ** (years + 1));
    }
    if (derivative === 0) return '#NUM!';
    const nextRate = rate - value / derivative;
    if (!Number.isFinite(nextRate) || nextRate <= -1) return '#NUM!';
    if (Math.abs(nextRate - rate) < 1e-10) return nextRate;
    rate = nextRate;
  }
  return '#NUM!';
}

function internalRateOfReturn(values, guess = 0.1) {
  if (!values.length || !values.some((value) => value > 0) || !values.some((value) => value < 0)) return '#NUM!';
  if (!Number.isFinite(guess) || guess <= -1) return '#NUM!';

  let rate = guess;
  for (let iteration = 0; iteration < 100; iteration++) {
    let value = 0;
    let derivative = 0;
    const denominator = 1 + rate;
    if (denominator <= 0) return '#NUM!';
    for (let period = 0; period < values.length; period++) {
      value += values[period] / (denominator ** period);
      if (period > 0) derivative += (-period * values[period]) / (denominator ** (period + 1));
    }
    if (derivative === 0) return '#NUM!';
    const nextRate = rate - value / derivative;
    if (!Number.isFinite(nextRate)) return '#NUM!';
    if (Math.abs(nextRate - rate) < 1e-10) return nextRate;
    rate = nextRate;
  }
  return '#NUM!';
}

const MS_PER_DAY = 86400000;
const SECONDS_PER_DAY = 86400;
const STANDARD_WEEKEND_DAYS = new Set([0, 6]);

function dateToSerial(date) {
  return date.getTime() / MS_PER_DAY + 25569;
}

function serialToDate(value) {
  if (value instanceof Date) return value;
  if (isNumericLike(value)) return new Date(Math.round((toNumber(value) - 25569) * MS_PER_DAY));
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeDateSerial(value) {
  const date = serialToDate(value);
  if (!date) return '#VALUE!';
  return dateToSerial(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())));
}

function dateSerial(year, month, day) {
  const normalizedYear = year >= 0 && year < 1900 ? year + 1900 : year;
  return dateToSerial(new Date(Date.UTC(normalizedYear, month - 1, day)));
}

function validDateSerial(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? dateToSerial(date)
    : '#VALUE!';
}

function dateValueSerial(value) {
  if (isNumericLike(value)) return normalizeDateSerial(value);
  const text = String(value ?? '').trim();
  let match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);
  if (match) return validDateSerial(Number(match[1]), Number(match[2]), Number(match[3]));
  match = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(text);
  if (match) {
    const year = Number(match[3].length === 2 ? `20${match[3]}` : match[3]);
    return validDateSerial(year, Number(match[1]), Number(match[2]));
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? '#VALUE!' : normalizeDateSerial(parsed);
}

function timeSerial(hour, minute, second) {
  const h = Math.trunc(hour);
  const m = Math.trunc(minute);
  const s = Math.trunc(second);
  if (h < 0 || m < 0 || s < 0) return '#NUM!';
  return ((h * 3600 + m * 60 + s) % SECONDS_PER_DAY) / SECONDS_PER_DAY;
}

function timeValueSerial(value) {
  if (isNumericLike(value)) return ((toNumber(value) % 1) + 1) % 1;
  const match = /^(\d{1,2})(?::(\d{1,2}))?(?::(\d{1,2}(?:\.\d+)?))?\s*(AM|PM)?$/i.exec(String(value ?? '').trim());
  if (!match) return '#VALUE!';
  let hour = Number(match[1]);
  const minute = Number(match[2] ?? 0);
  const second = Number(match[3] ?? 0);
  const marker = match[4]?.toUpperCase();
  if (marker) {
    if (hour < 1 || hour > 12) return '#VALUE!';
    if (marker === 'AM' && hour === 12) hour = 0;
    if (marker === 'PM' && hour < 12) hour += 12;
  }
  if (hour > 23 || minute > 59 || second >= 60) return '#VALUE!';
  return timeSerial(hour, minute, second);
}

function serialForTimePart(value) {
  if (isNumericLike(value)) return toNumber(value);
  const date = serialToDate(value);
  return date ? dateToSerial(date) : '#VALUE!';
}

function timePart(value, part) {
  const serial = serialForTimePart(value);
  if (isErrorValue(serial)) return serial;
  if (serial < 0) return '#NUM!';
  const totalSeconds = Math.round((((serial % 1) + 1) % 1) * SECONDS_PER_DAY) % SECONDS_PER_DAY;
  if (part === 'hour') return Math.floor(totalSeconds / 3600);
  if (part === 'minute') return Math.floor((totalSeconds % 3600) / 60);
  return totalSeconds % 60;
}

function daysInMonth(year, monthIndex) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function daysInYear(year) {
  return Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1) === 366 * MS_PER_DAY ? 366 : 365;
}

function datePartsForSerial(serial) {
  const date = serialToDate(serial);
  if (!date) return null;
  return {
    date,
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function bumpMonth(year, month) {
  return month > 12 ? {year: year + 1, month: 1} : {year, month};
}

function days360Between(startValue, endValue, european = false) {
  let start = normalizeDateSerial(startValue);
  let end = normalizeDateSerial(endValue);
  if (isErrorValue(start)) return start;
  if (isErrorValue(end)) return end;
  const sign = start > end ? -1 : 1;
  if (sign < 0) [start, end] = [end, start];
  const startParts = datePartsForSerial(start);
  const endParts = datePartsForSerial(end);
  let {year: y1, month: m1, day: d1} = startParts;
  let {year: y2, month: m2, day: d2} = endParts;
  if (european) {
    if (d1 === 31) d1 = 30;
    if (d2 === 31) d2 = 30;
  } else {
    const startLastFebruary = m1 === 2 && d1 === daysInMonth(y1, m1 - 1);
    const endLastFebruary = m2 === 2 && d2 === daysInMonth(y2, m2 - 1);
    if (startLastFebruary || d1 === 31) d1 = 30;
    if (endLastFebruary) {
      if (d1 < 30) {
        d2 = 1;
        ({year: y2, month: m2} = bumpMonth(y2, m2 + 1));
      } else {
        d2 = 30;
      }
    } else if (d2 === 31) {
      if (d1 < 30) {
        d2 = 1;
        ({year: y2, month: m2} = bumpMonth(y2, m2 + 1));
      } else {
        d2 = 30;
      }
    }
  }
  return sign * (360 * (y2 - y1) + 30 * (m2 - m1) + (d2 - d1));
}

function yearFraction(startValue, endValue, basisValue = 0) {
  let start = normalizeDateSerial(startValue);
  let end = normalizeDateSerial(endValue);
  if (isErrorValue(start)) return start;
  if (isErrorValue(end)) return end;
  const basis = Math.trunc(toNumber(basisValue));
  if (basis < 0 || basis > 4) return '#NUM!';
  const sign = start > end ? -1 : 1;
  if (sign < 0) [start, end] = [end, start];
  if (start === end) return 0;
  const actualDays = end - start;
  if (basis === 0) return sign * days360Between(start, end, false) / 360;
  if (basis === 2) return sign * actualDays / 360;
  if (basis === 3) return sign * actualDays / 365;
  if (basis === 4) return sign * days360Between(start, end, true) / 360;

  const startDate = serialToDate(start);
  const endDate = serialToDate(end);
  const startYear = startDate.getUTCFullYear();
  const endYear = endDate.getUTCFullYear();
  if (startYear === endYear) return sign * actualDays / daysInYear(startYear);

  let fraction = (dateToSerial(new Date(Date.UTC(startYear + 1, 0, 1))) - start) / daysInYear(startYear);
  for (let year = startYear + 1; year < endYear; year++) fraction += 1;
  fraction += (end - dateToSerial(new Date(Date.UTC(endYear, 0, 1)))) / daysInYear(endYear);
  return sign * fraction;
}

function addMonthsSerial(value, months) {
  const date = serialToDate(value);
  if (!date) return '#VALUE!';
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + Math.trunc(months);
  const day = Math.min(date.getUTCDate(), daysInMonth(year, month));
  return dateToSerial(new Date(Date.UTC(year, month, day)));
}

function endOfMonthSerial(value, months) {
  const date = serialToDate(value);
  if (!date) return '#VALUE!';
  return dateToSerial(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + Math.trunc(months) + 1, 0)));
}

function excelWeekday(value, returnType = 1) {
  const date = serialToDate(value);
  if (!date) return '#VALUE!';
  const day = date.getUTCDay();
  const type = Math.trunc(returnType);
  if (type === 1) return day + 1;
  if (type === 2) return day === 0 ? 7 : day;
  if (type === 3) return day === 0 ? 6 : day - 1;
  if (type >= 11 && type <= 17) {
    const firstDay = type === 17 ? 0 : type - 10;
    return ((day - firstDay + 7) % 7) + 1;
  }
  return '#NUM!';
}

function dayOfYear(date) {
  return Math.floor((Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - Date.UTC(date.getUTCFullYear(), 0, 1)) / MS_PER_DAY);
}

function isoWeekNumber(value) {
  const date = serialToDate(value);
  if (!date) return '#VALUE!';
  const normalized = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = normalized.getUTCDay() || 7;
  normalized.setUTCDate(normalized.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(normalized.getUTCFullYear(), 0, 1));
  return Math.ceil((((normalized - yearStart) / MS_PER_DAY) + 1) / 7);
}

function weekNumber(value, returnType = 1) {
  const date = serialToDate(value);
  if (!date) return '#VALUE!';
  const type = Math.trunc(returnType);
  if (type === 21) return isoWeekNumber(value);
  const startDay = type === 1 ? 0 : type === 2 ? 1 : type >= 11 && type <= 17 ? (type === 17 ? 0 : type - 10) : null;
  if (startDay == null) return '#NUM!';
  const normalized = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const jan1 = new Date(Date.UTC(normalized.getUTCFullYear(), 0, 1));
  const offset = (jan1.getUTCDay() - startDay + 7) % 7;
  return Math.floor((dayOfYear(normalized) + offset) / 7) + 1;
}

function weekendDaysFromValue(value = 1) {
  const raw = value == null || value === '' ? 1 : value;
  if (typeof raw === 'string' && /^[01]{7}$/.test(raw.trim())) {
    const pattern = raw.trim();
    if (!pattern.includes('0')) return '#VALUE!';
    const days = new Set();
    for (let index = 0; index < pattern.length; index++) {
      if (pattern[index] === '1') days.add((index + 1) % 7);
    }
    return days;
  }
  if (!isNumericLike(raw)) return '#VALUE!';
  const code = Math.trunc(toNumber(raw));
  const pairs = {
    1: [6, 0],
    2: [0, 1],
    3: [1, 2],
    4: [2, 3],
    5: [3, 4],
    6: [4, 5],
    7: [5, 6],
    11: [0],
    12: [1],
    13: [2],
    14: [3],
    15: [4],
    16: [5],
    17: [6],
  };
  return pairs[code] ? new Set(pairs[code]) : '#NUM!';
}

function isWorkdaySerial(serial, holidays = new Set(), weekendDays = STANDARD_WEEKEND_DAYS) {
  const date = serialToDate(serial);
  if (!date) return false;
  const day = date.getUTCDay();
  return !weekendDays.has(day) && !holidays.has(String(Math.trunc(serial)));
}

function networkDaysBetween(startValue, endValue, holidays = new Set(), weekendDays = STANDARD_WEEKEND_DAYS) {
  const start = normalizeDateSerial(startValue);
  const end = normalizeDateSerial(endValue);
  if (isErrorValue(start)) return start;
  if (isErrorValue(end)) return end;
  if (isErrorValue(weekendDays)) return weekendDays;
  if (start > end) return -networkDaysBetween(end, start, holidays, weekendDays);
  let count = 0;
  for (let serial = start; serial <= end; serial++) {
    if (isWorkdaySerial(serial, holidays, weekendDays)) count++;
  }
  return count;
}

function workdayFrom(startValue, days, holidays = new Set(), weekendDays = STANDARD_WEEKEND_DAYS) {
  const start = normalizeDateSerial(startValue);
  if (isErrorValue(start)) return start;
  if (isErrorValue(weekendDays)) return weekendDays;
  const targetDays = Math.trunc(days);
  if (targetDays === 0) return start;
  const step = targetDays > 0 ? 1 : -1;
  let remaining = Math.abs(targetDays);
  let serial = start;
  while (remaining > 0) {
    serial += step;
    if (isWorkdaySerial(serial, holidays, weekendDays)) remaining--;
  }
  return serial;
}

function compareDates(a, b) {
  return a.getTime() - b.getTime();
}

function addMonthsDate(date, months) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + months;
  const day = Math.min(date.getUTCDate(), daysInMonth(year, month));
  return new Date(Date.UTC(year, month, day));
}

function monthDifference(startDate, endDate) {
  let months = (endDate.getUTCFullYear() - startDate.getUTCFullYear()) * 12 + endDate.getUTCMonth() - startDate.getUTCMonth();
  if (endDate.getUTCDate() < startDate.getUTCDate()) months--;
  return months;
}

function sameMonthDayInYear(date, year) {
  const month = date.getUTCMonth();
  const day = Math.min(date.getUTCDate(), daysInMonth(year, month));
  return new Date(Date.UTC(year, month, day));
}

function datedif(startValue, endValue, unitValue) {
  const startSerial = normalizeDateSerial(startValue);
  const endSerial = normalizeDateSerial(endValue);
  if (isErrorValue(startSerial)) return startSerial;
  if (isErrorValue(endSerial)) return endSerial;
  if (startSerial > endSerial) return '#NUM!';
  const unit = String(unitValue ?? '').trim().toUpperCase();
  const startDate = serialToDate(startSerial);
  const endDate = serialToDate(endSerial);
  if (unit === 'D') return endSerial - startSerial;
  const months = monthDifference(startDate, endDate);
  if (unit === 'M') return months;
  if (unit === 'Y') return Math.floor(months / 12);
  if (unit === 'YM') return months % 12;
  if (unit === 'MD') {
    if (endDate.getUTCDate() >= startDate.getUTCDate()) return endDate.getUTCDate() - startDate.getUTCDate();
    const previousMonthEnd = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), 0));
    return previousMonthEnd.getUTCDate() - startDate.getUTCDate() + endDate.getUTCDate();
  }
  if (unit === 'YD') {
    let anniversary = sameMonthDayInYear(startDate, endDate.getUTCFullYear());
    if (compareDates(anniversary, endDate) > 0) anniversary = sameMonthDayInYear(startDate, endDate.getUTCFullYear() - 1);
    return normalizeDateSerial(endDate) - normalizeDateSerial(anniversary);
  }
  return '#NUM!';
}

function currentDateSerial(includeTime = false, nowValue = new Date()) {
  const now = nowValue instanceof Date ? nowValue : new Date(nowValue);
  if (Number.isNaN(now.getTime())) return '#VALUE!';
  if (includeTime) return dateToSerial(now);
  return dateToSerial(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
}

function randomValue(random = Math.random) {
  const value = typeof random === 'function' ? random() : random;
  return Number.isFinite(value) && value >= 0 && value < 1 ? value : '#NUM!';
}

function findInnermostFunctionCall(text) {
  const source = String(text ?? '');
  const stack = [];
  let quoted = false;
  for (let index = 0; index < source.length; index++) {
    const ch = source[index];
    if (ch === '"') {
      if (quoted && source[index + 1] === '"') index++;
      else quoted = !quoted;
      continue;
    }
    if (quoted) continue;
    if (ch === '(') {
      stack.push(index);
      continue;
    }
    if (ch !== ')') continue;
    const openIndex = stack.pop();
    if (openIndex == null) continue;
    let nameStart = openIndex - 1;
    while (nameStart >= 0 && /[A-Z0-9_.]/i.test(source[nameStart])) nameStart--;
    nameStart++;
    const name = source.slice(nameStart, openIndex);
    if (/^[A-Z][A-Z0-9_.]*$/i.test(name)) {
      return {start: nameStart, end: index + 1, text: source.slice(nameStart, index + 1)};
    }
  }
  return null;
}

function splitTopLevelOperator(text, operator) {
  const source = String(text ?? '');
  const parts = [];
  let current = '';
  let depth = 0;
  let quoted = false;
  for (let index = 0; index < source.length; index++) {
    const ch = source[index];
    if (ch === '"') {
      current += ch;
      if (quoted && source[index + 1] === '"') current += source[++index];
      else quoted = !quoted;
      continue;
    }
    if (!quoted && ch === '(') depth++;
    if (!quoted && ch === ')') depth = Math.max(0, depth - 1);
    if (!quoted && depth === 0 && ch === operator) {
      parts.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  if (parts.length) parts.push(current.trim());
  return parts.length ? parts : null;
}

function parseWholeFunctionCall(text) {
  const source = String(text ?? '').trim();
  const nameMatch = /^([A-Z][A-Z0-9_.]*)\s*\(/i.exec(source);
  if (!nameMatch) return null;
  const name = nameMatch[1];
  const openIndex = source.indexOf('(', nameMatch[0].length - 1);
  let depth = 0;
  let quoted = false;
  for (let index = openIndex; index < source.length; index++) {
    const ch = source[index];
    if (ch === '"') {
      if (quoted && source[index + 1] === '"') index++;
      else quoted = !quoted;
      continue;
    }
    if (quoted) continue;
    if (ch === '(') depth++;
    if (ch === ')') {
      depth--;
      if (depth === 0) {
        return index === source.length - 1
          ? {name: name.toUpperCase(), argText: source.slice(openIndex + 1, index)}
          : null;
      }
    }
  }
  return null;
}

function formulaVariableMap(input) {
  if (input instanceof Map) {
    return new Map(Array.from(input.entries(), ([name, value]) => [String(name).toUpperCase(), value]));
  }
  if (input && typeof input === 'object') {
    return new Map(Object.entries(input).map(([name, value]) => [String(name).toUpperCase(), value]));
  }
  return new Map();
}

function isValidFormulaVariableName(name) {
  const text = String(name ?? '').trim();
  return /^[A-Za-z_][A-Za-z0-9_.]*$/.test(text) && !isCellReference(text) && !/^(TRUE|FALSE)$/i.test(text);
}

function isFormulaReferenceValue(value) {
  return Boolean(value && typeof value === 'object' && value.kind === 'reference' && value.reference);
}

export function isFormulaArrayValue(value) {
  return Boolean(value && typeof value === 'object' && value.kind === 'array' && Array.isArray(value.values));
}

export function formulaArrayDimensions(value) {
  if (!isFormulaArrayValue(value)) return {rows: 0, cols: 0};
  return {
    rows: value.values.length,
    cols: Math.max(0, ...value.values.map((row) => Array.isArray(row) ? row.length : 1)),
  };
}

export function formulaArrayCellValue(value, rowOffset = 0, colOffset = 0) {
  if (!isFormulaArrayValue(value)) return undefined;
  return value.values[rowOffset]?.[colOffset] ?? '';
}

function normalizeFormulaArrayMatrix(values) {
  const source = Array.isArray(values) ? values : [[values]];
  if (!source.length) return [];
  return source.map((row) => Array.isArray(row) ? row : [row]);
}

function formulaArrayValue(values) {
  return {kind: 'array', values: normalizeFormulaArrayMatrix(values)};
}

function flattenFormulaArrayMatrix(matrix) {
  return normalizeFormulaArrayMatrix(matrix).flatMap((row) => row);
}

function formulaScalarValue(value) {
  if (isFormulaReferenceValue(value)) return formulaScalarValue(value.value);
  if (isFormulaArrayValue(value)) return formulaScalarValue(value.values[0]?.[0] ?? '');
  return value;
}

function formulaReferenceScalarValue(value) {
  return formulaScalarValue(value);
}

function formulaLiteralFromValue(value) {
  if (isFormulaReferenceValue(value)) return formulaLiteralFromValue(value.value);
  if (isErrorValue(value)) return value;
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'number') return String(value);
  if (isNumericLike(value)) return String(toNumber(value));
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function replaceFormulaVariableReferences(text, variables) {
  const source = String(text ?? '');
  if (!variables?.size) return {text: source, error: null};
  let result = '';
  let error = null;
  for (let index = 0; index < source.length;) {
    const ch = source[index];
    if (ch === '"') {
      const start = index++;
      while (index < source.length) {
        if (source[index] === '"' && source[index + 1] === '"') {
          index += 2;
          continue;
        }
        if (source[index] === '"') {
          index++;
          break;
        }
        index++;
      }
      result += source.slice(start, index);
      continue;
    }
    if (ch === "'") {
      const quotedSheet = consumeFormulaQuotedSheetName(source, index);
      if (quotedSheet) {
        result += quotedSheet.value;
        index = quotedSheet.end;
        continue;
      }
    }
    if (/[A-Za-z_]/.test(ch)) {
      const match = /^[A-Za-z_][A-Za-z0-9_.]*/.exec(source.slice(index));
      if (match) {
        const name = match[0];
        const key = name.toUpperCase();
        const nextIndex = index + name.length;
        const nextNonSpace = source.slice(nextIndex).match(/\S/)?.[0] || '';
        const isFunctionCall = nextNonSpace === '(';
        const isSheetQualifier = source[nextIndex] === '!';
        if (variables.has(key) && !isFunctionCall && !isSheetQualifier) {
          const value = formulaReferenceScalarValue(variables.get(key));
          if (isErrorValue(value)) error = value;
          result += formulaLiteralFromValue(value);
          index = nextIndex;
          continue;
        }
        result += name;
        index = nextIndex;
        continue;
      }
    }
    result += ch;
    index++;
  }
  return {text: result, error};
}

export function readCell(dataRef, row, col, getDefaultCellValue = defaultCellValue) {
  const key = cellKey(row, col);
  return dataRef.current.has(key) ? dataRef.current.get(key) : getDefaultCellValue(row, col);
}

export function evaluateFormula(raw, dataRef, origin, getDefaultCellValue = defaultCellValue, stack = new Set(), options = {}) {
  const formula = String(raw ?? '').trim();
  if (!formula.startsWith('=')) return raw;
  const expr = formula.slice(1).trim();
  const currentSheetName = origin?.sheetName || options.currentSheetName || '';
  const formulaVariables = formulaVariableMap(options.formulaVariables);
  const originKey = origin ? qualifiedReferenceKey(currentSheetName, origin.row, origin.col) : null;
  if (originKey && stack.has(originKey)) return '#CYCLE!';
  if (originKey) stack.add(originKey);

  const resolveSheetName = (sheetName) => options.resolveSheetName?.(sheetName) || sheetName || currentSheetName;
  const hasSheetReference = (sheetName) => !sheetName || !options.hasSheetReference || options.hasSheetReference(sheetName);
  const dataRefForSheet = (sheetName) => {
    if (!hasSheetReference(sheetName)) return null;
    const resolvedSheetName = resolveSheetName(sheetName);
    if (!sheetName || resolvedSheetName === currentSheetName) return dataRef;
    return options.getDataRefForSheet?.(resolvedSheetName) || null;
  };
  const readEvaluated = (row, col, sheetName = null) => {
    if (!hasSheetReference(sheetName)) return '#REF!';
    const resolvedSheetName = resolveSheetName(sheetName);
    const key = qualifiedReferenceKey(resolvedSheetName, row, col);
    if (stack.has(key)) return '#CYCLE!';
    const nextDataRef = dataRefForSheet(resolvedSheetName);
    if (!nextDataRef) return '#REF!';
    const value = readCell(nextDataRef, row, col, getDefaultCellValue);
    return typeof value === 'string' && value.trim().startsWith('=')
      ? evaluateFormula(value, nextDataRef, {row, col, sheetName: resolvedSheetName}, getDefaultCellValue, new Set(stack), {...options, currentSheetName: resolvedSheetName})
      : value;
  };
  const cellsForRangeReference = (parsed) => {
    if (!parsed) return [];
    const {sheetName, range} = parsed;
    const cells = [];
    let count = 0;
    for (let r = range.r1; r <= range.r2; r++) {
      for (let c = range.c1; c <= range.c2; c++) {
        if (++count > 10000) return cells;
        cells.push({row: r, col: c, rowOffset: r - range.r1, colOffset: c - range.c1, sheetName: sheetName || currentSheetName, value: readEvaluated(r, c, sheetName)});
      }
    }
    return cells;
  };
  const matrixForRangeReference = (parsed) => {
    if (!parsed) return [];
    const {sheetName, range} = parsed;
    const rows = [];
    let count = 0;
    for (let r = range.r1; r <= range.r2; r++) {
      const row = [];
      for (let c = range.c1; c <= range.c2; c++) {
        if (++count > 10000) return rows;
        row.push(readEvaluated(r, c, sheetName));
      }
      rows.push(row);
    }
    return rows;
  };
  const formulaReferenceValue = (reference) => ({
    kind: 'reference',
    reference,
    value: readEvaluated(reference.range.r1, reference.range.c1, reference.sheetName),
  });
  const arrayValueForArg = (arg) => {
    const variableValue = formulaVariables.get(String(arg ?? '').trim().toUpperCase());
    if (isFormulaArrayValue(variableValue)) return variableValue;
    if (isFormulaReferenceValue(variableValue)) return formulaArrayValue(matrixForRangeReference(variableValue.reference));
    if (isErrorValue(variableValue)) return variableValue;
    const fn = parseWholeFunctionCall(arg);
    if (!fn) return null;
    const value = evaluateNestedFormula(arg);
    return isFormulaArrayValue(value) ? value : null;
  };
  const matrixForAnyArg = (arg) => {
    const arrayValue = arrayValueForArg(arg);
    if (isErrorValue(arrayValue)) return arrayValue;
    if (arrayValue) return arrayValue.values;
    const reference = rangeReferenceForArg(arg);
    if (isErrorValue(reference)) return reference;
    if (reference) return matrixForRangeReference(reference);
    const value = resolveScalar(arg);
    return isErrorValue(value) ? value : [[value]];
  };
  const valuesForRangeReference = (parsed) => cellsForRangeReference(parsed).map((cell) => toNumber(cell.value));
  const rawValuesForRangeReference = (parsed) => cellsForRangeReference(parsed).map((cell) => cell.value);
  const formulaTextForReference = (arg) => {
    if (!isCellReference(arg)) return '#VALUE!';
    const ref = parseCellReference(arg, options);
    if (isErrorValue(ref)) return ref;
    if (!ref) return '#VALUE!';
    if (!hasSheetReference(ref.sheetName)) return '#REF!';
    const resolvedSheetName = resolveSheetName(ref.sheetName);
    const providedFormula = options.getCellFormula?.(resolvedSheetName, ref.row, ref.col);
    if (typeof providedFormula === 'string' && providedFormula.trim().startsWith('=')) return providedFormula;
    const nextDataRef = dataRefForSheet(resolvedSheetName);
    if (!nextDataRef) return '#REF!';
    const sourceValue = readCell(nextDataRef, ref.row, ref.col, getDefaultCellValue);
    return typeof sourceValue === 'string' && sourceValue.trim().startsWith('=') ? sourceValue : '';
  };
  const indirectReferenceText = (refValue, useA1 = true) => {
    const text = String(refValue ?? '').trim();
    if (!text) return '#REF!';
    return useA1 ? text : r1c1ReferenceToA1(text, origin);
  };
  const offsetReferenceForArgs = (offsetArgs) => {
    if (offsetArgs.length < 3) return '#VALUE!';
    const base = rangeReferenceForArg(offsetArgs[0]);
    if (isErrorValue(base)) return base;
    if (!base) return '#VALUE!';
    const rowOffset = resolveNumber(offsetArgs[1]);
    const colOffset = resolveNumber(offsetArgs[2]);
    if (isErrorValue(rowOffset)) return rowOffset;
    if (isErrorValue(colOffset)) return colOffset;
    const baseHeight = base.range.r2 - base.range.r1 + 1;
    const baseWidth = base.range.c2 - base.range.c1 + 1;
    const height = offsetArgs[3] == null ? baseHeight : resolveNumber(offsetArgs[3]);
    const width = offsetArgs[4] == null ? baseWidth : resolveNumber(offsetArgs[4]);
    if (isErrorValue(height)) return height;
    if (isErrorValue(width)) return width;
    const rows = Math.trunc(rowOffset);
    const cols = Math.trunc(colOffset);
    const rowCount = Math.trunc(height);
    const colCount = Math.trunc(width);
    if (![rows, cols, rowCount, colCount].every(Number.isFinite) || rowCount < 1 || colCount < 1) return '#REF!';
    const range = {
      r1: base.range.r1 + rows,
      c1: base.range.c1 + cols,
      r2: base.range.r1 + rows + rowCount - 1,
      c2: base.range.c1 + cols + colCount - 1,
    };
    if (range.r1 < 0 || range.c1 < 0) return '#REF!';
    const dimensions = options.getSheetDimensionsForSheet?.(resolveSheetName(base.sheetName)) || {};
    if ((dimensions.rowCount && range.r2 >= dimensions.rowCount) || (dimensions.colCount && range.c2 >= dimensions.colCount)) {
      return '#REF!';
    }
    return {sheetName: base.sheetName, range};
  };
  const rangeReferenceForArg = (arg, allowOrigin = false) => {
    if (arg == null || String(arg).trim() === '') {
      return allowOrigin && origin ? {sheetName: null, range: {r1: origin.row, c1: origin.col, r2: origin.row, c2: origin.col}} : null;
    }
    const variableValue = formulaVariables.get(String(arg ?? '').trim().toUpperCase());
    if (isFormulaReferenceValue(variableValue)) return variableValue.reference;
    if (isErrorValue(variableValue)) return variableValue;
    const parsed = parseRangeReference(arg, options);
    if (parsed) return parsed;
    const fn = parseWholeFunctionCall(arg);
    if (!fn) return null;
    const referenceArgs = fn.argText.trim() ? splitFormulaArgs(fn.argText) : [];
    if (fn.name === 'INDIRECT') {
      const refValue = resolveScalar(referenceArgs[0]);
      const useA1 = referenceArgs[1] == null ? true : !isFalseLike(resolveScalar(referenceArgs[1]));
      const reference = isErrorValue(refValue) ? refValue : indirectReferenceText(refValue, useA1);
      if (isErrorValue(reference)) return reference;
      return parseRangeReference(reference, options) || '#REF!';
    }
    if (fn.name === 'OFFSET') return offsetReferenceForArgs(referenceArgs);
    return null;
  };
  const rawValuesForRangeArg = (arg) => {
    const arrayValue = arrayValueForArg(arg);
    if (isErrorValue(arrayValue)) return arrayValue;
    if (arrayValue) return flattenFormulaArrayMatrix(arrayValue.values);
    const reference = rangeReferenceForArg(arg);
    if (isErrorValue(reference)) return reference;
    return reference ? rawValuesForRangeReference(reference) : [];
  };
  const valuesForRangeArg = (arg) => {
    const rawValues = rawValuesForRangeArg(arg);
    return isErrorValue(rawValues) ? rawValues : rawValues.map(toNumber);
  };
  const matrixForRangeArg = (arg) => {
    const arrayValue = arrayValueForArg(arg);
    if (isErrorValue(arrayValue)) return arrayValue;
    if (arrayValue) return arrayValue.values;
    const reference = rangeReferenceForArg(arg);
    if (isErrorValue(reference)) return reference;
    return reference ? matrixForRangeReference(reference) : [];
  };
  const rawValuesForArgs = (argsToResolve) => {
    return argsToResolve.flatMap((arg) => {
      const arrayValue = arrayValueForArg(arg);
      if (isErrorValue(arrayValue)) return [arrayValue];
      if (arrayValue) return flattenFormulaArrayMatrix(arrayValue.values);
      const reference = rangeReferenceForArg(arg);
      if (isErrorValue(reference)) return [reference];
      if (reference) return rawValuesForRangeReference(reference);
      return [resolveScalar(arg)];
    });
  };
  const numericValuesForArgs = (argsToResolve) => {
    const rawValues = rawValuesForArgs(argsToResolve);
    const error = firstErrorValue(rawValues);
    return error || rawValues.map(toNumber);
  };
  const numericOnlyValuesForArgs = (argsToResolve) => {
    const rawValues = rawValuesForArgs(argsToResolve);
    const error = firstErrorValue(rawValues);
    return error || rawValues.filter(isNumericLike).map(toNumber);
  };
  const resolveNumber = (arg) => {
    const value = resolveScalar(arg);
    return isErrorValue(value) ? value : toNumber(value);
  };
  const serialDatePart = (arg, part) => {
    const date = serialToDate(resolveScalar(arg));
    if (!date) return '#VALUE!';
    if (part === 'year') return date.getUTCFullYear();
    if (part === 'month') return date.getUTCMonth() + 1;
    return date.getUTCDate();
  };
  const evaluateNestedFormula = (text) => {
    const nestedStack = new Set(stack);
    if (originKey) nestedStack.delete(originKey);
    return evaluateFormula(`=${text}`, dataRef, origin || null, getDefaultCellValue, nestedStack, {...options, formulaVariables});
  };
  const replaceFunctionCallsForArithmetic = (text) => {
    let source = String(text ?? '');
    let error = null;
    for (let depth = 0; depth < 100; depth++) {
      const call = findInnermostFunctionCall(source);
      if (!call) break;
      const value = evaluateNestedFormula(call.text);
      if (isErrorValue(value)) {
        error = value;
        break;
      }
      source = `${source.slice(0, call.start)}${toNumber(value)}${source.slice(call.end)}`;
    }
    return error || source;
  };
  const applyExcelNumericOperators = (text) => {
    let source = String(text ?? '').replace(/\^/g, '**');
    for (let index = 0; index < 20 && /(?:\d+(?:\.\d+)?|\([^()]+\))\s*%/.test(source); index++) {
      source = source.replace(/(\d+(?:\.\d+)?|\([^()]+\))\s*%/g, '($1/100)');
    }
    return source;
  };
  const evaluateArithmetic = (text) => {
    const withFunctions = replaceFunctionCallsForArithmetic(text);
    if (isErrorValue(withFunctions)) return withFunctions;
    const withVariables = replaceFormulaVariableReferences(withFunctions, formulaVariables);
    if (withVariables.error) return withVariables.error;
    let cellError = null;
    const safe = replaceCellReferences(withVariables.text, (ref) => {
      const value = readEvaluated(ref.row, ref.col, ref.sheetName);
      if (isErrorValue(value)) cellError = value;
      return String(toNumber(value));
    }, options);
    const referenceError = ERROR_VALUE_PATTERN.exec(safe)?.[0];
    if (referenceError) return referenceError;
    if (cellError) return cellError;
    const excelSafe = applyExcelNumericOperators(safe);
    if (!/^[0-9+\-*/().\s]+$/.test(excelSafe)) return '#VALUE!';
    const result = Function(`"use strict"; return (${excelSafe})`)();
    if (Number.isNaN(result) && excelSafe.includes('/')) return '#DIV/0!';
    return normalizeNumericResult(result, '#DIV/0!');
  };
  const evaluateTextConcatenation = (text) => {
    const parts = splitTopLevelOperator(text, '&');
    if (!parts) return null;
    return parts.map((part) => resolveText(part)).join('');
  };
  const resolveScalar = (arg) => {
    const text = String(arg ?? '').trim();
    if (text === '') return '';
    if (isQuoted(text)) return unquote(text);
    if (/^TRUE$/i.test(text)) return true;
    if (/^FALSE$/i.test(text)) return false;
    if (formulaVariables.has(text.toUpperCase())) return formulaReferenceScalarValue(formulaVariables.get(text.toUpperCase()));
    const concatenated = evaluateTextConcatenation(text);
    if (concatenated != null) return concatenated;
    const addr = isCellReference(text) ? parseCellReference(text, options) : null;
    if (isErrorValue(addr)) return addr;
    if (addr) return readEvaluated(addr.row, addr.col, addr.sheetName);
    if (/^[A-Z][A-Z0-9_.]*\s*\(/i.test(text)) return evaluateNestedFormula(text);
    const comparison = findComparison(text);
    if (comparison) return evaluateCondition(text);
    if (/[+\-*/()%^]/.test(text) || isNumericLike(text)) return evaluateArithmetic(text);
    if (/^[A-Za-z_][A-Za-z0-9_.]*$/.test(text)) return '#NAME?';
    return text;
  };
  const resolveText = (arg) => String(resolveScalar(arg) ?? '');
  const evaluateCondition = (conditionText) => {
    const comparison = findComparison(conditionText);
    if (!comparison) {
      const value = resolveScalar(conditionText);
      if (typeof value === 'boolean') return value;
      if (isNumericLike(value)) return toNumber(value) !== 0;
      return Boolean(value);
    }
    const left = resolveScalar(comparison.left);
    const right = resolveScalar(comparison.right);
    const numeric = isNumericLike(left) && isNumericLike(right);
    const a = numeric ? toNumber(left) : String(left ?? '');
    const b = numeric ? toNumber(right) : String(right ?? '');
    if (comparison.operator === '>=') return a >= b;
    if (comparison.operator === '<=') return a <= b;
    if (comparison.operator === '<>') return a !== b;
    if (comparison.operator === '>') return a > b;
    if (comparison.operator === '<') return a < b;
    if (comparison.operator === '=') return a === b;
    return false;
  };
  const resolveDirectExpression = (text) => {
    const source = String(text ?? '').trim();
    if (source === '') return {matched: true, value: ''};
    if (isQuoted(source)) return {matched: true, value: unquote(source)};
    if (/^TRUE$/i.test(source)) return {matched: true, value: true};
    if (/^FALSE$/i.test(source)) return {matched: true, value: false};
    if (isErrorValue(source.toUpperCase())) return {matched: true, value: source.toUpperCase()};
    if (formulaVariables.has(source.toUpperCase())) return {matched: true, value: formulaReferenceScalarValue(formulaVariables.get(source.toUpperCase()))};
    const addr = isCellReference(source) ? parseCellReference(source, options) : null;
    if (isErrorValue(addr)) return {matched: true, value: addr};
    if (addr) return {matched: true, value: readEvaluated(addr.row, addr.col, addr.sheetName)};
    if (/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:E[+-]?\d+)?$/i.test(source)) return {matched: true, value: Number(source)};
    if (/^[A-Za-z_][A-Za-z0-9_.]*$/.test(source)) return {matched: true, value: '#NAME?'};
    return {matched: false, value: null};
  };

  const fnCall = parseWholeFunctionCall(expr);
  if (fnCall) {
    const name = fnCall.name;
    const argText = fnCall.argText.trim();
    const args = argText ? splitFormulaArgs(argText) : [];
    const aggregateIf = (mode) => {
      const criteriaReference = rangeReferenceForArg(args[0]);
      if (isErrorValue(criteriaReference)) return criteriaReference;
      if (!criteriaReference) return '#VALUE!';
      const criteriaCells = cellsForRangeReference(criteriaReference);
      const criterion = resolveScalar(args[1]);
      const valueReference = args[2] == null ? null : rangeReferenceForArg(args[2]);
      if (isErrorValue(valueReference)) return valueReference;
      const valueCells = valueReference ? cellsForRangeReference(valueReference) : criteriaCells;
      let total = 0;
      let count = 0;
      criteriaCells.forEach((cell, index) => {
        if (!matchesCriterion(cell.value, criterion)) return;
        if (mode === 'count') {
          count++;
          return;
        }
        const value = valueCells[index]?.value;
        if (mode === 'average' && !isNumericLike(value)) return;
        total += toNumber(value);
        count++;
      });
      if (mode === 'count') return count;
      if (mode === 'average') return count ? total / count : '#DIV/0!';
      return total;
    };
    const referenceShape = (reference) => ({
      rows: reference.range.r2 - reference.range.r1 + 1,
      cols: reference.range.c2 - reference.range.c1 + 1,
    });
    const sameReferenceShape = (left, right) => {
      const leftShape = referenceShape(left);
      const rightShape = referenceShape(right);
      return leftShape.rows === rightShape.rows && leftShape.cols === rightShape.cols;
    };
    const aggregateIfs = (valueRangeArg, criteriaArgs, mode) => {
      const valueReference = rangeReferenceForArg(valueRangeArg);
      if (isErrorValue(valueReference)) return valueReference;
      if (!valueReference || criteriaArgs.length % 2 !== 0) return '#VALUE!';
      const valueCells = cellsForRangeReference(valueReference);
      const criteria = [];
      for (let index = 0; index < criteriaArgs.length; index += 2) {
        const criteriaReference = rangeReferenceForArg(criteriaArgs[index]);
        if (isErrorValue(criteriaReference)) return criteriaReference;
        if (!criteriaReference) return '#VALUE!';
        if (!sameReferenceShape(valueReference, criteriaReference)) return '#VALUE!';
        criteria.push({cells: cellsForRangeReference(criteriaReference), criterion: resolveScalar(criteriaArgs[index + 1])});
      }
      let total = 0;
      let count = 0;
      let extreme = null;
      valueCells.forEach((cell, index) => {
        const matched = criteria.every((item) => matchesCriterion(item.cells[index]?.value, item.criterion));
        if (!matched) return;
        if (mode === 'count') {
          count++;
          return;
        }
        if ((mode === 'average' || mode === 'min' || mode === 'max') && !isNumericLike(cell.value)) return;
        const value = toNumber(cell.value);
        if (mode === 'min' || mode === 'max') {
          extreme = extreme == null ? value : mode === 'min' ? Math.min(extreme, value) : Math.max(extreme, value);
          count++;
          return;
        }
        total += value;
        count++;
      });
      if (mode === 'count') return count;
      if (mode === 'average') return count ? total / count : '#DIV/0!';
      if (mode === 'min' || mode === 'max') return count ? extreme : 0;
      return total;
    };
    const rangeForReferenceArg = (arg, allowOrigin = false) => {
      const reference = rangeReferenceForArg(arg, allowOrigin);
      if (isErrorValue(reference)) return reference;
      return reference ? reference.range : '#VALUE!';
    };
    const holidaySetForArgs = (holidayArgs) => {
      const values = numericOnlyValuesForArgs(holidayArgs);
      if (isErrorValue(values)) return values;
      const serials = [];
      for (const value of values) {
        const serial = normalizeDateSerial(value);
        if (isErrorValue(serial)) return serial;
        serials.push(String(Math.trunc(serial)));
      }
      return new Set(serials);
    };
    const averageAValuesForArgs = (argsToResolve) => {
      const rawValues = rawValuesForArgs(argsToResolve);
      const error = firstErrorValue(rawValues);
      if (error) return error;
      return rawValues.filter((value) => value !== '').map((value) => {
        if (typeof value === 'boolean') return value ? 1 : 0;
        return isNumericLike(value) ? toNumber(value) : 0;
      });
    };
    const compareByFormulaOperator = (left, right, operator) => {
      const numeric = isNumericLike(left) && isNumericLike(right);
      const a = numeric ? toNumber(left) : String(left ?? '');
      const b = numeric ? toNumber(right) : String(right ?? '');
      if (operator === '>=') return a >= b;
      if (operator === '<=') return a <= b;
      if (operator === '<>') return a !== b;
      if (operator === '>') return a > b;
      if (operator === '<') return a < b;
      return a === b;
    };
    const matrixDimensions = (matrix) => ({
      rows: matrix.length,
      cols: Math.max(0, ...matrix.map((row) => row.length)),
    });
    const nonEmptyMatrixForArg = (arg) => {
      const matrix = matrixForAnyArg(arg);
      if (isErrorValue(matrix)) return matrix;
      const size = matrixDimensions(matrix);
      return size.rows > 0 && size.cols > 0 ? matrix : '#VALUE!';
    };
    const paddedMatrixRow = (row, colCount, fillValue = '#N/A') => (
      Array.from({length: colCount}, (_item, colIndex) => row?.[colIndex] ?? fillValue)
    );
    const sliceMatrix = (matrix, rowStart, rowEnd, colStart, colEnd) => (
      matrix.slice(rowStart, rowEnd).map((row) => (
        Array.from({length: colEnd - colStart}, (_item, index) => row[colStart + index] ?? '')
      ))
    );
    const signedIndexOffset = (rawIndex, maxIndex) => {
      const index = Math.trunc(rawIndex);
      if (!Number.isFinite(index) || index === 0) return null;
      const offset = index > 0 ? index - 1 : maxIndex + index;
      return offset >= 0 && offset < maxIndex ? offset : null;
    };
    const booleanMatrixForArg = (arg) => {
      const comparison = findComparison(arg);
      if (!comparison) {
        const matrix = matrixForAnyArg(arg);
        if (isErrorValue(matrix)) return matrix;
        return matrix.map((row) => row.map((value) => !isFalseLike(value)));
      }
      const leftMatrix = matrixForAnyArg(comparison.left);
      if (isErrorValue(leftMatrix)) return leftMatrix;
      const rightMatrix = matrixForAnyArg(comparison.right);
      if (isErrorValue(rightMatrix)) return rightMatrix;
      const leftSize = matrixDimensions(leftMatrix);
      const rightSize = matrixDimensions(rightMatrix);
      const rightScalar = rightMatrix[0]?.[0] ?? '';
      return leftMatrix.map((row, rowIndex) => row.map((value, colIndex) => {
        const pairedRight = rightSize.rows === leftSize.rows && rightSize.cols === leftSize.cols
          ? rightMatrix[rowIndex]?.[colIndex]
          : rightScalar;
        return compareByFormulaOperator(value, pairedRight, comparison.operator);
      }));
    };
    const filterVectorForArg = (arg, rowCount, colCount) => {
      const matrix = booleanMatrixForArg(arg);
      if (isErrorValue(matrix)) return matrix;
      const size = matrixDimensions(matrix);
      if (size.rows === rowCount && size.cols === 1) {
        return {orientation: 'rows', values: matrix.map((row) => Boolean(row[0]))};
      }
      if (size.rows === 1 && size.cols === colCount) {
        return {orientation: 'cols', values: matrix[0].map(Boolean)};
      }
      return '#VALUE!';
    };
    const values = () => numericValuesForArgs(args);
    if (name === 'SUM') {
      const numericValues = values();
      if (isErrorValue(numericValues)) return numericValues;
      return numericValues.reduce((a, b) => a + b, 0);
    }
    if (name === 'AVERAGE' || name === 'AVG') {
      const numericValues = values();
      if (isErrorValue(numericValues)) return numericValues;
      return numericValues.length ? numericValues.reduce((a, b) => a + b, 0) / numericValues.length : 0;
    }
    if (name === 'AVERAGEA') {
      const numericValues = averageAValuesForArgs(args);
      if (isErrorValue(numericValues)) return numericValues;
      return numericValues.length ? numericValues.reduce((a, b) => a + b, 0) / numericValues.length : '#DIV/0!';
    }
    if (name === 'MIN') {
      const numericValues = values();
      if (isErrorValue(numericValues)) return numericValues;
      return numericValues.length ? Math.min(...numericValues) : 0;
    }
    if (name === 'MAX') {
      const numericValues = values();
      if (isErrorValue(numericValues)) return numericValues;
      return numericValues.length ? Math.max(...numericValues) : 0;
    }
    if (name === 'COUNT') {
      const rawValues = rawValuesForArgs(args);
      const error = firstErrorValue(rawValues);
      return error || rawValues.filter(isNumericLike).length;
    }
    if (name === 'COUNTA') {
      const rawValues = rawValuesForArgs(args);
      const error = firstErrorValue(rawValues);
      return error || rawValues.filter((value) => value !== '').length;
    }
    if (name === 'COUNTBLANK') {
      const rawValues = rawValuesForArgs(args);
      const error = firstErrorValue(rawValues);
      return error || rawValues.filter((value) => value === '').length;
    }
    if (name === 'COUNTIF') return aggregateIf('count');
    if (name === 'SUMIF') return aggregateIf('sum');
    if (name === 'AVERAGEIF') return aggregateIf('average');
    if (name === 'COUNTIFS') return aggregateIfs(args[0], args.slice(0), 'count');
    if (name === 'SUMIFS') return aggregateIfs(args[0], args.slice(1), 'sum');
    if (name === 'AVERAGEIFS') return aggregateIfs(args[0], args.slice(1), 'average');
    if (name === 'MINIFS') return aggregateIfs(args[0], args.slice(1), 'min');
    if (name === 'MAXIFS') return aggregateIfs(args[0], args.slice(1), 'max');
    if (name === 'ROUND') {
      const value = resolveNumber(args[0]);
      const places = resolveNumber(args[1] ?? 0);
      if (isErrorValue(value)) return value;
      if (isErrorValue(places)) return places;
      const factor = 10 ** places;
      return normalizeNumericResult(Math.round(value * factor) / factor);
    }
    if (name === 'MROUND') {
      const number = resolveNumber(args[0]);
      const multiple = resolveNumber(args[1]);
      const error = firstErrorValue([number, multiple]);
      return error || roundToMultiple(number, multiple);
    }
    if (name === 'ROUNDUP') {
      const number = resolveNumber(args[0]);
      const places = resolveNumber(args[1] ?? 0);
      if (isErrorValue(number)) return number;
      if (isErrorValue(places)) return places;
      const factor = 10 ** places;
      const value = number * factor;
      return normalizeNumericResult((value < 0 ? Math.floor(value) : Math.ceil(value)) / factor);
    }
    if (name === 'ROUNDDOWN') {
      const number = resolveNumber(args[0]);
      const places = resolveNumber(args[1] ?? 0);
      if (isErrorValue(number)) return number;
      if (isErrorValue(places)) return places;
      const factor = 10 ** places;
      const value = number * factor;
      return normalizeNumericResult((value < 0 ? Math.ceil(value) : Math.floor(value)) / factor);
    }
    if (name === 'ABS') {
      const value = resolveNumber(args[0]);
      return isErrorValue(value) ? value : Math.abs(value);
    }
    if (name === 'SQRT') {
      const value = resolveNumber(args[0]);
      if (isErrorValue(value)) return value;
      return value < 0 ? '#NUM!' : normalizeNumericResult(Math.sqrt(value));
    }
    if (name === 'POWER') {
      const base = resolveNumber(args[0]);
      const exponent = resolveNumber(args[1]);
      if (isErrorValue(base)) return base;
      if (isErrorValue(exponent)) return exponent;
      if (base === 0 && exponent < 0) return '#DIV/0!';
      return normalizeNumericResult(base ** exponent);
    }
    if (name === 'EXP') {
      const value = resolveNumber(args[0]);
      if (isErrorValue(value)) return value;
      return normalizeNumericResult(Math.exp(value));
    }
    if (name === 'LN' || name === 'LOG10') {
      const value = resolveNumber(args[0]);
      if (isErrorValue(value)) return value;
      if (value <= 0) return '#NUM!';
      return normalizeNumericResult(name === 'LN' ? Math.log(value) : Math.log10(value));
    }
    if (name === 'LOG') {
      const value = resolveNumber(args[0]);
      const base = resolveNumber(args[1] ?? 10);
      if (isErrorValue(value)) return value;
      if (isErrorValue(base)) return base;
      if (value <= 0 || base <= 0 || base === 1) return '#NUM!';
      return normalizeNumericResult(Math.log(value) / Math.log(base));
    }
    if (name === 'PI') return Math.PI;
    if (name === 'SIN' || name === 'COS' || name === 'TAN') {
      const value = resolveNumber(args[0]);
      if (isErrorValue(value)) return value;
      const result = name === 'SIN' ? Math.sin(value) : name === 'COS' ? Math.cos(value) : Math.tan(value);
      return normalizeNumericResult(result);
    }
    if (name === 'RADIANS' || name === 'DEGREES') {
      const value = resolveNumber(args[0]);
      if (isErrorValue(value)) return value;
      return normalizeNumericResult(name === 'RADIANS' ? value * Math.PI / 180 : value * 180 / Math.PI);
    }
    if (name === 'MOD') {
      const number = resolveNumber(args[0]);
      const divisor = resolveNumber(args[1]);
      if (isErrorValue(number)) return number;
      if (isErrorValue(divisor)) return divisor;
      return moduloWithDivisorSign(number, divisor);
    }
    if (name === 'QUOTIENT') {
      const numerator = resolveNumber(args[0]);
      const denominator = resolveNumber(args[1]);
      if (isErrorValue(numerator)) return numerator;
      if (isErrorValue(denominator)) return denominator;
      return denominator === 0 ? '#DIV/0!' : Math.trunc(numerator / denominator);
    }
    if (name === 'INT') {
      const value = resolveNumber(args[0]);
      return isErrorValue(value) ? value : Math.floor(value);
    }
    if (name === 'TRUNC') {
      const value = resolveNumber(args[0]);
      const digits = resolveNumber(args[1] ?? 0);
      if (isErrorValue(value)) return value;
      if (isErrorValue(digits)) return digits;
      return normalizeNumericResult(truncateNumber(value, Math.trunc(digits)));
    }
    if (name === 'EVEN' || name === 'ODD') {
      const value = resolveNumber(args[0]);
      if (isErrorValue(value)) return value;
      return roundToParity(value, name === 'EVEN' ? 'even' : 'odd');
    }
    if (name === 'SIGN') {
      const value = resolveNumber(args[0]);
      if (isErrorValue(value)) return value;
      return value > 0 ? 1 : value < 0 ? -1 : 0;
    }
    if (name === 'CEILING' || name === 'FLOOR') {
      const value = resolveNumber(args[0]);
      const significance = resolveNumber(args[1] ?? 1);
      if (isErrorValue(value)) return value;
      if (isErrorValue(significance)) return significance;
      if (significance === 0) return 0;
      const quotient = value / Math.abs(significance);
      const rounded = name === 'CEILING' ? Math.ceil(quotient) : Math.floor(quotient);
      return normalizeNumericResult(rounded * Math.abs(significance));
    }
    if (name === 'MEDIAN') {
      const numericValues = numericOnlyValuesForArgs(args);
      if (isErrorValue(numericValues)) return numericValues;
      numericValues.sort((a, b) => a - b);
      if (!numericValues.length) return 0;
      const middle = Math.floor(numericValues.length / 2);
      return numericValues.length % 2 ? numericValues[middle] : (numericValues[middle - 1] + numericValues[middle]) / 2;
    }
    if (name === 'MODE' || name === 'MODE.SNGL') {
      const numericValues = numericOnlyValuesForArgs(args);
      return modeSingle(numericValues);
    }
    if (name === 'GEOMEAN' || name === 'HARMEAN') {
      const numericValues = numericOnlyValuesForArgs(args);
      return name === 'GEOMEAN' ? geometricMean(numericValues) : harmonicMean(numericValues);
    }
    if (name === 'LARGE' || name === 'SMALL') {
      const numericValues = numericOnlyValuesForArgs([args[0]]);
      if (isErrorValue(numericValues)) return numericValues;
      numericValues.sort((a, b) => name === 'LARGE' ? b - a : a - b);
      const k = resolveNumber(args[1] ?? 1);
      if (isErrorValue(k)) return k;
      const index = Math.trunc(k) - 1;
      return index >= 0 && index < numericValues.length ? numericValues[index] : '#NUM!';
    }
    if (name === 'RANK' || name === 'RANK.EQ' || name === 'RANK.AVG') {
      const value = resolveNumber(args[0]);
      if (isErrorValue(value)) return value;
      const descending = toNumber(resolveScalar(args[2] ?? 0)) === 0;
      const numericValues = numericOnlyValuesForArgs([args[1]]);
      return rankForValues(value, numericValues, descending, name === 'RANK.AVG');
    }
    if (name === 'PERCENTILE' || name === 'PERCENTILE.INC' || name === 'PERCENTILE.EXC') {
      const numericValues = numericOnlyValuesForArgs([args[0]]);
      if (isErrorValue(numericValues)) return numericValues;
      numericValues.sort((a, b) => a - b);
      const percentile = resolveNumber(args[1]);
      if (isErrorValue(percentile)) return percentile;
      return normalizeNumericResult(percentileForSortedValues(numericValues, percentile, name === 'PERCENTILE.EXC'));
    }
    if (name === 'QUARTILE' || name === 'QUARTILE.INC' || name === 'QUARTILE.EXC') {
      const numericValues = numericOnlyValuesForArgs([args[0]]);
      if (isErrorValue(numericValues)) return numericValues;
      numericValues.sort((a, b) => a - b);
      const quartile = resolveNumber(args[1]);
      if (isErrorValue(quartile)) return quartile;
      return normalizeNumericResult(quartileForSortedValues(numericValues, quartile, name === 'QUARTILE.EXC'));
    }
    if (name === 'VAR.S' || name === 'VAR.P' || name === 'STDEV.S' || name === 'STDEV.P') {
      const variance = varianceForValues(numericOnlyValuesForArgs(args), name.endsWith('.S'));
      if (isErrorValue(variance)) return variance;
      return name.startsWith('STDEV') ? Math.sqrt(variance) : variance;
    }
    if (name === 'CORREL' || name === 'COVARIANCE.P' || name === 'COVARIANCE.S') {
      const leftValues = rawValuesForRangeArg(args[0]);
      const rightValues = rawValuesForRangeArg(args[1]);
      const error = firstErrorValue([leftValues, rightValues]);
      if (error) return error;
      if (!leftValues.length || !rightValues.length) return '#VALUE!';
      const pairs = pairedNumericValues(leftValues, rightValues);
      if (name === 'CORREL') return correlationForPairs(pairs);
      return covarianceForPairs(pairs, name === 'COVARIANCE.S');
    }
    if (name === 'SLOPE' || name === 'INTERCEPT' || name === 'RSQ') {
      const knownY = rawValuesForRangeArg(args[0]);
      const knownX = rawValuesForRangeArg(args[1]);
      const error = firstErrorValue([knownY, knownX]);
      if (error) return error;
      if (!knownY.length || !knownX.length) return '#VALUE!';
      const pairs = pairedNumericValues(knownX, knownY);
      if (name === 'RSQ') {
        const correlation = correlationForPairs(pairs);
        return isErrorValue(correlation) ? correlation : normalizeNumericResult(correlation ** 2);
      }
      const stats = regressionStatsForPairs(pairs);
      return isErrorValue(stats) ? stats : stats[name === 'SLOPE' ? 'slope' : 'intercept'];
    }
    if (name === 'FORECAST' || name === 'FORECAST.LINEAR') {
      const x = resolveNumber(args[0]);
      if (isErrorValue(x)) return x;
      const knownY = rawValuesForRangeArg(args[1]);
      const knownX = rawValuesForRangeArg(args[2]);
      const error = firstErrorValue([knownY, knownX]);
      if (error) return error;
      if (!knownY.length || !knownX.length) return '#VALUE!';
      const stats = regressionStatsForPairs(pairedNumericValues(knownX, knownY));
      return isErrorValue(stats) ? stats : normalizeNumericResult(stats.intercept + stats.slope * x);
    }
    if (name === 'SUMPRODUCT') {
      const arrays = args.map((arg) => {
        const matrix = matrixForRangeArg(arg);
        if (isErrorValue(matrix)) return matrix;
        if (matrix.length) return {values: flattenFormulaArrayMatrix(matrix), shape: matrixDimensions(matrix), ranged: true};
        return {values: [toNumber(resolveScalar(arg))], shape: {rows: 1, cols: 1}, ranged: false};
      });
      const error = firstErrorValue(arrays);
      if (error) return error;
      const rangeArrays = arrays.filter((array) => array.ranged);
      if (rangeArrays.length > 1) {
        const firstShape = rangeArrays[0].shape;
        if (rangeArrays.some((array) => array.shape.rows !== firstShape.rows || array.shape.cols !== firstShape.cols)) return '#VALUE!';
      }
      const length = Math.max(0, ...arrays.map((array) => array.values.length));
      let total = 0;
      for (let index = 0; index < length; index++) {
        total += arrays.reduce((product, array) => product * toNumber(array.values[index] ?? array.values[0] ?? 0), 1);
      }
      return total;
    }
    if (name === 'PRODUCT') {
      const numericValues = numericOnlyValuesForArgs(args);
      if (isErrorValue(numericValues)) return numericValues;
      return numericValues.length ? numericValues.reduce((a, b) => a * b, 1) : 0;
    }
    if (name === 'SUMSQ') {
      const numericValues = numericOnlyValuesForArgs(args);
      if (isErrorValue(numericValues)) return numericValues;
      return numericValues.reduce((total, value) => total + value ** 2, 0);
    }
    if (name === 'FACT' || name === 'FACTDOUBLE') {
      const value = resolveNumber(args[0]);
      if (isErrorValue(value)) return value;
      return name === 'FACT' ? factorial(value) : doubleFactorial(value);
    }
    if (name === 'GCD' || name === 'LCM') {
      const numericValues = numericOnlyValuesForArgs(args);
      if (isErrorValue(numericValues)) return numericValues;
      return name === 'GCD' ? greatestCommonDivisor(numericValues) : leastCommonMultiple(numericValues);
    }
    if (name === 'COMBIN' || name === 'PERMUT') {
      const count = resolveNumber(args[0]);
      const chosen = resolveNumber(args[1]);
      const error = firstErrorValue([count, chosen]);
      return error || (name === 'COMBIN' ? combinations(count, chosen) : permutations(count, chosen));
    }
    if (name === 'SEQUENCE') {
      const rawRowCount = resolveNumber(args[0]);
      const rawColCount = resolveNumber(args[1] ?? 1);
      const start = resolveNumber(args[2] ?? 1);
      const step = resolveNumber(args[3] ?? 1);
      const error = firstErrorValue([rawRowCount, rawColCount, start, step]);
      if (error) return error;
      const rowCount = Math.trunc(rawRowCount);
      const colCount = Math.trunc(rawColCount);
      if (rowCount < 1 || colCount < 1) return '#VALUE!';
      return formulaArrayValue(Array.from({length: rowCount}, (_row, rowIndex) => (
        Array.from({length: colCount}, (_col, colIndex) => start + step * (rowIndex * colCount + colIndex))
      )));
    }
    if (name === 'TRANSPOSE') {
      const matrix = matrixForRangeArg(args[0]);
      if (isErrorValue(matrix)) return matrix;
      if (!matrix.length) return '#VALUE!';
      const colCount = Math.max(0, ...matrix.map((row) => row.length));
      return formulaArrayValue(Array.from({length: colCount}, (_row, colIndex) => (
        matrix.map((row) => row[colIndex] ?? '')
      )));
    }
    if (name === 'HSTACK' || name === 'VSTACK') {
      if (!args.length) return '#VALUE!';
      const matrices = args.map((arg) => nonEmptyMatrixForArg(arg));
      const error = firstErrorValue(matrices);
      if (error) return error;
      const sizes = matrices.map(matrixDimensions);
      if (name === 'HSTACK') {
        const rowCount = Math.max(0, ...sizes.map((size) => size.rows));
        return formulaArrayValue(Array.from({length: rowCount}, (_row, rowIndex) => (
          matrices.flatMap((matrix, matrixIndex) => paddedMatrixRow(matrix[rowIndex], sizes[matrixIndex].cols))
        )));
      }
      const colCount = Math.max(0, ...sizes.map((size) => size.cols));
      return formulaArrayValue(matrices.flatMap((matrix) => (
        matrix.map((row) => paddedMatrixRow(row, colCount))
      )));
    }
    if (name === 'TAKE') {
      if (args.length < 2) return '#VALUE!';
      const matrix = nonEmptyMatrixForArg(args[0]);
      if (isErrorValue(matrix)) return matrix;
      const size = matrixDimensions(matrix);
      const rawRows = resolveNumber(args[1]);
      const rawCols = args[2] == null ? size.cols : resolveNumber(args[2]);
      const error = firstErrorValue([rawRows, rawCols]);
      if (error) return error;
      const rowCount = Math.trunc(rawRows);
      const colCount = Math.trunc(rawCols);
      if (!Number.isFinite(rowCount) || !Number.isFinite(colCount) || rowCount === 0 || colCount === 0) return '#CALC!';
      const rowsToTake = Math.min(Math.abs(rowCount), size.rows);
      const colsToTake = Math.min(Math.abs(colCount), size.cols);
      const rowStart = rowCount > 0 ? 0 : size.rows - rowsToTake;
      const colStart = colCount > 0 ? 0 : size.cols - colsToTake;
      return formulaArrayValue(sliceMatrix(matrix, rowStart, rowStart + rowsToTake, colStart, colStart + colsToTake));
    }
    if (name === 'DROP') {
      if (args.length < 2) return '#VALUE!';
      const matrix = nonEmptyMatrixForArg(args[0]);
      if (isErrorValue(matrix)) return matrix;
      const size = matrixDimensions(matrix);
      const rawRows = resolveNumber(args[1]);
      const rawCols = args[2] == null ? 0 : resolveNumber(args[2]);
      const error = firstErrorValue([rawRows, rawCols]);
      if (error) return error;
      const rowsToDrop = Math.trunc(rawRows);
      const colsToDrop = Math.trunc(rawCols);
      if (!Number.isFinite(rowsToDrop) || !Number.isFinite(colsToDrop)) return '#VALUE!';
      const rowStart = rowsToDrop > 0 ? Math.min(rowsToDrop, size.rows) : 0;
      const rowEnd = rowsToDrop < 0 ? Math.max(0, size.rows + rowsToDrop) : size.rows;
      const colStart = colsToDrop > 0 ? Math.min(colsToDrop, size.cols) : 0;
      const colEnd = colsToDrop < 0 ? Math.max(0, size.cols + colsToDrop) : size.cols;
      if (rowStart >= rowEnd || colStart >= colEnd) return '#CALC!';
      return formulaArrayValue(sliceMatrix(matrix, rowStart, rowEnd, colStart, colEnd));
    }
    if (name === 'CHOOSECOLS' || name === 'CHOOSEROWS') {
      if (args.length < 2) return '#VALUE!';
      const matrix = nonEmptyMatrixForArg(args[0]);
      if (isErrorValue(matrix)) return matrix;
      const size = matrixDimensions(matrix);
      const selectedOffsets = args.slice(1).map((arg) => {
        const value = resolveNumber(arg);
        return isErrorValue(value) ? value : signedIndexOffset(value, name === 'CHOOSECOLS' ? size.cols : size.rows);
      });
      const error = firstErrorValue(selectedOffsets);
      if (error) return error;
      if (selectedOffsets.some((offset) => offset == null)) return '#VALUE!';
      return formulaArrayValue(name === 'CHOOSECOLS'
        ? matrix.map((row) => selectedOffsets.map((colIndex) => row[colIndex] ?? ''))
        : selectedOffsets.map((rowIndex) => paddedMatrixRow(matrix[rowIndex], size.cols, '')));
    }
    if (name === 'FILTER') {
      const matrix = matrixForRangeArg(args[0]);
      if (isErrorValue(matrix)) return matrix;
      if (!matrix.length || args.length < 2) return '#VALUE!';
      const size = matrixDimensions(matrix);
      let orientation = null;
      let include = null;
      for (const includeArg of [args[1]]) {
        const vector = filterVectorForArg(includeArg, size.rows, size.cols);
        if (isErrorValue(vector)) return vector;
        if (!orientation) {
          orientation = vector.orientation;
          include = vector.values;
        } else if (orientation !== vector.orientation || include.length !== vector.values.length) {
          return '#VALUE!';
        } else {
          include = include.map((value, index) => value && vector.values[index]);
        }
      }
      if (!orientation) return '#VALUE!';
      const filtered = orientation === 'rows'
        ? matrix.filter((_row, index) => include[index])
        : matrix.map((row) => row.filter((_value, index) => include[index]));
      const hasValues = orientation === 'rows' ? filtered.length > 0 : filtered.some((row) => row.length > 0);
      if (!hasValues) return args[2] == null ? '#CALC!' : formulaArrayValue([[resolveScalar(args[2])]]);
      return formulaArrayValue(filtered);
    }
    if (name === 'UNIQUE') {
      const matrix = matrixForRangeArg(args[0]);
      if (isErrorValue(matrix)) return matrix;
      if (!matrix.length) return '#VALUE!';
      const byCol = args[1] == null ? false : !isFalseLike(resolveScalar(args[1]));
      const exactlyOnce = args[2] == null ? false : !isFalseLike(resolveScalar(args[2]));
      const vectors = byCol
        ? Array.from({length: Math.max(0, ...matrix.map((row) => row.length))}, (_item, colIndex) => matrix.map((row) => row[colIndex] ?? ''))
        : matrix;
      const counts = new Map();
      const keyFor = (vector) => JSON.stringify(vector.map((value) => [typeof value, String(value).toLowerCase()]));
      for (const vector of vectors) counts.set(keyFor(vector), (counts.get(keyFor(vector)) || 0) + 1);
      const seen = new Set();
      const unique = [];
      for (const vector of vectors) {
        const key = keyFor(vector);
        if (seen.has(key)) continue;
        seen.add(key);
        if (!exactlyOnce || counts.get(key) === 1) unique.push(vector);
      }
      if (!unique.length) return '#CALC!';
      return formulaArrayValue(byCol
        ? matrix.map((_row, rowIndex) => unique.map((col) => col[rowIndex] ?? ''))
        : unique);
    }
    if (name === 'SORT') {
      const matrix = matrixForRangeArg(args[0]);
      if (isErrorValue(matrix)) return matrix;
      if (!matrix.length) return '#VALUE!';
      const rawSortIndex = resolveNumber(args[1] ?? 1);
      const rawSortOrder = resolveNumber(args[2] ?? 1);
      const byColValue = args[3] == null ? false : resolveScalar(args[3]);
      const error = firstErrorValue([rawSortIndex, rawSortOrder, byColValue]);
      if (error) return error;
      const sortIndex = Math.trunc(rawSortIndex);
      const sortOrder = Math.trunc(rawSortOrder);
      const byCol = !isFalseLike(byColValue);
      if (![1, -1].includes(sortOrder) || sortIndex < 1) return '#VALUE!';
      if (byCol) {
        if (sortIndex > matrix.length) return '#VALUE!';
        const colCount = Math.max(0, ...matrix.map((row) => row.length));
        const indexes = Array.from({length: colCount}, (_item, index) => index);
        indexes.sort((a, b) => sortOrder * compareValues(matrix[sortIndex - 1]?.[a], matrix[sortIndex - 1]?.[b]));
        return formulaArrayValue(matrix.map((row) => indexes.map((index) => row[index] ?? '')));
      }
      if (matrix.some((row) => sortIndex > row.length)) return '#VALUE!';
      return formulaArrayValue([...matrix].sort((a, b) => sortOrder * compareValues(a[sortIndex - 1], b[sortIndex - 1])));
    }
    if (name === 'ROW' || name === 'COLUMN') {
      const range = rangeForReferenceArg(args[0], true);
      if (isErrorValue(range)) return range;
      return name === 'ROW' ? range.r1 + 1 : range.c1 + 1;
    }
    if (name === 'ROWS' || name === 'COLUMNS') {
      const matrix = matrixForRangeArg(args[0]);
      if (isErrorValue(matrix)) return matrix;
      if (matrix.length) return name === 'ROWS' ? matrix.length : Math.max(0, ...matrix.map((row) => row.length));
      const range = rangeForReferenceArg(args[0]);
      if (isErrorValue(range)) return range;
      return name === 'ROWS' ? range.r2 - range.r1 + 1 : range.c2 - range.c1 + 1;
    }
    if (name === 'ADDRESS') {
      const row = resolveNumber(args[0]);
      const col = resolveNumber(args[1]);
      const absType = args[2] == null ? 1 : resolveNumber(args[2]);
      const a1Value = args[3] == null ? true : resolveScalar(args[3]);
      const sheetName = args[4] == null ? '' : resolveScalar(args[4]);
      const error = firstErrorValue([row, col, absType, a1Value, sheetName]);
      return error || addressReference(row, col, absType, !isFalseLike(a1Value), sheetName);
    }
    if (name === 'INDIRECT') {
      const refValue = resolveScalar(args[0]);
      const a1Value = args[1] == null ? true : resolveScalar(args[1]);
      const error = firstErrorValue([refValue, a1Value]);
      if (error) return error;
      const reference = indirectReferenceText(refValue, !isFalseLike(a1Value));
      if (isErrorValue(reference)) return reference;
      const cellRef = parseCellReference(reference, options);
      if (isErrorValue(cellRef)) return cellRef;
      if (cellRef) return readEvaluated(cellRef.row, cellRef.col, cellRef.sheetName);
      const parsedRange = parseRangeReference(reference, options);
      if (parsedRange) return readEvaluated(parsedRange.range.r1, parsedRange.range.c1, parsedRange.sheetName);
      return '#REF!';
    }
    if (name === 'OFFSET') {
      const reference = offsetReferenceForArgs(args);
      if (isErrorValue(reference)) return reference;
      return reference ? readEvaluated(reference.range.r1, reference.range.c1, reference.sheetName) : '#VALUE!';
    }
    if (name === 'PMT') {
      const rate = resolveNumber(args[0]);
      const periods = resolveNumber(args[1]);
      const presentValue = resolveNumber(args[2]);
      const futureValue = resolveNumber(args[3] ?? 0);
      const type = normalizePaymentType(resolveNumber(args[4] ?? 0));
      const error = firstErrorValue([rate, periods, presentValue, futureValue, type]);
      if (error) return error;
      return normalizeNumericResult(paymentForLoan(rate, periods, presentValue, futureValue, type));
    }
    if (name === 'PV') {
      const rate = resolveNumber(args[0]);
      const periods = resolveNumber(args[1]);
      const payment = resolveNumber(args[2]);
      const futureValue = resolveNumber(args[3] ?? 0);
      const type = normalizePaymentType(resolveNumber(args[4] ?? 0));
      const error = firstErrorValue([rate, periods, payment, futureValue, type]);
      if (error) return error;
      return normalizeNumericResult(presentValueForLoan(rate, periods, payment, futureValue, type));
    }
    if (name === 'FV') {
      const rate = resolveNumber(args[0]);
      const periods = resolveNumber(args[1]);
      const payment = resolveNumber(args[2]);
      const presentValue = resolveNumber(args[3] ?? 0);
      const type = normalizePaymentType(resolveNumber(args[4] ?? 0));
      const error = firstErrorValue([rate, periods, payment, presentValue, type]);
      if (error) return error;
      return normalizeNumericResult(futureValueForLoan(rate, periods, payment, presentValue, type));
    }
    if (name === 'NPER') {
      const rate = resolveNumber(args[0]);
      const payment = resolveNumber(args[1]);
      const presentValue = resolveNumber(args[2]);
      const futureValue = resolveNumber(args[3] ?? 0);
      const type = normalizePaymentType(resolveNumber(args[4] ?? 0));
      const error = firstErrorValue([rate, payment, presentValue, futureValue, type]);
      if (error) return error;
      return normalizeNumericResult(periodsForLoan(rate, payment, presentValue, futureValue, type));
    }
    if (name === 'RATE') {
      const periods = resolveNumber(args[0]);
      const payment = resolveNumber(args[1]);
      const presentValue = resolveNumber(args[2]);
      const futureValue = resolveNumber(args[3] ?? 0);
      const type = normalizePaymentType(resolveNumber(args[4] ?? 0));
      const guess = resolveNumber(args[5] ?? 0.1);
      const error = firstErrorValue([periods, payment, presentValue, futureValue, type, guess]);
      if (error) return error;
      return normalizeNumericResult(rateForLoan(periods, payment, presentValue, futureValue, type, guess));
    }
    if (name === 'IPMT' || name === 'PPMT') {
      const rate = resolveNumber(args[0]);
      const period = resolveNumber(args[1]);
      const periods = resolveNumber(args[2]);
      const presentValue = resolveNumber(args[3]);
      const futureValue = resolveNumber(args[4] ?? 0);
      const type = normalizePaymentType(resolveNumber(args[5] ?? 0));
      const error = firstErrorValue([rate, period, periods, presentValue, futureValue, type]);
      if (error) return error;
      return name === 'IPMT'
        ? interestPaymentForLoan(rate, period, periods, presentValue, futureValue, type)
        : principalPaymentForLoan(rate, period, periods, presentValue, futureValue, type);
    }
    if (name === 'NPV') {
      const rate = resolveNumber(args[0]);
      if (isErrorValue(rate)) return rate;
      const cashFlows = numericValuesForArgs(args.slice(1));
      if (isErrorValue(cashFlows)) return cashFlows;
      return normalizeNumericResult(netPresentValue(rate, cashFlows));
    }
    if (name === 'IRR') {
      const cashFlows = numericOnlyValuesForArgs([args[0]]);
      if (isErrorValue(cashFlows)) return cashFlows;
      if (!cashFlows.length) return '#VALUE!';
      const guess = args[1] == null ? 0.1 : resolveNumber(args[1]);
      if (isErrorValue(guess)) return guess;
      return normalizeNumericResult(internalRateOfReturn(cashFlows, guess));
    }
    if (name === 'XNPV' || name === 'XIRR') {
      const valuesArg = args[name === 'XNPV' ? 1 : 0];
      const datesArg = args[name === 'XNPV' ? 2 : 1];
      const values = rawValuesForRangeArg(valuesArg);
      const dates = rawValuesForRangeArg(datesArg);
      const rangeError = firstErrorValue([values, dates]);
      if (rangeError) return rangeError;
      if (!values.length || !dates.length) return '#VALUE!';
      const pairs = irregularCashFlowPairs(values, dates);
      if (name === 'XNPV') {
        const rate = resolveNumber(args[0]);
        const error = firstErrorValue([rate, pairs]);
        return error || normalizeNumericResult(extendedNetPresentValue(rate, pairs));
      }
      const guess = args[2] == null ? 0.1 : resolveNumber(args[2]);
      const error = firstErrorValue([pairs, guess]);
      return error || normalizeNumericResult(extendedInternalRateOfReturn(pairs, guess));
    }
    if (name === 'DATE') return dateSerial(toNumber(resolveScalar(args[0])), toNumber(resolveScalar(args[1])), toNumber(resolveScalar(args[2])));
    if (name === 'TIME') {
      const hour = resolveNumber(args[0]);
      const minute = resolveNumber(args[1]);
      const second = resolveNumber(args[2]);
      const error = firstErrorValue([hour, minute, second]);
      return error || timeSerial(hour, minute, second);
    }
    if (name === 'DATEVALUE') {
      const value = resolveScalar(args[0]);
      return isErrorValue(value) ? value : dateValueSerial(value);
    }
    if (name === 'TIMEVALUE') {
      const value = resolveScalar(args[0]);
      return isErrorValue(value) ? value : timeValueSerial(value);
    }
    if (name === 'YEAR') return serialDatePart(args[0], 'year');
    if (name === 'MONTH') return serialDatePart(args[0], 'month');
    if (name === 'DAY') return serialDatePart(args[0], 'day');
    if (name === 'HOUR') return timePart(resolveScalar(args[0]), 'hour');
    if (name === 'MINUTE') return timePart(resolveScalar(args[0]), 'minute');
    if (name === 'SECOND') return timePart(resolveScalar(args[0]), 'second');
    if (name === 'WEEKNUM') {
      const value = resolveScalar(args[0]);
      const returnType = args[1] == null ? 1 : resolveNumber(args[1]);
      const error = firstErrorValue([value, returnType]);
      return error || weekNumber(value, returnType);
    }
    if (name === 'ISOWEEKNUM') {
      const value = resolveScalar(args[0]);
      return isErrorValue(value) ? value : isoWeekNumber(value);
    }
    if (name === 'DAYS') {
      const endDate = resolveScalar(args[0]);
      const startDate = resolveScalar(args[1]);
      const error = firstErrorValue([endDate, startDate]);
      if (error) return error;
      const endSerial = normalizeDateSerial(endDate);
      const startSerial = normalizeDateSerial(startDate);
      const serialError = firstErrorValue([endSerial, startSerial]);
      return serialError || endSerial - startSerial;
    }
    if (name === 'DAYS360') {
      const startDate = resolveScalar(args[0]);
      const endDate = resolveScalar(args[1]);
      const method = args[2] == null ? false : resolveScalar(args[2]);
      const error = firstErrorValue([startDate, endDate, method]);
      return error || days360Between(startDate, endDate, !isFalseLike(method));
    }
    if (name === 'YEARFRAC') {
      const startDate = resolveScalar(args[0]);
      const endDate = resolveScalar(args[1]);
      const basis = args[2] == null ? 0 : resolveNumber(args[2]);
      const error = firstErrorValue([startDate, endDate, basis]);
      return error || normalizeNumericResult(yearFraction(startDate, endDate, basis));
    }
    if (name === 'DATEDIF') {
      const startDate = resolveScalar(args[0]);
      const endDate = resolveScalar(args[1]);
      const unit = resolveScalar(args[2]);
      const error = firstErrorValue([startDate, endDate, unit]);
      return error || datedif(startDate, endDate, unit);
    }
    if (name === 'WEEKDAY') {
      const value = resolveScalar(args[0]);
      const returnType = args[1] == null ? 1 : resolveNumber(args[1]);
      const error = firstErrorValue([value, returnType]);
      return error || excelWeekday(value, returnType);
    }
    if (name === 'NETWORKDAYS') {
      const startDate = resolveScalar(args[0]);
      const endDate = resolveScalar(args[1]);
      const holidays = holidaySetForArgs(args.slice(2));
      const error = firstErrorValue([startDate, endDate, holidays]);
      return error || networkDaysBetween(startDate, endDate, holidays);
    }
    if (name === 'NETWORKDAYS.INTL') {
      const startDate = resolveScalar(args[0]);
      const endDate = resolveScalar(args[1]);
      const weekendDays = weekendDaysFromValue(args[2] == null ? 1 : resolveScalar(args[2]));
      const holidays = holidaySetForArgs(args.slice(3));
      const error = firstErrorValue([startDate, endDate, weekendDays, holidays]);
      return error || networkDaysBetween(startDate, endDate, holidays, weekendDays);
    }
    if (name === 'WORKDAY') {
      const startDate = resolveScalar(args[0]);
      const days = resolveNumber(args[1]);
      const holidays = holidaySetForArgs(args.slice(2));
      const error = firstErrorValue([startDate, days, holidays]);
      return error || workdayFrom(startDate, days, holidays);
    }
    if (name === 'WORKDAY.INTL') {
      const startDate = resolveScalar(args[0]);
      const days = resolveNumber(args[1]);
      const weekendDays = weekendDaysFromValue(args[2] == null ? 1 : resolveScalar(args[2]));
      const holidays = holidaySetForArgs(args.slice(3));
      const error = firstErrorValue([startDate, days, weekendDays, holidays]);
      return error || workdayFrom(startDate, days, holidays, weekendDays);
    }
    if (name === 'EDATE') return addMonthsSerial(resolveScalar(args[0]), toNumber(resolveScalar(args[1])));
    if (name === 'EOMONTH') return endOfMonthSerial(resolveScalar(args[0]), toNumber(resolveScalar(args[1])));
    if (name === 'TODAY') return currentDateSerial(false, options.now);
    if (name === 'NOW') return currentDateSerial(true, options.now);
    if (name === 'RAND') return randomValue(options.random);
    if (name === 'RANDBETWEEN') {
      const bottom = resolveNumber(args[0]);
      const top = resolveNumber(args[1]);
      if (isErrorValue(bottom)) return bottom;
      if (isErrorValue(top)) return top;
      const min = Math.ceil(bottom);
      const max = Math.floor(top);
      if (min > max) return '#NUM!';
      const value = randomValue(options.random);
      if (isErrorValue(value)) return value;
      return min + Math.floor(value * (max - min + 1));
    }
    if (name === 'LEN') return resolveText(args[0]).length;
    if (name === 'TRIM') return resolveText(args[0]).trim().replace(/\s+/g, ' ');
    if (name === 'UPPER') return resolveText(args[0]).toUpperCase();
    if (name === 'LOWER') return resolveText(args[0]).toLowerCase();
    if (name === 'PROPER') return properCaseText(resolveScalar(args[0]));
    if (name === 'LEFT') {
      const count = resolveNumber(args[1] ?? 1);
      if (isErrorValue(count)) return count;
      const length = Math.trunc(count);
      if (length < 0) return '#VALUE!';
      return resolveText(args[0]).slice(0, length);
    }
    if (name === 'RIGHT') {
      const text = resolveText(args[0]);
      const count = resolveNumber(args[1] ?? 1);
      if (isErrorValue(count)) return count;
      const length = Math.trunc(count);
      if (length < 0) return '#VALUE!';
      return text.slice(Math.max(0, text.length - length));
    }
    if (name === 'MID') {
      const startNum = resolveNumber(args[1] ?? 1);
      const count = resolveNumber(args[2] ?? 0);
      const error = firstErrorValue([startNum, count]);
      if (error) return error;
      const start = Math.trunc(startNum);
      const length = Math.trunc(count);
      if (start < 1 || length < 0) return '#VALUE!';
      return resolveText(args[0]).slice(start - 1, start - 1 + length);
    }
    if (name === 'CHAR') {
      const value = resolveNumber(args[0]);
      if (isErrorValue(value)) return value;
      const code = Math.trunc(value);
      return code >= 1 && code <= 255 ? String.fromCharCode(code) : '#VALUE!';
    }
    if (name === 'CODE') {
      const text = resolveText(args[0]);
      return text.length ? text.charCodeAt(0) : '#VALUE!';
    }
    if (name === 'VALUE') {
      const value = resolveScalar(args[0]);
      if (isErrorValue(value)) return value;
      return isNumericLike(value) ? toNumber(value) : '#VALUE!';
    }
    if (name === 'NUMBERVALUE') {
      const value = resolveScalar(args[0]);
      const decimal = args[1] == null ? '.' : resolveScalar(args[1]);
      const group = args[2] == null ? ',' : resolveScalar(args[2]);
      const error = firstErrorValue([value, decimal, group]);
      return error || numberValueFromText(value, decimal, group);
    }
    if (name === 'EXACT') return String(resolveScalar(args[0]) ?? '') === String(resolveScalar(args[1]) ?? '');
    if (name === 'CLEAN') {
      const value = resolveScalar(args[0]);
      return isErrorValue(value) ? value : cleanText(value);
    }
    if (name === 'REPT') {
      const text = resolveText(args[0]);
      const count = Math.trunc(toNumber(resolveScalar(args[1])));
      return count < 0 ? '#VALUE!' : text.repeat(Math.min(count, 32767));
    }
    if (name === 'REPLACE') {
      const text = resolveText(args[0]);
      const start = Math.trunc(toNumber(resolveScalar(args[1])));
      const length = Math.trunc(toNumber(resolveScalar(args[2])));
      if (start < 1 || length < 0) return '#VALUE!';
      const replacement = resolveText(args[3]);
      return `${text.slice(0, start - 1)}${replacement}${text.slice(start - 1 + length)}`;
    }
    if (name === 'FIND' || name === 'SEARCH') {
      const needle = resolveText(args[0]);
      const haystack = resolveText(args[1]);
      const startNum = resolveNumber(args[2] ?? 1);
      if (isErrorValue(startNum)) return startNum;
      const start = Math.trunc(startNum);
      if (start < 1 || start > haystack.length) return '#VALUE!';
      const index = name === 'SEARCH'
        ? haystack.toLowerCase().indexOf(needle.toLowerCase(), start - 1)
        : haystack.indexOf(needle, start - 1);
      return index >= 0 ? index + 1 : '#VALUE!';
    }
    if (name === 'SUBSTITUTE') {
      const text = resolveText(args[0]);
      const oldText = resolveText(args[1]);
      const newText = resolveText(args[2]);
      const instance = args[3] == null ? null : Math.trunc(toNumber(resolveScalar(args[3])));
      if (!oldText) return text;
      if (!instance) return text.split(oldText).join(newText);
      let seen = 0;
      return text.replace(new RegExp(oldText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), (match) => (++seen === instance ? newText : match));
    }
    if (name === 'FIXED') {
      const value = resolveNumber(args[0]);
      const decimals = args[1] == null ? 2 : resolveNumber(args[1]);
      const noCommas = args[2] == null ? false : resolveScalar(args[2]);
      const error = firstErrorValue([value, decimals, noCommas]);
      return error || formatFixedText(value, decimals, isFalseLike(noCommas));
    }
    if (name === 'DOLLAR') {
      const value = resolveNumber(args[0]);
      const decimals = args[1] == null ? 2 : resolveNumber(args[1]);
      const error = firstErrorValue([value, decimals]);
      return error || formatDollarText(value, decimals);
    }
    if (name === 'TEXT') {
      const value = resolveScalar(args[0]);
      const pattern = resolveScalar(args[1]);
      const error = firstErrorValue([value, pattern]);
      return error || textWithFormat(value, pattern);
    }
    if (name === 'TEXTBEFORE' || name === 'TEXTAFTER') {
      const text = resolveScalar(args[0]);
      const delimiter = resolveScalar(args[1]);
      const instance = args[2] == null ? 1 : resolveNumber(args[2]);
      const matchMode = args[3] == null ? 0 : resolveNumber(args[3]);
      const matchEndValue = args[4] == null ? false : resolveScalar(args[4]);
      const ifNotFound = args[5] == null ? undefined : resolveScalar(args[5]);
      const error = firstErrorValue([text, delimiter, instance, matchMode, matchEndValue, ifNotFound]);
      if (error) return error;
      if (![0, 1].includes(Math.trunc(matchMode))) return '#VALUE!';
      return textBeforeAfter(text, delimiter, instance, Math.trunc(matchMode), !isFalseLike(matchEndValue), ifNotFound, name === 'TEXTAFTER');
    }
    if (name === 'LET') {
      if (args.length < 3 || args.length % 2 === 0) return '#VALUE!';
      const variables = new Map(formulaVariables);
      const evaluateWithVariables = (text, nextVariables) => {
        const nestedStack = new Set(stack);
        if (originKey) nestedStack.delete(originKey);
        return evaluateFormula(`=${text}`, dataRef, origin || null, getDefaultCellValue, nestedStack, {...options, formulaVariables: nextVariables});
      };
      const referenceWithVariables = (text, nextVariables) => {
        const variableValue = nextVariables.get(String(text ?? '').trim().toUpperCase());
        if (isFormulaReferenceValue(variableValue)) return variableValue.reference;
        if (isErrorValue(variableValue)) return variableValue;
        return rangeReferenceForArg(text);
      };
      for (let index = 0; index < args.length - 1; index += 2) {
        const variableName = String(args[index] ?? '').trim();
        if (!isValidFormulaVariableName(variableName)) return '#NAME?';
        const reference = referenceWithVariables(args[index + 1], variables);
        variables.set(
          variableName.toUpperCase(),
          isErrorValue(reference) ? reference : reference ? formulaReferenceValue(reference) : evaluateWithVariables(args[index + 1], variables),
        );
      }
      return evaluateWithVariables(args[args.length - 1], variables);
    }
    if (name === 'IF') return evaluateCondition(args[0]) ? resolveScalar(args[1]) : resolveScalar(args[2]);
    if (name === 'IFS') {
      if (!args.length || args.length % 2 !== 0) return '#VALUE!';
      for (let index = 0; index < args.length; index += 2) {
        if (evaluateCondition(args[index])) return resolveScalar(args[index + 1]);
      }
      return '#N/A';
    }
    if (name === 'SWITCH') {
      if (args.length < 3) return '#VALUE!';
      const value = resolveScalar(args[0]);
      if (isErrorValue(value)) return value;
      const hasDefault = (args.length - 1) % 2 === 1;
      const pairLimit = hasDefault ? args.length - 1 : args.length;
      for (let index = 1; index < pairLimit; index += 2) {
        if (valuesEqual(value, resolveScalar(args[index]))) return resolveScalar(args[index + 1]);
      }
      return hasDefault ? resolveScalar(args[args.length - 1]) : '#N/A';
    }
    if (name === 'CHOOSE') {
      const index = resolveNumber(args[0]);
      if (isErrorValue(index)) return index;
      const choiceIndex = Math.trunc(index);
      return choiceIndex >= 1 && choiceIndex < args.length ? resolveScalar(args[choiceIndex]) : '#VALUE!';
    }
    if (name === 'IFERROR') {
      const value = resolveScalar(args[0]);
      return isErrorValue(value) ? resolveScalar(args[1]) : value;
    }
    if (name === 'IFNA') {
      const value = resolveScalar(args[0]);
      return value === '#N/A' ? resolveScalar(args[1]) : value;
    }
    if (name === 'TRUE') return true;
    if (name === 'FALSE') return false;
    if (name === 'AND') return args.every(evaluateCondition);
    if (name === 'OR') return args.some(evaluateCondition);
    if (name === 'XOR') {
      if (!args.length) return '#VALUE!';
      const values = args.map(resolveScalar);
      const error = firstErrorValue(values);
      if (error) return error;
      return values.filter((value) => {
        if (typeof value === 'boolean') return value;
        if (isNumericLike(value)) return toNumber(value) !== 0;
        return Boolean(value);
      }).length % 2 === 1;
    }
    if (name === 'NOT') return !evaluateCondition(args[0]);
    if (name === 'ISERROR') return isErrorValue(resolveScalar(args[0]));
    if (name === 'ISERR') {
      const value = resolveScalar(args[0]);
      return isErrorValue(value) && value !== '#N/A';
    }
    if (name === 'ISNA') return resolveScalar(args[0]) === '#N/A';
    if (name === 'ISBLANK') return resolveScalar(args[0]) === '';
    if (name === 'ISNUMBER') {
      const value = resolveScalar(args[0]);
      return typeof value === 'number' || isNumericLike(value);
    }
    if (name === 'ISTEXT') {
      const value = resolveScalar(args[0]);
      return typeof value === 'string' && !isErrorValue(value) && !isNumericLike(value);
    }
    if (name === 'ISLOGICAL') {
      const value = resolveScalar(args[0]);
      return typeof value === 'boolean';
    }
    if (name === 'ISNONTEXT') {
      const value = resolveScalar(args[0]);
      return typeof value !== 'string' || isErrorValue(value) || isNumericLike(value);
    }
    if (name === 'ISEVEN' || name === 'ISODD') {
      const value = resolveNumber(args[0]);
      if (isErrorValue(value)) return value;
      const odd = Math.abs(Math.trunc(value)) % 2 === 1;
      return name === 'ISODD' ? odd : !odd;
    }
    if (name === 'ISFORMULA') {
      const formulaText = formulaTextForReference(args[0]);
      return isErrorValue(formulaText) ? formulaText : formulaText !== '';
    }
    if (name === 'FORMULATEXT') {
      const formulaText = formulaTextForReference(args[0]);
      if (isErrorValue(formulaText)) return formulaText;
      return formulaText || '#N/A';
    }
    if (name === 'N') {
      const value = resolveScalar(args[0]);
      if (isErrorValue(value)) return value;
      if (typeof value === 'boolean') return value ? 1 : 0;
      return isNumericLike(value) ? toNumber(value) : 0;
    }
    if (name === 'T') {
      const value = resolveScalar(args[0]);
      if (isErrorValue(value)) return value;
      return typeof value === 'string' && !isNumericLike(value) ? value : '';
    }
    if (name === 'NA') return '#N/A';
    if (name === 'TYPE') {
      const value = resolveScalar(args[0]);
      if (isErrorValue(value)) return 16;
      if (typeof value === 'boolean') return 4;
      if (typeof value === 'number' || isNumericLike(value)) return 1;
      return 2;
    }
    if (name === 'ERROR.TYPE') {
      const value = resolveScalar(args[0]);
      return isErrorValue(value) ? ERROR_TYPE_CODES[value] || '#N/A' : '#N/A';
    }
    if (name === 'CONCAT') {
      const parts = [];
      for (const arg of args) {
        const rangeValues = rawValuesForRangeArg(arg);
        if (isErrorValue(rangeValues)) return rangeValues;
        if (rangeValues.length) parts.push(...rangeValues.map(String));
        else parts.push(resolveText(arg));
      }
      return parts.join('');
    }
    if (name === 'TEXTJOIN') {
      const delimiter = resolveText(args[0]);
      const ignoreEmpty = !isFalseLike(resolveScalar(args[1]));
      const parts = [];
      for (const arg of args.slice(2)) {
        const rangeValues = rawValuesForRangeArg(arg);
        if (isErrorValue(rangeValues)) return rangeValues;
        if (rangeValues.length) parts.push(...rangeValues.map(String));
        else parts.push(resolveText(arg));
      }
      return parts.filter((value) => !ignoreEmpty || value !== '').join(delimiter);
    }
    if (name === 'INDEX') {
      const matrix = matrixForRangeArg(args[0]);
      if (isErrorValue(matrix)) return matrix;
      if (!matrix.length) return '#VALUE!';
      let rowIndex = Math.trunc(toNumber(resolveScalar(args[1] ?? 1)));
      let colIndex = Math.trunc(toNumber(resolveScalar(args[2] ?? 1)));
      if (matrix.length === 1 && args[2] == null) {
        colIndex = rowIndex;
        rowIndex = 1;
      }
      if (rowIndex < 1 || colIndex < 1 || rowIndex > matrix.length || colIndex > (matrix[rowIndex - 1]?.length || 0)) return '#REF!';
      return matrix[rowIndex - 1][colIndex - 1];
    }
    if (name === 'MATCH') {
      const lookupValues = rawValuesForRangeArg(args[1]);
      if (isErrorValue(lookupValues)) return lookupValues;
      if (!lookupValues.length) return '#VALUE!';
      const rawMatchType = args[2] == null ? 1 : resolveNumber(args[2]);
      if (isErrorValue(rawMatchType)) return rawMatchType;
      const matchType = Math.trunc(rawMatchType);
      if (![-1, 0, 1].includes(matchType)) return '#VALUE!';
      const matchMode = matchType === 0 ? 0 : matchType < 0 ? 1 : -1;
      const index = findLookupIndex(lookupValues, resolveScalar(args[0]), matchMode);
      return index >= 0 ? index + 1 : '#N/A';
    }
    if (name === 'XMATCH') {
      const lookupValues = rawValuesForRangeArg(args[1]);
      if (isErrorValue(lookupValues)) return lookupValues;
      if (!lookupValues.length) return '#VALUE!';
      const matchMode = args[2] == null ? 0 : Math.trunc(toNumber(resolveScalar(args[2])));
      if (![-1, 0, 1, 2].includes(matchMode)) return '#VALUE!';
      const searchMode = Math.trunc(toNumber(resolveScalar(args[3] ?? 1)));
      if (![1, -1, 2, -2].includes(searchMode)) return '#VALUE!';
      const index = findLookupIndex(lookupValues, resolveScalar(args[0]), matchMode, searchMode < 0 ? -1 : 1);
      return index >= 0 ? index + 1 : '#N/A';
    }
    if (name === 'LOOKUP') {
      const lookupValues = rawValuesForRangeArg(args[1]);
      if (isErrorValue(lookupValues)) return lookupValues;
      if (!lookupValues.length) return '#VALUE!';
      const resultValues = args[2] == null ? lookupValues : rawValuesForRangeArg(args[2]);
      if (isErrorValue(resultValues)) return resultValues;
      if (!resultValues.length) return '#VALUE!';
      if (resultValues.length && resultValues.length !== lookupValues.length) return '#VALUE!';
      const index = findLookupIndex(lookupValues, resolveScalar(args[0]), -1);
      return index >= 0 && index < resultValues.length ? resultValues[index] : '#N/A';
    }
    if (name === 'VLOOKUP') {
      const matrix = matrixForRangeArg(args[1]);
      if (isErrorValue(matrix)) return matrix;
      if (!matrix.length) return '#VALUE!';
      const colIndex = Math.trunc(toNumber(resolveScalar(args[2])));
      if (colIndex < 1 || matrix.some((row) => colIndex > row.length)) return '#REF!';
      const rangeLookup = args[3] == null ? true : !isFalseLike(resolveScalar(args[3]));
      const rowIndex = findLookupIndex(matrix.map((row) => row[0]), resolveScalar(args[0]), rangeLookup ? -1 : 0);
      return rowIndex >= 0 ? matrix[rowIndex][colIndex - 1] : '#N/A';
    }
    if (name === 'HLOOKUP') {
      const matrix = matrixForRangeArg(args[1]);
      if (isErrorValue(matrix)) return matrix;
      if (!matrix.length) return '#VALUE!';
      const rowIndex = Math.trunc(toNumber(resolveScalar(args[2])));
      if (rowIndex < 1 || rowIndex > matrix.length) return '#REF!';
      const rangeLookup = args[3] == null ? true : !isFalseLike(resolveScalar(args[3]));
      const colIndex = findLookupIndex(matrix[0] || [], resolveScalar(args[0]), rangeLookup ? -1 : 0);
      return colIndex >= 0 ? matrix[rowIndex - 1][colIndex] : '#N/A';
    }
    if (name === 'XLOOKUP') {
      const lookupMatrix = matrixForRangeArg(args[1]);
      const returnMatrix = matrixForRangeArg(args[2]);
      const error = firstErrorValue([lookupMatrix, returnMatrix]);
      if (error) return error;
      const lookupValues = flattenFormulaArrayMatrix(lookupMatrix);
      const returnValues = flattenFormulaArrayMatrix(returnMatrix);
      if (!lookupValues.length || !returnValues.length) return '#VALUE!';
      if (lookupValues.length !== returnValues.length) return '#VALUE!';
      const ifNotFound = args[3] == null ? '#N/A' : resolveScalar(args[3]);
      const rawMatchMode = args[4] == null ? 0 : resolveNumber(args[4]);
      const rawSearchMode = args[5] == null ? 1 : resolveNumber(args[5]);
      const modeError = firstErrorValue([rawMatchMode, rawSearchMode]);
      if (modeError) return modeError;
      const matchMode = Math.trunc(rawMatchMode);
      const searchMode = Math.trunc(rawSearchMode);
      if (![-1, 0, 1, 2].includes(matchMode) || ![1, -1, 2, -2].includes(searchMode)) return '#VALUE!';
      const index = findLookupIndex(lookupValues, resolveScalar(args[0]), matchMode, searchMode < 0 ? -1 : 1);
      return index >= 0 ? returnValues[index] : ifNotFound;
    }
    return '#NAME?';
  }

  try {
    const comparison = findComparison(expr);
    if (comparison) return evaluateCondition(expr);
    const concatenated = evaluateTextConcatenation(expr);
    if (concatenated != null) return concatenated;
    const direct = resolveDirectExpression(expr);
    if (direct.matched) return direct.value;
    return evaluateArithmetic(expr);
  } catch {
    return '#ERROR!';
  } finally {
    if (originKey) stack.delete(originKey);
  }
}

export function displayCellValue(dataRef, row, col, getDefaultCellValue = defaultCellValue) {
  const value = readCell(dataRef, row, col, getDefaultCellValue);
  return typeof value === 'string' && value.trim().startsWith('=')
    ? formatFormulaResult(evaluateFormula(value, dataRef, {row, col}, getDefaultCellValue))
    : value;
}
