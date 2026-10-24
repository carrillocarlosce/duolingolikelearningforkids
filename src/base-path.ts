/** Project-site prefix. Keep identical to /base-path.mjs */
export const BASE_PATH = "/duolingolikelearningforkids";

export function withBasePath(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (!BASE_PATH) return normalized;
  if (normalized === "/") return `${BASE_PATH}/`;
  return `${BASE_PATH}${normalized}`;
}
