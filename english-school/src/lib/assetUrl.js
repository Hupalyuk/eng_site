export function resolveAssetUrl(url, apiBase = "", fallback = "") {
  if (!url) return fallback;

  const value = String(url);
  if (/^(https?:|data:|blob:)/i.test(value)) {
    return value;
  }

  const base = String(apiBase || "").replace(/\/+$/, "");
  const path = value.startsWith("/") ? value : `/${value}`;
  return `${base}${path}`;
}
