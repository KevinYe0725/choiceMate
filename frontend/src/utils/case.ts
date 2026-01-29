const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Object.prototype.toString.call(value) === '[object Object]';

const toSnake = (key: string) =>
  key
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/\s+/g, '_')
    .toLowerCase();

const toCamel = (key: string) =>
  key.replace(/_([a-z0-9])/g, (_, letter) => String(letter).toUpperCase());

export const toSnakeCase = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value.map((item) => toSnakeCase(item)) as T;
  }
  if (isPlainObject(value)) {
    const result: Record<string, unknown> = {};
    Object.entries(value).forEach(([key, val]) => {
      result[toSnake(key)] = toSnakeCase(val);
    });
    return result as T;
  }
  return value;
};

export const toCamelCase = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value.map((item) => toCamelCase(item)) as T;
  }
  if (isPlainObject(value)) {
    const result: Record<string, unknown> = {};
    Object.entries(value).forEach(([key, val]) => {
      result[toCamel(key)] = toCamelCase(val);
    });
    return result as T;
  }
  return value;
};
