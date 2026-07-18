export type JobStatus = "OPEN" | "CLOSED" | "ARCHIVED";

export type ScoringStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";

export interface JobOpening {
  id: string;
  title: string;
  profileDescription?: string;
  status?: JobStatus;
  organisationId?: string;
  createdById?: string;
  createdAt?: string;
  updatedAt?: string;
  inboundEmail?: string | null;
  inboundEmailCode?: string | null;
  candidateCount?: number;
}

export interface JobDetail extends JobOpening {
  profileDescription: string;
  creatorName?: string;
}

export interface ScoringStatusSummary {
  totalCandidates: number;
  parsedCount: number;
  scoredCount: number;
  failedCount: number;
  scoringStatus: ScoringStatus;
}

export interface FileValidationError {
  fileName: string;
  reason: string;
}

export interface SelectedFile {
  file: File;
  id: string;
}

export interface CurrentUser {
  userId: string;
  role: string;
  organisationId: string;
}
