import { useState, useEffect, useMemo, useRef } from "react";
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
  Trash2,
  AlertTriangle,
  Download,
} from "lucide-react";

// ── Config ──────────────────────────────────────────────
const API_BASE_URL = "http://localhost:3001/api/v1";
const ALLOWED_FILE_TYPES = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

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

interface SelectedFile {
  file: File;
  id: string;
}

interface Candidate {
  id: string;
  status: "PENDING" | "SCORED" | "FAILED" | "NEW" | "SHORTLISTED" | "REJECTED" | "OFFERED";
  parsedName?: string;
  firstName?: string;
  lastName?: string;
  fileName: string;
  score?: number;
  email?: string;
  verdict?: "STRONG_FIT" | "GOOD_FIT" | "PARTIAL_FIT" | "WEAK_FIT";
  scoreExplanation?: Record<string, unknown>;
  createdAt?: string;
}

interface ScoringStatusSummary {
  totalCandidates: number;
  parsedCount: number;
  scoredCount: number;
  failedCount: number;
  scoringStatus: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
}

interface FileValidationError {
  fileName: string;
  reason: string;
}

// ── Helpers ─────────────────────────────────────────────

/** Get score badge color based on score range */
function getScoreBadgeColor(score: number): { bg: string; text: string } {
  if (score >= 80) return { bg: "#dcfce7", text: "#166534" }; // green
  if (score >= 60) return { bg: "#dbeafe", text: "#1e40af" }; // blue
  if (score >= 40) return { bg: "#fef3c7", text: "#92400e" }; // amber
  return { bg: "#fee2e2", text: "#7f1d1d" }; // red
}

/** Get verdict badge color */
function getVerdictBadgeColor(verdict: string): { bg: string; text: string } {
  switch (verdict) {
    case "STRONG_FIT":
      return { bg: "#dcfce7", text: "#166534" }; // green
    case "GOOD_FIT":
      return { bg: "#dbeafe", text: "#1e40af" }; // blue
    case "PARTIAL_FIT":
      return { bg: "#fef3c7", text: "#92400e" }; // amber
    case "WEAK_FIT":
      return { bg: "#fee2e2", text: "#7f1d1d" }; // red
    default:
      return { bg: "var(--lu-bg-secondary)", text: "var(--lu-text-secondary)" };
  }
}

/** Get verdict label in French */
function getVerdictLabel(verdict: string): string {
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
      return verdict;
  }
}

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

// ── File validation helpers ─────────────────────────────

function validateFiles(files: File[]): {
  valid: File[];
  errors: FileValidationError[];
} {
  const valid: File[] = [];
  const errors: FileValidationError[] = [];

  files.forEach((file) => {
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      errors.push({
        fileName: file.name,
        reason: `Type de fichier non supporté. Acceptés: PDF, DOCX`,
      });
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      errors.push({
        fileName: file.name,
        reason: `Fichier trop volumineux (${(file.size / (1024 * 1024)).toFixed(2)}MB > 5MB)`,
      });
      return;
    }

    valid.push(file);
  });

  return { valid, errors };
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

// ── Component ───────────────────────────────────────────
export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Data state
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  // Close action state
  const [isClosing, setIsClosing] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  // Upload state
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fileValidationErrors, setFileValidationErrors] = useState<FileValidationError[]>([]);
  const [, setIsPolling] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [isDeletingJob, setIsDeletingJob] = useState(false);
  const [showDeleteJobConfirm, setShowDeleteJobConfirm] = useState(false);
  const [candidateToDelete, setCandidateToDelete] = useState<Candidate | null>(null);
  const [isDeletingCandidate, setIsDeletingCandidate] = useState(false);
  const [deleteCandidateError, setDeleteCandidateError] = useState<string | null>(null);

  // PDF export state
  const [isExporting, setIsExporting] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCandidates, setTotalCandidates] = useState(0);
  const CANDIDATES_PER_PAGE = 10;

  // Scoring and filter state
  const [scoringStatus, setScoringStatus] = useState<ScoringStatusSummary | null>(null);
  const [verdictFilter, setVerdictFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState<"score" | "name" | "uploadDate">("score");
  const [scoringPollingIntervalRef, setScoringPollingIntervalRef] = useState<ReturnType<typeof setInterval> | null>(null);

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
        // Load existing candidates
        await fetchCandidates();
      } else {
        throw new Error(resData?.error?.message || "Erreur inconnue");
      }
    } catch (err: any) {
      setError(err.message || "Impossible de charger l'offre.");
    } finally {
      setLoading(false);
    }
  };

  // ── Fetch existing candidates ──────────────────────────
  const fetchCandidates = async (page: number = 1, limit: number = CANDIDATES_PER_PAGE) => {
    if (!id) return;
    try {
      const token = await getAuthToken();

      // Build query params for sorting and filtering
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());

      if (verdictFilter !== "All") {
        params.append("verdict", verdictFilter);
      }
      if (statusFilter !== "All") {
        params.append("status", statusFilter);
      }

      let res = await fetch(
        `${API_BASE_URL}/jobs/${id}/candidates?${params.toString()}&_t=${Date.now()}`,
        {
          method: "GET",
          cache: "no-store",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // 401 retry
      if (res.status === 401) {
        localStorage.removeItem("linkup_access_token");
        localStorage.removeItem("accessToken");
        const newToken = await getAuthToken();
        res = await fetch(
          `${API_BASE_URL}/jobs/${id}/candidates?${params.toString()}&_t=${Date.now()}`,
          {
            method: "GET",
            cache: "no-store",
            headers: { Authorization: `Bearer ${newToken}` },
          }
        );
      }

      if (!res.ok) throw new Error("Erreur lors du chargement des candidats");

      const resData = await res.json();
      if (resData?.success && resData?.data) {
        // Handle both structures: data.candidates (with pagination) or data (array)
        let candidatesArray = [];
        let pagination = { page: 1, limit: 10, total: 0, pages: 1 };

        if (Array.isArray(resData.data)) {
          // If data is already an array
          candidatesArray = resData.data;
        } else if (resData.data.candidates && Array.isArray(resData.data.candidates)) {
          // If data has a candidates property (with pagination)
          candidatesArray = resData.data.candidates;
          pagination = resData.data.pagination || pagination;
        }

        console.log("[JobDetailPage] poll candidates response:", candidatesArray.map((c: any) => ({ id: c.id, status: c.status, score: c.score, verdict: c.verdict })));

        const loadedCandidates: Candidate[] = candidatesArray.map(
          (candidate: any) => {
            const explanation = candidate.scoreExplanation as Record<string, unknown> | null;
            const verdict = (candidate.verdict ?? explanation?.verdict) as
              | Candidate["verdict"]
              | undefined;
            const score =
              typeof candidate.score === "number"
                ? candidate.score
                : candidate.score && !Number.isNaN(Number(candidate.score))
                  ? Number(candidate.score)
                  : undefined;
            const status =
              candidate.status && candidate.status !== ""
                ? candidate.status
                : score !== undefined
                  ? "SCORED"
                  : "PENDING";

            return {
              id: candidate.id,
              status,
              fileName: candidate.fileName || `${candidate.firstName} ${candidate.lastName}`.trim() || "CV",
              parsedName:
                candidate.lastName || candidate.firstName
                  ? `${candidate.firstName || ""} ${candidate.lastName || ""}`.trim()
                  : undefined,
              firstName: candidate.firstName,
              lastName: candidate.lastName,
              score,
              email: candidate.email,
              verdict,
              scoreExplanation: explanation,
              createdAt: candidate.createdAt,
            };
          }
        );

        // Sort candidates based on sortBy preference
        let sortedCandidates = [...loadedCandidates];
        if (sortBy === "score") {
          sortedCandidates.sort((a, b) => (b.score ?? -Infinity) - (a.score ?? -Infinity));
        } else if (sortBy === "name") {
          sortedCandidates.sort((a, b) => {
            const nameA = a.parsedName || "";
            const nameB = b.parsedName || "";
            return nameA.localeCompare(nameB);
          });
        } else if (sortBy === "uploadDate") {
          sortedCandidates.sort((a, b) => {
            const dateA = new Date(a.createdAt || 0).getTime();
            const dateB = new Date(b.createdAt || 0).getTime();
            return dateB - dateA;
          });
        }

        setCandidates(sortedCandidates);
        setCurrentPage(pagination.page);
        setTotalPages(pagination.pages);
        setTotalCandidates(pagination.total);

        if (
          sortedCandidates.some((candidate) => candidate.status === "PENDING") &&
          !pollingIntervalRef.current
        ) {
          console.log("[JobDetailPage] pending candidates detected, starting polling");
          startPolling(sortedCandidates);
        }
      }
    } catch (err) {
      console.error("Erreur lors du chargement des candidats:", err);
    }
  };

  useEffect(() => {
    if (id) fetchJob();
  }, [id]);

  // ── Fetch scoring status ───────────────────────────────
  const fetchScoringStatus = async () => {
    if (!id) return;
    try {
      const token = await getAuthToken();
      let res = await fetch(`${API_BASE_URL}/jobs/${id}/scoring-status?_t=${Date.now()}`, {
        method: "GET",
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      });

      // 401 retry
      if (res.status === 401) {
        localStorage.removeItem("linkup_access_token");
        localStorage.removeItem("accessToken");
        const newToken = await getAuthToken();
        res = await fetch(`${API_BASE_URL}/jobs/${id}/scoring-status?_t=${Date.now()}`, {
          method: "GET",
          cache: "no-store",
          headers: { Authorization: `Bearer ${newToken}` },
        });
      }

      if (!res.ok) throw new Error("Erreur lors du chargement du statut de scoring");

      const resData = await res.json();
      if (resData?.success && resData?.data) {
        setScoringStatus(resData.data);
      }
    } catch (err) {
      console.error("Erreur lors du chargement du statut de scoring:", err);
    }
  };

  // ── Start polling for scoring status ───────────────────
  const startScoringStatusPolling = () => {
    // Fetch immediately
    fetchScoringStatus();

    // Then poll every 3 seconds to match frontend refresh expectations
    const interval = setInterval(() => {
      fetchScoringStatus();
    }, 3000);

    setScoringPollingIntervalRef(interval);
  };

  const stopScoringStatusPolling = () => {
    if (scoringPollingIntervalRef) {
      clearInterval(scoringPollingIntervalRef);
      setScoringPollingIntervalRef(null);
    }
  };

  // Stop polling when scoring is completed
  useEffect(() => {
    if (scoringStatus?.scoringStatus === "COMPLETED") {
      stopScoringStatusPolling();
      // Stop candidate polling when scoring completes
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
        setIsPolling(false);
      }
      // Refresh candidate list immediately once scoring completes
      setCurrentPage(1);
      fetchCandidates(1);
    }
  }, [scoringStatus?.scoringStatus]);

  // Load job data and scoring status when component mounts
  useEffect(() => {
    if (id) {
      fetchJob();
      fetchScoringStatus();
    }
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

  // ── Upload handlers ────────────────────────────────────
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    addFiles(files);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    addFiles(files);
    // Reset the input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const addFiles = (files: File[]) => {
    setFileValidationErrors([]);
    const { valid, errors } = validateFiles(files);

    if (errors.length > 0) {
      setFileValidationErrors(errors);
      return;
    }

    const newFiles: SelectedFile[] = valid.map((file) => ({
      file,
      id: Math.random().toString(36).substring(2),
    }));

    setSelectedFiles((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (fileId: string) => {
    setSelectedFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0 || !job || !currentUser) return;

    try {
      setIsUploading(true);
      setUploadError(null);
      setUploadProgress(0);

      const formData = new FormData();
      selectedFiles.forEach(({ file }) => {
        formData.append("files", file);
      });

      let token = await getAuthToken();
      let retryCount = 0;
      const maxRetries = 1;

      const performUpload = (): Promise<any> => {
        return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
              const percentComplete = (e.loaded / e.total) * 100;
              setUploadProgress(percentComplete);
            }
          });

          xhr.addEventListener("load", async () => {
            // Handle 401 with retry
            if (xhr.status === 401 && retryCount < maxRetries) {
              retryCount++;
              console.log("Token expired, retrying with new token...");
              localStorage.removeItem("linkup_access_token");
              localStorage.removeItem("accessToken");
              token = await getAuthToken();

              // Create new FormData for retry
              const retryFormData = new FormData();
              selectedFiles.forEach(({ file }) => {
                retryFormData.append("files", file);
              });

              // Reset progress for retry
              setUploadProgress(0);

              // Retry the upload
              performUpload()
                .then(resolve)
                .catch(reject);
              return;
            }

            if (xhr.status === 202) {
              resolve(xhr.responseText);
            } else {
              reject(
                new Error(
                  `Upload échoué (${xhr.status}): ` +
                  (xhr.responseText || "Erreur serveur")
                )
              );
            }
          });

          xhr.addEventListener("error", () => {
            reject(new Error("Erreur réseau lors de l'upload"));
          });

          xhr.open("POST", `${API_BASE_URL}/jobs/${job.id}/candidates/upload`);
          xhr.setRequestHeader("Authorization", `Bearer ${token}`);
          xhr.send(formData);
        });
      };

      const responseText = await performUpload();
      const response = JSON.parse(responseText);

      if (response?.success && response?.data) {
        // Create candidate objects with initial PENDING status
        const newCandidates: Candidate[] = response.data.map(
          (candidate: any) => ({
            id: candidate.id,
            status: "PENDING" as const,
            fileName: candidate.fileName || "",
            parsedName: undefined,
            email: candidate.email,
          })
        );

        setCandidates((prev) => [...prev, ...newCandidates]);
        setSelectedFiles([]);
        setUploadProgress(100);

        // Start polling for status updates
        startPolling(newCandidates);
      }
    } catch (err: any) {
      setUploadError(err.message || "Erreur lors de l'upload");
    } finally {
      setIsUploading(false);
    }
  };

  // ── Polling handlers ───────────────────────────────────
  const startPolling = (_initialCandidates: Candidate[]) => {
    if (pollingIntervalRef.current) {
      return;
    }

    setIsPolling(true);

    // Start polling for scoring status too
    startScoringStatusPolling();

    const poll = async () => {
      if (!id) return;
      await fetchCandidates(1, 1000);
    };

    // Create the interval before the initial fetch so fetchCandidates can detect active polling
    pollingIntervalRef.current = setInterval(poll, 3000);
    poll();
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (scoringPollingIntervalRef) {
        clearInterval(scoringPollingIntervalRef);
      }
    };
  }, [scoringPollingIntervalRef]);

  // ── Permission check ──────────────────────────────────
  const canClose =
    job &&
    job.status === "OPEN" &&
    currentUser &&
    (currentUser.role === "ADMIN" || currentUser.userId === job.createdById);

  // Allow deletion for the creator or an ADMIN regardless of job status
  const canDelete =
    job &&
    currentUser &&
    (currentUser.role === "ADMIN" || currentUser.userId === job.createdById);

  // ── Handle filter and sort changes ─────────────────────
  const handleVerdictFilterChange = (value: string) => {
    setVerdictFilter(value);
    setCurrentPage(1);
    // Trigger fetch with new filter
    setTimeout(() => {
      if (value !== verdictFilter) {
        // Filter state will be used in the next fetchCandidates call
      }
    }, 0);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handleSortChange = (value: "score" | "name" | "uploadDate") => {
    setSortBy(value);
    setCurrentPage(1);
  };

  // Re-fetch when filters or sort change
  useEffect(() => {
    fetchCandidates(1);
  }, [verdictFilter, statusFilter, sortBy]);

  const handleOpenCandidate = (candidateId: string) => {
    if (!id) return;
    navigate(`/candidatures/${id}/candidats/${candidateId}`, {
      state: { fromJobDetail: true },
    });
  };

  // Open centered confirmation for candidate deletion
  const handleDeleteCandidate = (candidateId: string) => {
    const candidate = candidates.find((c) => c.id === candidateId) || null;
    if (!candidate) return;
    setCandidateToDelete(candidate);
    setDeleteCandidateError(null);
  };

  const performDeleteCandidate = async () => {
    if (!id || !candidateToDelete) return;
    if (!confirm) {
      // placeholder to satisfy linter
    }
    try {
      setIsDeletingCandidate(true);
      setDeleteCandidateError(null);
      let token = await getAuthToken();
      let res = await fetch(`${API_BASE_URL}/jobs/${id}/candidates/${candidateToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        localStorage.removeItem('linkup_access_token');
        localStorage.removeItem('accessToken');
        token = await getAuthToken();
        res = await fetch(`${API_BASE_URL}/jobs/${id}/candidates/${candidateToDelete.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData?.error?.message || 'Erreur lors de la suppression');
      }

      // Re-fetch current page to ensure consistent list & pagination
      await fetchCandidates(currentPage);
      setCandidateToDelete(null);
    } catch (err: any) {
      setDeleteCandidateError(err.message || 'Impossible de supprimer le candidat');
    } finally {
      setIsDeletingCandidate(false);
    }
  };

  // Open centered confirmation for job deletion
  const handleDeleteJob = () => {
    if (!job) return;
    setShowDeleteJobConfirm(true);
  };

  const performDeleteJob = async () => {
    if (!job) return;
    try {
      setIsDeletingJob(true);
      let token = await getAuthToken();
      let res = await fetch(`${API_BASE_URL}/jobs/${job.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        localStorage.removeItem('linkup_access_token');
        localStorage.removeItem('accessToken');
        token = await getAuthToken();
        res = await fetch(`${API_BASE_URL}/jobs/${job.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      const resData = await res.json();
      if (!res.ok) throw new Error(resData?.error?.message || 'Erreur lors de la suppression');
      navigate('/candidatures');
    } catch (err: any) {
      alert(err.message || 'Impossible de supprimer l\'offre');
    } finally {
      setIsDeletingJob(false);
      setShowDeleteJobConfirm(false);
    }
  };

  // ── PDF export handler ────────────────────────────────────
  const handleExportPdf = async () => {
    if (!id || isExporting) return;
    try {
      setIsExporting(true);
      const token = await getAuthToken();

      const res = await fetch(`${API_BASE_URL}/jobs/${id}/export/pdf`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        // Try to read error message from JSON body
        let errorMsg = `Erreur serveur (${res.status})`;
        try {
          const errData = await res.json();
          if (errData?.error?.message) {
            errorMsg = errData.error.message;
          }
        } catch {
          // Response wasn't JSON, keep default error message
        }
        throw new Error(errorMsg);
      }

      // Get the response as a blob — NOT json or text
      const blob = await res.blob();

      // Verify we got a PDF (sanity check)
      if (blob.size < 100) {
        throw new Error("Le fichier PDF généré semble vide ou corrompu.");
      }

      // Create a proper PDF blob and trigger download
      const pdfBlob = new Blob([blob], { type: "application/pdf" });
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `export-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Revoke the object URL after a short delay to ensure download starts
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err: any) {
      console.error("[PDF Export] Error:", err);
      alert(err.message || "Impossible d'exporter le PDF.");
    } finally {
      setIsExporting(false);
    }
  };

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
              className={`db-badge jd-status-badge ${job.status === "OPEN" ? "badge--green" : "badge--gray"
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
            {canDelete && (
              <button
                onClick={() => handleDeleteJob()}
                className="jd-btn-delete"
                id="btn-delete-job"
                style={{ marginLeft: 8, display: 'inline-flex', alignItems: 'center', gap: 8 }}
              >
                <Trash2 size={14} />
                <span>Supprimer</span>
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

      {/* ── Candidates section ── */}
      <div className="db-card" id="candidates-section">
        <div className="jd-section-header" style={{ justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Users
              size={16}
              strokeWidth={2}
              style={{ color: "var(--lu-accent)" }}
            />
            <h3 className="jd-section-title">
              Candidats{" "}
              <span className="jd-section-count">({candidates.length})</span>
            </h3>
          </div>
          <button
            onClick={handleExportPdf}
            disabled={!scoringStatus || scoringStatus.scoredCount === 0 || isExporting}
            title={
              !scoringStatus || scoringStatus.scoredCount === 0
                ? "Aucun résultat à exporter"
                : "Exporter les résultats en PDF"
            }
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 14px",
              fontSize: "13px",
              fontWeight: 500,
              borderRadius: "8px",
              border: "1px solid var(--lu-border)",
              backgroundColor:
                !scoringStatus || scoringStatus.scoredCount === 0
                  ? "var(--lu-bg-secondary)"
                  : "var(--lu-accent)",
              color:
                !scoringStatus || scoringStatus.scoredCount === 0
                  ? "var(--lu-text-muted)"
                  : "#ffffff",
              cursor:
                !scoringStatus || scoringStatus.scoredCount === 0 || isExporting
                  ? "not-allowed"
                  : "pointer",
              opacity:
                !scoringStatus || scoringStatus.scoredCount === 0
                  ? 0.6
                  : 1,
              transition: "all 0.2s ease",
            }}
          >
            {isExporting ? (
              <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
            ) : (
              <Download size={14} />
            )}
            {isExporting ? "Export en cours…" : "Exporter en PDF"}
          </button>
        </div>

        {/* File validation errors */}
        {fileValidationErrors.length > 0 && (
          <div className="cand-error-alert" style={{ marginBottom: "16px" }}>
            <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
              <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
              <div>
                <strong>Fichiers non valides:</strong>
                <ul style={{ marginTop: "8px", marginLeft: "20px", fontSize: "0.9em" }}>
                  {fileValidationErrors.map((err, i) => (
                    <li key={i}>
                      <strong>{err.fileName}:</strong> {err.reason}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Upload error */}
        {uploadError && (
          <div className="cand-error-alert" style={{ marginBottom: "16px" }}>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <AlertCircle size={16} />
              <span>{uploadError}</span>
            </div>
          </div>
        )}

        {/* Candidates table - shown when candidates exist */}
        {candidates.length > 0 && (
          <div style={{ marginBottom: "24px" }}>
            {/* Progress indicator - shown when scoring is in progress */}
            {scoringStatus?.scoringStatus === "IN_PROGRESS" && (
              <div
                style={{
                  backgroundColor: "rgba(59, 130, 246, 0.05)",
                  border: "1px solid rgba(59, 130, 246, 0.2)",
                  borderRadius: "6px",
                  padding: "12px 16px",
                  marginBottom: "16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <Loader2
                  size={16}
                  className="cand-spinner"
                  style={{ color: "var(--lu-accent)", flexShrink: 0 }}
                />
                <span style={{ fontSize: "0.9em", color: "var(--lu-text-secondary)" }}>
                  Analyse en cours... {scoringStatus.scoredCount} / {scoringStatus.totalCandidates} candidats scorés
                </span>
              </div>
            )}

            {/* Filter and sort controls */}
            <div
              style={{
                display: "flex",
                gap: "12px",
                marginBottom: "16px",
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <label style={{ fontSize: "0.9em", fontWeight: 500, color: "var(--lu-text-secondary)" }}>
                  Verdict :
                </label>
                <select
                  value={verdictFilter}
                  onChange={(e) => handleVerdictFilterChange(e.target.value)}
                  style={{
                    padding: "6px 10px",
                    borderRadius: "4px",
                    border: "1px solid var(--lu-border)",
                    backgroundColor: "var(--lu-bg-page)",
                    color: "var(--lu-text-primary)",
                    fontSize: "0.9em",
                    cursor: "pointer",
                  }}
                >
                  <option value="All">Tous</option>
                  <option value="STRONG_FIT">Très bon fit</option>
                  <option value="GOOD_FIT">Bon fit</option>
                  <option value="PARTIAL_FIT">Partiellement adéquat</option>
                  <option value="WEAK_FIT">Peu adéquat</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <label style={{ fontSize: "0.9em", fontWeight: 500, color: "var(--lu-text-secondary)" }}>
                  Statut :
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => handleStatusFilterChange(e.target.value)}
                  style={{
                    padding: "6px 10px",
                    borderRadius: "4px",
                    border: "1px solid var(--lu-border)",
                    backgroundColor: "var(--lu-bg-page)",
                    color: "var(--lu-text-primary)",
                    fontSize: "0.9em",
                    cursor: "pointer",
                  }}
                >
                  <option value="All">Tous</option>
                  <option value="PENDING">En attente</option>
                  <option value="NEW">Nouveau</option>
                  <option value="SHORTLISTED">Sélectionné</option>
                  <option value="REJECTED">Rejeté</option>
                  <option value="OFFERED">Offre</option>
                  <option value="SCORED">Scoré</option>
                  <option value="FAILED">Échoué</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: "8px", alignItems: "center", marginLeft: "auto" }}>
                <label style={{ fontSize: "0.9em", fontWeight: 500, color: "var(--lu-text-secondary)" }}>
                  Trier par :
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value as "score" | "name" | "uploadDate")}
                  style={{
                    padding: "6px 10px",
                    borderRadius: "4px",
                    border: "1px solid var(--lu-border)",
                    backgroundColor: "var(--lu-bg-page)",
                    color: "var(--lu-text-primary)",
                    fontSize: "0.9em",
                    cursor: "pointer",
                  }}
                >
                  <option value="score">Score (décroissant)</option>
                  <option value="name">Nom (A-Z)</option>
                  <option value="uploadDate">Date d'upload (récent)</option>
                </select>
              </div>
            </div>

            <h4 style={{ margin: "0 0 12px 0", fontSize: "0.95em", fontWeight: 600 }}>
              Candidats ({totalCandidates} total)
            </h4>
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "0.9em",
                }}
              >
                <thead>
                  <tr
                    style={{
                      borderBottom: "1px solid var(--lu-border)",
                      backgroundColor: "var(--lu-bg-secondary)",
                    }}
                  >
                    <th
                      style={{
                        padding: "12px",
                        textAlign: "left",
                        fontWeight: 600,
                        color: "var(--lu-text-secondary)",
                      }}
                    >
                      Statut
                    </th>
                    <th
                      style={{
                        padding: "12px",
                        textAlign: "left",
                        fontWeight: 600,
                        color: "var(--lu-text-secondary)",
                      }}
                    >
                      Nom du candidat
                    </th>
                    <th
                      style={{
                        padding: "12px",
                        textAlign: "left",
                        fontWeight: 600,
                        color: "var(--lu-text-secondary)",
                      }}
                    >
                      Email
                    </th>
                    <th
                      style={{
                        padding: "12px",
                        textAlign: "center",
                        fontWeight: 600,
                        color: "var(--lu-text-secondary)",
                      }}
                    >
                      Score
                    </th>
                    <th
                      style={{
                        padding: "12px",
                        textAlign: "center",
                        fontWeight: 600,
                        color: "var(--lu-text-secondary)",
                      }}
                    >
                      Verdict
                    </th>
                    <th
                      style={{
                        padding: "12px",
                        textAlign: "center",
                        fontWeight: 600,
                        color: "var(--lu-text-secondary)",
                        width: "80px",
                      }}
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((candidate) => (
                    <tr
                      key={candidate.id}
                      onClick={() => handleOpenCandidate(candidate.id)}
                      style={{
                        borderBottom: "1px solid var(--lu-border)",
                        backgroundColor:
                          candidate.status === "FAILED"
                            ? "rgba(239, 68, 68, 0.05)"
                            : "transparent",
                        cursor: "pointer",
                      }}
                    >
                      {/* Status column */}
                      <td
                        style={{
                          padding: "12px",
                          textAlign: "center",
                        }}
                      >
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "6px",
                          }}
                        >
                          {candidate.status === "PENDING" && (
                            <>
                              <Loader2
                                size={16}
                                className="cand-spinner"
                                style={{ color: "var(--lu-accent)" }}
                              />
                              <span style={{ fontSize: "0.9em" }}>PENDING</span>
                            </>
                          )}
                          {candidate.status === "SCORED" && (
                            <>
                              <CheckCircle2
                                size={16}
                                style={{ color: "#22c55e" }}
                                strokeWidth={2.5}
                              />
                              <span style={{ fontSize: "0.9em", color: "#22c55e" }}>SCORED</span>
                            </>
                          )}
                          {candidate.status === "FAILED" && (
                            <>
                              <XCircle
                                size={16}
                                style={{ color: "#ef4444" }}
                                strokeWidth={2.5}
                              />
                              <span style={{ fontSize: "0.9em", color: "#ef4444" }}>FAILED</span>
                            </>
                          )}
                          {candidate.status === "NEW" && (
                            <span style={{ fontSize: "0.9em" }}>NOUVEAU</span>
                          )}
                          {candidate.status === "SHORTLISTED" && (
                            <span style={{ fontSize: "0.9em", color: "#3b82f6" }}>SÉLECTIONNÉ</span>
                          )}
                          {candidate.status === "REJECTED" && (
                            <span style={{ fontSize: "0.9em", color: "#ef4444" }}>REJETÉ</span>
                          )}
                          {candidate.status === "OFFERED" && (
                            <span style={{ fontSize: "0.9em", color: "#22c55e" }}>OFFRE</span>
                          )}
                        </div>
                      </td>

                      {/* Candidate name column */}
                      <td style={{ padding: "12px" }}>
                        <div style={{ fontWeight: 500 }}>
                          {candidate.parsedName || (
                            <span style={{ color: "var(--lu-text-tertiary)" }}>
                              {candidate.status === "PENDING"
                                ? "Analyse en cours..."
                                : "Non disponible"}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Email column */}
                      <td style={{ padding: "12px" }}>
                        <div
                          style={{
                            fontSize: "0.9em",
                            color: candidate.email
                              ? "var(--lu-text-secondary)"
                              : "var(--lu-text-tertiary)",
                            wordBreak: "break-all",
                          }}
                        >
                          {candidate.email || "-"}
                        </div>
                      </td>

                      {/* Score column with badge */}
                      <td
                        style={{
                          padding: "12px",
                          textAlign: "center",
                        }}
                      >
                        {candidate.score !== undefined && candidate.score > 0 ? (
                          <div
                            style={{
                              display: "inline-block",
                              padding: "4px 8px",
                              borderRadius: "4px",
                              fontWeight: 600,
                              fontSize: "0.85em",
                              ...getScoreBadgeColor(candidate.score),
                            }}
                          >
                            {candidate.score.toFixed(0)}
                          </div>
                        ) : (
                          <div
                            style={{
                              fontSize: "0.85em",
                              color: "var(--lu-text-tertiary)",
                            }}
                          >
                            -
                          </div>
                        )}
                      </td>

                      {/* Verdict column with badge */}
                      <td
                        style={{
                          padding: "12px",
                          textAlign: "center",
                        }}
                      >
                        {candidate.verdict ? (
                          <div
                            style={{
                              display: "inline-block",
                              padding: "4px 8px",
                              borderRadius: "4px",
                              fontWeight: 500,
                              fontSize: "0.85em",
                              ...getVerdictBadgeColor(candidate.verdict),
                            }}
                          >
                            {getVerdictLabel(candidate.verdict)}
                          </div>
                        ) : (
                          <div
                            style={{
                              fontSize: "0.85em",
                              color: "var(--lu-text-tertiary)",
                            }}
                          >
                            -
                          </div>
                        )}
                      </td>

                      <td style={{ padding: "12px", textAlign: "center" }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCandidate(candidate.id);
                          }}
                          className="cand-btn-danger"
                          title="Supprimer le candidat"
                          style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination controls */}
            {totalPages > 1 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: "12px",
                  marginTop: "16px",
                  paddingTop: "12px",
                  borderTop: "1px solid var(--lu-border)",
                }}
              >
                <button
                  onClick={() => fetchCandidates(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="cand-btn-secondary"
                  style={{
                    padding: "6px 12px",
                    fontSize: "0.9em",
                    opacity: currentPage === 1 ? 0.5 : 1,
                    cursor: currentPage === 1 ? "not-allowed" : "pointer",
                  }}
                >
                  ← Précédent
                </button>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "0.9em",
                    color: "var(--lu-text-secondary)",
                  }}
                >
                  <span>Page</span>
                  <input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={currentPage}
                    onChange={(e) => {
                      const page = parseInt(e.target.value) || 1;
                      if (page >= 1 && page <= totalPages) {
                        fetchCandidates(page);
                      }
                    }}
                    style={{
                      width: "50px",
                      padding: "4px 8px",
                      textAlign: "center",
                      border: "1px solid var(--lu-border)",
                      borderRadius: "4px",
                      fontSize: "0.9em",
                    }}
                  />
                  <span>/ {totalPages}</span>
                </div>

                <button
                  onClick={() => fetchCandidates(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="cand-btn-secondary"
                  style={{
                    padding: "6px 12px",
                    fontSize: "0.9em",
                    opacity: currentPage === totalPages ? 0.5 : 1,
                    cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                  }}
                >
                  Suivant →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Empty state message when filters return no results */}
        {candidates.length === 0 && (verdictFilter !== "All" || statusFilter !== "All") && (
          <div style={{ marginBottom: "24px" }}>
            {/* Filter and sort controls (shown even with no results) */}
            <div
              style={{
                display: "flex",
                gap: "12px",
                marginBottom: "16px",
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <label style={{ fontSize: "0.9em", fontWeight: 500, color: "var(--lu-text-secondary)" }}>
                  Verdict :
                </label>
                <select
                  value={verdictFilter}
                  onChange={(e) => handleVerdictFilterChange(e.target.value)}
                  style={{
                    padding: "6px 10px",
                    borderRadius: "4px",
                    border: "1px solid var(--lu-border)",
                    backgroundColor: "var(--lu-bg-page)",
                    color: "var(--lu-text-primary)",
                    fontSize: "0.9em",
                    cursor: "pointer",
                  }}
                >
                  <option value="All">Tous</option>
                  <option value="STRONG_FIT">Très bon fit</option>
                  <option value="GOOD_FIT">Bon fit</option>
                  <option value="PARTIAL_FIT">Partiellement adéquat</option>
                  <option value="WEAK_FIT">Peu adéquat</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <label style={{ fontSize: "0.9em", fontWeight: 500, color: "var(--lu-text-secondary)" }}>
                  Statut :
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => handleStatusFilterChange(e.target.value)}
                  style={{
                    padding: "6px 10px",
                    borderRadius: "4px",
                    border: "1px solid var(--lu-border)",
                    backgroundColor: "var(--lu-bg-page)",
                    color: "var(--lu-text-primary)",
                    fontSize: "0.9em",
                    cursor: "pointer",
                  }}
                >
                  <option value="All">Tous</option>
                  <option value="PENDING">En attente</option>
                  <option value="NEW">Nouveau</option>
                  <option value="SHORTLISTED">Sélectionné</option>
                  <option value="REJECTED">Rejeté</option>
                  <option value="OFFERED">Offre</option>
                  <option value="SCORED">Scoré</option>
                  <option value="FAILED">Échoué</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: "8px", alignItems: "center", marginLeft: "auto" }}>
                <label style={{ fontSize: "0.9em", fontWeight: 500, color: "var(--lu-text-secondary)" }}>
                  Trier par :
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value as "score" | "name" | "uploadDate")}
                  style={{
                    padding: "6px 10px",
                    borderRadius: "4px",
                    border: "1px solid var(--lu-border)",
                    backgroundColor: "var(--lu-bg-page)",
                    color: "var(--lu-text-primary)",
                    fontSize: "0.9em",
                    cursor: "pointer",
                  }}
                >
                  <option value="score">Score (décroissant)</option>
                  <option value="name">Nom (A-Z)</option>
                  <option value="uploadDate">Date d'upload (récent)</option>
                </select>
              </div>
            </div>

            {/* Empty state message */}
            <div
              style={{
                textAlign: "center",
                padding: "40px 20px",
                backgroundColor: "rgba(59, 130, 246, 0.05)",
                border: "1px dashed rgba(59, 130, 246, 0.3)",
                borderRadius: "8px",
              }}
            >
              <Users size={32} strokeWidth={1.4} style={{ margin: "0 auto 12px", color: "var(--lu-text-tertiary)" }} />
              <h4 style={{ margin: "0 0 8px 0", fontSize: "1em", fontWeight: 600, color: "var(--lu-text-secondary)" }}>
                Aucun candidat trouvé
              </h4>
              <p style={{ margin: "0", fontSize: "0.9em", color: "var(--lu-text-tertiary)" }}>
                Aucun candidat ne correspond aux filtres sélectionnés. Essayez de modifier vos critères.
              </p>
            </div>
          </div>
        )}

        {/* Dropzone - always shown to allow uploading more files */}
        <div
          className={`jd-dropzone ${dragActive ? "jd-dropzone--active" : ""}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: "2px dashed var(--lu-border)",
            borderRadius: "8px",
            padding: "32px",
            textAlign: "center",
            cursor: job.status === "CLOSED" ? "not-allowed" : "pointer",
            backgroundColor: dragActive
              ? "rgba(var(--lu-accent-rgb, 59, 130, 246), 0.05)"
              : "transparent",
            transition: "all 0.2s ease",
            marginBottom: selectedFiles.length > 0 ? "16px" : "0",
            opacity: job.status === "CLOSED" ? 0.6 : 1,
          }}
        >
          <Upload
            size={32}
            strokeWidth={1.4}
            style={{ margin: "0 auto 12px", color: "var(--lu-accent)" }}
          />
          <h4 style={{ margin: "0 0 8px 0", fontSize: "1em", fontWeight: 600 }}>
            {candidates.length > 0
              ? "Uploader d'autres CVs"
              : "Glissez-déposez vos CVs ici"}
          </h4>
          <p style={{ margin: "0 0 12px 0", fontSize: "0.9em", color: "var(--lu-text-secondary)" }}>
            ou cliquez pour sélectionner des fichiers
          </p>
          <p style={{ margin: "0", fontSize: "0.85em", color: "var(--lu-text-tertiary)" }}>
            PDF, DOCX • Max 5MB par fichier
          </p>
        </div>

        {/* Selected files list */}
        {selectedFiles.length > 0 && (
          <div style={{ marginBottom: "16px", marginTop: "16px" }}>
            <h4 style={{ margin: "0 0 12px 0", fontSize: "0.95em", fontWeight: 600 }}>
              Fichiers sélectionnés ({selectedFiles.length})
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {selectedFiles.map(({ file, id }) => (
                <div
                  key={id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px",
                    backgroundColor: "var(--lu-bg-secondary)",
                    borderRadius: "6px",
                    fontSize: "0.9em",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <FileText size={16} />
                    <div>
                      <div style={{ fontWeight: 500 }}>{file.name}</div>
                      <div style={{ fontSize: "0.85em", color: "var(--lu-text-tertiary)" }}>
                        {formatFileSize(file.size)}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFile(id)}
                    disabled={isUploading}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: isUploading ? "default" : "pointer",
                      padding: "4px",
                      display: "flex",
                      alignItems: "center",
                      color: "var(--lu-text-secondary)",
                      opacity: isUploading ? 0.5 : 1,
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload button and progress */}
        {selectedFiles.length > 0 && (
          <div style={{ marginBottom: "16px" }}>
            <button
              onClick={handleUpload}
              disabled={isUploading || job.status === "CLOSED"}
              className="cand-btn-primary"
              style={{ width: "100%", justifyContent: "center" }}
            >
              {isUploading ? (
                <>
                  <Loader2 size={14} className="cand-skeleton-pulse" />
                  <span>Analyse en cours...</span>
                </>
              ) : (
                <>
                  <Upload size={14} strokeWidth={2.4} />
                  <span>Analyser les CVs</span>
                </>
              )}
            </button>

            {/* Progress bar */}
            {isUploading && (
              <div
                style={{
                  marginTop: "12px",
                  height: "4px",
                  backgroundColor: "var(--lu-bg-secondary)",
                  borderRadius: "2px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    backgroundColor: "var(--lu-accent)",
                    width: `${uploadProgress}%`,
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Empty state with no candidates and no files */}
        {selectedFiles.length === 0 && candidates.length === 0 && (
          <p
            style={{
              textAlign: "center",
              fontSize: "0.9em",
              color: "var(--lu-text-secondary)",
              marginTop: "16px",
            }}
          >
            Aucun candidat pour l'instant. Uploadez des CVs pour démarrer
            le processus de sélection.
          </p>
        )}

        {/* Status message for closed jobs */}
        {job.status === "CLOSED" && selectedFiles.length === 0 && (
          <p
            style={{
              textAlign: "center",
              fontSize: "0.9em",
              color: "var(--lu-text-secondary)",
              marginTop: "16px",
            }}
          >
            L'upload de CVs est désactivé pour les offres clôturées.
          </p>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx"
          onChange={handleFileInputChange}
          style={{ display: "none" }}
        />

        {/* Centered delete confirmation for candidate */}
        {candidateToDelete && (
          <>
            <div
              className="cand-drawer-overlay cand-drawer-overlay--open"
              onClick={() => { if (!isDeletingCandidate) setCandidateToDelete(null); }}
            />
            <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
              <div style={{ width: 420, background: 'var(--lu-bg-page)', border: '1px solid var(--lu-border)', borderRadius: 8, padding: 20, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
                <h3 style={{ marginTop: 0 }}>Supprimer le candidat ?</h3>
                <p style={{ marginTop: 8 }}>Voulez-vous vraiment supprimer ce candidat ? Cette action est irréversible.</p>
                {deleteCandidateError && <div className="cand-error-alert" style={{ marginTop: 12 }}>{deleteCandidateError}</div>}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                  <button className="cand-btn-secondary" onClick={() => setCandidateToDelete(null)} disabled={isDeletingCandidate}>Annuler</button>
                  <button className="cand-btn-danger" onClick={performDeleteCandidate} disabled={isDeletingCandidate}>
                    {isDeletingCandidate ? <Loader2 size={14} className="cand-skeleton-pulse" /> : 'Confirmer la suppression'}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Centered delete confirmation for job */}
        {showDeleteJobConfirm && (
          <>
            <div
              className="cand-drawer-overlay cand-drawer-overlay--open"
              onClick={() => { if (!isDeletingJob) setShowDeleteJobConfirm(false); }}
            />
            <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
              <div style={{ width: 420, background: 'var(--lu-bg-page)', border: '1px solid var(--lu-border)', borderRadius: 8, padding: 20, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
                <h3 style={{ marginTop: 0 }}>Supprimer l'offre ?</h3>
                <p style={{ marginTop: 8 }}>Voulez-vous vraiment supprimer l'offre « <strong>{job?.title}</strong> » et tous ses candidats ? Cette action est irréversible.</p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                  <button className="cand-btn-secondary" onClick={() => setShowDeleteJobConfirm(false)} disabled={isDeletingJob}>Annuler</button>
                  <button className="cand-btn-danger" onClick={performDeleteJob} disabled={isDeletingJob}>
                    {isDeletingJob ? <Loader2 size={14} className="cand-skeleton-pulse" /> : 'Confirmer la suppression'}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Last updated ── */}
      <p className="jd-updated-note">
        Dernière mise à jour : {formatDateRelative(job.updatedAt)}
      </p>
    </div>
  );
}
