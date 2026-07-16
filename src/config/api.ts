const fallbackBaseUrl = "http://localhost:3001/api/v1";

function normalizeApiBaseUrl(rawBaseUrl: string): string {
  const cleanedBaseUrl = rawBaseUrl.replace(/\/+$/, "");

  if (cleanedBaseUrl.endsWith("/api/v1")) {
    return cleanedBaseUrl;
  }

  if (cleanedBaseUrl.endsWith("/api")) {
    return `${cleanedBaseUrl}/v1`;
  }

  if (cleanedBaseUrl.endsWith("/v1")) {
    return cleanedBaseUrl;
  }

  return `${cleanedBaseUrl}/api/v1`;
}

export const API_BASE_URL = normalizeApiBaseUrl(
  import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    fallbackBaseUrl
);

export function getApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}
