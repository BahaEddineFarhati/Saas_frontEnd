import { useState, useEffect } from "react";
import { Search, Plus, X, Loader2, AlertCircle, ExternalLink } from "lucide-react";

// Configured backend API Base URL
const API_BASE_URL = "http://localhost:3001/api/v1";

interface JobOpening {
  id: string;
  title: string;
  status: "OPEN" | "CLOSED";
  createdAt: string;
  candidateCount: number;
}

// Active auth promise to handle concurrent calls during StrictMode
let activeAuthPromise: Promise<string> | null = null;

// Background login fallback helper to handle authentication in development
async function getAuthToken(): Promise<string> {
  const token = localStorage.getItem("linkup_access_token");
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

      // If token expired/invalid, clear local token and re-authenticate once
      if (res.status === 401) {
        localStorage.removeItem("linkup_access_token");
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
    const matchesStatus =
      statusFilter === "ALL" || job.status.toUpperCase() === statusFilter;
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
      setTitleValidationError("Le titre de l'offre est requis");
      hasErrors = true;
    }
    if (!formDesc.trim()) {
      setDescValidationError("La description du profil est requise");
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
        throw new Error(resData?.error?.message || "Titre ou description requis par l'API.");
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

  return (
    <div className="db-root">
      
      {/* Header controls row */}
      <div className="cand-header-row">
        <div>
          <h2 className="db-welcome-heading">Offres d'emploi</h2>
          <p className="db-welcome-sub">Gérez et suivez les offres de recrutement de votre entreprise.</p>
        </div>
        <button 
          onClick={() => setIsPanelOpen(true)}
          className="cand-btn-primary"
          id="btn-new-job"
        >
          <Plus size={16} strokeWidth={2.4} />
          <span>Nouvelle offre</span>
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
            placeholder="Rechercher par titre..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            id="search-jobs"
          />
        </div>

        <div className="cand-filter-group" role="group" aria-label="Status filter">
          <button
            onClick={() => setStatusFilter("ALL")}
            className={`cand-filter-btn ${statusFilter === "ALL" ? "cand-filter-btn--active" : ""}`}
            id="filter-all"
          >
            Tous
          </button>
          <button
            onClick={() => setStatusFilter("OPEN")}
            className={`cand-filter-btn ${statusFilter === "OPEN" ? "cand-filter-btn--active" : ""}`}
            id="filter-open"
          >
            Actifs
          </button>
          <button
            onClick={() => setStatusFilter("CLOSED")}
            className={`cand-filter-btn ${statusFilter === "CLOSED" ? "cand-filter-btn--active" : ""}`}
            id="filter-closed"
          >
            Clôturés
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
                  <th>Titre de l'offre</th>
                  <th>Statut</th>
                  <th>Date de création</th>
                  <th className="db-th-num">Candidats</th>
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
              <h3 className="lu-empty-title">Aucune offre trouvée</h3>
              <p className="lu-empty-body">
                {jobs.length === 0 
                  ? "Commencez par créer votre première offre d'emploi pour recevoir des candidatures." 
                  : "Aucune offre ne correspond aux critères de recherche actuels."}
              </p>
              {jobs.length === 0 && (
                <button 
                  onClick={() => setIsPanelOpen(true)}
                  className="cand-btn-primary" 
                  style={{ marginTop: "16px" }}
                >
                  <Plus size={14} strokeWidth={2.4} />
                  <span>Nouvelle offre</span>
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
                  <th>Titre de l'offre</th>
                  <th>Statut</th>
                  <th>Date de création</th>
                  <th className="db-th-num">Candidats</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.map((job) => (
                  <tr key={job.id}>
                    <td>
                      <p className="db-job-title">{job.title}</p>
                      <p className="db-job-dept">Ressources Humaines</p>
                    </td>
                    <td>
                      <span className={`db-badge ${job.status.toUpperCase() === "OPEN" ? "badge--green" : "badge--gray"}`}>
                        {job.status.toUpperCase() === "OPEN" ? "Ouverte" : "Clôturée"}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: "var(--lu-text-secondary)", fontSize: "12.5px" }}>
                        {formatDate(job.createdAt)}
                      </span>
                    </td>
                    <td className="db-td-num">{job.candidateCount}</td>
                    <td className="db-td-link">
                      <a 
                        href={`/openings/${job.id}`} 
                        className="db-open-link" 
                        aria-label={`Ouvrir ${job.title}`}
                      >
                        <ExternalLink size={13} strokeWidth={2} />
                        <span>Ouvrir</span>
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
          <h3 className="cand-drawer-title">Créer une offre d'emploi</h3>
          <button 
            onClick={() => setIsPanelOpen(false)}
            className="cand-drawer-close"
            disabled={formSubmitting}
            aria-label="Fermer"
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
              <label htmlFor="job-title" className="cand-label">Titre du poste *</label>
              <input
                type="text"
                id="job-title"
                className="cand-input"
                placeholder="Ex. Senior Fullstack Developer (Node.js/React)"
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
              <label htmlFor="job-desc" className="cand-label">Description du profil recherché *</label>
              <textarea
                id="job-desc"
                className="cand-input cand-textarea"
                placeholder="Décrivez les compétences, l'expérience requise et les responsabilités du poste..."
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
              Annuler
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
                  <span>Création...</span>
                </>
              ) : (
                <span>Créer l'offre</span>
              )}
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}

