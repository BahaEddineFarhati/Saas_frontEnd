import { useState, useEffect } from "react";
import { Search, Plus, X, Loader2, AlertCircle, ExternalLink, Trash2 } from "lucide-react";
import type { JobOpening } from "./types";
import { API_BASE_URL } from "./config/api";
import { useTranslation } from "./i18n/I18nContext";

// Active auth promise to handle concurrent calls during StrictMode
let activeAuthPromise: Promise<string> | null = null;

// Background login fallback helper to handle authentication in development
async function getAuthToken(): Promise<string> {
  const token = localStorage.getItem("accessToken") || localStorage.getItem("linkup_access_token");
  if (token) return token;

  if (activeAuthPromise) {
    return activeAuthPromise;
  }

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

export default function CandidaturesPage() {
  const { t } = useTranslation();
  // Page Data States
  const [jobs, setJobs] = useState<JobOpening[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "OPEN" | "CLOSED">("ALL");

  // Create Side Panel States
  const [isPanelOpen, setIsPanelOpen] = useState<boolean>(false);
  const [formTitle, setFormTitle] = useState<string>("");
  const [formDesc, setFormDesc] = useState<string>("");
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  
  // Validation error states
  const [titleValidationError, setTitleValidationError] = useState<string | null>(null);
  const [descValidationError, setDescValidationError] = useState<string | null>(null);
  // Delete confirmation state
  const [jobToDelete, setJobToDelete] = useState<JobOpening | null>(null);
  const [isDeletingJob, setIsDeletingJob] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Fetch job openings
  const fetchJobs = async () => {
    try {
      setLoading(true);
      setError(null);
      let token = await getAuthToken();
      
      let res = await fetch(`${API_BASE_URL}/jobs`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // If token expired/invalid, clear local tokens and re-authenticate once
      if (res.status === 401) {
        localStorage.removeItem("linkup_access_token");
        localStorage.removeItem("accessToken");
        token = await getAuthToken();
        res = await fetch(`${API_BASE_URL}/jobs`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }

      if (!res.ok) {
        throw new Error(`Failed to fetch jobs (Status: ${res.status})`);
      }

      const resData = await res.json();
      if (resData?.success) {
        setJobs(resData.data || []);
      } else {
        throw new Error(resData?.error?.message || "Unknown error fetching job list");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load job openings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  // Format Date Helper
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  // Client-Side Search & Filter Logic
  const filteredJobs = jobs.filter((job) => {
    const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase());
    const normalizedStatus = (job.status ?? "OPEN").toUpperCase();
    const matchesStatus = statusFilter === "ALL" || normalizedStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Handle Form Submission
  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setTitleValidationError(null);
    setDescValidationError(null);

    let hasErrors = false;

    // Client-side validations
    if (!formTitle.trim()) {
      setTitleValidationError(t('candidatures.form.titleRequired'));
      hasErrors = true;
    }
    if (!formDesc.trim()) {
      setDescValidationError(t('candidatures.form.descRequired'));
      hasErrors = true;
    }

    if (hasErrors) {
      return; // Stop here, make no API call
    }

    try {
      setFormSubmitting(true);
      const token = await getAuthToken();

      const res = await fetch(`${API_BASE_URL}/jobs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: formTitle,
          profileDescription: formDesc,
        }),
      });

      const resData = await res.json();

      if (!res.ok) {
        throw new Error(resData?.error?.message || t('candidatures.form.apiError'));
      }

      if (resData?.success && resData?.data) {
        const newJob: JobOpening = {
          id: resData.data.id,
          title: resData.data.title,
          status: resData.data.status || "OPEN",
          createdAt: resData.data.createdAt || new Date().toISOString(),
          candidateCount: 0, // Freshly created jobs start with 0 candidates
        };

        // Add to list immediately without full page reload
        setJobs((prev) => [newJob, ...prev]);

        // Reset form & close panel
        setFormTitle("");
        setFormDesc("");
        setIsPanelOpen(false);
      } else {
        throw new Error("Unable to parse job creation response.");
      }
    } catch (err: any) {
      setFormError(err.message || "Failed to create the job opening.");
    } finally {
      setFormSubmitting(false);
    }
  };

  // Delete job handlers
  const performDeleteJob = async () => {
    if (!jobToDelete) return;
    try {
      setIsDeletingJob(true);
      setDeleteError(null);
      let token = await getAuthToken();

      let res = await fetch(`${API_BASE_URL}/jobs/${jobToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      // Retry once on 401
      if (res.status === 401) {
        localStorage.removeItem('linkup_access_token');
        localStorage.removeItem('accessToken');
        token = await getAuthToken();
        res = await fetch(`${API_BASE_URL}/jobs/${jobToDelete.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData?.error?.message || t('candidatures.deleteError'));
      }

      // Remove from list
      setJobs((prev) => prev.filter((j) => j.id !== jobToDelete.id));
      setJobToDelete(null);
    } catch (err: any) {
      setDeleteError(err.message || t('candidatures.deleteErrorFallback'));
    } finally {
      setIsDeletingJob(false);
    }
  };

  return (
    <div className="db-root">
      
      {/* Header controls row */}
      <div className="cand-header-row">
        <div>
          <h2 className="db-welcome-heading">{t('candidatures.title')}</h2>
          <p className="db-welcome-sub">{t('candidatures.subtitle')}</p>
        </div>
        <button 
          onClick={() => setIsPanelOpen(true)}
          className="cand-btn-primary"
          id="btn-new-job"
        >
          <Plus size={16} strokeWidth={2.4} />
          <span>{t('candidatures.newJob')}</span>
        </button>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="cand-error-alert" style={{ marginBottom: "16px" }}>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Search and Filters Controls */}
      <div className="cand-controls">
        <div className="cand-search-wrapper">
          <Search size={16} className="cand-search-icon" />
          <input
            type="text"
            className="cand-search-input"
            placeholder={t('candidatures.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            id="search-jobs"
          />
        </div>

        <div className="cand-filter-group" role="group" aria-label={t('candidatures.statusFilter')}>
          <button
            onClick={() => setStatusFilter("ALL")}
            className={`cand-filter-btn ${statusFilter === "ALL" ? "cand-filter-btn--active" : ""}`}
            id="filter-all"
          >
            {t('candidatures.filterAll')}
          </button>
          <button
            onClick={() => setStatusFilter("OPEN")}
            className={`cand-filter-btn ${statusFilter === "OPEN" ? "cand-filter-btn--active" : ""}`}
            id="filter-open"
          >
            {t('candidatures.filterOpen')}
          </button>
          <button
            onClick={() => setStatusFilter("CLOSED")}
            className={`cand-filter-btn ${statusFilter === "CLOSED" ? "cand-filter-btn--active" : ""}`}
            id="filter-closed"
          >
            {t('candidatures.filterClosed')}
          </button>
        </div>
      </div>

      {/* Main List Container */}
      <div className="db-card" style={{ padding: "16px 20px" }}>
        
        {/* Loading Skeletons */}
        {loading ? (
          <div className="db-table-wrap">
            <table className="db-table">
              <thead>
                <tr>
                  <th>{t('candidatures.table.title')}</th>
                  <th>{t('candidatures.table.status')}</th>
                  <th>{t('candidatures.table.createdAt')}</th>
                  <th className="db-th-num">{t('candidatures.table.candidates')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4].map((n) => (
                  <tr key={n} className="cand-skeleton-pulse">
                    <td>
                      <div className="cand-skeleton-bar" style={{ width: "160px", marginBottom: "6px" }} />
                      <div className="cand-skeleton-bar" style={{ width: "90px" }} />
                    </td>
                    <td>
                      <div className="cand-skeleton-badge" />
                    </td>
                    <td>
                      <div className="cand-skeleton-bar" style={{ width: "80px" }} />
                    </td>
                    <td className="db-td-num">
                      <div className="cand-skeleton-bar" style={{ width: "30px", marginLeft: "auto" }} />
                    </td>
                    <td className="db-td-link">
                      <div className="cand-skeleton-bar" style={{ width: "50px", marginLeft: "auto" }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : filteredJobs.length === 0 ? (
          /* Empty State */
          <div className="lu-placeholder-page" style={{ minHeight: "280px" }}>
            <div className="lu-empty-state">
              <svg 
                width="48" 
                height="48" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="1.4" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                aria-hidden="true" 
                className="lu-empty-icon"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="8" y1="12" x2="16" y2="12" />
                <line x1="12" y1="8" x2="12" y2="16" />
              </svg>
              <h3 className="lu-empty-title">{t('candidatures.emptyTitle')}</h3>
              <p className="lu-empty-body">
                {jobs.length === 0 
                  ? t('candidatures.emptyBodyNoJobs') 
                  : t('candidatures.emptyBodyNoMatch')}
              </p>
              {jobs.length === 0 && (
                <button 
                  onClick={() => setIsPanelOpen(true)}
                  className="cand-btn-primary" 
                  style={{ marginTop: "16px" }}
                >
                  <Plus size={14} strokeWidth={2.4} />
                  <span>{t('candidatures.newJob')}</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Table View */
          <div className="db-table-wrap">
            <table className="db-table">
              <thead>
                <tr>
                  <th>{t('candidatures.table.title')}</th>
                  <th>{t('candidatures.table.status')}</th>
                  <th>{t('candidatures.table.createdAt')}</th>
                  <th className="db-th-num">{t('candidatures.table.candidates')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.map((job) => (
                  <tr key={job.id}>
                    <td>
                      <p className="db-job-title">{job.title}</p>
                      <p className="db-job-dept">{t('candidatures.table.department')}</p>
                    </td>
                    <td>
                      <span className={`db-badge ${(job.status ?? "OPEN").toUpperCase() === "OPEN" ? "badge--green" : "badge--gray"}`}>
                        {(job.status ?? "OPEN").toUpperCase() === "OPEN" ? t('candidatures.statusOpen') : t('candidatures.statusClosed')}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: "var(--lu-text-secondary)", fontSize: "12.5px" }}>
                        {formatDate(job.createdAt ?? "")}
                      </span>
                    </td>
                    <td className="db-td-num">{job.candidateCount}</td>
                    <td className="db-td-link">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, minHeight: 24 }}>
                        <a
                          href={`/candidatures/${job.id}`}
                          className="db-open-link"
                          aria-label={`${t('common.open')} ${job.title}`}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 28 }}
                        >
                          <ExternalLink size={13} strokeWidth={2} />
                          <span>{t('common.open')}</span>
                        </a>

                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            setJobToDelete(job);
                          }}
                          className="cand-btn-danger"
                          title={`${t('common.delete')} ${job.title}`}
                          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, height: 28, width: 28, padding: 0 }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete confirmation centered modal */}
      {jobToDelete && (
        <>
          <div
            className="cand-drawer-overlay cand-drawer-overlay--open"
            onClick={() => { if (!isDeletingJob) setJobToDelete(null); }}
          />
          <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
            <div style={{ width: 420, background: 'var(--lu-bg-page)', border: '1px solid var(--lu-border)', borderRadius: 8, padding: 20, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
              <h3 style={{ marginTop: 0 }}>{t('candidatures.deleteTitle')}</h3>
              <p style={{ marginTop: 8 }}>{t('candidatures.deleteMessage', { title: jobToDelete.title })}</p>
              {deleteError && <div className="cand-error-alert" style={{ marginTop: 12 }}>{deleteError}</div>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                <button className="cand-btn-secondary" onClick={() => setJobToDelete(null)} disabled={isDeletingJob}>{t('common.cancel')}</button>
                <button className="cand-btn-danger" onClick={performDeleteJob} disabled={isDeletingJob}>
                  {isDeletingJob ? <Loader2 size={14} className="cand-skeleton-pulse" /> : t('candidatures.deleteConfirm')}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Side Panel / Create Drawer Overlay */}
      <div 
        className={`cand-drawer-overlay ${isPanelOpen ? "cand-drawer-overlay--open" : ""}`}
        onClick={() => {
          if (!formSubmitting) setIsPanelOpen(false);
        }}
      />

      {/* Side Panel Drawer */}
      <div className={`cand-drawer ${isPanelOpen ? "cand-drawer--open" : ""}`} id="create-job-panel">
        <div className="cand-drawer-header">
          <h3 className="cand-drawer-title">{t('candidatures.createTitle')}</h3>
          <button 
            onClick={() => setIsPanelOpen(false)}
            className="cand-drawer-close"
            disabled={formSubmitting}
            aria-label={t('common.close')}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleCreateJob} style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div className="cand-drawer-body">
            
            {/* Inline Panel Error message */}
            {formError && (
              <div className="cand-error-alert">
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <AlertCircle size={16} />
                  <span>{formError}</span>
                </div>
              </div>
            )}

            {/* Title Field */}
            <div className="cand-form-group">
              <label htmlFor="job-title" className="cand-label">{t('candidatures.form.titleLabel')}</label>
              <input
                type="text"
                id="job-title"
                className="cand-input"
                placeholder={t('candidatures.form.titlePlaceholder')}
                value={formTitle}
                onChange={(e) => {
                  setFormTitle(e.target.value);
                  if (e.target.value.trim()) setTitleValidationError(null);
                }}
                disabled={formSubmitting}
              />
              {titleValidationError && (
                <span className="cand-error-text" id="title-error">{titleValidationError}</span>
              )}
            </div>

            {/* Profile Description Field */}
            <div className="cand-form-group">
              <label htmlFor="job-desc" className="cand-label">{t('candidatures.form.descLabel')}</label>
              <textarea
                id="job-desc"
                className="cand-input cand-textarea"
                placeholder={t('candidatures.form.descPlaceholder')}
                value={formDesc}
                onChange={(e) => {
                  setFormDesc(e.target.value);
                  if (e.target.value.trim()) setDescValidationError(null);
                }}
                disabled={formSubmitting}
              />
              {descValidationError && (
                <span className="cand-error-text" id="desc-error">{descValidationError}</span>
              )}
            </div>
          </div>

          {/* Form Actions footer */}
          <div className="cand-drawer-footer">
            <button
              type="button"
              className="cand-btn-secondary"
              onClick={() => setIsPanelOpen(false)}
              disabled={formSubmitting}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="cand-btn-primary"
              disabled={formSubmitting}
              id="submit-job-form"
            >
              {formSubmitting ? (
                <>
                  <Loader2 size={16} className="cand-skeleton-pulse" />
                  <span>{t('candidatures.form.creating')}</span>
                </>
              ) : (
                <span>{t('candidatures.form.createButton')}</span>
              )}
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}

