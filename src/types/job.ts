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
