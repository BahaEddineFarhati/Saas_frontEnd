import { apiClient } from "./apiClient";

// ─── Response types ──────────────────────────────────────────────────────────

export interface DashboardStats {
  activeJobOpenings: number;
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

export interface ActivityEvent {
  type: "job_created" | "cvs_uploaded" | "job_closed";
  message: string;
  jobOpeningId: string;
  jobOpeningTitle: string;
  timestamp: string;
  timeAgo: string;
}

export interface TimeSeriesPoint {
  date: string;  // "YYYY-MM-DD"
  count: number;
}

export interface ParsingStatusPoint {
  status: "PENDING" | "SCORED" | "FAILED";
  count: number;
}

export interface FunnelStage {
  stage: string;
  count: number;
}

export type TimeRange = "7d" | "30d" | "90d";

// ─── API functions ───────────────────────────────────────────────────────────

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const res = await apiClient.get<{ success: boolean; data: DashboardStats }>(
    "/v1/dashboard/stats"
  );
  return res.data.data;
}

export async function fetchRecentJobOpenings(): Promise<RecentJobOpening[]> {
  const res = await apiClient.get<{ success: boolean; data: RecentJobOpening[] }>(
    "/v1/dashboard/recent-job-openings"
  );
  return res.data.data;
}

export async function fetchRecentActivity(): Promise<ActivityEvent[]> {
  const res = await apiClient.get<{ success: boolean; data: ActivityEvent[] }>(
    "/v1/dashboard/recent-activity"
  );
  return res.data.data;
}

export async function fetchCandidatesOverTime(
  range: TimeRange = "30d"
): Promise<TimeSeriesPoint[]> {
  const res = await apiClient.get<{ success: boolean; data: TimeSeriesPoint[] }>(
    `/v1/dashboard/charts/candidates-over-time?range=${range}`
  );
  return res.data.data;
}

export async function fetchParsingStatus(): Promise<ParsingStatusPoint[]> {
  const res = await apiClient.get<{
    success: boolean;
    data: ParsingStatusPoint[];
  }>("/v1/dashboard/charts/parsing-status");
  return res.data.data;
}

export async function fetchOpeningsFunnel(): Promise<FunnelStage[]> {
  const res = await apiClient.get<{ success: boolean; data: FunnelStage[] }>(
    "/v1/dashboard/charts/openings-funnel"
  );
  return res.data.data;
}
