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
} from 'lucide-react'

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
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'RECRUITER' | 'ADMIN'>('RECRUITER')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!open) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) {
      setError('Email is required')
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
        onInvited(`Invitation sent to ${email}`)
        setEmail('')
        setRole('RECRUITER')
        onClose()
      } else {
        setError(data.error?.message ?? 'Failed to send invitation')
      }
    } catch {
      setError('Network error. Please try again.')
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
          <h3>Invite a team member</h3>
          <button className="ent-modal-close" onClick={onClose} aria-label="Close">
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
            <label>Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setError('')
              }}
              placeholder="colleague@company.com"
              autoFocus
            />
          </div>

          <div className="ent-field">
            <label>Role</label>
            <div className="ent-role-pills">
              <button
                type="button"
                className={`ent-role-pill ${role === 'RECRUITER' ? 'ent-role-pill--active' : ''}`}
                onClick={() => setRole('RECRUITER')}
              >
                <ShieldOff size={14} /> Recruiter
              </button>
              <button
                type="button"
                className={`ent-role-pill ${role === 'ADMIN' ? 'ent-role-pill--active' : ''}`}
                onClick={() => setRole('ADMIN')}
              >
                <Shield size={14} /> Admin
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="ent-btn ent-btn--primary ent-btn--full">
            {loading ? (
              <>
                <Loader2 size={16} className="ent-spin" /> Sending…
              </>
            ) : (
              <>
                <UserPlus size={16} /> Send Invitation
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
  danger,
  loading,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  message: string
  confirmLabel: string
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
              Cancel
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
      setToast({ message: 'Failed to load team members', type: 'error' })
    } finally {
      setLoadingMembers(false)
    }
  }, [navigate])

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
      setToast({ message: 'Failed to load organisation info', type: 'error' })
    } finally {
      setLoadingOrg(false)
    }
  }, [navigate])

  useEffect(() => {
    fetchMembers()
    fetchOrg()
  }, [fetchMembers, fetchOrg])

  /* ── member actions ── */
  async function handleRoleChange(member: Member) {
    const newRole = member.role === 'ADMIN' ? 'RECRUITER' : 'ADMIN'
    const action = member.role === 'ADMIN' ? 'demote' : 'promote'

    setConfirm({
      open: true,
      title: `${action === 'promote' ? 'Promote' : 'Demote'} ${member.firstName}?`,
      message: `Change ${member.firstName} ${member.lastName}'s role from ${member.role} to ${newRole}?`,
      confirmLabel: action === 'promote' ? 'Promote to Admin' : 'Demote to Recruiter',
      danger: action === 'demote',
      action: async () => {
        const res = await fetch(`${API_BASE_URL}/organisation/members/${member.id}/role`, {
          method: 'PATCH',
          headers: authHeaders(),
          body: JSON.stringify({ role: newRole }),
        })
        const data = await res.json()
        if (res.ok && data.success) {
          setToast({ message: `${member.firstName}'s role updated to ${newRole}`, type: 'success' })

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
          setToast({ message: data.error?.message ?? 'Failed to update role', type: 'error' })
        }
      },
    })
  }

  async function handleDeactivate(member: Member) {
    setConfirm({
      open: true,
      title: `Remove ${member.firstName}?`,
      message: `This will deactivate ${member.firstName} ${member.lastName}'s account. They will no longer be able to log in and their active sessions will be terminated immediately. This action cannot be undone.`,
      confirmLabel: 'Remove Member',
      danger: true,
      action: async () => {
        const res = await fetch(`${API_BASE_URL}/organisation/members/${member.id}`, {
          method: 'DELETE',
          headers: authHeaders(),
        })
        const data = await res.json()
        if (res.ok && data.success) {
          setToast({ message: `${member.firstName} has been deactivated`, type: 'success' })
          fetchMembers()
        } else {
          setToast({ message: data.error?.message ?? 'Failed to deactivate member', type: 'error' })
        }
      },
    })
  }

  async function handleConfirmAction() {
    setConfirmLoading(true)
    try {
      await confirm.action()
    } catch {
      setToast({ message: 'An unexpected error occurred', type: 'error' })
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
        setToast({ message: 'No changes to save', type: 'error' })
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
        setToast({ message: 'Organisation updated successfully', type: 'success' })
      } else if (data.error?.code === 'SLUG_TAKEN') {
        setSlugError('This slug is already taken by another organisation')
      } else {
        setToast({ message: data.error?.message ?? 'Failed to update organisation', type: 'error' })
      }
    } catch {
      setToast({ message: 'Network error. Please try again.', type: 'error' })
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
              <h2 className="ent-section-title">Team Members</h2>
              <p className="ent-section-sub">
                {activeMembers.length} active member{activeMembers.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button className="ent-btn ent-btn--primary" onClick={() => setInviteOpen(true)}>
            <UserPlus size={16} /> Invite Member
          </button>
        </div>

        {loadingMembers ? (
          <div className="ent-loading">
            <Loader2 size={24} className="ent-spin" />
            <span>Loading members…</span>
          </div>
        ) : (
          <div className="ent-table-wrap">
            <table className="ent-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th>Status</th>
                  <th className="ent-th-actions">Actions</th>
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
                        {m.role}
                      </span>
                    </td>
                    <td className="ent-td-date">{formatDate(m.createdAt)}</td>
                    <td>
                      <span className="ent-badge ent-badge--green">Active</span>
                    </td>
                    <td className="ent-td-actions">
                      <button
                        className="ent-action-btn ent-action-btn--role"
                        onClick={() => handleRoleChange(m)}
                        title={m.role === 'ADMIN' ? 'Demote to Recruiter' : 'Promote to Admin'}
                      >
                        {m.role === 'ADMIN' ? <ShieldOff size={14} /> : <Shield size={14} />}
                      </button>
                      <button
                        className="ent-action-btn ent-action-btn--remove"
                        onClick={() => handleDeactivate(m)}
                        title="Deactivate member"
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
                          Invitation envoyée
                        </span>
                      </div>
                    </td>
                    <td className="ent-td-email">{inv.email}</td>
                    <td>
                      <span className={`ent-badge ${inv.role === 'ADMIN' ? 'ent-badge--purple' : 'ent-badge--blue'}`}>
                        {inv.role}
                      </span>
                    </td>
                    <td className="ent-td-date">{formatDate(inv.createdAt)}</td>
                    <td>
                      <span className="ent-badge ent-badge--amber">
                        <Clock size={10} /> Pending
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
                        {m.role}
                      </span>
                    </td>
                    <td className="ent-td-date">{formatDate(m.createdAt)}</td>
                    <td>
                      <span className={`ent-badge ${m.departureStatus === 'QUIT' ? 'ent-badge--amber' : 'ent-badge--red'}`}>
                        {m.departureStatus === 'QUIT' ? 'Quit' : 'Deactivated'}
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
              <h2 className="ent-section-title">Organisation Information</h2>
              <p className="ent-section-sub">Manage your organisation details</p>
            </div>
          </div>
        </div>

        {loadingOrg ? (
          <div className="ent-loading">
            <Loader2 size={24} className="ent-spin" />
            <span>Loading organisation…</span>
          </div>
        ) : org ? (
          <form onSubmit={handleSaveOrg} className="ent-org-form">
            <div className="ent-org-grid">
              <div className="ent-field">
                <label>Organisation Name</label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Acme Corp"
                />
              </div>

              <div className="ent-field">
                <label>Slug</label>
                <input
                  type="text"
                  value={orgSlug}
                  onChange={(e) => {
                    setOrgSlug(e.target.value)
                    setSlugError('')
                  }}
                  placeholder="acme-corp"
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
                <span className="ent-org-info-label">Plan</span>
                <span className="ent-badge ent-badge--amber">{org.plan}</span>
              </div>
              <div className="ent-org-info-item">
                <span className="ent-org-info-label">Created</span>
                <span className="ent-org-info-value">{formatDate(org.createdAt)}</span>
              </div>
            </div>

            <button type="submit" disabled={savingOrg} className="ent-btn ent-btn--primary">
              {savingOrg ? (
                <>
                  <Loader2 size={16} className="ent-spin" /> Saving…
                </>
              ) : (
                <>
                  <Save size={16} /> Save Changes
                </>
              )}
            </button>
          </form>
        ) : null}
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
        danger={confirm.danger}
        loading={confirmLoading}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirm((c) => ({ ...c, open: false }))}
      />
    </div>
  )
}
