export type EmailIngestionStatus = "PROCESSED" | "PARTIAL" | "REJECTED" | "JOB_NOT_FOUND" | "SPAM";

export interface EmailIngestionLog {
  id: string;
  jobOpeningId?: string | null;
  senderEmail: string;
  subject?: string | null;
  recipientEmail: string;
  attachmentCount: number;
  processedCount: number;
  rejectedCount: number;
  spamScore?: number | null;
  status: EmailIngestionStatus;
  errorMessage?: string | null;
  createdAt: string;
}
