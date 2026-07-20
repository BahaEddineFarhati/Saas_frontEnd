import { apiClient } from "./apiClient";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UsageSummary {
  organisation: { id: string; name: string; slug: string };
  month: number;
  year: number;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  cvParsingTokens: number;
  cvScoringTokens: number;
  cvEnrichmentTokens: number;
  chatTokens: number;
  callCount: number;
}

export interface UsageSummaryResponse {
  data: UsageSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UsageDetailSummary {
  month: number;
  year: number;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  cvParsingTokens: number;
  cvScoringTokens: number;
  cvEnrichmentTokens: number;
  chatTokens: number;
  callCount: number;
}

export interface UsageLogEntry {
  id: string;
  feature: string;
  provider: string;
  model: string;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  createdAt: string;
}

export interface UsageDetailResponse {
  organisation: { id: string; name: string; slug: string };
  summary: UsageDetailSummary | null;
  topLogs: UsageLogEntry[];
}

export interface UsageHistoryPoint {
  month: number;
  year: number;
  totalTokens: number;
  callCount: number;
  cvParsingTokens: number;
  cvScoringTokens: number;
  cvEnrichmentTokens: number;
  chatTokens: number;
}

export interface UsageHistoryResponse {
  organisation: { id: string; name: string; slug: string };
  history: UsageHistoryPoint[];
}

export interface OwnUsageResponse {
  success: boolean;
  data: {
    summary: UsageDetailSummary | null;
  };
}

export interface OwnUsageHistoryResponse {
  success: boolean;
  data: {
    organisation: { id: string; name: string; slug: string };
    history: UsageHistoryPoint[];
  };
}

// ─── Super Admin endpoints ───────────────────────────────────────────────────

export async function fetchUsageSummaries(params: {
  month?: number;
  year?: number;
  organisationId?: string;
  page?: number;
  limit?: number;
}): Promise<UsageSummaryResponse> {
  const query = new URLSearchParams();
  if (params.month) query.set("month", String(params.month));
  if (params.year) query.set("year", String(params.year));
  if (params.organisationId) query.set("organisationId", params.organisationId);
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));

  const res = await apiClient.get<UsageSummaryResponse>(
    `/v1/admin/usage?${query.toString()}`
  );
  return res.data;
}

export async function fetchUsageDetail(
  organisationId: string,
  year: number,
  month: number
): Promise<UsageDetailResponse> {
  const res = await apiClient.get<UsageDetailResponse>(
    `/v1/admin/usage/${organisationId}/${year}/${month}`
  );
  return res.data;
}

export async function fetchUsageHistory(
  organisationId: string
): Promise<UsageHistoryResponse> {
  const res = await apiClient.get<UsageHistoryResponse>(
    `/v1/admin/usage/${organisationId}/history`
  );
  return res.data;
}

// ─── Regular Admin endpoint (own org only) ───────────────────────────────────

export async function fetchOwnOrgUsage(): Promise<UsageDetailSummary | null> {
  const res = await apiClient.get<OwnUsageResponse>("/v1/organisation/usage");
  return res.data.data.summary;
}

export async function fetchOwnOrgUsageHistory(): Promise<UsageHistoryPoint[]> {
  const res = await apiClient.get<OwnUsageHistoryResponse>("/v1/organisation/usage/history");
  return res.data.data.history;
}

