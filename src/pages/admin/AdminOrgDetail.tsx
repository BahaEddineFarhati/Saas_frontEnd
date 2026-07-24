import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Lock,
  Unlock,
  X,
  AlertTriangle,
  RefreshCw,
  CheckCircle,
  Sparkles,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { apiClient } from '../../api/apiClient';
import { useTranslation } from '../../i18n/I18nContext';
import {
  fetchUsageDetail,
  fetchUsageHistory,
  type UsageDetailSummary,
  type UsageHistoryPoint,
} from '../../api/usageApi';

interface OrgUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

interface OrgDetail {
  id: string;
  name: string;
  slug: string;
  plan: string;
  suspended: boolean;
  suspendedAt: string | null;
  suspendedReason: string | null;
  createdAt: string;
  users: OrgUser[];
  _count: {
    jobOpenings: number;
    candidates: number;
  };
}

const planColors: Record<string, string> = {
  FREE: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  PRO: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  ENTERPRISE: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
};

export default function AdminOrgDetail() {
  const { orgId } = useParams<{ orgId: string }>();
  const { t, localeTag } = useTranslation();
  const [org, setOrg] = useState<OrgDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Suspend modal
  const [showSuspend, setShowSuspend] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspending, setSuspending] = useState(false);

  // Unsuspend
  const [unsuspending, setUnsuspending] = useState(false);

  // Edit panel
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', slug: '', plan: '' });
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Success toast
  const [toast, setToast] = useState<string | null>(null);

  // Usage data
  const [usageSummary, setUsageSummary] = useState<UsageDetailSummary | null>(null);
  const [usageHistory, setUsageHistory] = useState<UsageHistoryPoint[]>([]);
  const [usageLoading, setUsageLoading] = useState(true);
  const [usageError, setUsageError] = useState(false);

  const fetchOrg = useCallback(async () => {
    if (!orgId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get(`/admin/organisations/${orgId}`);
      const data = res.data.data;
      setOrg(data);
      setEditForm({ name: data.name, slug: data.slug, plan: data.plan });
    } catch {
      setError(t('admin.orgDetail.loadError'));
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchOrg();
  }, [fetchOrg]);

  // Fetch usage data
  useEffect(() => {
    if (!orgId) return;
    setUsageLoading(true);
    setUsageError(false);
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    Promise.all([
      fetchUsageDetail(orgId, year, month),
      fetchUsageHistory(orgId),
    ])
      .then(([detail, history]) => {
        setUsageSummary(detail.summary);
        setUsageHistory(history.history);
      })
      .catch(() => setUsageError(true))
      .finally(() => setUsageLoading(false));
  }, [orgId]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleSuspend = async () => {
    if (!orgId) return;
    try {
      setSuspending(true);
      await apiClient.post(`/admin/organisations/${orgId}/suspend`, {
        reason: suspendReason || undefined,
      });
      setShowSuspend(false);
      setSuspendReason('');
      setToast(t('admin.orgDetail.suspendSuccess'));
      await fetchOrg();
    } catch {
      setError(t('admin.orgDetail.suspendFailed'));
    } finally {
      setSuspending(false);
    }
  };

  const handleUnsuspend = async () => {
    if (!orgId) return;
    try {
      setUnsuspending(true);
      await apiClient.post(`/admin/organisations/${orgId}/unsuspend`);
      setToast(t('admin.orgDetail.unsuspendSuccess'));
      await fetchOrg();
    } catch {
      setError(t('admin.orgDetail.unsuspendFailed'));
    } finally {
      setUnsuspending(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) return;
    try {
      setSaving(true);
      setEditError(null);
      await apiClient.patch(`/admin/organisations/${orgId}`, editForm);
      setShowEdit(false);
      setToast(t('admin.orgDetail.updateSuccess'));
      await fetchOrg();
    } catch (err: any) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        t('admin.orgDetail.updateError');
      setEditError(msg);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(localeTag, {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatTokens = (n: number) =>
    new Intl.NumberFormat(localeTag).format(n);

  const formatMonthYear = (m: number, y: number) => {
    const d = new Date(y, m - 1);
    return d.toLocaleDateString(localeTag, { month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-10 w-10 border-4 border-gray-300 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !org) {
    return (
      <div className="p-6">
        <Link
          to="/admin/organisations"
          className="inline-flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 hover:underline mb-4"
        >
          <ArrowLeft size={16} /> {t('admin.orgDetail.backToList')}
        </Link>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-5 flex items-center gap-3">
          <AlertTriangle className="text-red-500 shrink-0" size={20} />
          <p className="text-red-700 dark:text-red-400">{error}</p>
          <button
            onClick={fetchOrg}
            className="ml-auto text-sm font-medium text-red-600 dark:text-red-400 hover:underline flex items-center gap-1"
          >
            <RefreshCw size={14} /> {t('admin.orgDetail.retry')}
          </button>
        </div>
      </div>
    );
  }

  if (!org) return null;

  return (
    <div className="p-6 space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 bg-emerald-600 text-white px-5 py-3 rounded-lg shadow-lg text-sm animate-[fadeIn_0.2s_ease-out]">
          <CheckCircle size={16} />
          {toast}
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3 text-sm">
          <AlertTriangle className="text-red-500 shrink-0" size={16} />
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Back */}
      <Link
        to="/admin/organisations"
        className="inline-flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
      >
        <ArrowLeft size={16} /> {t('admin.orgDetail.backToList')}
      </Link>

      {/* Org Info Card */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {org.name}
              </h2>
              {org.suspended ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  {t('admin.orgDetail.suspended')}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {t('admin.orgDetail.active')}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              <span>
                {t('admin.orgDetail.slug')} : <span className="font-mono text-gray-700 dark:text-gray-300">{org.slug}</span>
              </span>
              <span
                className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${planColors[org.plan] || planColors.FREE}`}
              >
                {org.plan}
              </span>
              <span>{t('admin.orgDetail.createdAt', { date: formatDate(org.createdAt) })}</span>
            </div>

            {org.suspended && org.suspendedAt && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {t('admin.orgDetail.suspendedAt', { date: formatDate(org.suspendedAt) })}
                {org.suspendedReason && (
                  <span className="ml-2 text-gray-500 dark:text-gray-400">
                    {t('admin.orgDetail.suspendedReason', { reason: org.suspendedReason })}
                  </span>
                )}
              </p>
            )}

            <div className="flex gap-6 text-sm text-gray-600 dark:text-gray-400 pt-1">
              <span>{t('admin.orgDetail.userCount', { count: org.users.length, plural: org.users.length > 1 ? 's' : '' })}</span>
              <span>{t('admin.orgDetail.jobCount', { count: org._count.jobOpenings, plural: org._count.jobOpenings > 1 ? 's' : '' })}</span>
              <span>{t('admin.orgDetail.cvCount', { count: org._count.candidates, plural: org._count.candidates > 1 ? 's' : '' })}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {org.suspended ? (
              <button
                onClick={handleUnsuspend}
                disabled={unsuspending}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
              >
                {unsuspending ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Unlock size={14} />
                )}
                {t('admin.orgDetail.unsuspend')}
              </button>
            ) : (
              <button
                onClick={() => setShowSuspend(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition"
              >
                <Lock size={14} />
                {t('admin.orgDetail.suspend')}
              </button>
            )}
            <button
              onClick={() => {
                setEditForm({ name: org.name, slug: org.slug, plan: org.plan });
                setEditError(null);
                setShowEdit(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition"
            >
              <Edit size={14} />
              {t('admin.orgDetail.edit')}
            </button>
          </div>
        </div>
      </div>

      {/* ── Utilisation IA Section ── */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-slate-700 flex items-center gap-2">
          <Sparkles size={18} className="text-indigo-500" />
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {t('admin.orgDetail.usageTitle')}
          </h3>
        </div>

        {usageLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-7 w-7 border-4 border-gray-300 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        ) : usageError ? (
          <div className="px-5 py-8 text-center text-sm text-red-500 dark:text-red-400 flex items-center justify-center gap-2">
            <AlertTriangle size={16} />
            {t('admin.orgDetail.usageLoadError')}
          </div>
        ) : (
          <div className="p-5 space-y-6">
            {/* Metric Tiles */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { label: t('entreprise.aiUsage.totalTokens'), value: usageSummary?.totalTokens ?? 0, color: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800', textColor: 'text-indigo-700 dark:text-indigo-300' },
                { label: t('entreprise.aiUsage.cvParsing'), value: usageSummary?.cvParsingTokens ?? 0, color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800', textColor: 'text-blue-700 dark:text-blue-300' },
                { label: t('entreprise.aiUsage.cvScoring'), value: usageSummary?.cvScoringTokens ?? 0, color: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800', textColor: 'text-purple-700 dark:text-purple-300' },
                { label: t('entreprise.aiUsage.enrichment'), value: usageSummary?.cvEnrichmentTokens ?? 0, color: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800', textColor: 'text-amber-700 dark:text-amber-300' },
                { label: t('entreprise.aiUsage.chat'), value: usageSummary?.chatTokens ?? 0, color: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800', textColor: 'text-emerald-700 dark:text-emerald-300' },
              ].map((tile) => (
                <div
                  key={tile.label}
                  className={`rounded-xl border p-4 ${tile.color} transition-all hover:shadow-sm`}
                >
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    {tile.label}
                  </p>
                  <p className={`text-xl font-bold ${tile.textColor}`}>
                    {formatTokens(tile.value)}
                  </p>
                </div>
              ))}
            </div>

            {/* History Chart */}
            <div className="pt-2">
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
                {t('admin.orgDetail.usageHistory')}
              </h4>
              {usageHistory.length === 0 || usageHistory.every(h => h.totalTokens === 0) ? (
                <div className="py-12 text-center text-sm text-gray-400 dark:text-gray-500 border border-dashed border-gray-200 dark:border-slate-700 rounded-xl bg-gray-50/50 dark:bg-slate-900/10">
                  {t('admin.orgDetail.usageNoData')}
                </div>
              ) : (
                <div className="w-full h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={usageHistory.map((h) => ({
                        ...h,
                        name: formatMonthYear(h.month, h.year),
                      }))}
                      margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--lu-border)" vertical={false} />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11, fill: "var(--lu-text-secondary)" }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "var(--lu-text-secondary)" }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload || !payload.length) return null;
                          return (
                            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-3.5 shadow-xl text-xs min-w-[180px] space-y-2">
                              <p className="font-semibold text-gray-900 dark:text-white capitalize border-b border-gray-100 dark:border-slate-800 pb-1.5">{label}</p>
                              <div className="space-y-1.5">
                                {payload.map((entry: any) => (
                                  <div key={entry.dataKey} className="flex items-center justify-between gap-4 text-gray-600 dark:text-gray-400">
                                    <div className="flex items-center gap-2">
                                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                                      <span>{entry.name}</span>
                                    </div>
                                    <span className="font-mono font-medium text-gray-900 dark:text-white">
                                      {new Intl.NumberFormat(localeTag).format(entry.value)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                              <div className="pt-2 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between font-bold text-gray-950 dark:text-white">
                                <span>{t('admin.orgDetail.usageTotalTokens')}</span>
                                <span className="font-mono">{new Intl.NumberFormat(localeTag).format(payload.reduce((sum: number, e: any) => sum + e.value, 0))}</span>
                              </div>
                              <div className="text-[10px] text-gray-400 dark:text-gray-500 pt-0.5 flex justify-between">
                                <span>{t('admin.orgDetail.usageApiCalls')}</span>
                                <span>{payload[0]?.payload?.callCount ?? 0}</span>
                              </div>
                            </div>
                          );
                        }}
                      />
                      <Legend
                        verticalAlign="top"
                        height={36}
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: 12 }}
                      />
                      <Bar name="CV Parsing" dataKey="cvParsingTokens" stackId="a" fill="#6366f1" radius={[0, 0, 0, 0]} />
                      <Bar name="CV Scoring" dataKey="cvScoringTokens" stackId="a" fill="#8b5cf6" radius={[0, 0, 0, 0]} />
                      <Bar name="Enrichment" dataKey="cvEnrichmentTokens" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                      <Bar name="Chat" dataKey="chatTokens" stackId="a" fill="#10b981" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-slate-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {t('admin.orgDetail.membersTitle', { count: org.users.length })}
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-700/50 text-left">
                <th className="px-5 py-3 font-medium text-gray-500 dark:text-gray-400">
                  {t('admin.orgDetail.table.name')}
                </th>
                <th className="px-5 py-3 font-medium text-gray-500 dark:text-gray-400">
                  {t('admin.orgDetail.table.email')}
                </th>
                <th className="px-5 py-3 font-medium text-gray-500 dark:text-gray-400">
                  {t('admin.orgDetail.table.role')}
                </th>
                <th className="px-5 py-3 font-medium text-gray-500 dark:text-gray-400">
                  {t('admin.orgDetail.table.status')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {org.users.map((u) => (
                <tr
                  key={u.id}
                  className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors"
                >
                  <td className="px-5 py-3.5 font-medium text-gray-900 dark:text-white">
                    {u.firstName} {u.lastName}
                  </td>
                  <td className="px-5 py-3.5 text-gray-500 dark:text-gray-400">
                    {u.email}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        u.role === 'ADMIN'
                          ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {u.isActive ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {t('admin.orgDetail.memberActive')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        {t('admin.orgDetail.memberInactive')}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {org.users.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-10 text-center text-gray-400 dark:text-gray-500"
                  >
                    {t('admin.orgDetail.noMembers')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Suspend Confirmation Modal ── */}
      {showSuspend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-700 w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('admin.orgDetail.suspendModalTitle')}
              </h2>
              <button
                onClick={() => {
                  setShowSuspend(false);
                  setSuspendReason('');
                }}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition"
              >
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 flex gap-2">
                <AlertTriangle
                  size={16}
                  className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"
                />
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  {t('admin.orgDetail.suspendModalWarning')}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('admin.orgDetail.suspendReasonLabel')}
                </label>
                <textarea
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  rows={3}
                  placeholder={t('admin.orgDetail.suspendReasonPlaceholder')}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowSuspend(false);
                    setSuspendReason('');
                  }}
                  className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-800 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 transition"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleSuspend}
                  disabled={suspending}
                  className="px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {suspending && (
                    <RefreshCw size={14} className="animate-spin" />
                  )}
                  {t('admin.orgDetail.confirmSuspend')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Side Panel (Modal) ── */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border-l border-gray-200 dark:border-slate-700 w-full max-w-md h-full shadow-xl animate-[slideIn_0.2s_ease-out]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('admin.orgDetail.editTitle')}
              </h2>
              <button
                onClick={() => {
                  setShowEdit(false);
                  setEditError(null);
                }}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition"
              >
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {editError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-400">
                  {editError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('admin.orgDetail.editNameLabel')}
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('admin.orgDetail.editSlugLabel')}
                </label>
                <input
                  type="text"
                  required
                  value={editForm.slug}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, slug: e.target.value }))
                  }
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('admin.orgDetail.editPlanLabel')}
                </label>
                <select
                  value={editForm.plan}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, plan: e.target.value }))
                  }
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="FREE">FREE</option>
                  <option value="PRO">PRO</option>
                  <option value="ENTERPRISE">ENTERPRISE</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEdit(false);
                    setEditError(null);
                  }}
                  className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-800 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 transition"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {saving && (
                    <RefreshCw size={14} className="animate-spin" />
                  )}
                  {t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
