import { DEFAULT_SCHEMA, Type } from 'js-yaml';

// gray-matter used js-yaml 3's YAML 1.1 numeric resolution. Keep those
// scalar rules on the safe js-yaml 4 schema: upgrading the parser must not
// turn identifiers such as 018 into numbers or reinterpret octal values.
const INTEGER =
  /^[-+]?(?:0|0b[01_]*[01]|0x[\da-fA-F_]*[\da-fA-F]|0[0-7_]*[0-7]|[1-9](?:[\d_]*\d)?|[1-9][\d_]*(?::[0-5]?\d)+)$/;
const FLOAT =
  /^(?:[-+]?(?:0|[1-9][\d_]*)(?:\.[\d_]*)?(?:[eE][-+]?\d+)?|\.[\d_]+(?:[eE][-+]?\d+)?|[-+]?\d[\d_]*(?::[0-5]?\d)+\.[\d_]*|[-+]?\.(?:inf|Inf|INF)|\.(?:nan|NaN|NAN))$/;

function numericValue(input: string, integer: boolean): number {
  const text = input.replace(/_/g, '').toLowerCase();
  const sign = text.startsWith('-') ? -1 : 1;
  const value = text.replace(/^[-+]/, '');
  if (value === '.inf') return sign * Infinity;
  if (value === '.nan') return NaN;
  if (value.includes(':')) {
    return sign * value.split(':').reduce((total, digit) => total * 60 + Number(digit), 0);
  }
  if (integer) {
    if (value === '0') return 0;
    if (value.startsWith('0b')) return sign * parseInt(value.slice(2), 2);
    if (value.startsWith('0x')) return sign * parseInt(value.slice(2), 16);
    if (value.startsWith('0')) return sign * parseInt(value, 8);
  }
  return sign * Number(value);
}

const integer = new Type('tag:yaml.org,2002:int', {
  kind: 'scalar',
  resolve: (value: string | null) =>
    value !== null && INTEGER.test(value) && Number.isFinite(numericValue(value, true)),
  construct: (value: string) => numericValue(value, true),
  predicate: value => typeof value === 'number' && Number.isInteger(value) && !Object.is(value, -0),
  represent: value => String(value)
});

const float = new Type('tag:yaml.org,2002:float', {
  kind: 'scalar',
  resolve: (value: string | null) =>
    value !== null &&
    !value.endsWith('_') &&
    FLOAT.test(value) &&
    (Number.isFinite(numericValue(value, false)) || /^[-+]?\.(?:inf|nan)$/i.test(value)),
  construct: (value: string) => numericValue(value, false),
  predicate: value =>
    typeof value === 'number' && (!Number.isInteger(value) || Object.is(value, -0)),
  represent: (value: unknown) => {
    if (Number.isNaN(value)) return '.nan';
    if (value === Infinity) return '.inf';
    if (value === -Infinity) return '-.inf';
    if (Object.is(value, -0)) return '-0.0';
    return String(value).replace(/^([-+]?\d+)e/, '$1.e');
  }
});

// Reuse this schema when dumping too, so strings such as "1:20" are quoted
// and cannot become numbers when the saved page is read again. No JS tags
// or evaluation support are added to DEFAULT_SCHEMA.
export const frontmatterSchema = DEFAULT_SCHEMA.extend({ implicit: [integer, float] });
