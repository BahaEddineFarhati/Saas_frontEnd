import { apiClient } from "./apiClient";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  createdAt: string;
}

export interface SendMessageResponse {
  message: ChatMessage;
  suggestions?: string[];
}

// ─── API functions ───────────────────────────────────────────────────────────

export async function fetchChatMessages(jobId: string): Promise<ChatMessage[]> {
  const res = await apiClient.get<{ messages: ChatMessage[] }>(
    `/v1/jobs/${jobId}/chat/messages`
  );
  return res.data.messages;
}

export async function sendChatMessage(
  jobId: string,
  message: string,
  signal?: AbortSignal
): Promise<SendMessageResponse> {
  const res = await apiClient.post<any>(
    `/v1/jobs/${jobId}/chat/message`,
    { message },
    { signal: signal as any }
  );
  return res.data;
}

export async function clearChatSession(jobId: string): Promise<void> {
  await apiClient.delete(`/v1/jobs/${jobId}/chat/session`);
}

export async function fetchJobTitle(jobId: string): Promise<string> {
  const res = await apiClient.get<{ success: boolean; data: { title: string } }>(
    `/v1/jobs/${jobId}`
  );
  return res.data.data.title;
}
