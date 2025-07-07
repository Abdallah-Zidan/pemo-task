import { isObject } from './is-object';

export function hasProperty<T extends object, K extends string>(
  obj: unknown,
  key: K,
): obj is T & Record<K, unknown> {
  return isObject(obj) && key in obj;
}
