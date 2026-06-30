import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  X,
  AlertTriangle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { apiClient } from '../../api/apiClient';

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

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface CreateForm {
  organisationName: string;
  slug: string;
  adminEmail: string;
}

const emptyForm: CreateForm = {
  organisationName: '',
  slug: '',
  adminEmail: '',
};

const planColors: Record<string, string> = {
  FREE: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  PRO: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  ENTERPRISE: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
};

export default function AdminOrganisations() {
  const navigate = useNavigate();
  const [orgs, setOrgs] = useState<Organisation[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [search, setSearch] = useState('');
  const [suspendedFilter, setSuspendedFilter] = useState<'all' | 'true' | 'false'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create modal state
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(emptyForm);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  const fetchOrgs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set('page', String(pagination.page));
      params.set('limit', '10');
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (suspendedFilter !== 'all') params.set('suspended', suspendedFilter);

      const res = await apiClient.get(`/v1/admin/organisations?${params.toString()}`);
      setOrgs(res.data.data);
      setPagination(res.data.pagination);
    } catch {
      setError('Impossible de charger la liste des organisations.');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, debouncedSearch, suspendedFilter]);

  useEffect(() => {
    fetchOrgs();
  }, [fetchOrgs]);

  // Reset page when search or filter changes
  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [debouncedSearch, suspendedFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreating(true);
      setCreateError(null);
      await apiClient.post('/v1/admin/organisations', createForm);
      setShowCreate(false);
      setCreateForm(emptyForm);
      await fetchOrgs();
    } catch (err: any) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Erreur lors de la création.';
      setCreateError(msg);
    } finally {
      setCreating(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const autoSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  return (
    <div className="p-6 space-y-6">
      {/* Error banner */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3 text-sm">
          <AlertTriangle className="text-red-500 shrink-0" size={16} />
          <p className="text-red-700 dark:text-red-400">{error}</p>
          <button
            onClick={fetchOrgs}
            className="ml-auto text-sm font-medium text-red-600 dark:text-red-400 hover:underline flex items-center gap-1"
          >
            <RefreshCw size={14} /> Réessayer
          </button>
        </div>
      )}

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition"
          />
        </div>

        {/* Filter */}
        <select
          value={suspendedFilter}
          onChange={(e) =>
            setSuspendedFilter(e.target.value as 'all' | 'true' | 'false')
          }
          className="px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">Toutes</option>
          <option value="false">Actives</option>
          <option value="true">Suspendues</option>
        </select>

        {/* Create button */}
        <button
          onClick={() => setShowCreate(true)}
          className="ml-auto inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition shadow-sm"
        >
          <Plus size={16} />
          Créer une organisation
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 border-4 border-gray-300 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-700/50 text-left">
                  <th className="px-5 py-3 font-medium text-gray-500 dark:text-gray-400">
                    Nom
                  </th>
                  <th className="px-5 py-3 font-medium text-gray-500 dark:text-gray-400">
                    Slug
                  </th>
                  <th className="px-5 py-3 font-medium text-gray-500 dark:text-gray-400">
                    Plan
                  </th>
                  <th className="px-5 py-3 font-medium text-gray-500 dark:text-gray-400 text-center">
                    Utilisateurs
                  </th>
                  <th className="px-5 py-3 font-medium text-gray-500 dark:text-gray-400 text-center">
                    CVs
                  </th>
                  <th className="px-5 py-3 font-medium text-gray-500 dark:text-gray-400">
                    Date création
                  </th>
                  <th className="px-5 py-3 font-medium text-gray-500 dark:text-gray-400">
                    Statut
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {orgs.map((org) => (
                  <tr
                    key={org.id}
                    onClick={() => navigate(`/admin/organisations/${org.id}`)}
                    className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-3.5 font-medium text-gray-900 dark:text-white">
                      {org.name}
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 dark:text-gray-400 font-mono text-xs">
                      {org.slug}
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
                    <td className="px-5 py-3.5 text-center text-gray-700 dark:text-gray-300">
                      {org._count.cvsAnalysed}
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 dark:text-gray-400">
                      {formatDate(org.createdAt)}
                    </td>
                    <td className="px-5 py-3.5">
                      {org.suspended ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                          Suspendu
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Actif
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {orgs.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-10 text-center text-gray-400 dark:text-gray-500"
                    >
                      Aucune organisation trouvée.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 dark:border-slate-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Page {pagination.page} sur {pagination.totalPages} — {pagination.total} résultat
              {pagination.total > 1 ? 's' : ''}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))
                }
                disabled={pagination.page <= 1}
                className="p-2 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() =>
                  setPagination((p) => ({
                    ...p,
                    page: Math.min(p.totalPages, p.page + 1),
                  }))
                }
                disabled={pagination.page >= pagination.totalPages}
                className="p-2 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Create Organisation Modal ── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-700 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Créer une organisation
              </h2>
              <button
                onClick={() => {
                  setShowCreate(false);
                  setCreateForm(emptyForm);
                  setCreateError(null);
                }}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition"
              >
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {createError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-400">
                  {createError}
                </div>
              )}

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm text-blue-700 dark:text-blue-400">
                Une invitation sera envoyée à l'admin pour qu'il complète son compte (même mécanisme que l'invitation d'un membre).
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nom de l'organisation *
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.organisationName}
                    onChange={(e) =>
                      setCreateForm((f) => ({
                        ...f,
                        organisationName: e.target.value,
                        slug: autoSlug(e.target.value),
                      }))
                    }
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Slug *
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.slug}
                    onChange={(e) =>
                      setCreateForm((f) => ({ ...f, slug: e.target.value }))
                    }
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email de l'admin *
                  </label>
                  <input
                    type="email"
                    required
                    value={createForm.adminEmail}
                    onChange={(e) =>
                      setCreateForm((f) => ({
                        ...f,
                        adminEmail: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreate(false);
                    setCreateForm(emptyForm);
                    setCreateError(null);
                  }}
                  className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-800 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {creating && (
                    <RefreshCw size={14} className="animate-spin" />
                  )}
                  Créer & Inviter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
