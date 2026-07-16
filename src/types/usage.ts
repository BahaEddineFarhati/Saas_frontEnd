export type UsageFeature = "chat" | "dashboard" | "parsing" | "scoring";

export interface LLMUsageLog {
  id: string;
  feature: UsageFeature;
  usageCount: number;
  createdAt: string;
}

export interface LLMUsageSummary {
  totalUsage: number;
  byFeature: Record<UsageFeature, number>;
}
