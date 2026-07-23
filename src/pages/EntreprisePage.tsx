import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE_URL } from '../config/api'
import {
  Users,
  Building2,
  UserPlus,
  Shield,
  ShieldOff,
  UserX,
  Save,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  X,
  Mail,
  Clock,
  Sparkles,
} from 'lucide-react'
import {
  fetchOwnOrgUsage,
  fetchOwnOrgUsageHistory,
  type UsageDetailSummary,
  type UsageHistoryPoint,
} from '../api/usageApi'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { useTranslation } from '../i18n/I18nContext'

/* ── types ─────────────────────────────────────────────────────────────── */
interface Member {
  id: string
  firstName: string
  lastName: string
  email: string
  role: 'ADMIN' | 'RECRUITER'
  isActive: boolean
  departureStatus?: string
  createdAt: string
}

interface PendingInvite {
  id: string
  email: string
  role: 'ADMIN' | 'RECRUITER'
  isPending: true
  createdAt: string
  expiresAt: string
}

interface Organisation {
  id: string
  name: string
  slug: string
  plan: string
  createdAt: string
}

/* ── helpers ───────────────────────────────────────────────────────────── */
function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/* ── toast ─────────────────────────────────────────────────────────────── */
interface Toast {
  message: string
  type: 'success' | 'error'
}

function ToastBanner({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4500)
    return () => clearTimeout(t)
  }, [toast, onClose])

  return (
    <div
      className={`ent-toast ${toast.type === 'success' ? 'ent-toast--success' : 'ent-toast--error'}`}
    >
      {toast.type === 'success' ? (
        <CheckCircle2 size={16} strokeWidth={2} />
      ) : (
        <AlertTriangle size={16} strokeWidth={2} />
      )}
      <span>{toast.message}</span>
      <button onClick={onClose} className="ent-toast-close" aria-label="Close">
        <X size={14} />
      </button>
    </div>
  )
}

/* ── invite modal ──────────────────────────────────────────────────────── */
function InviteModal({
  open,
  onClose,
  onInvited,
}: {
  open: boolean
  onClose: () => void
  onInvited: (msg: string) => void
}) {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'RECRUITER' | 'ADMIN'>('RECRUITER')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!open) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) {
      setError(t('entreprise.invite.emailRequired'))
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch(`${API_BASE_URL}/organisation/members/invite`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ email, role }),
      })
      const data = await res.json()

      if (res.ok && data.success) {
        onInvited(t('entreprise.invite.inviteSentTo', { email }))
        setEmail('')
        setRole('RECRUITER')
        onClose()
      } else {
        setError(data.error?.message ?? t('entreprise.invite.sendFailed'))
      }
    } catch {
      setError(t('entreprise.invite.networkError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="ent-modal-overlay" onClick={onClose}>
      <div className="ent-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ent-modal-header">
          <div className="ent-modal-icon">
            <Mail size={20} strokeWidth={1.8} />
          </div>
          <h3>{t('entreprise.invite.title')}</h3>
          <button className="ent-modal-close" onClick={onClose} aria-label={t('common.close')}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="ent-modal-body">
          {error && (
            <div className="ent-inline-error">
              <AlertTriangle size={14} />
              <span>{error}</span>
            </div>
          )}

          <div className="ent-field">
            <label>{t('entreprise.invite.emailLabel')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setError('')
              }}
              placeholder={t('entreprise.invite.emailPlaceholder')}
              autoFocus
            />
          </div>

          <div className="ent-field">
            <label>{t('entreprise.invite.roleLabel')}</label>
            <div className="ent-role-pills">
              <button
                type="button"
                className={`ent-role-pill ${role === 'RECRUITER' ? 'ent-role-pill--active' : ''}`}
                onClick={() => setRole('RECRUITER')}
              >
                <ShieldOff size={14} /> {t('entreprise.invite.recruiter')}
              </button>
              <button
                type="button"
                className={`ent-role-pill ${role === 'ADMIN' ? 'ent-role-pill--active' : ''}`}
                onClick={() => setRole('ADMIN')}
              >
                <Shield size={14} /> {t('entreprise.invite.admin')}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="ent-btn ent-btn--primary ent-btn--full">
            {loading ? (
              <>
                <Loader2 size={16} className="ent-spin" /> {t('entreprise.invite.sending')}
              </>
            ) : (
              <>
                <UserPlus size={16} /> {t('entreprise.invite.sendButton')}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

/* ── confirm modal ─────────────────────────────────────────────────────── */
function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  danger,
  loading,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
  danger?: boolean
  loading: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  if (!open) return null

  return (
    <div className="ent-modal-overlay" onClick={onCancel}>
      <div className="ent-modal ent-modal--sm" onClick={(e) => e.stopPropagation()}>
        <div className="ent-modal-header">
          <div className={`ent-modal-icon ${danger ? 'ent-modal-icon--danger' : ''}`}>
            <AlertTriangle size={20} strokeWidth={1.8} />
          </div>
          <h3>{title}</h3>
        </div>
        <div className="ent-modal-body">
          <p className="ent-confirm-text">{message}</p>
          <div className="ent-confirm-actions">
            <button className="ent-btn ent-btn--ghost" onClick={onCancel} disabled={loading}>
              {cancelLabel}
            </button>
            <button
              className={`ent-btn ${danger ? 'ent-btn--danger' : 'ent-btn--primary'}`}
              onClick={onConfirm}
              disabled={loading}
            >
              {loading ? <Loader2 size={16} className="ent-spin" /> : null}
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════════════════════════════════════ */
export default function EntreprisePage() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  /* ── state ── */
  const [members, setMembers] = useState<Member[]>([])
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([])
  const [org, setOrg] = useState<Organisation | null>(null)
  const [loadingMembers, setLoadingMembers] = useState(true)
  const [loadingOrg, setLoadingOrg] = useState(true)

  // org form
  const [orgName, setOrgName] = useState('')
  const [orgSlug, setOrgSlug] = useState('')
  const [slugError, setSlugError] = useState('')
  const [savingOrg, setSavingOrg] = useState(false)

  // invite modal
  const [inviteOpen, setInviteOpen] = useState(false)

  // confirm modal
  const [confirm, setConfirm] = useState<{
    open: boolean
    title: string
    message: string
    confirmLabel: string
    danger: boolean
    action: () => Promise<void>
  }>({ open: false, title: '', message: '', confirmLabel: '', danger: false, action: async () => {} })
  const [confirmLoading, setConfirmLoading] = useState(false)

  // toast
  const [toast, setToast] = useState<Toast | null>(null)

  // AI usage
  const [aiUsage, setAiUsage] = useState<UsageDetailSummary | null>(null)
  const [aiUsageHistory, setAiUsageHistory] = useState<UsageHistoryPoint[]>([])
  const [aiUsageLoading, setAiUsageLoading] = useState(true)
  const [aiUsageUnavailable, setAiUsageUnavailable] = useState(false)

  /* ── fetchers ── */
  const fetchMembers = useCallback(async () => {
    setLoadingMembers(true)
    try {
      const res = await fetch(`${API_BASE_URL}/organisation/members`, { headers: authHeaders() })
      if (res.status === 403) {
        localStorage.setItem('userRole', 'RECRUITER')
        navigate('/dashboard')
        return
      }
      const data = await res.json()
      if (data.success) {
        setMembers(data.data.members ?? data.data)
        setPendingInvites(data.data.pendingInvites ?? [])
      }
    } catch {
      setToast({ message: t('entreprise.team.loadFailed'), type: 'error' })
    } finally {
      setLoadingMembers(false)
    }
  }, [navigate, t])

  const fetchOrg = useCallback(async () => {
    setLoadingOrg(true)
    try {
      const res = await fetch(`${API_BASE_URL}/organisation`, { headers: authHeaders() })
      if (res.status === 403) {
        localStorage.setItem('userRole', 'RECRUITER')
        navigate('/dashboard')
        return
      }
      const data = await res.json()
      if (data.success) {
        setOrg(data.data)
        setOrgName(data.data.name)
        setOrgSlug(data.data.slug)
      }
    } catch {
      setToast({ message: t('entreprise.org.loadFailed'), type: 'error' })
    } finally {
      setLoadingOrg(false)
    }
  }, [navigate, t])

  useEffect(() => {
    fetchMembers()
    fetchOrg()
  }, [fetchMembers, fetchOrg])

  // Fetch own org AI usage and history
  useEffect(() => {
    setAiUsageLoading(true)
    setAiUsageUnavailable(false)
    Promise.all([
      fetchOwnOrgUsage(),
      fetchOwnOrgUsageHistory(),
    ])
      .then(([summary, history]) => {
        setAiUsage(summary)
        setAiUsageHistory(history)
      })
      .catch((err) => {
        if (err?.response?.status === 403) {
          setAiUsageUnavailable(true)
        }
      })
      .finally(() => setAiUsageLoading(false))
  }, [])

  /* ── member actions ── */
  async function handleRoleChange(member: Member) {
    const newRole = member.role === 'ADMIN' ? 'RECRUITER' : 'ADMIN'
    const action = member.role === 'ADMIN' ? 'demote' : 'promote'

    setConfirm({
      open: true,
      title: action === 'promote'
        ? t('entreprise.confirm.promoteTitle', { name: member.firstName })
        : t('entreprise.confirm.demoteTitle', { name: member.firstName }),
      message: t('entreprise.confirm.roleChangeMessage', {
        firstName: member.firstName,
        lastName: member.lastName,
        fromRole: member.role,
        toRole: newRole,
      }),
      confirmLabel: action === 'promote'
        ? t('entreprise.confirm.promoteConfirm')
        : t('entreprise.confirm.demoteConfirm'),
      danger: action === 'demote',
      action: async () => {
        const res = await fetch(`${API_BASE_URL}/organisation/members/${member.id}/role`, {
          method: 'PATCH',
          headers: authHeaders(),
          body: JSON.stringify({ role: newRole }),
        })
        const data = await res.json()
        if (res.ok && data.success) {
          setToast({ message: t('entreprise.confirm.roleUpdated', { name: member.firstName, role: newRole }), type: 'success' })

          // Detect self-demotion
          let isSelfDemotion = false
          try {
            const token = localStorage.getItem('accessToken')
            if (token) {
              const payload = JSON.parse(atob(token.split('.')[1]))
              if (payload.userId === member.id && newRole === 'RECRUITER') {
                isSelfDemotion = true
              }
            }
          } catch (e) {
            console.error('Failed to parse token payload:', e)
          }

          if (isSelfDemotion) {
            localStorage.setItem('userRole', 'RECRUITER')
            // Delay slightly so user sees the success toast before redirecting
            setTimeout(() => {
              navigate('/dashboard')
            }, 1000)
          } else {
            fetchMembers()
          }
        } else {
          setToast({ message: data.error?.message ?? t('entreprise.confirm.roleUpdateFailed'), type: 'error' })
        }
      },
    })
  }

  async function handleDeactivate(member: Member) {
    setConfirm({
      open: true,
      title: t('entreprise.confirm.removeTitle', { name: member.firstName }),
      message: t('entreprise.confirm.removeMessage', { firstName: member.firstName, lastName: member.lastName }),
      confirmLabel: t('entreprise.confirm.removeConfirm'),
      danger: true,
      action: async () => {
        const res = await fetch(`${API_BASE_URL}/organisation/members/${member.id}`, {
          method: 'DELETE',
          headers: authHeaders(),
        })
        const data = await res.json()
        if (res.ok && data.success) {
          setToast({ message: t('entreprise.confirm.deactivated', { name: member.firstName }), type: 'success' })
          fetchMembers()
        } else {
          setToast({ message: data.error?.message ?? t('entreprise.confirm.deactivateFailed'), type: 'error' })
        }
      },
    })
  }

  async function handleConfirmAction() {
    setConfirmLoading(true)
    try {
      await confirm.action()
    } catch {
      setToast({ message: t('entreprise.confirm.unexpectedError'), type: 'error' })
    } finally {
      setConfirmLoading(false)
      setConfirm((c) => ({ ...c, open: false }))
    }
  }

  /* ── org save ── */
  async function handleSaveOrg(e: React.FormEvent) {
    e.preventDefault()
    setSlugError('')
    setSavingOrg(true)

    try {
      const body: Record<string, string> = {}
      if (orgName !== org?.name) body.name = orgName
      if (orgSlug !== org?.slug) body.slug = orgSlug

      if (Object.keys(body).length === 0) {
        setToast({ message: t('entreprise.org.noChanges'), type: 'error' })
        setSavingOrg(false)
        return
      }

      const res = await fetch(`${API_BASE_URL}/organisation`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (res.ok && data.success) {
        setOrg(data.data)
        setOrgName(data.data.name)
        setOrgSlug(data.data.slug)
        setToast({ message: t('entreprise.org.updated'), type: 'success' })
      } else if (data.error?.code === 'SLUG_TAKEN') {
        setSlugError(t('entreprise.org.slugTaken'))
      } else {
        setToast({ message: data.error?.message ?? t('entreprise.org.updateFailed'), type: 'error' })
      }
    } catch {
      setToast({ message: t('entreprise.org.networkError'), type: 'error' })
    } finally {
      setSavingOrg(false)
    }
  }

  /* ── render ── */
  const activeMembers = members.filter((m) => m.isActive)
  const deactivatedMembers = members.filter((m) => !m.isActive)

  return (
    <div className="ent-root">
      {toast && <ToastBanner toast={toast} onClose={() => setToast(null)} />}

      {/* ═══ Section 1: Team Members ═══ */}
      <section className="ent-section">
        <div className="ent-section-header">
          <div className="ent-section-title-row">
            <div className="ent-section-icon ent-section-icon--purple">
              <Users size={20} strokeWidth={1.8} />
            </div>
            <div>
              <h2 className="ent-section-title">{t('entreprise.team.title')}</h2>
              <p className="ent-section-sub">
                {activeMembers.length} {t('entreprise.team.activeCount', { count: activeMembers.length, plural: activeMembers.length !== 1 ? 's' : '' })}
              </p>
            </div>
          </div>
          <button className="ent-btn ent-btn--primary" onClick={() => setInviteOpen(true)}>
            <UserPlus size={16} /> {t('entreprise.team.inviteButton')}
          </button>
        </div>

        {loadingMembers ? (
          <div className="ent-loading">
            <Loader2 size={24} className="ent-spin" />
            <span>{t('entreprise.team.loadingMembers')}</span>
          </div>
        ) : (
          <div className="ent-table-wrap">
            <table className="ent-table">
              <thead>
                <tr>
                  <th>{t('entreprise.team.table.member')}</th>
                  <th>{t('entreprise.team.table.email')}</th>
                  <th>{t('entreprise.team.table.role')}</th>
                  <th>{t('entreprise.team.table.joined')}</th>
                  <th>{t('entreprise.team.table.status')}</th>
                  <th className="ent-th-actions">{t('entreprise.team.table.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {activeMembers.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <div className="ent-member-cell">
                        <div className="ent-member-avatar">
                          {m.firstName[0]}
                          {m.lastName[0]}
                        </div>
                        <span className="ent-member-name">
                          {m.firstName} {m.lastName}
                        </span>
                      </div>
                    </td>
                    <td className="ent-td-email">{m.email}</td>
                    <td>
                      <span className={`ent-badge ${m.role === 'ADMIN' ? 'ent-badge--purple' : 'ent-badge--blue'}`}>
                        {m.role === 'ADMIN' ? <Shield size={12} /> : <ShieldOff size={12} />}
                        {m.role === 'ADMIN' ? t('entreprise.invite.admin') : t('entreprise.invite.recruiter')}
                      </span>
                    </td>
                    <td className="ent-td-date">{formatDate(m.createdAt)}</td>
                    <td>
                      <span className="ent-badge ent-badge--green">{t('entreprise.team.status.active')}</span>
                    </td>
                    <td className="ent-td-actions">
                      <button
                        className="ent-action-btn ent-action-btn--role"
                        onClick={() => handleRoleChange(m)}
                        title={m.role === 'ADMIN' ? t('entreprise.team.demoteToRecruiter') : t('entreprise.team.promoteToAdmin')}
                      >
                        {m.role === 'ADMIN' ? <ShieldOff size={14} /> : <Shield size={14} />}
                      </button>
                      <button
                        className="ent-action-btn ent-action-btn--remove"
                        onClick={() => handleDeactivate(m)}
                        title={t('entreprise.team.deactivateMember')}
                      >
                        <UserX size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
                {pendingInvites.map((inv) => (
                  <tr key={`invite-${inv.id}`} className="ent-row--deactivated">
                    <td>
                      <div className="ent-member-cell">
                        <div className="ent-member-avatar ent-member-avatar--inactive">
                          <Clock size={14} />
                        </div>
                        <span className="ent-member-name" style={{ fontStyle: 'italic', opacity: 0.7 }}>
                          {t('entreprise.team.inviteSent')}
                        </span>
                      </div>
                    </td>
                    <td className="ent-td-email">{inv.email}</td>
                    <td>
                      <span className={`ent-badge ${inv.role === 'ADMIN' ? 'ent-badge--purple' : 'ent-badge--blue'}`}>
                        {inv.role === 'ADMIN' ? t('entreprise.invite.admin') : t('entreprise.invite.recruiter')}
                      </span>
                    </td>
                    <td className="ent-td-date">{formatDate(inv.createdAt)}</td>
                    <td>
                      <span className="ent-badge ent-badge--amber">
                        <Clock size={10} /> {t('entreprise.team.status.pending')}
                      </span>
                    </td>
                    <td className="ent-td-actions">—</td>
                  </tr>
                ))}
                {deactivatedMembers.map((m) => (
                  <tr key={m.id} className="ent-row--deactivated">
                    <td>
                      <div className="ent-member-cell">
                        <div className="ent-member-avatar ent-member-avatar--inactive">
                          {m.firstName[0]}
                          {m.lastName[0]}
                        </div>
                        <span className="ent-member-name">
                          {m.firstName} {m.lastName}
                        </span>
                      </div>
                    </td>
                    <td className="ent-td-email">{m.email}</td>
                    <td>
                      <span className="ent-badge ent-badge--gray">
                        {m.role === 'ADMIN' ? t('entreprise.invite.admin') : t('entreprise.invite.recruiter')}
                      </span>
                    </td>
                    <td className="ent-td-date">{formatDate(m.createdAt)}</td>
                    <td>
                      <span className={`ent-badge ${m.departureStatus === 'QUIT' ? 'ent-badge--amber' : 'ent-badge--red'}`}>
                        {m.departureStatus === 'QUIT' ? t('entreprise.team.status.quit') : t('entreprise.team.status.deactivated')}
                      </span>
                    </td>
                    <td className="ent-td-actions">—</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ═══ Section 2: Organisation Information ═══ */}
      <section className="ent-section">
        <div className="ent-section-header">
          <div className="ent-section-title-row">
            <div className="ent-section-icon ent-section-icon--amber">
              <Building2 size={20} strokeWidth={1.8} />
            </div>
            <div>
              <h2 className="ent-section-title">{t('entreprise.org.title')}</h2>
              <p className="ent-section-sub">{t('entreprise.org.subtitle')}</p>
            </div>
          </div>
        </div>

        {loadingOrg ? (
          <div className="ent-loading">
            <Loader2 size={24} className="ent-spin" />
            <span>{t('entreprise.org.loading')}</span>
          </div>
        ) : org ? (
          <form onSubmit={handleSaveOrg} className="ent-org-form">
            <div className="ent-org-grid">
              <div className="ent-field">
                <label>{t('entreprise.org.nameLabel')}</label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder={t('entreprise.org.namePlaceholder')}
                />
              </div>

              <div className="ent-field">
                <label>{t('entreprise.org.slugLabel')}</label>
                <input
                  type="text"
                  value={orgSlug}
                  onChange={(e) => {
                    setOrgSlug(e.target.value)
                    setSlugError('')
                  }}
                  placeholder={t('entreprise.org.slugPlaceholder')}
                />
                {slugError && (
                  <p className="ent-field-error">
                    <AlertTriangle size={12} /> {slugError}
                  </p>
                )}
              </div>
            </div>

            <div className="ent-org-info-row">
              <div className="ent-org-info-item">
                <span className="ent-org-info-label">{t('entreprise.org.planLabel')}</span>
                <span className="ent-badge ent-badge--amber">{org.plan}</span>
              </div>
              <div className="ent-org-info-item">
                <span className="ent-org-info-label">{t('entreprise.org.createdLabel')}</span>
                <span className="ent-org-info-value">{formatDate(org.createdAt)}</span>
              </div>
            </div>

            <button type="submit" disabled={savingOrg} className="ent-btn ent-btn--primary">
              {savingOrg ? (
                <>
                  <Loader2 size={16} className="ent-spin" /> {t('entreprise.org.saving')}
                </>
              ) : (
                <>
                  <Save size={16} /> {t('entreprise.org.saveButton')}
                </>
              )}
            </button>
          </form>
        ) : null}
      </section>

      {/* ═══ Section 3: AI Usage This Month ═══ */}
      <section className="ent-section">
        <div className="ent-section-header">
          <div className="ent-section-title-row">
            <div className="ent-section-icon ent-section-icon--purple">
              <Sparkles size={20} strokeWidth={1.8} />
            </div>
            <div>
              <h2 className="ent-section-title">{t('entreprise.aiUsage.title')}</h2>
              <p className="ent-section-sub">{t('entreprise.aiUsage.subtitle')}</p>
            </div>
          </div>
        </div>

        {aiUsageLoading ? (
          <div className="ent-loading">
            <Loader2 size={24} className="ent-spin" />
            <span>{t('entreprise.aiUsage.loading')}</span>
          </div>
        ) : aiUsageUnavailable ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted, #94a3b8)' }}>
            <AlertTriangle size={20} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
            {t('entreprise.aiUsage.unavailable')}
          </div>
        ) : aiUsage ? (
          <div style={{ padding: '1.25rem' }}>
            {/* Total tokens - large display */}
            <div style={{
              textAlign: 'center',
              padding: '1.5rem 0 1rem',
              borderBottom: '1px solid var(--border, rgba(148,163,184,0.15))',
              marginBottom: '1rem',
            }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted, #94a3b8)', marginBottom: 4 }}>
                {t('entreprise.aiUsage.totalTokens')}
              </p>
              <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary, #e2e8f0)' }}>
                {new Intl.NumberFormat('fr-FR').format(aiUsage.totalTokens)}
              </p>
            </div>

            {/* Feature breakdown */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
              {[
                { label: t('entreprise.aiUsage.cvParsing'), value: aiUsage.cvParsingTokens, accent: '#6366f1' },
                { label: t('entreprise.aiUsage.cvScoring'), value: aiUsage.cvScoringTokens, accent: '#8b5cf6' },
                { label: t('entreprise.aiUsage.enrichment'), value: aiUsage.cvEnrichmentTokens, accent: '#f59e0b' },
                { label: t('entreprise.aiUsage.chat'), value: aiUsage.chatTokens, accent: '#10b981' },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '0.625rem',
                    border: '1px solid var(--border, rgba(148,163,184,0.15))',
                    background: 'var(--card-bg, rgba(148,163,184,0.04))',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: item.accent, display: 'inline-block', flexShrink: 0,
                    }} />
                    <span style={{ fontSize: '0.7rem', fontWeight: 500, color: 'var(--text-muted, #94a3b8)' }}>
                      {item.label}
                    </span>
                  </div>
                  <p style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary, #e2e8f0)' }}>
                    {new Intl.NumberFormat('fr-FR').format(item.value)}
                  </p>
                </div>
              ))}
            </div>

            {/* 12-month usage history chart */}
            {aiUsageHistory && aiUsageHistory.length > 0 && !aiUsageHistory.every(h => h.totalTokens === 0) && (
              <div style={{
                marginTop: '2rem',
                paddingTop: '1.5rem',
                borderTop: '1px solid var(--border, rgba(148,163,184,0.15))',
              }}>
                <h4 style={{
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--text-primary, #e2e8f0)',
                  marginBottom: '1rem',
                }}>
                  {t('entreprise.aiUsage.historyTitle')}
                </h4>
                <div style={{ width: '100%', height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={aiUsageHistory.map((h) => ({
                        ...h,
                        name: (() => {
                          const d = new Date(h.year, h.month - 1);
                          return d.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
                        })(),
                      }))}
                      margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border, rgba(148,163,184,0.15))" vertical={false} />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11, fill: "var(--text-muted, #94a3b8)" }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "var(--text-muted, #94a3b8)" }}
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
                                      {new Intl.NumberFormat('fr-FR').format(entry.value)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                              <div className="pt-2 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between font-bold text-gray-950 dark:text-white">
                                <span>{t('entreprise.aiUsage.totalTokens')}</span>
                                <span className="font-mono">{new Intl.NumberFormat('fr-FR').format(payload.reduce((sum: number, e: any) => sum + e.value, 0))}</span>
                              </div>
                              <div className="text-[10px] text-gray-400 dark:text-gray-500 pt-0.5 flex justify-between">
                                <span>{t('entreprise.aiUsage.apiCalls')}</span>
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
                      <Bar name={t('entreprise.aiUsage.cvParsing')} dataKey="cvParsingTokens" stackId="a" fill="#6366f1" radius={[0, 0, 0, 0]} />
                      <Bar name={t('entreprise.aiUsage.cvScoring')} dataKey="cvScoringTokens" stackId="a" fill="#8b5cf6" radius={[0, 0, 0, 0]} />
                      <Bar name={t('entreprise.aiUsage.enrichment')} dataKey="cvEnrichmentTokens" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                      <Bar name={t('entreprise.aiUsage.chat')} dataKey="chatTokens" stackId="a" fill="#10b981" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted, #94a3b8)' }}>
            {t('entreprise.aiUsage.noUsage')}
          </div>
        )}
      </section>

      {/* ═══ Modals ═══ */}
      <InviteModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvited={(msg) => {
          setToast({ message: msg, type: 'success' })
          fetchMembers()
        }}
      />

      <ConfirmModal
        open={confirm.open}
        title={confirm.title}
        message={confirm.message}
        confirmLabel={confirm.confirmLabel}
        cancelLabel={t('entreprise.confirm.cancel')}
        danger={confirm.danger}
        loading={confirmLoading}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirm((c) => ({ ...c, open: false }))}
      />
    </div>
  )
}
