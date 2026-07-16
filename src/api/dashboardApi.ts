import { apiClient } from "./apiClient";
import type { DashboardStats, RecentActivity, ChartDataPoint, FunnelStage } from "../types";

export type { DashboardStats, RecentActivity, ChartDataPoint, FunnelStage } from "../types";

// ─── Response types ──────────────────────────────────────────────────────────
export interface DashboardStatsResponse extends DashboardStats {
  totalJobOpenings: number;
  totalCandidatesUploaded: number;
  candidatesUploadedThisMonth: number;
  candidatesPendingParsing: number;
  candidatesParsedSuccessfully: number;
  candidatesFailedParsing: number;
  teamMembersCount: number;
}

export interface RecentJobOpening {
  id: string;
  title: string;
  status: "OPEN" | "CLOSED" | "ARCHIVED";
  candidateCount: number;
  parsedCount: number;
  updatedAt: string;
}

export interface ActivityEvent extends RecentActivity {}

export interface TimeSeriesPoint extends ChartDataPoint {}

export interface ParsingStatusPoint {
  status: "PENDING" | "SCORED" | "FAILED";
  count: number;
}

export type TimeRange = "7d" | "30d" | "90d";

// ─── API functions ───────────────────────────────────────────────────────────

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const res = await apiClient.get<{ success: boolean; data: DashboardStats }>(
    "/dashboard/stats"
  );
  return res.data.data;
}

export async function fetchRecentJobOpenings(): Promise<RecentJobOpening[]> {
  const res = await apiClient.get<{ success: boolean; data: RecentJobOpening[] }>(
    "/dashboard/recent-job-openings"
  );
  return res.data.data;
}

export async function fetchRecentActivity(): Promise<ActivityEvent[]> {
  const res = await apiClient.get<{ success: boolean; data: ActivityEvent[] }>(
    "/dashboard/recent-activity"
  );
  return res.data.data;
}

export async function fetchCandidatesOverTime(
  range: TimeRange = "30d"
): Promise<TimeSeriesPoint[]> {
  const res = await apiClient.get<{ success: boolean; data: TimeSeriesPoint[] }>(
    `/dashboard/charts/candidates-over-time?range=${range}`
  );
  return res.data.data;
}

export async function fetchParsingStatus(): Promise<ParsingStatusPoint[]> {
  const res = await apiClient.get<{
    success: boolean;
    data: ParsingStatusPoint[];
  }>('/dashboard/charts/parsing-status');
  return res.data.data;
}

export async function fetchOpeningsFunnel(): Promise<FunnelStage[]> {
  const res = await apiClient.get<{ success: boolean; data: FunnelStage[] }>(
    "/dashboard/charts/openings-funnel"
  );
  return res.data.data;
}
