import { memo, useMemo, useState, type ReactNode, type CSSProperties } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LabelList,
} from "recharts";
import {
  Briefcase,
  Upload,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  ExternalLink,
  CalendarDays,
  TrendingUp,
  PieChart as PieIcon,
  Activity,
  ChevronRight,
  Zap,
} from "lucide-react";
import {
  fetchDashboardStats,
  fetchRecentJobOpenings,
  fetchRecentActivity,
  fetchCandidatesOverTime,
  fetchParsingStatus,
  fetchOpeningsFunnel,
  type TimeRange,
  type TimeSeriesPoint,
  type RecentJobOpening,
  type ActivityEvent,
  type ParsingStatusPoint,
  type FunnelStage,
} from "../api/dashboardApi";
import "./dashboard.css";
import { useTranslation } from "../i18n/I18nContext";

// ── Types ──────────────────────────────────────────────────────────────────

interface User { fullName: string; email: string; firstName: string; role?: string; }
interface OutletCtx { user: User; }

// ── Constants ─────────────────────────────────────────────────────────────

// RANGE_OPTIONS labels are now resolved via t() at render time
const RANGE_VALUES: TimeRange[] = ["7d", "30d", "90d"];

const DONUT_COLORS: Record<string, string> = {
  PENDING: "#F59E0B",
  SCORED:  "#22C55E",
  FAILED:  "#EF4444",
};

// DONUT_LABELS are now resolved via t() at render time

const STATUS_BADGE: Record<string, string> = {
  OPEN:     "badge--green",
  CLOSED:   "badge--gray",
  ARCHIVED: "badge--gray",
};

// STATUS_LABEL resolved via t() at render time

const ACTIVITY_ICONS: Record<string, ReactNode> = {
  job_created:  <Briefcase   size={14} strokeWidth={1.8} />,
  cvs_uploaded: <Upload      size={14} strokeWidth={1.8} />,
  job_closed:   <CheckCircle2 size={14} strokeWidth={1.8} />,
};

const ACTIVITY_COLORS: Record<string, string> = {
  job_created:  "act-icon--blue",
  cvs_uploaded: "act-icon--purple",
  job_closed:   "act-icon--green",
};

// ── Temps gagné (time saved) assumptions ───────────────────────────────────
// Formule : temps gagné = nombre de CV × (temps moyen manuel − temps moyen système)
const MANUAL_AVG_MINUTES_PER_CV = 15;   // temps moyen pour analyser un CV manuellement
const SYSTEM_AVG_MINUTES_PER_CV = 0.5;  // temps moyen pour analyser un CV via notre système (≈ 30s)

function formatTimeSaved(totalMinutes: number): string {
  if (totalMinutes <= 0) return "0min";
  const hours = Math.floor(totalMinutes / 60);
  const mins  = Math.round(totalMinutes % 60);
  if (hours === 0) return `${mins}min`;
  if (mins === 0)  return `${hours}h`;
  return `${hours}h ${mins}min`;
}

// ── Static style/formatter objects ──────────────────────────────────────────
// Hoisted out of the component body so they aren't reallocated on every render.

const KPI_CARD_STYLE: CSSProperties = { display: "flex", flexDirection: "column", height: "100%" };
const KPI_NOTE_STYLE: CSSProperties = { marginTop: "auto" };
const ICON_TITLE_STYLE: CSSProperties = { verticalAlign: "middle", marginRight: 6 };
const KPI_GRID_STYLE: CSSProperties = { display: "grid", alignItems: "stretch" };

function formatTickDate(v: string): string {
  return new Date(v).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function formatBarCount(v: ReactNode): string {
  return Number(v).toLocaleString();
}

// ── Sub-components ────────────────────────────────────────────────────────

function SkeletonBlock({ w = "100%", h = 16, r = 6 }: { w?: string | number; h?: number; r?: number }) {
  return (
    <div
      className="db-skeleton"
      style={{ width: w, height: h, borderRadius: r }}
    />
  );
}

function StatCardSkeleton() {
  return (
    <div className="db-kpi-card" style={KPI_CARD_STYLE}>
      <SkeletonBlock w={38} h={38} r={10} />
      <SkeletonBlock w="60%" h={11} />
      <SkeletonBlock w="40%" h={30} />
      <SkeletonBlock w="70%" h={12} />
    </div>
  );
}

function SectionEmptyState({ icon, title, body, action }: {
  icon: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="db-empty-state">
      <div className="db-empty-icon">{icon}</div>
      <p className="db-empty-title">{title}</p>
      {body && <p className="db-empty-body">{body}</p>}
      {action && <div className="db-empty-action">{action}</div>}
    </div>
  );
}

// ── Donut chart centre label ───────────────────────────────────────────────

function DonutCentreLabel({ total, label }: { total: number; label: string }) {
  return (
    <text
      x="50%" y="50%"
      textAnchor="middle" dominantBaseline="middle"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      <tspan x="50%" dy="-6" fontSize="22" fontWeight="700" fill="var(--lu-text-primary)">
        {total.toLocaleString()}
      </tspan>
      <tspan x="50%" dy="20" fontSize="11" fill="var(--lu-text-muted)">
        {label}
      </tspan>
    </text>
  );
}

// ── Custom tooltip for line chart ─────────────────────────────────────────

function LineTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="db-chart-tooltip">
      <p className="db-chart-tooltip-label">{label}</p>
      <p className="db-chart-tooltip-value">{payload[0].value} CV{payload[0].value !== 1 ? "s" : ""}</p>
    </div>
  );
}

// ── KPI cards section ───────────────────────────────────────────────────────
// Owns its own `stats` query so it only re-renders when that query's
// data/status actually changes, never as a side effect of sibling sections
// (timeline range changes, table/activity refetches, etc).

const KpiCards = memo(function KpiCards() {
  const { t } = useTranslation();
  const statsQ = useQuery({ queryKey: ["dashboard", "stats"], queryFn: fetchDashboardStats, staleTime: 60_000 });

  const timeSavedMinutes = useMemo(() => {
    if (!statsQ.data) return 0;
    return statsQ.data.candidatesUploadedThisMonth * (MANUAL_AVG_MINUTES_PER_CV - SYSTEM_AVG_MINUTES_PER_CV);
  }, [statsQ.data]);

  if (statsQ.isLoading) {
    return (
      <div className="db-kpi-grid" style={KPI_GRID_STYLE}>
        {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
      </div>
    );
  }

  if (statsQ.isError) {
    return (
      <div className="db-kpi-grid" style={KPI_GRID_STYLE}>
        <div className="db-kpi-error" style={{ gridColumn: "1/-1" }}>
          <AlertCircle size={16} />
          <span>{t('dashboard.statsError')}</span>
        </div>
      </div>
    );
  }

  const stats = statsQ.data!;

  return (
    <div className="db-kpi-grid" style={KPI_GRID_STYLE}>
      {/* Active openings */}
      <div className="db-kpi-card" style={KPI_CARD_STYLE}>
        <span className="db-kpi-icon kpi-icon--blue" aria-hidden><Briefcase size={20} strokeWidth={1.6} /></span>
        <p className="db-kpi-label">{t('dashboard.kpi.activeOpenings')}</p>
        <p className="db-kpi-value">{stats.activeJobOpenings}</p>
        <p className="db-kpi-note" style={KPI_NOTE_STYLE}>{t('dashboard.kpi.totalOpenings', { count: stats.totalJobOpenings })}</p>
      </div>

      {/* Uploaded this month */}
      <div className="db-kpi-card db-kpi-card--row" style={KPI_CARD_STYLE}>
        <div className="db-kpi-card-main">
          <span className="db-kpi-icon kpi-icon--purple" aria-hidden><Upload size={20} strokeWidth={1.6} /></span>
          <p className="db-kpi-label">{t('dashboard.kpi.cvsThisMonth')}</p>
          <p className="db-kpi-value">{stats.candidatesUploadedThisMonth}</p>
          <p className="db-kpi-note" style={KPI_NOTE_STYLE}>{t('dashboard.kpi.totalCvs', { count: stats.totalCandidatesUploaded })}</p>
        </div>
        <div
          className="db-kpi-time-badge"
          title={`${stats.candidatesUploadedThisMonth} CV × (${MANUAL_AVG_MINUTES_PER_CV}min manuel − ${SYSTEM_AVG_MINUTES_PER_CV}min système)`}
        >
          <Zap size={14} strokeWidth={2.2} className="db-kpi-time-badge-icon" />
          <span className="db-kpi-time-badge-value">{formatTimeSaved(timeSavedMinutes)}</span>
          <span className="db-kpi-time-badge-label">{t('dashboard.kpi.timeSaved')}</span>
        </div>
      </div>

      {/* Pending — highlighted if > 0 */}
      <div className={`db-kpi-card ${stats.candidatesPendingParsing > 0 ? "db-kpi-card--amber" : ""}`} style={KPI_CARD_STYLE}>
        <span className="db-kpi-icon kpi-icon--amber" aria-hidden><Clock size={20} strokeWidth={1.6} /></span>
        <p className="db-kpi-label">{t('dashboard.kpi.pendingParsing')}</p>
        <p className="db-kpi-value">{stats.candidatesPendingParsing}</p>
        <p className="db-kpi-note" style={KPI_NOTE_STYLE}>
          {stats.candidatesPendingParsing > 0 ? t('dashboard.kpi.parsingInProgress') : t('dashboard.kpi.allParsed')}
        </p>
      </div>

      {/* Successfully parsed */}
      <div className="db-kpi-card" style={KPI_CARD_STYLE}>
        <span className="db-kpi-icon kpi-icon--green" aria-hidden><CheckCircle2 size={20} strokeWidth={1.6} /></span>
        <p className="db-kpi-label">{t('dashboard.kpi.parsedSuccessfully')}</p>
        <p className="db-kpi-value">{stats.candidatesParsedSuccessfully}</p>
        <p className="db-kpi-note" style={KPI_NOTE_STYLE}>
          {stats.candidatesFailedParsing > 0 ? t('dashboard.kpi.failedCount', { count: stats.candidatesFailedParsing }) : t('dashboard.kpi.noFailures')}
        </p>
      </div>
    </div>
  );
});

// ── Team footnote ───────────────────────────────────────────────────────────
// Tiny, but isolated for the same reason: it re-renders only on its own
// query's status changes instead of riding along with the whole page.

const TeamFootnote = memo(function TeamFootnote() {
  const { t } = useTranslation();
  const statsQ = useQuery({ queryKey: ["dashboard", "stats"], queryFn: fetchDashboardStats, staleTime: 60_000 });
  if (!statsQ.data) return null;
  const count = statsQ.data.teamMembersCount;
  return (
    <div className="db-team-note">
      <Users size={13} style={ICON_TITLE_STYLE} />
      {t('dashboard.teamNote', { count, plural: count !== 1 ? 's' : '' })}
    </div>
  );
});

// ── Candidates-over-time line chart ─────────────────────────────────────────
// Owns the `range` state itself. This is the only piece of UI that needs to
// re-render when the user flips between 7d/30d/90d — keeping the state local
// means that interaction never touches the donut, funnel, table, or activity
// sections. `placeholderData: keepPreviousData` keeps the previous curve on
// screen (instead of flashing back to a skeleton) while the new range loads.

const CandidatesTimelineChart = memo(function CandidatesTimelineChart() {
  const { t } = useTranslation();
  const [range, setRange] = useState<TimeRange>("30d");

  const timelineQ = useQuery({
    queryKey: ["dashboard", "timeline", range],
    queryFn: () => fetchCandidatesOverTime(range),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });

  const timelineAllZero = useMemo(
    () => timelineQ.data?.every((p: TimeSeriesPoint) => p.count === 0) ?? false,
    [timelineQ.data]
  );

  const tickInterval = useMemo(
    () => Math.floor((timelineQ.data?.length ?? 30) / 6),
    [timelineQ.data]
  );

  return (
    <div className="db-card db-chart-card">
      <div className="db-chart-header">
        <div>
          <h3 className="db-card-title"><TrendingUp size={15} style={ICON_TITLE_STYLE} />{t('dashboard.timeline.title')}</h3>
          <p className="db-card-sub">{t('dashboard.timeline.subtitle')}</p>
        </div>
        <div className="db-range-tabs" role="group" aria-label={t('dashboard.ranges.period')}>
          {RANGE_VALUES.map((val) => (
            <button
              key={val}
              className={`db-range-tab ${range === val ? "db-range-tab--active" : ""}`}
              onClick={() => setRange(val)}
            >
              {t(`dashboard.ranges.${val}`)}
            </button>
          ))}
        </div>
      </div>

      {timelineQ.isLoading ? (
        <div className="db-chart-skeleton">
          <SkeletonBlock w="100%" h={180} r={8} />
        </div>
      ) : timelineQ.isError ? (
        <SectionEmptyState
          icon={<AlertCircle size={32} />}
          title={t('dashboard.timeline.loadError')}
          body={t('dashboard.timeline.loadErrorBody')}
        />
      ) : timelineAllZero ? (
        <SectionEmptyState
          icon={<CalendarDays size={32} />}
          title={t('dashboard.timeline.noCandidates')}
          body={t('dashboard.timeline.noCandidatesBody')}
        />
      ) : (
        <ResponsiveContainer width="100%" height={210}>
          <LineChart data={timelineQ.data ?? []} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--lu-border)" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "var(--lu-text-muted)" }}
              tickLine={false}
              axisLine={false}
              interval={tickInterval}
              tickFormatter={formatTickDate}
            />
            <YAxis
              type="number"
              domain={[0, "dataMax"]}
              allowDecimals={false}
              tick={{ fontSize: 11, fill: "var(--lu-text-muted)" }}
              tickLine={false}
              axisLine={false}
              width={32}
            />
            <Tooltip content={<LineTooltip />} />
            <Line
              type="monotone"
              dataKey="count"
              stroke="var(--lu-accent)"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0, fill: "var(--lu-accent)" }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
});

// ── Parsing status donut ─────────────────────────────────────────────────────

const ParsingStatusDonut = memo(function ParsingStatusDonut() {
  const { t } = useTranslation();
  const donutQ = useQuery({ queryKey: ["dashboard", "parsing-status"], queryFn: fetchParsingStatus, staleTime: 60_000 });

  const donutTotal = useMemo(
    () => donutQ.data?.reduce((s: number, d: ParsingStatusPoint) => s + d.count, 0) ?? 0,
    [donutQ.data]
  );

  return (
    <div className="db-card db-chart-card">
      <h3 className="db-card-title"><PieIcon size={15} style={ICON_TITLE_STYLE} />{t('dashboard.parsingStatus.title')}</h3>
      <p className="db-card-sub">{t('dashboard.parsingStatus.subtitle')}</p>

      {donutQ.isLoading ? (
        <div className="db-chart-skeleton" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <SkeletonBlock w={160} h={160} r={80} />
        </div>
      ) : donutQ.isError ? (
        <SectionEmptyState icon={<AlertCircle size={32} />} title={t('dashboard.timeline.loadError')} />
      ) : donutTotal === 0 ? (
        <SectionEmptyState
          icon={<PieIcon size={32} />}
          title={t('dashboard.parsingStatus.noData')}
          body={t('dashboard.parsingStatus.noDataBody')}
        />
      ) : (
        <>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={donutQ.data ?? []}
                dataKey="count"
                nameKey="status"
                cx="50%"
                cy="50%"
                innerRadius={58}
                outerRadius={82}
                strokeWidth={0}
                isAnimationActive={false}
              >
                {donutQ.data!.map((entry: ParsingStatusPoint) => (
                  <Cell key={entry.status} fill={DONUT_COLORS[entry.status] ?? "#ccc"} />
                ))}
              </Pie>
              <DonutCentreLabel total={donutTotal} label={t('dashboard.parsingStatus.candidates')} />
            </PieChart>
          </ResponsiveContainer>

          <ul className="db-donut-legend">
            {donutQ.data!.map((entry: ParsingStatusPoint) => (
              <li key={entry.status} className="db-donut-legend-item">
                <span className="db-donut-dot" style={{ background: DONUT_COLORS[entry.status] }} />
                <span className="db-donut-status">{t(`dashboard.donutLabels.${entry.status}`)}</span>
                <span className="db-donut-count">{entry.count.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
});

// ── Recruitment funnel ───────────────────────────────────────────────────────

const RecruitmentFunnel = memo(function RecruitmentFunnel() {
  const { t } = useTranslation();
  const funnelQ = useQuery({ queryKey: ["dashboard", "funnel"], queryFn: fetchOpeningsFunnel, staleTime: 60_000 });

  const funnelMax = useMemo(
    () => funnelQ.data?.reduce((m: number, s: FunnelStage) => Math.max(m, s.count), 0) ?? 0,
    [funnelQ.data]
  );

  return (
    <div className="db-card">
      <h3 className="db-card-title"><Activity size={15} style={ICON_TITLE_STYLE} />{t('dashboard.funnel.title')}</h3>
      <p className="db-card-sub">{t('dashboard.funnel.subtitle')}</p>

      {funnelQ.isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
          {Array.from({ length: 4 }).map((_, i) => <SkeletonBlock key={i} h={36} r={6} />)}
        </div>
      ) : funnelQ.isError ? (
        <SectionEmptyState icon={<AlertCircle size={32} />} title={t('dashboard.funnel.loadError')} />
      ) : funnelMax === 0 ? (
        <SectionEmptyState
          icon={<Activity size={32} />}
          title={t('dashboard.funnel.noData')}
          body={t('dashboard.funnel.noDataBody')}
        />
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <BarChart
            layout="vertical"
            data={funnelQ.data ?? []}
            margin={{ top: 8, right: 60, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--lu-border)" horizontal={false} />
            <XAxis
              type="number"
              allowDecimals={false}
              tick={{ fontSize: 11, fill: "var(--lu-text-muted)" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="stage"
              width={160}
              tick={{ fontSize: 12, fill: "var(--lu-text-secondary)" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ fill: "var(--lu-border)" }}
              contentStyle={{
                background: "var(--lu-bg-card)",
                border: "1px solid var(--lu-border)",
                borderRadius: 8,
                fontSize: 12,
                color: "var(--lu-text-primary)",
              }}
            />
            <Bar dataKey="count" fill="var(--lu-accent)" radius={[0, 6, 6, 0]} opacity={0.85} maxBarSize={28} isAnimationActive={false}>
              <LabelList
                dataKey="count"
                position="right"
                style={{ fontSize: 12, fontWeight: 700, fill: "var(--lu-text-primary)" }}
                formatter={formatBarCount}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
});

// ── Recent job openings table ────────────────────────────────────────────────

const RecentJobsTable = memo(function RecentJobsTable() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const jobsQ = useQuery({ queryKey: ["dashboard", "recent-jobs"], queryFn: fetchRecentJobOpenings, staleTime: 60_000 });

  return (
    <div className="db-card">
      <h3 className="db-card-title">{t('dashboard.recentJobs.title')}</h3>
      <p className="db-card-sub">{t('dashboard.recentJobs.subtitle')}</p>

      {jobsQ.isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
          {Array.from({ length: 4 }).map((_, i) => <SkeletonBlock key={i} h={44} r={8} />)}
        </div>
      ) : jobsQ.isError ? (
        <SectionEmptyState icon={<AlertCircle size={32} />} title={t('dashboard.recentJobs.loadError')} />
      ) : jobsQ.data!.length === 0 ? (
        <SectionEmptyState
          icon={<Briefcase size={32} />}
          title={t('dashboard.recentJobs.noJobs')}
          body={t('dashboard.recentJobs.noJobsBody')}
        />
      ) : (
        <div className="db-table-wrap">
          <table className="db-table">
            <thead>
              <tr>
                <th>{t('dashboard.recentJobs.tableTitle')}</th>
                <th>{t('dashboard.recentJobs.tableStatus')}</th>
                <th className="db-th-num">{t('dashboard.recentJobs.tableCvs')}</th>
                <th className="db-th-num">{t('dashboard.recentJobs.tableParsed')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {jobsQ.data!.map((job: RecentJobOpening) => (
                <tr key={job.id}>
                  <td>
                    <p className="db-job-title">{job.title}</p>
                  </td>
                  <td>
                    <span className={`db-badge ${STATUS_BADGE[job.status] ?? "badge--gray"}`}>
                      {t(`dashboard.statusLabels.${job.status}`)}
                    </span>
                  </td>
                  <td className="db-td-num">{job.candidateCount}</td>
                  <td className="db-td-num">{job.parsedCount}</td>
                  <td className="db-td-link">
                    <button
                      className="db-open-link"
                      onClick={() => navigate(`/candidatures/${job.id}`)}
                      aria-label={`${t('common.open')} ${job.title}`}
                    >
                      <ExternalLink size={12} strokeWidth={2} />
                      {t('common.open')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
});

// ── Recent activity feed ─────────────────────────────────────────────────────

const RecentActivityFeed = memo(function RecentActivityFeed() {
  const { t } = useTranslation();
  const activityQ = useQuery({ queryKey: ["dashboard", "activity"], queryFn: fetchRecentActivity, staleTime: 60_000 });

  return (
    <div className="db-card">
      <h3 className="db-card-title">{t('dashboard.activity.title')}</h3>
      <p className="db-card-sub">{t('dashboard.activity.subtitle')}</p>

      {activityQ.isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <SkeletonBlock w={30} h={30} r={8} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
                <SkeletonBlock h={13} />
                <SkeletonBlock w="40%" h={11} />
              </div>
            </div>
          ))}
        </div>
      ) : activityQ.isError ? (
        <SectionEmptyState icon={<AlertCircle size={32} />} title={t('dashboard.activity.loadError')} />
      ) : activityQ.data!.length === 0 ? (
        <SectionEmptyState
          icon={<Activity size={32} />}
          title={t('dashboard.activity.noActivity')}
          body={t('dashboard.activity.noActivityBody')}
        />
      ) : (
        <ul className="db-activity">
          {activityQ.data!.map((event: ActivityEvent, i: number) => (
            <li key={i} className="db-activity-item">
              <span
                className={`db-act-icon ${ACTIVITY_COLORS[event.type] ?? "act-icon--blue"}`}
                aria-hidden
              >
                {ACTIVITY_ICONS[event.type] ?? <ChevronRight size={14} />}
              </span>
              <div className="db-act-body">
                <p className="db-act-text">{event.message}</p>
                <p className="db-act-time">{event.timeAgo}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});

// ── Header ────────────────────────────────────────────────────────────────
// Subscribes to the same `stats` query as KpiCards/TeamFootnote. React Query
// dedupes the underlying fetch across all three subscribers (one network
// request, three independent re-render scopes), so this costs nothing extra
// over the original single-fetch version while keeping each section isolated.

const DashboardHeader = memo(function DashboardHeader({ firstName }: { firstName: string }) {
  const { t } = useTranslation();
  const statsQ = useQuery({ queryKey: ["dashboard", "stats"], queryFn: fetchDashboardStats, staleTime: 60_000 });

  const hour = new Date().getHours();
  const greeting = hour < 12 ? t('dashboard.greeting.morning') : hour < 18 ? t('dashboard.greeting.afternoon') : t('dashboard.greeting.evening');

  const summaryLine = statsQ.data
    ? t('dashboard.summary', {
        activeJobs: statsQ.data.activeJobOpenings,
        jobPlural: statsQ.data.activeJobOpenings !== 1 ? 's' : '',
        pendingCandidates: statsQ.data.candidatesPendingParsing,
        candidatePlural: statsQ.data.candidatesPendingParsing !== 1 ? 's' : '',
      })
    : null;

  return (
    <div className="db-header-row">
      <div>
        <h2 className="db-welcome-heading">
          {greeting}, <span className="db-accent">{firstName}</span>
        </h2>
        <p className="db-welcome-sub">
          {summaryLine ?? t('dashboard.loadingStats')}
        </p>
      </div>
    </div>
  );
});

// ── Main Component ────────────────────────────────────────────────────────
// Now a thin shell: it holds no query state of its own, so it only re-renders
// when `user` changes from the outlet context. Every section below manages
// its own data and re-render scope independently.

export default function DashboardPage() {
  const { user } = useOutletContext<OutletCtx>();

  return (
    <div className="db-root">
      <DashboardHeader firstName={user.firstName} />

      <KpiCards />

      <div className="db-charts-grid">
        <CandidatesTimelineChart />
        <ParsingStatusDonut />
      </div>

      <RecruitmentFunnel />

      <div className="db-mid-grid">
        <RecentJobsTable />
        <RecentActivityFeed />
      </div>

      <TeamFootnote />
    </div>
  );
}