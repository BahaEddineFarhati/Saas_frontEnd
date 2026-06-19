import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  User,
  AlertCircle,
  Loader2,
  Lock,
  Upload,
  Users,
  FileText,
  CheckCircle2,
  XCircle,
} from "lucide-react";

// ── Config ──────────────────────────────────────────────
const API_BASE_URL = "http://localhost:3001/api/v1";

// ── Types ───────────────────────────────────────────────
interface JobDetail {
  id: string;
  title: string;
  profileDescription: string;
  status: "OPEN" | "CLOSED";
  organisationId: string;
  createdById: string;
  creatorName?: string;
  createdAt: string;
  updatedAt: string;
  candidateCount: number;
}

interface CurrentUser {
  userId: string;
  role: string;
  organisationId: string;
}

// ── Helpers ─────────────────────────────────────────────

/** Decode JWT payload (no validation — just extract claims) */
function decodeJwtPayload(token: string): CurrentUser | null {
  try {
    const base64 = token.split(".")[1];
    if (!base64) return null;
    const json = atob(base64.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(json);
    return {
      userId: payload.userId ?? "",
      role: payload.role ?? "",
      organisationId: payload.organisationId ?? "",
    };
  } catch {
    return null;
  }
}

/** Active auth promise to handle concurrent calls during StrictMode */
let activeAuthPromise: Promise<string> | null = null;

async function getAuthToken(): Promise<string> {
  const token = localStorage.getItem("accessToken") || localStorage.getItem("linkup_access_token");
  if (token) return token;

  if (activeAuthPromise) return activeAuthPromise;

  activeAuthPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "recruiter@acme.com",
          password: "Recruiter1234!",
        }),
      });
      const data = await res.json();
      if (data?.success && data?.data?.accessToken) {
        localStorage.setItem("linkup_access_token", data.data.accessToken);
        return data.data.accessToken;
      }
    } catch (err) {
      console.error("Auto-authentication failed:", err);
    } finally {
      activeAuthPromise = null;
    }
    return "";
  })();

  return activeAuthPromise;
}

function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
}

function formatDateRelative(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
}

// ── Component ───────────────────────────────────────────
export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Data state
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  // Close action state
  const [isClosing, setIsClosing] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  // Current user (from JWT + localStorage fallback for role)
  const currentUser = useMemo<CurrentUser | null>(() => {
    const token =
      localStorage.getItem("accessToken") ||
      localStorage.getItem("linkup_access_token");
    if (!token) return null;
    const decoded = decodeJwtPayload(token);
    if (!decoded) return null;
    // JWT may not contain role — use localStorage fallback set at login
    if (!decoded.role) {
      decoded.role = localStorage.getItem("userRole") || "";
    }
    return decoded;
  }, []);

  // ── Fetch job data ────────────────────────────────────
  const fetchJob = async () => {
    try {
      setLoading(true);
      setError(null);
      setNotFound(false);
      let token = await getAuthToken();

      let res = await fetch(`${API_BASE_URL}/jobs/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // 401 retry
      if (res.status === 401) {
        localStorage.removeItem("linkup_access_token");
        localStorage.removeItem("accessToken");
        token = await getAuthToken();
        res = await fetch(`${API_BASE_URL}/jobs/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      if (res.status === 404) {
        setNotFound(true);
        return;
      }

      if (!res.ok) {
        throw new Error(`Erreur serveur (${res.status})`);
      }

      const resData = await res.json();
      if (resData?.success && resData?.data) {
        setJob(resData.data);
      } else {
        throw new Error(resData?.error?.message || "Erreur inconnue");
      }
    } catch (err: any) {
      setError(err.message || "Impossible de charger l'offre.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchJob();
  }, [id]);

  // ── Close job handler ─────────────────────────────────
  const handleCloseJob = async () => {
    if (!job) return;
    try {
      setIsClosing(true);
      setCloseError(null);
      const token = await getAuthToken();

      const res = await fetch(`${API_BASE_URL}/jobs/${job.id}/close`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });

      const resData = await res.json();

      if (!res.ok) {
        throw new Error(
          resData?.error?.message || "Impossible de clôturer l'offre."
        );
      }

      if (resData?.success && resData?.data) {
        // Update status in-place without page reload
        setJob((prev) =>
          prev ? { ...prev, status: resData.data.status } : null
        );
        setShowCloseConfirm(false);
      }
    } catch (err: any) {
      setCloseError(err.message || "Échec de la clôture.");
    } finally {
      setIsClosing(false);
    }
  };

  // ── Permission check ──────────────────────────────────
  const canClose =
    job &&
    job.status === "OPEN" &&
    currentUser &&
    (currentUser.role === "ADMIN" || currentUser.userId === job.createdById);

  // ══════════════════════════════════════════════════════
  //  RENDER: Loading skeleton
  // ══════════════════════════════════════════════════════
  if (loading) {
    return (
      <div className="db-root">
        {/* Back link skeleton */}
        <div className="jd-back-row">
          <div
            className="cand-skeleton-bar cand-skeleton-pulse"
            style={{ width: "140px", height: "16px" }}
          />
        </div>

        {/* Header skeleton */}
        <div className="jd-header-card db-card">
          <div className="jd-header-top">
            <div style={{ flex: 1 }}>
              <div
                className="cand-skeleton-bar cand-skeleton-pulse"
                style={{ width: "260px", height: "24px", marginBottom: "12px" }}
              />
              <div
                className="cand-skeleton-bar cand-skeleton-pulse"
                style={{ width: "180px", height: "14px" }}
              />
            </div>
            <div
              className="cand-skeleton-badge cand-skeleton-pulse"
              style={{ width: "80px", height: "28px" }}
            />
          </div>
          <div className="jd-meta-row" style={{ marginTop: "20px" }}>
            <div
              className="cand-skeleton-bar cand-skeleton-pulse"
              style={{ width: "140px" }}
            />
            <div
              className="cand-skeleton-bar cand-skeleton-pulse"
              style={{ width: "120px" }}
            />
          </div>
        </div>

        {/* Description skeleton */}
        <div className="db-card">
          <div
            className="cand-skeleton-bar cand-skeleton-pulse"
            style={{ width: "160px", height: "16px", marginBottom: "16px" }}
          />
          <div
            className="cand-skeleton-bar cand-skeleton-pulse"
            style={{ width: "100%", height: "14px", marginBottom: "10px" }}
          />
          <div
            className="cand-skeleton-bar cand-skeleton-pulse"
            style={{ width: "90%", height: "14px", marginBottom: "10px" }}
          />
          <div
            className="cand-skeleton-bar cand-skeleton-pulse"
            style={{ width: "70%", height: "14px" }}
          />
        </div>

        {/* Candidates skeleton */}
        <div className="db-card">
          <div
            className="cand-skeleton-bar cand-skeleton-pulse"
            style={{ width: "140px", height: "16px", marginBottom: "16px" }}
          />
          <div
            className="cand-skeleton-bar cand-skeleton-pulse"
            style={{ width: "200px", height: "14px" }}
          />
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════
  //  RENDER: 404 Not Found
  // ══════════════════════════════════════════════════════
  if (notFound) {
    return (
      <div className="db-root">
        <div className="jd-not-found">
          <div className="jd-not-found-icon">
            <XCircle size={48} strokeWidth={1.4} />
          </div>
          <h2 className="jd-not-found-title">Offre introuvable</h2>
          <p className="jd-not-found-body">
            Cette offre d'emploi n'existe pas, a été supprimée ou appartient à
            une autre organisation.
          </p>
          <Link to="/candidatures" className="cand-btn-primary" style={{ marginTop: "20px" }}>
            <ArrowLeft size={14} strokeWidth={2.4} />
            <span>Retour aux offres</span>
          </Link>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════
  //  RENDER: Error state
  // ══════════════════════════════════════════════════════
  if (error || !job) {
    return (
      <div className="db-root">
        <div className="jd-back-row">
          <Link to="/candidatures" className="jd-back-link">
            <ArrowLeft size={15} strokeWidth={2} />
            <span>Retour aux offres</span>
          </Link>
        </div>
        <div className="cand-error-alert">
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <AlertCircle size={16} />
            <span>{error || "Impossible de charger l'offre."}</span>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════
  //  RENDER: Job Detail
  // ══════════════════════════════════════════════════════
  return (
    <div className="db-root">
      {/* ── Back navigation ── */}
      <div className="jd-back-row">
        <Link to="/candidatures" className="jd-back-link" id="back-to-list">
          <ArrowLeft size={15} strokeWidth={2} />
          <span>Retour aux offres</span>
        </Link>
      </div>

      {/* ── Header card ── */}
      <div className="jd-header-card db-card" id="job-header">
        <div className="jd-header-top">
          <div className="jd-header-info">
            <h2 className="jd-title">{job.title}</h2>
            <div className="jd-meta-row">
              <span className="jd-meta-item">
                <Calendar size={13} strokeWidth={2} />
                <span>Créé le {formatDate(job.createdAt)}</span>
              </span>
              <span className="jd-meta-item">
                <User size={13} strokeWidth={2} />
                <span>Recruteur</span>
              </span>
              <span className="jd-meta-item">
                <Users size={13} strokeWidth={2} />
                <span>
                  {job.candidateCount}{" "}
                  {job.candidateCount === 1 ? "candidat" : "candidats"}
                </span>
              </span>
            </div>
          </div>

          <div className="jd-header-actions">
            <span
              className={`db-badge jd-status-badge ${
                job.status === "OPEN" ? "badge--green" : "badge--gray"
              }`}
            >
              {job.status === "OPEN" ? "Ouverte" : "Clôturée"}
            </span>

            {canClose && (
              <button
                onClick={() => setShowCloseConfirm(true)}
                className="jd-btn-close"
                id="btn-close-job"
              >
                <Lock size={14} strokeWidth={2.2} />
                <span>Fermer cette offre</span>
              </button>
            )}
          </div>
        </div>

        {/* Close error */}
        {closeError && (
          <div className="cand-error-alert" style={{ marginTop: "16px" }}>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <AlertCircle size={16} />
              <span>{closeError}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Close confirmation modal ── */}
      {showCloseConfirm && (
        <>
          <div
            className="cand-drawer-overlay cand-drawer-overlay--open"
            onClick={() => !isClosing && setShowCloseConfirm(false)}
          />
          <div className="jd-confirm-modal" id="close-confirm-modal">
            <div className="jd-confirm-icon">
              <Lock size={24} strokeWidth={1.8} />
            </div>
            <h3 className="jd-confirm-title">Clôturer cette offre ?</h3>
            <p className="jd-confirm-body">
              Cette action changera le statut de l'offre «&nbsp;
              <strong>{job.title}</strong>&nbsp;» en <strong>Clôturée</strong>.
              Les candidats existants seront conservés. Cette action est
              irréversible.
            </p>
            <div className="jd-confirm-actions">
              <button
                className="cand-btn-secondary"
                onClick={() => setShowCloseConfirm(false)}
                disabled={isClosing}
              >
                Annuler
              </button>
              <button
                className="jd-btn-confirm-close"
                onClick={handleCloseJob}
                disabled={isClosing}
                id="confirm-close-job"
              >
                {isClosing ? (
                  <>
                    <Loader2 size={14} className="cand-skeleton-pulse" />
                    <span>Clôture...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} strokeWidth={2.2} />
                    <span>Confirmer la clôture</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Profile Description card ── */}
      <div className="db-card" id="job-description">
        <div className="jd-section-header">
          <FileText
            size={16}
            strokeWidth={2}
            style={{ color: "var(--lu-accent)" }}
          />
          <h3 className="jd-section-title">Description du profil recherché</h3>
        </div>
        <div className="jd-description-content">
          {job.profileDescription.split("\n").map((paragraph, i) => (
            <p key={i} className="jd-description-paragraph">
              {paragraph || "\u00A0"}
            </p>
          ))}
        </div>
      </div>

      {/* ── Candidates section (empty state) ── */}
      <div className="db-card" id="candidates-section">
        <div className="jd-section-header">
          <Users
            size={16}
            strokeWidth={2}
            style={{ color: "var(--lu-accent)" }}
          />
          <h3 className="jd-section-title">
            Candidats{" "}
            <span className="jd-section-count">({job.candidateCount})</span>
          </h3>
        </div>

        {/* Empty state */}
        <div className="jd-candidates-empty">
          <div className="jd-candidates-empty-icon">
            <Upload size={32} strokeWidth={1.4} />
          </div>
          <h4 className="jd-candidates-empty-title">
            Aucun candidat pour l'instant
          </h4>
          <p className="jd-candidates-empty-body">
            Uploadez des CVs pour démarrer le processus de sélection. Notre IA
            analysera automatiquement les profils et les classera selon leur
            adéquation avec le poste.
          </p>
          <button
            className="cand-btn-primary"
            style={{ marginTop: "12px" }}
            disabled={job.status === "CLOSED"}
            id="btn-upload-cv"
          >
            <Upload size={14} strokeWidth={2.4} />
            <span>Uploader des CVs</span>
          </button>
          {job.status === "CLOSED" && (
            <p className="jd-upload-disabled-note">
              L'upload de CVs est désactivé pour les offres clôturées.
            </p>
          )}
        </div>
      </div>

      {/* ── Last updated ── */}
      <p className="jd-updated-note">
        Dernière mise à jour : {formatDateRelative(job.updatedAt)}
      </p>
    </div>
  );
}
