export type CandidateStatus = "PENDING" | "NEW" | "SHORTLISTED" | "REJECTED" | "OFFERED" | "SCORED" | "FAILED";

export interface Candidate {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  rawFileUrl?: string;
  parsedJson?: Record<string, unknown> | null;
  score?: number | null;
  scoreExplanation?: Record<string, unknown> | null;
  summary?: string | null;
  interviewQuestions?: Array<Record<string, unknown>> | null;
  status?: CandidateStatus;
  jobOpeningId?: string;
  createdAt?: string;
  updatedAt?: string;
  parsedName?: string;
  fileName?: string;
  verdict?: "STRONG_FIT" | "GOOD_FIT" | "PARTIAL_FIT" | "WEAK_FIT";
}

export interface ParsedCV {
  summary?: string;
  skills?: string[];
  experience?: WorkExperience[];
  education?: Education[];
  languages?: Language[];
  score?: number;
}

export interface WorkExperience {
  company?: string;
  role?: string;
  duration?: string;
  description?: string;
}

export interface Education {
  school?: string;
  degree?: string;
  field?: string;
  year?: string;
}

export interface Language {
  name?: string;
  level?: string;
}

export interface ScoreExplanation {
  score?: number;
  explanation?: string;
}

export interface InterviewQuestion {
  question: string;
  answer?: string;
}
