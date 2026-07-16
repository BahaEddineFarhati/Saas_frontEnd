export type ActivityType = "job_created" | "cvs_uploaded" | "job_closed";

export interface ActivityLog {
  type: ActivityType;
  message: string;
  jobOpeningId?: string;
  jobOpeningTitle?: string;
  timestamp?: string;
  timeAgo?: string;
}
