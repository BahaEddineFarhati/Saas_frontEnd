// ── mockData.ts ───────────────────────────────────────────────────────────
// Replace this with real API calls when the backend is ready.

export interface JobOpening {
  id: string;
  title: string;
  department: string;
  cvsUploaded: number;
  shortlisted: number;
  stage: "Uploading" | "Screening" | "Shortlisted" | "Interview" | "Offer";
  lastActiveAt: string; // ISO date string
}

export interface ActivityItem {
  id: string;
  actor: string;
  action: string;
  target: string;
  timestamp: string; // human-readable relative
  type: "upload" | "screening" | "move" | "offer";
}

export interface FunnelStage {
  label: string;
  count: number;
}

export interface TopCandidate {
  id: string;
  name: string;
  score: number; // 0-100
  position: string;
  status: "Shortlisted" | "Interview" | "Offer" | "Screening";
}

// ── KPI source data ───────────────────────────────────────────────────────
export const AVG_MANUAL_SCREENING_MINUTES = 12; // minutes per CV manually

export const TOTAL_CVS_THIS_MONTH = 312;

export const ACTIVE_JOB_OPENINGS: JobOpening[] = [
  {
    id: "job-1",
    title: "Senior Frontend Developer",
    department: "Engineering",
    cvsUploaded: 87,
    shortlisted: 14,
    stage: "Interview",
    lastActiveAt: "2024-06-15T10:30:00Z",
  },
  {
    id: "job-2",
    title: "Marketing Manager",
    department: "Marketing",
    cvsUploaded: 63,
    shortlisted: 8,
    stage: "Shortlisted",
    lastActiveAt: "2024-06-15T08:12:00Z",
  },
  {
    id: "job-3",
    title: "Product Designer",
    department: "Design",
    cvsUploaded: 45,
    shortlisted: 11,
    stage: "Screening",
    lastActiveAt: "2024-06-14T17:45:00Z",
  },
  {
    id: "job-4",
    title: "Data Engineer",
    department: "Engineering",
    cvsUploaded: 72,
    shortlisted: 9,
    stage: "Interview",
    lastActiveAt: "2024-06-14T14:00:00Z",
  },
  {
    id: "job-5",
    title: "Head of Sales",
    department: "Sales",
    cvsUploaded: 31,
    shortlisted: 5,
    stage: "Offer",
    lastActiveAt: "2024-06-13T11:20:00Z",
  },
  {
    id: "job-6",
    title: "DevOps Engineer",
    department: "Engineering",
    cvsUploaded: 14,
    shortlisted: 0,
    stage: "Uploading",
    lastActiveAt: "2024-06-13T09:05:00Z",
  },
];

export const RECENT_ACTIVITY: ActivityItem[] = [
  {
    id: "a-1",
    actor: "Ahmed",
    action: "uploaded 45 CVs to",
    target: "Senior Frontend Developer",
    timestamp: "2 min ago",
    type: "upload",
  },
  {
    id: "a-2",
    actor: "System",
    action: "Screening completed for",
    target: "Marketing Manager — 8 candidates shortlisted",
    timestamp: "34 min ago",
    type: "screening",
  },
  {
    id: "a-3",
    actor: "Sara",
    action: "moved Khalil Mansouri to Interview stage in",
    target: "Data Engineer",
    timestamp: "1 h ago",
    type: "move",
  },
  {
    id: "a-4",
    actor: "System",
    action: "Screening completed for",
    target: "Product Designer — 11 candidates shortlisted",
    timestamp: "3 h ago",
    type: "screening",
  },
  {
    id: "a-5",
    actor: "Ahmed",
    action: "uploaded 31 CVs to",
    target: "Head of Sales",
    timestamp: "Yesterday",
    type: "upload",
  },
  {
    id: "a-6",
    actor: "Sara",
    action: "sent an offer to Ines Bouali in",
    target: "Head of Sales",
    timestamp: "Yesterday",
    type: "offer",
  },
  {
    id: "a-7",
    actor: "Ahmed",
    action: "uploaded 14 CVs to",
    target: "DevOps Engineer",
    timestamp: "2 days ago",
    type: "upload",
  },
];

export const FUNNEL_DATA: FunnelStage[] = [
  { label: "CVs uploaded",  count: 312 },
  { label: "Screened",      count: 289 },
  { label: "Shortlisted",   count: 47  },
  { label: "Interview",     count: 23  },
  { label: "Offer",         count: 5   },
];

export const TOP_CANDIDATES: TopCandidate[] = [
  { id: "c-1", name: "Khalil Mansouri",  score: 94, position: "Data Engineer",            status: "Interview"   },
  { id: "c-2", name: "Ines Bouali",      score: 91, position: "Head of Sales",             status: "Offer"       },
  { id: "c-3", name: "Rania Tounsi",     score: 89, position: "Senior Frontend Developer", status: "Interview"   },
  { id: "c-4", name: "Omar Hamdi",       score: 87, position: "Product Designer",          status: "Shortlisted" },
  { id: "c-5", name: "Yasmine Ferhat",   score: 85, position: "Marketing Manager",         status: "Shortlisted" },
  { id: "c-6", name: "Sami Belhaj",      score: 83, position: "Senior Frontend Developer", status: "Shortlisted" },
];
