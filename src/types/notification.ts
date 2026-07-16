export type NotificationType = "JOB_PARSING_COMPLETED" | "JOB_PARSING_FAILED";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  jobOpeningId: string;
  read: boolean;
  createdAt: string;
}
