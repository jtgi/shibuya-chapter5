import NodeCache from "node-cache";
export const cache = new NodeCache({
  stdTTL: process.env.NODE_ENV !== "production" ? 30 : 60,
});

export async function getOrSet<T>(
  key: string,
  getter: () => Promise<T>,
  ttl = 0
) {
  const value = cache.get<T>(key);
  if (value) {
    return value;
  }

  const newValue = await getter();
  cache.set(key, newValue, ttl);
  return newValue;
}
