export function parsePersistedChoice<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  fallback: T
): T {
  return value !== undefined && allowed.includes(value as T) ? (value as T) : fallback;
}
