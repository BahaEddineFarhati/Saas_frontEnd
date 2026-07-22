import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Users,
  FileText,
  Briefcase,
  AlertTriangle,
  Unlock,
  Eye,
  RefreshCw,
  TrendingUp,
  ShieldAlert,
  Clock,
  XCircle,
  Target,
  Activity,
  Award,
  ExternalLink,
} from 'lucide-react';
import { apiClient } from '../../api/apiClient';
import { useTranslation } from '../../i18n/I18nContext';

interface Stats {
  totalOrganisations: number;
  activeOrganisations: number;
  suspendedOrganisations: number;
  totalUsers: number;
  totalCVsAnalysed: number;
  totalCVsThisMonth: number;
  totalJobOpenings: number;
  activeJobOpenings: number;
  // Queue health fields
  queuePendingJobs?: number;
  queueFailedJobs?: number;
  // Scoring KPI fields
  totalCandidatesScored?: number;
  averagePlatformScore?: number;
  strongFitCandidates?: number;
}

interface Organisation {
  id: string;
  name: string;
  slug: string;
  plan: string;
  suspended: boolean;
  suspendedAt: string | null;
  createdAt: string;
  _count: {
    users: number;
    jobOpenings: number;
    cvsAnalysed: number;
  };
}

const planColors: Record<string, string> = {
  FREE: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  PRO: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  ENTERPRISE: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
};

export default function AdminDashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<Stats | null>(null);
  const [orgs, setOrgs] = useState<Organisation[]>([]);
  const [suspendedOrgs, setSuspendedOrgs] = useState<Organisation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unsuspending, setUnsuspending] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsRes, orgsRes] = await Promise.all([
        apiClient.get('/admin/stats'),
        apiClient.get('/admin/organisations?limit=10&page=1'),
      ]);

      setStats(statsRes.data.data);
      setOrgs(orgsRes.data.data);

      // Filter suspended orgs from the full list (or fetch separately)
      const suspended = (orgsRes.data.data as Organisation[]).filter(
        (o) => o.suspended
      );

      // If there are suspended orgs beyond the first 10, fetch them
      if (statsRes.data.data.suspendedOrganisations > 0 && suspended.length === 0) {
        const suspRes = await apiClient.get(
          '/admin/organisations?suspended=true&limit=50'
        );
        setSuspendedOrgs(suspRes.data.data);
      } else {
        setSuspendedOrgs(suspended);
      }
    } catch {
      setError(t('admin.dashboard.loadError'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUnsuspend = async (orgId: string) => {
    try {
      setUnsuspending(orgId);
      await apiClient.post(`/admin/organisations/${orgId}/unsuspend`);
      await fetchData();
    } catch {
      setError(t('admin.dashboard.unsuspendFailed'));
    } finally {
      setUnsuspending(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-10 w-10 border-4 border-gray-300 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-5 flex items-center gap-3">
          <AlertTriangle className="text-red-500 shrink-0" size={20} />
          <p className="text-red-700 dark:text-red-400">{error}</p>
          <button
            onClick={fetchData}
            className="ml-auto text-sm font-medium text-red-600 dark:text-red-400 hover:underline flex items-center gap-1"
          >
            <RefreshCw size={14} /> {t('admin.dashboard.retry')}
          </button>
        </div>
      </div>
    );
  }

  const kpiCards = [
    {
      label: t('admin.dashboard.kpi.totalOrgs'),
      value: stats?.totalOrganisations ?? 0,
      icon: <Building2 size={22} />,
      color: 'text-indigo-600 dark:text-indigo-400',
      bg: 'bg-indigo-50 dark:bg-indigo-900/20',
    },
    {
      label: t('admin.dashboard.kpi.activeOrgs'),
      value: stats?.activeOrganisations ?? 0,
      icon: <TrendingUp size={22} />,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    },
    {
      label: t('admin.dashboard.kpi.suspendedOrgs'),
      value: stats?.suspendedOrganisations ?? 0,
      icon: <ShieldAlert size={22} />,
      color:
        (stats?.suspendedOrganisations ?? 0) > 0
          ? 'text-red-600 dark:text-red-400'
          : 'text-gray-500 dark:text-gray-400',
      bg:
        (stats?.suspendedOrganisations ?? 0) > 0
          ? 'bg-red-50 dark:bg-red-900/20'
          : 'bg-gray-50 dark:bg-gray-800',
      ring:
        (stats?.suspendedOrganisations ?? 0) > 0
          ? 'ring-2 ring-red-300 dark:ring-red-700'
          : '',
    },
    {
      label: t('admin.dashboard.kpi.totalUsers'),
      value: stats?.totalUsers ?? 0,
      icon: <Users size={22} />,
      color: 'text-sky-600 dark:text-sky-400',
      bg: 'bg-sky-50 dark:bg-sky-900/20',
    },
    {
      label: t('admin.dashboard.kpi.cvsThisMonth'),
      value: stats?.totalCVsThisMonth ?? 0,
      icon: <FileText size={22} />,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-900/20',
    },
    {
      label: t('admin.dashboard.kpi.activeOpenings'),
      value: stats?.activeJobOpenings ?? 0,
      icon: <Briefcase size={22} />,
      color: 'text-violet-600 dark:text-violet-400',
      bg: 'bg-violet-50 dark:bg-violet-900/20',
    },
  ];

  return (
    <div className="p-6 space-y-8">
      {/* Error banner */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3 text-sm">
          <AlertTriangle className="text-red-500 shrink-0" size={16} />
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpiCards.map((card) => (
          <div
            key={card.label}
            className={`rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 transition-all hover:shadow-md hover:-translate-y-0.5 ${card.ring || ''}`}
          >
            <div className={`inline-flex p-2.5 rounded-lg ${card.bg} ${card.color} mb-3`}>
              {card.icon}
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {card.value.toLocaleString('fr-FR')}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-tight">
              {card.label}
            </p>
          </div>
        ))}
      </div>

      {/* Queue Health Section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Activity size={18} className="text-gray-500 dark:text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
            {t('admin.dashboard.queueHealth')}
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Pending Jobs Card */}
          <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 transition-all hover:shadow-md hover:-translate-y-0.5">
            <div className="inline-flex p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 mb-3">
              <Clock size={22} />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {(stats?.queuePendingJobs ?? 0).toLocaleString('fr-FR')}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-tight">
              {t('admin.dashboard.pendingJobs')}
            </p>
          </div>

          {/* Failed Jobs Card */}
          <div
            className={`rounded-xl border bg-white dark:bg-slate-800 p-5 transition-all hover:shadow-md hover:-translate-y-0.5 ${
              (stats?.queueFailedJobs ?? 0) > 0
                ? 'border-red-300 dark:border-red-700 ring-2 ring-red-300 dark:ring-red-700'
                : 'border-gray-200 dark:border-slate-700'
            }`}
          >
            <div
              className={`inline-flex p-2.5 rounded-lg mb-3 ${
                (stats?.queueFailedJobs ?? 0) > 0
                  ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                  : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
              }`}
            >
              <XCircle size={22} />
            </div>
            <p
              className={`text-2xl font-bold ${
                (stats?.queueFailedJobs ?? 0) > 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-gray-900 dark:text-white'
              }`}
            >
              {(stats?.queueFailedJobs ?? 0).toLocaleString('fr-FR')}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-tight">
              {t('admin.dashboard.failedJobs')}
            </p>
          </div>
        </div>

        {/* Queue Failed Warning Banner */}
        {(stats?.queueFailedJobs ?? 0) > 0 && (
          <div className="mt-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/50 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={18} />
            <div className="text-sm text-red-700 dark:text-red-400">
              <p>
                {t('admin.dashboard.queueWarning')}{' '}
                <a
                  href="/admin/queues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold underline underline-offset-2 hover:text-red-800 dark:hover:text-red-300 transition-colors"
                >
                  BullMQ <ExternalLink size={12} />
                </a>
                .
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Scoring KPIs Section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Target size={18} className="text-gray-500 dark:text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
            {t('admin.dashboard.scoringKpis')}
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Total Candidates Scored */}
          <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 transition-all hover:shadow-md hover:-translate-y-0.5">
            <div className="inline-flex p-2.5 rounded-lg bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 mb-3">
              <Target size={22} />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {(stats?.totalCandidatesScored ?? 0).toLocaleString('fr-FR')}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-tight">
              {t('admin.dashboard.candidatesScored')}
            </p>
          </div>

          {/* Average Platform Score */}
          <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 transition-all hover:shadow-md hover:-translate-y-0.5">
            <div className="inline-flex p-2.5 rounded-lg bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400 mb-3">
              <Activity size={22} />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {(stats?.averagePlatformScore ?? 0).toFixed(1)}
              <span className="text-sm font-normal text-gray-400 dark:text-gray-500 ml-1">
                / 100
              </span>
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-tight">
              {t('admin.dashboard.avgPlatformScore')}
            </p>
          </div>

          {/* Strong Fit Candidates */}
          <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 transition-all hover:shadow-md hover:-translate-y-0.5">
            <div className="inline-flex p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 mb-3">
              <Award size={22} />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {(stats?.strongFitCandidates ?? 0).toLocaleString('fr-FR')}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-tight">
              {t('admin.dashboard.strongFitCandidates')}
            </p>
          </div>
        </div>
      </div>

      {/* Suspended Orgs Alert */}
      {suspendedOrgs.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/50 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="text-red-500" size={18} />
            <h3 className="font-semibold text-red-800 dark:text-red-300">
              {t('admin.dashboard.suspendedOrgsTitle', { count: suspendedOrgs.length })}
            </h3>
          </div>
          <div className="space-y-2">
            {suspendedOrgs.map((org) => (
              <div
                key={org.id}
                className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-lg px-4 py-3 border border-red-100 dark:border-red-900/30"
              >
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {org.name}
                  </span>
                  {org.suspendedAt && (
                    <span className="ml-3 text-xs text-gray-500 dark:text-gray-400">
                      {t('admin.dashboard.suspendedOn', { date: formatDate(org.suspendedAt) })}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleUnsuspend(org.id)}
                  disabled={unsuspending === org.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition disabled:opacity-50"
                >
                  {unsuspending === org.id ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Unlock size={14} />
                  )}
                  {t('admin.dashboard.unsuspend')}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Organisations Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {t('admin.dashboard.recentOrgs')}
          </h3>
          <Link
            to="/admin/organisations"
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            {t('admin.dashboard.viewAll')}
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-700/50 text-left">
                <th className="px-5 py-3 font-medium text-gray-500 dark:text-gray-400">{t('admin.dashboard.table.name')}</th>
                <th className="px-5 py-3 font-medium text-gray-500 dark:text-gray-400">{t('admin.dashboard.table.plan')}</th>
                <th className="px-5 py-3 font-medium text-gray-500 dark:text-gray-400 text-center">{t('admin.dashboard.table.users')}</th>
                <th className="px-5 py-3 font-medium text-gray-500 dark:text-gray-400">{t('admin.dashboard.table.status')}</th>
                <th className="px-5 py-3 font-medium text-gray-500 dark:text-gray-400">{t('admin.dashboard.table.createdAt')}</th>
                <th className="px-5 py-3 font-medium text-gray-500 dark:text-gray-400 text-center">{t('admin.dashboard.table.action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {orgs.map((org) => (
                <tr
                  key={org.id}
                  className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors"
                >
                  <td className="px-5 py-3.5 font-medium text-gray-900 dark:text-white">
                    {org.name}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${planColors[org.plan] || planColors.FREE}`}
                    >
                      {org.plan}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-center text-gray-700 dark:text-gray-300">
                    {org._count.users}
                  </td>
                  <td className="px-5 py-3.5">
                    {org.suspended ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        {t('admin.dashboard.suspended')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {t('admin.dashboard.active')}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-gray-500 dark:text-gray-400">
                    {formatDate(org.createdAt)}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <Link
                      to={`/admin/organisations/${org.id}`}
                      className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline text-sm font-medium"
                    >
                      <Eye size={14} /> {t('admin.dashboard.view')}
                    </Link>
                  </td>
                </tr>
              ))}
              {orgs.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-10 text-center text-gray-400 dark:text-gray-500"
                  >
                    {t('admin.dashboard.noOrgs')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
