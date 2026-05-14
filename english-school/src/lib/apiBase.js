export function getApiBase() {
  const configured = import.meta.env.VITE_API_BASE;
  if (configured && configured.trim()) {
    return configured.trim().replace(/\/+$/, "");
  }

  if (import.meta.env.DEV) {
    return "http://localhost:4000";
  }

  return "";
}

