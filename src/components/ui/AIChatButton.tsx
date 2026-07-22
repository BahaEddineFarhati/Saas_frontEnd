import { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { Sparkles, X } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import AIChatPanel from "./AIChatPanel";
import { useTranslation } from "../../i18n/I18nContext";

/**
 * Regex to match job-opening pages and extract the jobId.
 * Matches:  /candidatures/:jobId
 *           /candidatures/:jobId/candidats/:candidateId
 */
const JOB_ROUTE_RE = /^\/candidatures\/([^/]+)(?:\/candidats\/[^/]+)?$/;

export default function AIChatButton() {
  const { pathname } = useLocation();
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  // Extract jobId from the current pathname (null if not on a job page)
  const jobId = useMemo(() => {
    const match = pathname.match(JOB_ROUTE_RE);
    return match ? match[1] : null;
  }, [pathname]);

  // Close the panel when navigating to a different job or away from job pages
  useEffect(() => {
    setIsOpen(false);
  }, [jobId]);

  // Don't render if not authenticated or not on a job page
  if (!isAuthenticated || !jobId) return null;

  return (
    <>
      {/* Chat Panel (kept mounted to preserve state & pending requests on close) */}
      <AIChatPanel
        jobId={jobId}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />

      {/* Floating Button */}
      <button
        type="button"
        className={`ai-chat-btn${isOpen ? " ai-chat-btn--open" : ""}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? t('chat.closeChat') : t('chat.openChat')}
      >
        <span className="ai-chat-btn__icon">
          {isOpen ? <X size={24} strokeWidth={2} /> : <Sparkles size={24} strokeWidth={2} />}
        </span>
      </button>
    </>
  );
}
