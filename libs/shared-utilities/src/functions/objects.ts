// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function flattenObject(obj: any, prefix = '', result: any = {}) {
  if (!obj) {
    return result;
  }

  for (const key in obj) {
    const value = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      flattenObject(value, newKey, result);
    } else {
      result[newKey] = value;
    }
  }

  return result;
}
