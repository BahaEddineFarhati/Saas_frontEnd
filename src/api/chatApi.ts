import { apiClient } from "./apiClient";
import type { ChatMessage } from "../types";

export type { ChatMessage } from "../types";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SendMessageResponse {
  message: ChatMessage;
  suggestions?: string[];
}

// ─── API functions ───────────────────────────────────────────────────────────

export async function fetchChatMessages(jobId: string): Promise<ChatMessage[]> {
  const res = await apiClient.get<{ messages: ChatMessage[] }>(
    `/jobs/${jobId}/chat/messages`
  );
  return res.data.messages;
}

export async function sendChatMessage(
  jobId: string,
  message: string,
  signal?: AbortSignal
): Promise<SendMessageResponse> {
  const res = await apiClient.post<any>(
    `/jobs/${jobId}/chat/message`,
    { message },
    { signal: signal as any }
  );
  return res.data;
}

export async function clearChatSession(jobId: string): Promise<void> {
  await apiClient.delete(`/jobs/${jobId}/chat/session`);
}

export async function fetchJobTitle(jobId: string): Promise<string> {
  const res = await apiClient.get<{ success: boolean; data: { title: string } }>(
    `/jobs/${jobId}`
  );
  return res.data.data.title;
}
