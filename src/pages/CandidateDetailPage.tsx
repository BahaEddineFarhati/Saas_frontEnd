import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  XCircle,
  Star,
  ChevronDown,
  ChevronUp,
  FileText,
  ShieldCheck,
} from "lucide-react";

const API_BASE_URL = "http://localhost:3001/api/v1";

interface CandidateDetail {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string | null;
  status: "PENDING" | "NEW" | "SHORTLISTED" | "REJECTED" | "OFFERED" | "SCORED" | "FAILED";
  score: number | null;
  createdAt: string;
  cv: {
    rawFileUrl: string;
  };
  profile: Record<string, unknown>;
  scoring: {
    score: number | null;
    verdict: string | null;
    matchedCriteria: string[];
    missingCriteria: string[];
    strengths: string[];
  };
  summary: string | null;
  interviewQuestions: Array<{ question: string; rationale: string }>;
}

function getScoreBadgeColor(score: number | null) {
  if (score === null || score === undefined) {
    return { backgroundColor: "var(--lu-bg-secondary)", color: "var(--lu-text-secondary)" };
  }
  if (score >= 80) return { backgroundColor: "#dcfce7", color: "#166534" };
  if (score >= 60) return { backgroundColor: "#dbeafe", color: "#1e40af" };
  if (score >= 40) return { backgroundColor: "#fef3c7", color: "#92400e" };
  return { backgroundColor: "#fee2e2", color: "#7f1d1d" };
}

function getVerdictBadgeColor(verdict: string | null) {
  switch (verdict) {
    case "STRONG_FIT":
      return { backgroundColor: "#dcfce7", color: "#166534" };
    case "GOOD_FIT":
      return { backgroundColor: "#dbeafe", color: "#1e40af" };
    case "PARTIAL_FIT":
      return { backgroundColor: "#fef3c7", color: "#92400e" };
    case "WEAK_FIT":
      return { backgroundColor: "#fee2e2", color: "#7f1d1d" };
    default:
      return { backgroundColor: "var(--lu-bg-secondary)", color: "var(--lu-text-secondary)" };
  }
}

function getVerdictLabel(verdict: string | null) {
  switch (verdict) {
    case "STRONG_FIT":
      return "Très bon fit";
    case "GOOD_FIT":
      return "Bon fit";
    case "PARTIAL_FIT":
      return "Partiellement adéquat";
    case "WEAK_FIT":
      return "Peu adéquat";
    default:
      return "Pas de verdict";
  }
}

function getStatusLabel(status: CandidateDetail["status"]) {
  switch (status) {
    case "PENDING":
      return "En attente";
    case "NEW":
      return "Nouveau";
    case "SHORTLISTED":
      return "Shortlisté";
    case "REJECTED":
      return "Rejeté";
    case "OFFERED":
      return "Offre";
    case "SCORED":
      return "Scoré";
    case "FAILED":
      return "Échoué";
    default:
      return status;
  }
}

function getStatusBadgeStyle(status: CandidateDetail["status"]) {
  switch (status) {
    case "SHORTLISTED":
      return { backgroundColor: "#dbebff", color: "#1d4ed8" };
    case "REJECTED":
      return { backgroundColor: "#fee2e2", color: "#b91c1c" };
    case "PENDING":
      return { backgroundColor: "#f8fafc", color: "#475569" };
    case "SCORED":
      return { backgroundColor: "#ecfccb", color: "#365314" };
    case "FAILED":
      return { backgroundColor: "#fee2e2", color: "#991b1b" };
    case "OFFERED":
      return { backgroundColor: "#dcfce7", color: "#166534" };
    default:
      return { backgroundColor: "#f1f5f9", color: "#475569" };
  }
}

interface CandidateLocationState {
  fromJobDetail?: boolean;
}

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

export default function CandidateDetailPage() {
  const { jobId, candidateId } = useParams<{ jobId: string; candidateId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [candidate, setCandidate] = useState<CandidateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [expandedQuestions, setExpandedQuestions] = useState<Record<number, boolean>>({});
  const [rawOpen, setRawOpen] = useState(false);

  const fromJobDetail = useMemo(() => {
    return (location.state as CandidateLocationState | null)?.fromJobDetail === true;
  }, [location.state]);

  useEffect(() => {
    async function loadCandidate() {
      if (!jobId || !candidateId) {
        setError("Informations du candidat manquantes.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const token = await getAuthToken();
        const res = await fetch(`${API_BASE_URL}/jobs/${jobId}/candidates/${candidateId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error?.message || "Impossible de charger le candidat.");
        }

        const body = await res.json();
        if (!body?.success || !body?.data) {
          throw new Error(body?.error?.message || "Données du candidat invalides.");
        }

        setCandidate(body.data as CandidateDetail);
      } catch (err: any) {
        setError(err?.message || "Erreur inconnue lors du chargement.");
      } finally {
        setLoading(false);
      }
    }

    loadCandidate();
  }, [jobId, candidateId]);

  const handleGoBack = () => {
    if (fromJobDetail) {
      navigate(-1);
      return;
    }

    if (jobId) {
      navigate(`/candidatures/${jobId}`);
      return;
    }

    navigate("/candidatures");
  };

  const handleStatusUpdate = async (status: "SHORTLISTED" | "REJECTED") => {
    if (!jobId || !candidateId) return;
    setActionLoading(true);
    setActionError(null);

    try {
      const token = await getAuthToken();
      const res = await fetch(`${API_BASE_URL}/jobs/${jobId}/candidates/${candidateId}/status`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message || "Impossible de mettre à jour le statut.");
      }

      const body = await res.json();
      if (!body?.success || !body?.data) {
        throw new Error(body?.error?.message || "Mise à jour du statut impossible.");
      }

      setCandidate((prev) =>
        prev
          ? {
              ...prev,
              status: body.data.status,
            }
          : prev
      );
    } catch (err: any) {
      setActionError(err?.message || "Erreur lors de la mise à jour du statut.");
    } finally {
      setActionLoading(false);
    }
  };

  const toggleQuestion = (index: number) => {
    setExpandedQuestions((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const profileWorkExperience = Array.isArray(candidate?.profile?.workExperience)
    ? (candidate?.profile?.workExperience as Array<Record<string, unknown>>)
    : [];
  const profileEducation = Array.isArray(candidate?.profile?.education)
    ? (candidate?.profile?.education as Array<Record<string, unknown>>)
    : [];
  const profileSkills = Array.isArray(candidate?.profile?.skills)
    ? (candidate?.profile?.skills as string[])
    : [];
  const profileLanguages = Array.isArray(candidate?.profile?.languages)
    ? (candidate?.profile?.languages as Array<Record<string, unknown>>)
    : [];

  return (
    <div className="db-root">
      <div className="jd-back-row">
        <button className="jd-back-link" onClick={handleGoBack}>
          <ArrowLeft size={15} strokeWidth={2} />
          <span>Retour aux candidats</span>
        </button>
      </div>

      {loading ? (
        <div className="db-card" style={{ padding: 24 }}>
          <Loader2 size={20} className="cand-skeleton-pulse" /> Chargement du candidat...
        </div>
      ) : error ? (
        <div className="db-card" style={{ padding: 24 }}>
          <div className="cand-error-alert">
            <XCircle size={16} /> <span>{error}</span>
          </div>
        </div>
      ) : candidate ? (
        <>
          <div className="jd-header-card db-card" style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 280 }}>
                <h2 style={{ margin: 0, fontSize: "1.75rem" }}>
                  {candidate.firstName || ""} {candidate.lastName || ""}
                </h2>
                <p style={{ marginTop: 8, color: "var(--lu-text-secondary)" }}>
                  {candidate.email ?? "Email non disponible"} • {candidate.phone ?? "Téléphone non disponible"}
                </p>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 14px",
                    borderRadius: 999,
                    fontWeight: 600,
                    fontSize: "0.95em",
                    backgroundColor: getScoreBadgeColor(candidate.score).backgroundColor,
                    color: getScoreBadgeColor(candidate.score).color,
                  }}
                >
                  Score : {candidate.score ?? "-"}
                </span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 14px",
                    borderRadius: 999,
                    fontWeight: 600,
                    fontSize: "0.95em",
                    backgroundColor: getVerdictBadgeColor(candidate.scoring.verdict).backgroundColor,
                    color: getVerdictBadgeColor(candidate.scoring.verdict).color,
                  }}
                >
                  {getVerdictLabel(candidate.scoring.verdict)}
                </span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 14px",
                    borderRadius: 999,
                    fontWeight: 600,
                    fontSize: "0.95em",
                    backgroundColor: getStatusBadgeStyle(candidate.status).backgroundColor,
                    color: getStatusBadgeStyle(candidate.status).color,
                  }}
                >
                  {getStatusLabel(candidate.status)}
                </span>
              </div>
            </div>

            <div style={{ marginTop: 24, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                onClick={() => handleStatusUpdate("SHORTLISTED")}
                disabled={actionLoading || candidate.status === "SHORTLISTED"}
                className="cand-btn-primary"
                style={{ opacity: candidate.status === "SHORTLISTED" ? 0.55 : 1 }}
              >
                Shortlister
              </button>
              <button
                onClick={() => handleStatusUpdate("REJECTED")}
                disabled={actionLoading || candidate.status === "REJECTED"}
                className="cand-btn-secondary"
                style={{ opacity: candidate.status === "REJECTED" ? 0.55 : 1 }}
              >
                Rejeter
              </button>
            </div>

            {actionError && (
              <div className="cand-error-alert" style={{ marginTop: 16 }}>
                <XCircle size={16} /> <span>{actionError}</span>
              </div>
            )}
          </div>

          <div className="db-card" style={{ padding: 24, marginTop: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <FileText size={18} style={{ color: "var(--lu-accent)" }} />
              <h3 style={{ margin: 0, fontSize: "1.05rem" }}>Résumé AI</h3>
            </div>
            <div style={{ minHeight: 120, padding: 18, borderRadius: 12, backgroundColor: "var(--lu-bg-secondary)" }}>
              {candidate.summary ? (
                <p style={{ margin: 0, lineHeight: 1.7 }}>{candidate.summary}</p>
              ) : (
                <p style={{ margin: 0, color: "var(--lu-text-secondary)" }}>
                  Résumé non disponible pour le moment.
                </p>
              )}
            </div>
          </div>

          <div className="db-card" style={{ padding: 24, marginTop: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <ShieldCheck size={18} style={{ color: "var(--lu-accent)" }} />
              <h3 style={{ margin: 0, fontSize: "1.05rem" }}>Analyse du score</h3>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div>
                <h4 style={{ marginBottom: 12 }}>Critères satisfaits</h4>
                {candidate.scoring.matchedCriteria.length > 0 ? (
                  <ul style={{ margin: 0, paddingLeft: 20, listStyle: "none" }}>
                    {candidate.scoring.matchedCriteria.map((item, index) => (
                      <li key={index} style={{ marginBottom: 10, display: "flex", gap: 8, alignItems: "flex-start" }}>
                        <span style={{ color: "#16a34a", marginTop: 2 }}>✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ margin: 0, color: "var(--lu-text-secondary)" }}>Aucun critère satisfait</p>
                )}
              </div>

              <div>
                <h4 style={{ marginBottom: 12 }}>Critères manquants</h4>
                {candidate.scoring.missingCriteria.length > 0 ? (
                  <ul style={{ margin: 0, paddingLeft: 20, listStyle: "none" }}>
                    {candidate.scoring.missingCriteria.map((item, index) => (
                      <li key={index} style={{ marginBottom: 10, display: "flex", gap: 8, alignItems: "flex-start" }}>
                        <span style={{ color: "#dc2626", marginTop: 2 }}>✕</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ margin: 0, color: "var(--lu-text-secondary)" }}>Aucun critère manquant</p>
                )}
              </div>
            </div>
            <div style={{ marginTop: 20 }}>
              <h4 style={{ marginBottom: 12 }}>Points forts</h4>
              {candidate.scoring.strengths.length > 0 ? (
                <div style={{ display: "grid", gap: 8 }}>
                  {candidate.scoring.strengths.map((item, index) => (
                    <div
                      key={index}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "10px 14px",
                        borderRadius: 10,
                        backgroundColor: "var(--lu-bg-secondary)",
                      }}
                    >
                      <Star size={16} style={{ color: "#f59e0b" }} />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ margin: 0, color: "var(--lu-text-secondary)" }}>Aucun point fort identifié</p>
              )}
            </div>
          </div>

          <div className="db-card" style={{ padding: 24, marginTop: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <ShieldCheck size={18} style={{ color: "var(--lu-accent)" }} />
              <h3 style={{ margin: 0, fontSize: "1.05rem" }}>Questions d'entretien</h3>
            </div>
            {candidate.interviewQuestions.length > 0 ? (
              <div style={{ display: "grid", gap: 12 }}>
                {candidate.interviewQuestions.map((questionItem, index) => (
                  <div
                    key={index}
                    style={{
                      border: "1px solid var(--lu-border)",
                      borderRadius: 12,
                      padding: 16,
                      backgroundColor: "var(--lu-bg-page)",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => toggleQuestion(index)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        background: "none",
                        border: "none",
                        padding: 0,
                        color: "inherit",
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <strong>{index + 1}. </strong>
                        {questionItem.question}
                      </div>
                      {expandedQuestions[index] ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                    {expandedQuestions[index] && (
                      <p style={{ marginTop: 12, color: "var(--lu-text-secondary)", lineHeight: 1.7 }}>
                        {questionItem.rationale}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ margin: 0, color: "var(--lu-text-secondary)" }}>
                Les questions d'entretien ne sont pas encore disponibles.
              </p>
            )}
          </div>

          <div className="db-card" style={{ padding: 24, marginTop: 20 }}>
            <button
              type="button"
              onClick={() => setRawOpen(!rawOpen)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                padding: "16px 18px",
                border: "1px solid var(--lu-border)",
                borderRadius: 12,
                background: "var(--lu-bg-page)",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <FileText size={18} style={{ color: "var(--lu-accent)" }} />
                <div>
                  <strong>Données brutes du profil</strong>
                  <p style={{ margin: 0, color: "var(--lu-text-secondary)", fontSize: "0.95em" }}>
                    Travail, formation, compétences et langues.
                  </p>
                </div>
              </div>
              {rawOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            {rawOpen && (
              <div style={{ marginTop: 20, display: "grid", gap: 20 }}>
                {profileWorkExperience.length > 0 && (
                  <div>
                    <h4 style={{ marginBottom: 10 }}>Expérience professionnelle</h4>
                    {profileWorkExperience.map((item, index) => (
                      <div key={index} style={{ marginBottom: 16, padding: 16, borderRadius: 12, backgroundColor: "var(--lu-bg-secondary)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                          <strong>{String(item.title || item.position || "")}</strong>
                          <span style={{ color: "var(--lu-text-secondary)" }}>
                            {String(item.startDate ?? "")} – {String(item.endDate ?? "Aujourd'hui")}
                          </span>
                        </div>
                        <p style={{ margin: "8px 0 0", color: "var(--lu-text-secondary)" }}>
                          {String(item.company || item.employer || "Entreprise non spécifiée")}
                        </p>
                        {typeof item.description === "string" && (
                          <p style={{ marginTop: 8, color: "var(--lu-text-secondary)", lineHeight: 1.7 }}>
                            {item.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {profileEducation.length > 0 && (
                  <div>
                    <h4 style={{ marginBottom: 10 }}>Formation</h4>
                    <div style={{ display: "grid", gap: 12 }}>
                      {profileEducation.map((item, index) => (
                        <div key={index} style={{ padding: 16, borderRadius: 12, backgroundColor: "var(--lu-bg-secondary)" }}>
                          <strong>{String(item.degree || item.fieldOfStudy || "Diplôme inconnu")}</strong>
                          <p style={{ margin: "6px 0 0", color: "var(--lu-text-secondary)" }}>
                            {String(item.school || item.institution || "Établissement inconnu")}
                          </p>
                          <p style={{ marginTop: 6, color: "var(--lu-text-secondary)" }}>
                            {String(item.startDate ?? "")} – {String(item.endDate ?? "")}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {profileSkills.length > 0 && (
                  <div>
                    <h4 style={{ marginBottom: 10 }}>Compétences</h4>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                      {profileSkills.map((skill, index) => (
                        <span
                          key={index}
                          style={{
                            padding: "8px 12px",
                            borderRadius: 999,
                            backgroundColor: "var(--lu-bg-secondary)",
                            color: "var(--lu-text-primary)",
                            fontSize: "0.9em",
                          }}
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {profileLanguages.length > 0 && (
                  <div>
                    <h4 style={{ marginBottom: 10 }}>Langues</h4>
                    <div style={{ display: "grid", gap: 12 }}>
                      {profileLanguages.map((item, index) => (
                        <div key={index} style={{ padding: 16, borderRadius: 12, backgroundColor: "var(--lu-bg-secondary)" }}>
                          <strong>{String(item.language || "Langue inconnue")}</strong>
                          {typeof item.level === "string" && (
                            <p style={{ margin: "8px 0 0", color: "var(--lu-text-secondary)" }}>
                              Niveau : {item.level}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {profileWorkExperience.length === 0 && profileEducation.length === 0 && profileSkills.length === 0 && profileLanguages.length === 0 && (
                  <div style={{ padding: 16, borderRadius: 12, backgroundColor: "var(--lu-bg-secondary)", color: "var(--lu-text-secondary)" }}>
                    Aucune donnée de profil structurée disponible.
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
