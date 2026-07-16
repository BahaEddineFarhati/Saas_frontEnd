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

export interface RecentActivity {
  type: string;
  message: string;
  jobOpeningId: string;
  jobOpeningTitle: string;
  timestamp: string;
  timeAgo: string;
}

export interface ChartDataPoint {
  date: string;
  count: number;
}

export interface FunnelStage {
  stage: string;
  count: number;
}
