import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { API_BASE_URL } from "../config/api";
import {
  ArrowLeft,
  ArrowUpRight,
  Loader2,
  XCircle,
  Star,
  ChevronDown,
  ChevronUp,
  FileText,
  ShieldCheck,
  Download,
  Briefcase,
  GraduationCap,
  Cpu,
  Globe2,
  MapPin,
  Calendar,
  GitCompare,
  X,
} from "lucide-react";
import { useTranslation } from "../i18n/I18nContext";

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

interface PickerCandidate {
  id: string;
  firstName: string;
  lastName: string;
  score: number | null;
  scoreExplanation: Record<string, unknown> | null;
  verdict?: string;
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

function getVerdictLabel(verdict: string | null, t: (key: string) => string) {
  switch (verdict) {
    case "STRONG_FIT":
      return t("jobDetail.verdicts.STRONG_FIT");
    case "GOOD_FIT":
      return t("jobDetail.verdicts.GOOD_FIT");
    case "PARTIAL_FIT":
      return t("jobDetail.verdicts.PARTIAL_FIT");
    case "WEAK_FIT":
      return t("jobDetail.verdicts.WEAK_FIT");
    default:
      return t("candidateDetail.noVerdict");
  }
}

function getStatusLabel(status: CandidateDetail["status"], t: (key: string) => string) {
  switch (status) {
    case "PENDING":
      return t("jobDetail.statuses.PENDING");
    case "NEW":
      return t("jobDetail.statuses.NEW");
    case "SHORTLISTED":
      return t("jobDetail.statuses.SHORTLISTED");
    case "REJECTED":
      return t("jobDetail.statuses.REJECTED");
    case "OFFERED":
      return t("jobDetail.statuses.OFFERED");
    case "SCORED":
      return t("jobDetail.statuses.SCORED");
    case "FAILED":
      return t("jobDetail.statuses.FAILED");
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
  const { t } = useTranslation();
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
  const [activeProfileTab, setActiveProfileTab] = useState<"experience" | "education" | "skills" | "languages">("experience");

  // ── Comparison state ──
  const [compareMode, setCompareMode] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [compareCandidate, setCompareCandidate] = useState<CandidateDetail | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [pickerCandidates, setPickerCandidates] = useState<PickerCandidate[]>([]);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerLoading, setPickerLoading] = useState(false);

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

  const handleDownloadCV = async () => {
    if (!jobId || !candidateId) return;
    try {
      let token = await getAuthToken();
      let res = await fetch(`${API_BASE_URL}/jobs/${jobId}/candidates/${candidateId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        localStorage.removeItem('linkup_access_token');
        localStorage.removeItem('accessToken');
        token = await getAuthToken();
        res = await fetch(`${API_BASE_URL}/jobs/${jobId}/candidates/${candidateId}/download`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      if (!res.ok) {
        throw new Error(`Erreur lors du téléchargement (${res.status})`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // Try to get filename from Content-Disposition header
      const disposition = res.headers.get('Content-Disposition');
      const match = disposition?.match(/filename[^;=\n]*=(['"]?)([^'"\n;]*)\1/);
      a.download = match?.[2]?.trim() || `cv-${candidateId}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || t('candidateDetail.downloadError'));
    }
  };

  const toggleQuestion = (index: number) => {
    setExpandedQuestions((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  // ── Comparison handlers ──
  const handleOpenPicker = useCallback(async () => {
    if (!jobId || !candidateId) return;
    setPickerOpen(true);
    setPickerSearch("");
    setPickerLoading(true);
    try {
      const token = await getAuthToken();
      const res = await fetch(
        `${API_BASE_URL}/jobs/${jobId}/candidates?excludeId=${candidateId}&limit=100`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error("Impossible de charger les candidats.");
      const body = await res.json();
      setPickerCandidates(body?.data?.candidates ?? []);
    } catch {
      setPickerCandidates([]);
    } finally {
      setPickerLoading(false);
    }
  }, [jobId, candidateId]);

  const handleSelectCompare = useCallback(async (selectedId: string) => {
    if (!jobId || !candidateId) return;
    setPickerOpen(false);
    setCompareLoading(true);
    try {
      const token = await getAuthToken();
      const res = await fetch(
        `${API_BASE_URL}/jobs/${jobId}/candidates/compare?ids=${candidateId},${selectedId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error("Impossible de comparer les candidats.");
      const body = await res.json();
      if (body?.data?.length === 2) {
        // Update current candidate data with fresh data
        setCandidate(body.data[0]);
        setCompareCandidate(body.data[1]);
        setCompareMode(true);
      }
    } catch (err: any) {
      setActionError(err?.message || "Erreur lors de la comparaison.");
    } finally {
      setCompareLoading(false);
    }
  }, [jobId, candidateId]);

  const handleExitCompare = useCallback(() => {
    setCompareMode(false);
    setCompareCandidate(null);
  }, []);

  const filteredPickerCandidates = useMemo(() => {
    if (!pickerSearch.trim()) return pickerCandidates;
    const q = pickerSearch.toLowerCase();
    return pickerCandidates.filter((c) =>
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(q)
    );
  }, [pickerCandidates, pickerSearch]);

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
          <span>{t("candidateDetail.backToCandidates")}</span>
        </button>
      </div>

      {loading ? (
        <div className="db-card" style={{ padding: 24 }}>
          <Loader2 size={20} className="cand-skeleton-pulse" /> {t("candidateDetail.loadingCandidate")}
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
                  {candidate.email ?? t("candidateDetail.emailNotAvailable")} • {candidate.phone ?? t("candidateDetail.phoneNotAvailable")}
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
                  {t("candidateDetail.scoreLabel", { score: candidate.score ?? "-" })}
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
                  {getVerdictLabel(candidate.scoring.verdict, t)}
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
                  {getStatusLabel(candidate.status, t)}
                </span>
              </div>
            </div>

            <div style={{ marginTop: 24, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <button
                onClick={() => handleStatusUpdate("SHORTLISTED")}
                disabled={actionLoading || candidate.status === "SHORTLISTED"}
                className="cand-btn-primary"
                style={{ opacity: candidate.status === "SHORTLISTED" ? 0.55 : 1 }}
              >
                {t("candidateDetail.shortlist")}
              </button>
              <button
                onClick={() => handleStatusUpdate("REJECTED")}
                disabled={actionLoading || candidate.status === "REJECTED"}
                className="cand-btn-secondary"
                style={{ opacity: candidate.status === "REJECTED" ? 0.55 : 1 }}
              >
                {t("candidateDetail.reject")}
              </button>
              <button
                onClick={handleOpenPicker}
                disabled={actionLoading || compareLoading || compareMode}
                className="cand-btn-compare"
                id="compare-trigger-btn"
              >
                <GitCompare size={15} strokeWidth={2} />
                <span>{t("candidateDetail.compareWithOther")}</span>
              </button>
              <button
                onClick={handleDownloadCV}
                disabled={actionLoading}
                className="cand-btn-secondary"
                style={{ display: "inline-flex", alignItems: "center", gap: 7, marginLeft: "auto" }}
                title={t("candidateDetail.downloadCV")}
              >
                <Download size={15} strokeWidth={2} />
                <span>{t("candidateDetail.downloadCV")}</span>
              </button>
            </div>

            {actionError && (
              <div className="cand-error-alert" style={{ marginTop: 16 }}>
                <XCircle size={16} /> <span>{actionError}</span>
              </div>
            )}
          </div>

          {!compareMode && (
            <div className="db-card" style={{ padding: 24, marginTop: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <FileText size={18} style={{ color: "var(--lu-accent)" }} />
                <h3 style={{ margin: 0, fontSize: "1.05rem" }}>{t("candidateDetail.aiSummaryTitle")}</h3>
              </div>
              <div style={{ minHeight: 120, padding: 18, borderRadius: 12, backgroundColor: "var(--lu-bg-secondary)" }}>
                {candidate.summary ? (
                  <p style={{ margin: 0, lineHeight: 1.7 }}>{candidate.summary}</p>
                ) : (
                  <p style={{ margin: 0, color: "var(--lu-text-secondary)" }}>
                    {t("candidateDetail.summaryNotAvailable")}
                  </p>
                )}
              </div>
            </div>
          )}

          {!compareMode && (
            <div className="db-card" style={{ padding: 24, marginTop: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <ShieldCheck size={18} style={{ color: "var(--lu-accent)" }} />
                <h3 style={{ margin: 0, fontSize: "1.05rem" }}>{t("candidateDetail.scoreAnalysisTitle")}</h3>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <div>
                  <h4 style={{ marginBottom: 12 }}>{t("candidateDetail.matchedCriteriaTitle")}</h4>
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
                    <p style={{ margin: 0, color: "var(--lu-text-secondary)" }}>{t("candidateDetail.noMatchedCriteria")}</p>
                  )}
                </div>

                <div>
                  <h4 style={{ marginBottom: 12 }}>{t("candidateDetail.missingCriteriaTitle")}</h4>
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
                    <p style={{ margin: 0, color: "var(--lu-text-secondary)" }}>{t("candidateDetail.noMissingCriteria")}</p>
                  )}
                </div>
              </div>
              <div style={{ marginTop: 20 }}>
                <h4 style={{ marginBottom: 12 }}>{t("candidateDetail.strengthsTitle")}</h4>
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
                  <p style={{ margin: 0, color: "var(--lu-text-secondary)" }}>{t("candidateDetail.noStrengths")}</p>
                )}
              </div>
            </div>
          )}

          {!compareMode && (
            <div className="db-card" style={{ padding: 24, marginTop: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <ShieldCheck size={18} style={{ color: "var(--lu-accent)" }} />
                <h3 style={{ margin: 0, fontSize: "1.05rem" }}>{t("candidateDetail.interviewQuestionsTitle")}</h3>
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
                  {t("candidateDetail.questionsNotAvailable")}
                </p>
              )}
            </div>
          )}

          {/* ── Raw profile data (hidden in compare mode) ── */}
          {!compareMode && (
            <div className="db-card" style={{ padding: 0, marginTop: 20, overflow: "hidden", borderRadius: 12 }}>
              {/* Collapsible header */}
              <button
                type="button"
                onClick={() => setRawOpen(!rawOpen)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  padding: "20px 22px",
                  border: "none",
                  background: "var(--lu-bg-page)",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                  <FileText size={18} style={{ color: "var(--lu-accent)" }} />
                  <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 4 }}>
                    <strong style={{ lineHeight: 1.2, fontSize: "1rem" }}>{t("candidateDetail.rawProfileTitle")}</strong>
                    <p style={{ margin: 0, color: "var(--lu-text-secondary)", fontSize: "0.95em", lineHeight: 1.5 }}>
                      {t("candidateDetail.rawProfileSubtitle")}
                    </p>
                  </div>
                </div>
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", minWidth: 24 }}>
                  {rawOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </span>
              </button>

              {rawOpen && (
                <div style={{ borderTop: "1px solid var(--lu-border)" }}>
                  {/* Tab bar */}
                  <div style={{
                    display: "flex",
                    gap: 0,
                    padding: "0 22px",
                    borderBottom: "1px solid var(--lu-border)",
                    backgroundColor: "var(--lu-bg-secondary)",
                    overflowX: "auto",
                  }}>
                    {([
                      { key: "experience", label: t("candidateDetail.tabs.experience"), icon: <Briefcase size={14} />, count: profileWorkExperience.length },
                      { key: "education", label: t("candidateDetail.tabs.education"), icon: <GraduationCap size={14} />, count: profileEducation.length },
                      { key: "skills", label: t("candidateDetail.tabs.skills"), icon: <Cpu size={14} />, count: profileSkills.length },
                      { key: "languages", label: t("candidateDetail.tabs.languages"), icon: <Globe2 size={14} />, count: profileLanguages.length },
                    ] as const).map(tab => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setActiveProfileTab(tab.key)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 7,
                          padding: "12px 18px",
                          border: "none",
                          borderBottom: activeProfileTab === tab.key
                            ? "2px solid var(--lu-accent)"
                            : "2px solid transparent",
                          background: "none",
                          color: activeProfileTab === tab.key ? "var(--lu-accent)" : "var(--lu-text-secondary)",
                          fontWeight: activeProfileTab === tab.key ? 600 : 400,
                          fontSize: "0.9em",
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                          transition: "color 0.15s, border-color 0.15s",
                        }}
                      >
                        {tab.icon}
                        {tab.label}
                        {tab.count > 0 && (
                          <span style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            minWidth: 18,
                            height: 18,
                            padding: "0 5px",
                            borderRadius: 999,
                            fontSize: "0.78em",
                            fontWeight: 600,
                            backgroundColor: activeProfileTab === tab.key ? "var(--lu-accent)" : "var(--lu-border)",
                            color: activeProfileTab === tab.key ? "#fff" : "var(--lu-text-secondary)",
                          }}>
                            {tab.count}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Tab content */}
                  <div style={{ padding: "24px 22px" }}>

                    {/* ── EXPERIENCE TAB ── */}
                    {activeProfileTab === "experience" && (
                      profileWorkExperience.length > 0 ? (
                        <div style={{ display: "grid", gap: 16 }}>
                          {profileWorkExperience.map((item, index) => (
                            <div
                              key={index}
                              style={{
                                display: "flex",
                                gap: 16,
                                padding: 20,
                                borderRadius: 12,
                                border: "1px solid var(--lu-border)",
                                backgroundColor: "var(--lu-bg-page)",
                              }}
                            >
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 4, flexShrink: 0 }}>
                                <div style={{
                                  width: 36, height: 36, borderRadius: 10,
                                  backgroundColor: "rgba(var(--lu-accent-rgb, 99,102,241), 0.1)",
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  color: "var(--lu-accent)",
                                }}>
                                  <Briefcase size={16} />
                                </div>
                                {index < profileWorkExperience.length - 1 && (
                                  <div style={{ width: 2, flex: 1, marginTop: 8, backgroundColor: "var(--lu-border)", minHeight: 24 }} />
                                )}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
                                  <div>
                                    <p style={{ margin: 0, fontWeight: 700, fontSize: "1rem", color: "var(--lu-text-primary)" }}>
                                      {String(item.title || item.position || t("candidateDetail.notSpecified.position"))}
                                    </p>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                                      <MapPin size={12} style={{ color: "var(--lu-text-tertiary)", flexShrink: 0 }} />
                                      <span style={{ fontSize: "0.9em", color: "var(--lu-text-secondary)" }}>
                                        {String(item.company || item.employer || t("candidateDetail.notSpecified.company"))}
                                        {item.location ? ` · ${String(item.location)}` : ""}
                                      </span>
                                    </div>
                                  </div>
                                  <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                                    <Calendar size={12} style={{ color: "var(--lu-text-tertiary)" }} />
                                    <span style={{
                                      fontSize: "0.82em",
                                      color: "var(--lu-text-secondary)",
                                      padding: "3px 10px",
                                      borderRadius: 999,
                                      backgroundColor: "var(--lu-bg-secondary)",
                                      whiteSpace: "nowrap",
                                    }}>
                                      {String(item.startDate ?? "?")}{" "}–{" "}
                                      {item.current ? t("candidateDetail.today") : String(item.endDate ?? t("candidateDetail.today"))}
                                    </span>
                                  </div>
                                </div>
                                {typeof item.description === "string" && item.description && (
                                  <p style={{ margin: "10px 0 0", fontSize: "0.9em", color: "var(--lu-text-secondary)", lineHeight: 1.7 }}>
                                    {item.description}
                                  </p>
                                )}
                                {Array.isArray(item.responsibilities) && (item.responsibilities as string[]).length > 0 && (
                                  <ul style={{ margin: "10px 0 0", paddingLeft: 18, fontSize: "0.9em", color: "var(--lu-text-secondary)", lineHeight: 1.7 }}>
                                    {(item.responsibilities as string[]).map((r, i) => <li key={i}>{r}</li>)}
                                  </ul>
                                )}
                                {Array.isArray(item.technologies) && (item.technologies as string[]).length > 0 && (
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                                    {(item.technologies as string[]).map((tech, i) => (
                                      <span key={i} style={{
                                        padding: "3px 10px",
                                        borderRadius: 999,
                                        fontSize: "0.8em",
                                        fontWeight: 500,
                                        backgroundColor: "var(--lu-bg-secondary)",
                                        color: "var(--lu-accent)",
                                        border: "1px solid var(--lu-border)",
                                      }}>{tech}</span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--lu-text-tertiary)" }}>
                          <Briefcase size={36} style={{ marginBottom: 12, opacity: 0.4 }} />
                          <p style={{ margin: 0 }}>{t("candidateDetail.noExperience")}</p>
                        </div>
                      )
                    )}

                    {/* ── EDUCATION TAB ── */}
                    {activeProfileTab === "education" && (
                      profileEducation.length > 0 ? (
                        <div style={{ display: "grid", gap: 16 }}>
                          {profileEducation.map((item, index) => (
                            <div
                              key={index}
                              style={{
                                display: "flex",
                                gap: 16,
                                padding: 20,
                                borderRadius: 12,
                                border: "1px solid var(--lu-border)",
                                backgroundColor: "var(--lu-bg-page)",
                              }}
                            >
                              <div style={{ flexShrink: 0, paddingTop: 4 }}>
                                <div style={{
                                  width: 36, height: 36, borderRadius: 10,
                                  backgroundColor: "rgba(34,197,94,0.1)",
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  color: "#16a34a",
                                }}>
                                  <GraduationCap size={16} />
                                </div>
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ margin: 0, fontWeight: 700, fontSize: "1rem", color: "var(--lu-text-primary)" }}>
                                  {String(item.degree || item.diploma || item.fieldOfStudy || t("candidateDetail.notSpecified.degree"))}
                                </p>
                                {Boolean(item.fieldOfStudy && item.degree) && (
                                  <p style={{ margin: "3px 0 0", fontSize: "0.9em", fontStyle: "italic", color: "var(--lu-text-secondary)" }}>
                                    {String(item.fieldOfStudy)}
                                  </p>
                                )}
                                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5 }}>
                                  <MapPin size={12} style={{ color: "var(--lu-text-tertiary)", flexShrink: 0 }} />
                                  <span style={{ fontSize: "0.9em", color: "var(--lu-text-secondary)" }}>
                                    {String(item.school || item.institution || item.university || t("candidateDetail.notSpecified.institution"))}
                                    {item.location ? ` · ${String(item.location)}` : ""}
                                  </span>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 8 }}>
                                  <Calendar size={12} style={{ color: "var(--lu-text-tertiary)" }} />
                                  <span style={{
                                    fontSize: "0.82em",
                                    color: "var(--lu-text-secondary)",
                                    padding: "3px 10px",
                                    borderRadius: 999,
                                    backgroundColor: "var(--lu-bg-secondary)",
                                  }}>
                                    {item.startDate || item.endDate
                                      ? `${String(item.startDate ?? "")} – ${String(item.endDate ?? "")}`
                                      : t("candidateDetail.datesNotSpecified")}
                                  </span>
                                </div>
                                {typeof item.description === "string" && item.description && (
                                  <p style={{ margin: "10px 0 0", fontSize: "0.9em", color: "var(--lu-text-secondary)", lineHeight: 1.7 }}>
                                    {item.description}
                                  </p>
                                )}
                                {typeof item.grade === "string" && item.grade && (
                                  <span style={{
                                    display: "inline-block", marginTop: 10,
                                    padding: "3px 10px", borderRadius: 999, fontSize: "0.82em",
                                    fontWeight: 600, backgroundColor: "rgba(34,197,94,0.1)", color: "#16a34a",
                                  }}>
                                    {t("candidateDetail.mentionGrade", { grade: item.grade })}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--lu-text-tertiary)" }}>
                          <GraduationCap size={36} style={{ marginBottom: 12, opacity: 0.4 }} />
                          <p style={{ margin: 0 }}>{t("candidateDetail.noEducation")}</p>
                        </div>
                      )
                    )}

                    {/* ── SKILLS TAB ── */}
                    {activeProfileTab === "skills" && (
                      profileSkills.length > 0 ? (
                        <div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                            {profileSkills.map((skill, index) => (
                              <span
                                key={index}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 6,
                                  padding: "7px 14px",
                                  borderRadius: 999,
                                  fontSize: "0.9em",
                                  fontWeight: 500,
                                  backgroundColor: "var(--lu-bg-secondary)",
                                  color: "var(--lu-text-primary)",
                                  border: "1px solid var(--lu-border)",
                                  transition: "background 0.15s",
                                }}
                              >
                                <Cpu size={12} style={{ color: "var(--lu-accent)", flexShrink: 0 }} />
                                {typeof skill === "string" ? skill : String((skill as any)?.name || skill)}
                              </span>
                            ))}
                          </div>
                          <p style={{ margin: "20px 0 0", fontSize: "0.85em", color: "var(--lu-text-tertiary)" }}>
                            {t("candidateDetail.skillsIdentified", { count: profileSkills.length, plural: profileSkills.length > 1 ? "s" : "" })}
                          </p>
                        </div>
                      ) : (
                        <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--lu-text-tertiary)" }}>
                          <Cpu size={36} style={{ marginBottom: 12, opacity: 0.4 }} />
                          <p style={{ margin: 0 }}>{t("candidateDetail.noSkills")}</p>
                        </div>
                      )
                    )}

                    {/* ── LANGUAGES TAB ── */}
                    {activeProfileTab === "languages" && (
                      profileLanguages.length > 0 ? (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
                          {profileLanguages.map((item, index) => {
                            const langName = String(item.language || item.name || "?");
                            const level = typeof item.level === "string" ? item.level : null;
                            const levelColors: Record<string, { bg: string; text: string }> = {
                              "native": { bg: "#dcfce7", text: "#166534" },
                              "natif": { bg: "#dcfce7", text: "#166534" },
                              "fluent": { bg: "#dbeafe", text: "#1e40af" },
                              "courant": { bg: "#dbeafe", text: "#1e40af" },
                              "professional": { bg: "#dbeafe", text: "#1e40af" },
                              "intermediate": { bg: "#fef3c7", text: "#92400e" },
                              "intermédiaire": { bg: "#fef3c7", text: "#92400e" },
                              "basic": { bg: "#fee2e2", text: "#991b1b" },
                              "débutant": { bg: "#fee2e2", text: "#991b1b" },
                            };
                            const levelStyle = level
                              ? (levelColors[level.toLowerCase()] || { bg: "var(--lu-bg-secondary)", text: "var(--lu-text-secondary)" })
                              : null;
                            return (
                              <div
                                key={index}
                                style={{
                                  padding: 18,
                                  borderRadius: 12,
                                  border: "1px solid var(--lu-border)",
                                  backgroundColor: "var(--lu-bg-page)",
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 10,
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                  <div style={{
                                    width: 34, height: 34, borderRadius: 10,
                                    backgroundColor: "rgba(99,102,241,0.1)",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    color: "var(--lu-accent)", flexShrink: 0,
                                  }}>
                                    <Globe2 size={16} />
                                  </div>
                                  <strong style={{ fontSize: "1rem", color: "var(--lu-text-primary)" }}>{langName}</strong>
                                </div>
                                {levelStyle && level && (
                                  <span style={{
                                    alignSelf: "flex-start",
                                    padding: "4px 12px",
                                    borderRadius: 999,
                                    fontSize: "0.82em",
                                    fontWeight: 600,
                                    backgroundColor: levelStyle.bg,
                                    color: levelStyle.text,
                                    textTransform: "capitalize",
                                  }}>
                                    {level}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--lu-text-tertiary)" }}>
                          <Globe2 size={36} style={{ marginBottom: 12, opacity: 0.4 }} />
                          <p style={{ margin: 0 }}>{t("candidateDetail.noLanguages")}</p>
                        </div>
                      )
                    )}

                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ COMPARISON MODE LAYOUT ═══ */}
          {compareMode && compareCandidate && (
            <>
              <div className="compare-exit-bar" style={{ marginTop: 20 }}>
                <span className="compare-exit-bar__label">
                  <GitCompare size={16} />
                  {t("candidateDetail.compareMode")}
                </span>
                <button className="compare-exit-btn" onClick={handleExitCompare} id="compare-exit-btn">
                  <X size={14} />
                  {t("candidateDetail.exitCompare")}
                </button>
              </div>

              <div className="compare-grid">
                {[candidate, compareCandidate].map((cand, colIndex) => {
                  const otherCand = colIndex === 0 ? compareCandidate : candidate;
                  const isScoreWinner = (cand.score ?? -1) > (otherCand.score ?? -1);
                  const otherMatchedSet = new Set(otherCand.scoring.matchedCriteria);
                  const otherMissingSet = new Set(otherCand.scoring.missingCriteria);

                  const cWorkExp = Array.isArray(cand.profile?.workExperience)
                    ? (cand.profile.workExperience as Array<Record<string, unknown>>)
                    : [];
                  const cEducation = Array.isArray(cand.profile?.education)
                    ? (cand.profile.education as Array<Record<string, unknown>>)
                    : [];
                  const cSkills = Array.isArray(cand.profile?.skills)
                    ? (cand.profile.skills as string[])
                    : [];
                  const cLanguages = Array.isArray(cand.profile?.languages)
                    ? (cand.profile.languages as Array<Record<string, unknown>>)
                    : [];

                  return (
                    <div key={cand.id} className="compare-column">
                      {/* ── Header ── */}
                      <div className="compare-col-header">
                        <button
                          type="button"
                          className="compare-col-name"
                          onClick={() => {
                            navigate(`/candidatures/${jobId}/candidats/${cand.id}`, {
                              state: { fromJobDetail }
                            });
                            handleExitCompare();
                          }}
                        >
                          <span>{cand.firstName || ""} {cand.lastName || ""}</span>
                          <ArrowUpRight size={16} style={{ flexShrink: 0 }} />
                        </button>
                        <div className="compare-badges">
                          <span
                            className={`compare-badge ${isScoreWinner ? "compare-score--winner" : ""}`}
                            style={!isScoreWinner ? {
                              backgroundColor: getScoreBadgeColor(cand.score).backgroundColor,
                              color: getScoreBadgeColor(cand.score).color,
                            } : undefined}
                          >
                            {t("candidateDetail.scoreLabel", { score: cand.score ?? "-" })}
                          </span>
                          <span
                            className="compare-badge"
                            style={{
                              backgroundColor: getVerdictBadgeColor(cand.scoring.verdict).backgroundColor,
                              color: getVerdictBadgeColor(cand.scoring.verdict).color,
                            }}
                          >
                            {getVerdictLabel(cand.scoring.verdict, t)}
                          </span>
                        </div>
                      </div>

                      {/* ── Matched Criteria ── */}
                      <div>
                        <h4 className="compare-section-title">
                          <ShieldCheck size={14} /> {t("candidateDetail.matchedCriteriaTitle")}
                        </h4>
                        <div className="compare-criteria-list" style={{ marginTop: 8 }}>
                          {cand.scoring.matchedCriteria.length > 0 ? (
                            cand.scoring.matchedCriteria.map((item, i) => (
                              <span
                                key={i}
                                className={`compare-tag ${otherMissingSet.has(item)
                                    ? "compare-tag--diff-matched"
                                    : "compare-tag--matched"
                                  }`}
                              >
                                ✓ {item}
                              </span>
                            ))
                          ) : (
                            <span className="compare-empty">{t("candidateDetail.noMatchedCriteria")}</span>
                          )}
                        </div>
                      </div>

                      {/* ── Missing Criteria ── */}
                      <div>
                        <h4 className="compare-section-title">
                          <XCircle size={14} /> {t("candidateDetail.missingCriteriaTitle")}
                        </h4>
                        <div className="compare-criteria-list" style={{ marginTop: 8 }}>
                          {cand.scoring.missingCriteria.length > 0 ? (
                            cand.scoring.missingCriteria.map((item, i) => (
                              <span
                                key={i}
                                className={`compare-tag ${otherMatchedSet.has(item)
                                    ? "compare-tag--diff-missing"
                                    : "compare-tag--missing"
                                  }`}
                              >
                                ✗ {item}
                              </span>
                            ))
                          ) : (
                            <span className="compare-empty">{t("candidateDetail.noMissingCriteria")}</span>
                          )}
                        </div>
                      </div>

                      {/* ── Skills ── */}
                      <div>
                        <h4 className="compare-section-title">
                          <Cpu size={14} /> {t("candidateDetail.tabs.skills")}
                        </h4>
                        <div className="compare-criteria-list" style={{ marginTop: 8 }}>
                          {cSkills.length > 0 ? (
                            cSkills.map((skill, i) => (
                              <span key={i} className="compare-tag compare-tag--neutral">
                                {typeof skill === "string" ? skill : String((skill as any)?.name || skill)}
                              </span>
                            ))
                          ) : (
                            <span className="compare-empty">{t("candidateDetail.noSkills")}</span>
                          )}
                        </div>
                      </div>

                      {/* ── Work Experience ── */}
                      <div>
                        <h4 className="compare-section-title">
                          <Briefcase size={14} /> {t("candidateDetail.tabs.experience")}
                        </h4>
                        {cWorkExp.length > 0 ? (
                          <div>
                            {cWorkExp.map((item, i) => (
                              <div key={i} className="compare-entry">
                                <p className="compare-entry-title">
                                  {String(item.title || item.position || t("candidateDetail.notSpecified.position"))}
                                </p>
                                <p className="compare-entry-sub">
                                  {String(item.company || item.employer || "")}
                                </p>
                                <p className="compare-entry-dates">
                                  {String(item.startDate ?? "")} – {item.current ? t("candidateDetail.today") : String(item.endDate ?? t("candidateDetail.today"))}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="compare-empty" style={{ marginTop: 8 }}>{t("candidateDetail.noExperience")}</p>
                        )}
                      </div>

                      {/* ── Education ── */}
                      <div>
                        <h4 className="compare-section-title">
                          <GraduationCap size={14} /> {t("candidateDetail.tabs.education")}
                        </h4>
                        {cEducation.length > 0 ? (
                          <div>
                            {cEducation.map((item, i) => (
                              <div key={i} className="compare-entry">
                                <p className="compare-entry-title">
                                  {String(item.degree || item.diploma || item.fieldOfStudy || t("candidateDetail.notSpecified.degree"))}
                                </p>
                                <p className="compare-entry-sub">
                                  {String(item.fieldOfStudy && item.degree ? item.fieldOfStudy : "")}
                                </p>
                                <p className="compare-entry-sub">
                                  {String(item.school || item.institution || item.university || "")}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="compare-empty" style={{ marginTop: 8 }}>{t("candidateDetail.noEducation")}</p>
                        )}
                      </div>

                      {/* ── Languages ── */}
                      <div>
                        <h4 className="compare-section-title">
                          <Globe2 size={14} /> {t("candidateDetail.tabs.languages")}
                        </h4>
                        <div className="compare-criteria-list" style={{ marginTop: 8 }}>
                          {cLanguages.length > 0 ? (
                            cLanguages.map((item, i) => (
                              <span key={i} className="compare-tag compare-tag--neutral">
                                {String(item.language || item.name || "?")}
                                {typeof item.level === "string" ? ` (${item.level})` : ""}
                              </span>
                            ))
                          ) : (
                            <span className="compare-empty">{t("candidateDetail.noLanguages")}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Compare loading indicator */}
          {compareLoading && (
            <div className="db-card" style={{ padding: 24, marginTop: 20, textAlign: "center" }}>
              <Loader2 size={20} className="cand-skeleton-pulse" /> {t("candidateDetail.loadingCompare")}
            </div>
          )}
        </>
      ) : null}

      {/* ═══ CANDIDATE PICKER MODAL ═══ */}
      {pickerOpen && (
        <div className="compare-picker-overlay" onClick={() => setPickerOpen(false)}>
          <div className="compare-picker-modal" onClick={(e) => e.stopPropagation()}>
            <div className="compare-picker-header">
              <h3>{t("candidateDetail.compareWith")}</h3>
              <button className="compare-picker-close" onClick={() => setPickerOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <input
              className="compare-picker-search"
              type="text"
              placeholder={t("candidateDetail.searchCandidate")}
              value={pickerSearch}
              onChange={(e) => setPickerSearch(e.target.value)}
              autoFocus
            />
            <div className="compare-picker-list">
              {pickerLoading ? (
                <div className="compare-picker-loading">
                  <Loader2 size={16} className="cand-skeleton-pulse" /> {t("common.loading")}
                </div>
              ) : filteredPickerCandidates.length > 0 ? (
                filteredPickerCandidates.map((c) => (
                  <button
                    key={c.id}
                    className="compare-picker-item"
                    onClick={() => handleSelectCompare(c.id)}
                  >
                    <span className="compare-picker-item-name">
                      {c.firstName} {c.lastName}
                    </span>
                    <div className="compare-picker-item-badges">
                      <span
                        className="compare-badge"
                        style={{
                          ...getScoreBadgeColor(c.score),
                          padding: "4px 10px",
                          fontSize: "0.78em",
                        }}
                      >
                        {c.score ?? "-"}
                      </span>
                      {c.verdict && (
                        <span
                          className="compare-badge"
                          style={{
                            ...getVerdictBadgeColor(c.verdict),
                            padding: "4px 10px",
                            fontSize: "0.78em",
                          }}
                        >
                          {getVerdictLabel(c.verdict, t)}
                        </span>
                      )}
                    </div>
                  </button>
                ))
              ) : (
                <div className="compare-picker-empty">
                  {pickerSearch ? t("candidateDetail.noCandidatesFound") : t("candidateDetail.noOtherCandidates")}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
