export type ChatRole = "USER" | "ASSISTANT";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  jobOpeningId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}
