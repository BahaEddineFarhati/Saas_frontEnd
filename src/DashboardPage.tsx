import { useOutletContext } from "react-router-dom";
import {
  FileText,
  Clock,
  Briefcase,
  CalendarCheck,
  Upload,
  Settings,
  ArrowRight,
  Star,
  ExternalLink,
} from "lucide-react";
import {
  ACTIVE_JOB_OPENINGS,
  RECENT_ACTIVITY,
  FUNNEL_DATA,
  TOP_CANDIDATES,
  TOTAL_CVS_THIS_MONTH,
  AVG_MANUAL_SCREENING_MINUTES,
  type JobOpening,
  type ActivityItem,
  type TopCandidate,
} from "./mockData";

interface User { fullName: string; email: string; firstName: string; }
interface OutletCtx { user: User; }

// ── derived KPIs ──────────────────────────────────────────────────────────
const totalShortlisted = ACTIVE_JOB_OPENINGS.reduce((s, j) => s + j.shortlisted, 0);
const timeSavedHours   = Math.round((TOTAL_CVS_THIS_MONTH * AVG_MANUAL_SCREENING_MINUTES) / 60);

// ── helpers ───────────────────────────────────────────────────────────────
const stageColors: Record<JobOpening["stage"], string> = {
  Uploading:   "badge--gray",
  Screening:   "badge--blue",
  Shortlisted: "badge--purple",
  Interview:   "badge--amber",
  Offer:       "badge--green",
};

const activityIconMap: Record<ActivityItem["type"], React.ReactNode> = {
  upload:    <Upload   size={14} strokeWidth={1.8} />,
  screening: <Settings size={14} strokeWidth={1.8} />,
  move:      <ArrowRight size={14} strokeWidth={1.8} />,
  offer:     <Star    size={14} strokeWidth={1.8} />,
};

const activityColors: Record<ActivityItem["type"], string> = {
  upload:    "act-icon--blue",
  screening: "act-icon--purple",
  move:      "act-icon--amber",
  offer:     "act-icon--green",
};

const statusColors: Record<TopCandidate["status"], string> = {
  Screening:   "badge--blue",
  Shortlisted: "badge--purple",
  Interview:   "badge--amber",
  Offer:       "badge--green",
};

function initials(name: string) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

const funnelMax = FUNNEL_DATA[0].count;

// ── KPI config ────────────────────────────────────────────────────────────
const kpis = [
  {
    label: "CVs analysed this month",
    value: TOTAL_CVS_THIS_MONTH.toLocaleString(),
    note: "Across all openings",
    icon: <FileText size={20} strokeWidth={1.6} />,
    colorClass: "kpi-icon--blue",
  },
  {
    label: "Avg. time saved per opening",
    value: `${timeSavedHours} h`,
    note: `${TOTAL_CVS_THIS_MONTH} CVs × ${AVG_MANUAL_SCREENING_MINUTES} min manual`,
    icon: <Clock size={20} strokeWidth={1.6} />,
    colorClass: "kpi-icon--green",
  },
  {
    label: "Active job openings",
    value: ACTIVE_JOB_OPENINGS.length.toString(),
    note: "Currently accepting CVs",
    icon: <Briefcase size={20} strokeWidth={1.6} />,
    colorClass: "kpi-icon--purple",
  },
  {
    label: "Awaiting interview",
    value: totalShortlisted.toString(),
    note: "Shortlisted across all openings",
    icon: <CalendarCheck size={20} strokeWidth={1.6} />,
    colorClass: "kpi-icon--amber",
  },
];

// ── component ─────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useOutletContext<OutletCtx>();

  return (
    <div className="db-root">

      {/* welcome */}
      <div className="db-welcome">
        <h2 className="db-welcome-heading">
          Good morning, <span className="db-accent">{user.firstName}</span>
        </h2>
        <p className="db-welcome-sub">Here's what's happening across your hiring pipeline today.</p>
      </div>

      {/* ── KPI row ── */}
      <div className="db-kpi-grid">
        {kpis.map(({ label, value, note, icon, colorClass }) => (
          <div key={label} className="db-kpi-card">
            <span className={`db-kpi-icon ${colorClass}`} aria-hidden="true">{icon}</span>
            <p className="db-kpi-label">{label}</p>
            <p className="db-kpi-value">{value}</p>
            <p className="db-kpi-note">{note}</p>
          </div>
        ))}
      </div>

      {/* ── mid: table + activity ── */}
      <div className="db-mid-grid">

        {/* active job openings table */}
        <div className="db-card">
          <h3 className="db-card-title">Active job openings</h3>
          <div className="db-table-wrap">
            <table className="db-table">
              <thead>
                <tr>
                  <th>Job title</th>
                  <th className="db-th-num">CVs</th>
                  <th className="db-th-num">Shortlisted</th>
                  <th>Stage</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {ACTIVE_JOB_OPENINGS.map((job) => (
                  <tr key={job.id}>
                    <td>
                      <p className="db-job-title">{job.title}</p>
                      <p className="db-job-dept">{job.department}</p>
                    </td>
                    <td className="db-td-num">{job.cvsUploaded}</td>
                    <td className="db-td-num">{job.shortlisted}</td>
                    <td>
                      <span className={`db-badge ${stageColors[job.stage]}`}>
                        {job.stage}
                      </span>
                    </td>
                    <td className="db-td-link">
                      <a href={`/openings/${job.id}`} className="db-open-link" aria-label={`Open ${job.title}`}>
                        <ExternalLink size={13} strokeWidth={2} />
                        Open
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* recent activity feed */}
        <div className="db-card">
          <h3 className="db-card-title">Recent activity</h3>
          <ul className="db-activity">
            {RECENT_ACTIVITY.map((item) => (
              <li key={item.id} className="db-activity-item">
                <span className={`db-act-icon ${activityColors[item.type]}`} aria-hidden="true">
                  {activityIconMap[item.type]}
                </span>
                <div className="db-act-body">
                  <p className="db-act-text">
                    <strong>{item.actor}</strong> {item.action}{" "}
                    <span className="db-act-target">{item.target}</span>
                  </p>
                  <p className="db-act-time">{item.timestamp}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── bottom: funnel + top candidates ── */}
      <div className="db-bottom-grid">

        {/* hiring funnel */}
        <div className="db-card">
          <h3 className="db-card-title">Hiring funnel</h3>
          <p className="db-card-sub">Aggregated across all active openings</p>
          <div className="db-funnel">
            {FUNNEL_DATA.map(({ label, count }, i) => {
              const pct = Math.round((count / funnelMax) * 100);
              const dropPct = i > 0
                ? Math.round(((FUNNEL_DATA[i - 1].count - count) / FUNNEL_DATA[i - 1].count) * 100)
                : null;
              return (
                <div key={label} className="db-funnel-row">
                  <div className="db-funnel-meta">
                    <span className="db-funnel-label">{label}</span>
                    <span className="db-funnel-count">{count.toLocaleString()}</span>
                  </div>
                  <div className="db-funnel-track">
                    <div className="db-funnel-bar" style={{ width: `${pct}%` }} />
                  </div>
                  {dropPct !== null && (
                    <span className="db-funnel-drop">−{dropPct}% drop-off</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* top candidates */}
        <div className="db-card">
          <h3 className="db-card-title">Top candidates</h3>
          <p className="db-card-sub">Highest-scored across all openings</p>
          <ul className="db-candidates">
            {TOP_CANDIDATES.map((c, i) => (
              <li key={c.id} className="db-candidate-row">
                <span className="db-rank">#{i + 1}</span>
                <div className="db-cand-avatar">{initials(c.name)}</div>
                <div className="db-cand-body">
                  <p className="db-cand-name">{c.name}</p>
                  <p className="db-cand-pos">{c.position}</p>
                </div>
                <div className="db-cand-right">
                  <span className="db-score">{c.score}</span>
                  <span className={`db-badge ${statusColors[c.status]}`}>{c.status}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
