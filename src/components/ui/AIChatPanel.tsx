import { useState, useEffect, useRef, useCallback } from "react";
import { Sparkles, Trash2, SendHorizontal, RotateCw, Square } from "lucide-react";
import {
  fetchChatMessages,
  sendChatMessage,
  clearChatSession,
  fetchJobTitle,
  ChatMessage,
} from "../../api/chatApi";

// ── Constants ────────────────────────────────────────────────────────────────

const MAX_CHARS = 1000;
const CHAR_WARN_THRESHOLD = 800;
const LLM_TIMEOUT_MS = 30_000;

const WELCOME_MESSAGE =
  "Bonjour ! Je suis votre assistant IA pour ce poste. Vous pouvez me poser des questions sur les candidats, leurs profils, et qui correspond le mieux à votre recherche.";

const INITIAL_CHIPS = [
  "Qui est le meilleur candidat pour ce poste ?",
  "Quels candidats devrais-je shortlister ?",
  "Compare les deux meilleurs candidats",
  "Quels sont les points faibles de notre pipeline ?",
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeTime(value: string): string {
  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / 60_000));
  if (diffMinutes < 60) return `Il y a ${diffMinutes} min`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `Il y a ${diffHours} h`;
  const diffDays = Math.round(diffHours / 24);
  return `Il y a ${diffDays} j`;
}

// Truncate function
function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + "…" : text;
}

function cleanMessageContent(content: string): string {
  const matchIndex = content.search(/SUGGESTIONS:/i);
  if (matchIndex !== -1) {
    return content.slice(0, matchIndex).trim();
  }
  return content;
}

// ── Props ────────────────────────────────────────────────────────────────────

interface AIChatPanelProps {
  jobId: string;
  isOpen: boolean;
  onClose: () => void;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function AIChatPanel({ jobId, isOpen }: AIChatPanelProps) {
  // State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUserMessage, setLastUserMessage] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const prevSuggestionsRef = useRef<string[]>([]);

  // ── Cancel request helper ───────────────────────────────────────────────
  const cancelPendingRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsPending(false);
  }, []);

  // ── Scroll to bottom ────────────────────────────────────────────────────
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isPending, scrollToBottom]);

  // ── Load job title ──────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    fetchJobTitle(jobId)
      .then((title) => {
        if (!cancelled) setJobTitle(title);
      })
      .catch(() => {
        if (!cancelled) setJobTitle("Poste");
      });
    return () => { cancelled = true; };
  }, [jobId]);

  // ── Load message history ────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setIsLoadingHistory(true);
    setError(null);
    setSuggestions([]);
    cancelPendingRequest(); // Abort any query when moving to a different job

    fetchChatMessages(jobId)
      .then((msgs) => {
        if (!cancelled) {
          setMessages(msgs);
          
          // Restore suggestions from the last message if it's from the assistant
          if (msgs.length > 0) {
            const lastMsg = msgs[msgs.length - 1];
            if (lastMsg.role === "ASSISTANT") {
              const matchIndex = lastMsg.content.search(/SUGGESTIONS:/i);
              if (matchIndex !== -1) {
                const suggestionsSection = lastMsg.content.slice(matchIndex + "SUGGESTIONS:".length).trim();
                let loadedSuggestions: string[] | undefined;
                
                if (suggestionsSection.startsWith("[")) {
                  try {
                    const parsed = JSON.parse(suggestionsSection);
                    if (Array.isArray(parsed) && parsed.every((s: unknown) => typeof s === "string")) {
                      loadedSuggestions = parsed.slice(0, 2);
                    }
                  } catch {}
                }
                
                if (!loadedSuggestions) {
                  const lines = suggestionsSection.split("\n");
                  const listItems: string[] = [];
                  for (const line of lines) {
                    const cleanLine = line.replace(/^\s*[-*•]\s*|^\s*\d+\.\s*/, "").trim();
                    if (cleanLine) {
                      listItems.push(cleanLine);
                    }
                  }
                  if (listItems.length > 0) {
                    loadedSuggestions = listItems.slice(0, 2);
                  }
                }
                
                if (loadedSuggestions) {
                  setSuggestions(loadedSuggestions);
                }
              }
            }
          }

          setIsLoadingHistory(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMessages([]);
          setIsLoadingHistory(false);
        }
      });

    return () => { cancelled = true; };
  }, [jobId, cancelPendingRequest]);

  // ── Auto-resize textarea ───────────────────────────────────────────────
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 72)}px`;
  }, [input]);

  // ── Send message ───────────────────────────────────────────────────────
  const handleSend = useCallback(async (text?: string) => {
    const messageText = (text ?? input).trim();
    if (!messageText || isPending) return;

    // Optimistic UI — add user message immediately
    const optimisticUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: "USER",
      content: messageText,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev: ChatMessage[]) => [...prev, optimisticUserMsg]);
    setInput("");
    setIsPending(true);
    setError(null);
    setLastUserMessage(messageText);
    
    // Store current suggestions for cancellation restoration
    prevSuggestionsRef.current = suggestions;
    setSuggestions([]);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    // Set 30s timeout
    timeoutRef.current = setTimeout(() => {
      setIsPending(false);
      setError("La réponse a pris trop longtemps. Veuillez réessayer.");
    }, LLM_TIMEOUT_MS);

    // Instantiate AbortController
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await sendChatMessage(jobId, messageText, controller.signal);

      // Clear timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      setMessages((prev: ChatMessage[]) => {
        const withoutOptimistic = prev.filter((m: ChatMessage) => m.id !== optimisticUserMsg.id);
        return [...withoutOptimistic, optimisticUserMsg, response.message];
      });

      if (response.suggestions && response.suggestions.length > 0) {
        setSuggestions(response.suggestions.slice(0, 2));
      }

      setError(null);
    } catch (err: any) {
      // Clear timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      // If request was aborted, ignore and clean up UI peacefully
      if (err.name === "CanceledError" || err.code === "ERR_CANCELED") {
        // Restore previous suggestions or default chips
        if (prevSuggestionsRef.current.length > 0) {
          setSuggestions(prevSuggestionsRef.current);
        } else {
          setSuggestions(INITIAL_CHIPS);
        }
        return;
      }

      setError("Une erreur s'est produite. Veuillez réessayer.");
    } finally {
      setIsPending(false);
      abortControllerRef.current = null;
    }
  }, [input, isPending, jobId]);

  // ── Retry last message ─────────────────────────────────────────────────
  const handleRetry = useCallback(() => {
    if (lastUserMessage) {
      setError(null);
      handleSend(lastUserMessage);
    }
  }, [lastUserMessage, handleSend]);

  // ── Clear conversation ─────────────────────────────────────────────────
  const handleClear = useCallback(async () => {
    cancelPendingRequest(); // Abort any active query
    try {
      await clearChatSession(jobId);
      setMessages([]);
      setSuggestions([]);
      setError(null);
      setShowClearConfirm(false);
    } catch {
      setShowClearConfirm(false);
    }
  }, [jobId, cancelPendingRequest]);

  // ── Keyboard handler ──────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Cleanup timeout on unmount ─────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // ── Derived state ─────────────────────────────────────────────────────
  const isWelcomeState = !isLoadingHistory && messages.length === 0;
  const charCount = input.length;
  const showCharCounter = charCount > CHAR_WARN_THRESHOLD;

  return (
    <div
      className={`ai-chat-panel ${isOpen ? "ai-chat-panel--open" : "ai-chat-panel--closed"}`}
      role="dialog"
      aria-label="Assistant IA"
    >
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="ai-chat-header">
        <span className="ai-chat-header__icon">
          <Sparkles size={18} strokeWidth={2} />
        </span>
        <span className="ai-chat-header__title">
          Assistant IA — {truncate(jobTitle, 30) || "…"}
        </span>
        {showClearConfirm ? (
          <button
            type="button"
            className="ai-chat-header__clear-confirm"
            onClick={handleClear}
            onBlur={() => setShowClearConfirm(false)}
          >
            Confirmer ?
          </button>
        ) : (
          <button
            type="button"
            className="ai-chat-header__clear-btn"
            onClick={() => setShowClearConfirm(true)}
            title="Effacer l'historique"
          >
            <Trash2 size={16} strokeWidth={1.8} />
          </button>
        )}
      </div>

      {/* ── Messages ───────────────────────────────────────── */}
      {isLoadingHistory ? (
        <div className="ai-chat-skeleton">
          <div className="ai-chat-skeleton__bar ai-chat-skeleton__bar--left" />
          <div className="ai-chat-skeleton__bar ai-chat-skeleton__bar--right" />
          <div className="ai-chat-skeleton__bar ai-chat-skeleton__bar--left-sm" />
        </div>
      ) : (
        <div className="ai-chat-messages">
          {/* Welcome message (always shown when no messages) */}
          {isWelcomeState && (
            <div className="ai-chat-welcome">
              <div className="ai-chat-msg ai-chat-msg--assistant">
                <div className="ai-chat-msg__bubble">{WELCOME_MESSAGE}</div>
              </div>
              <div className="ai-chat-welcome__chips">
                {INITIAL_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    className="ai-chat-suggestion-chip"
                    onClick={() => handleSend(chip)}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message history */}
          {messages.map((msg: ChatMessage) => (
            <div
              key={msg.id}
              className={`ai-chat-msg ai-chat-msg--${msg.role === "USER" ? "user" : "assistant"}`}
            >
              <div className="ai-chat-msg__bubble">{cleanMessageContent(msg.content)}</div>
              <span className="ai-chat-msg__time">
                {formatRelativeTime(msg.createdAt)}
              </span>
            </div>
          ))}

          {/* Typing indicator */}
          {isPending && (
            <div className="ai-chat-typing">
              <span className="ai-chat-typing__dot" />
              <span className="ai-chat-typing__dot" />
              <span className="ai-chat-typing__dot" />
            </div>
          )}

          {/* Error bubble */}
          {error && !isPending && (
            <div className="ai-chat-msg ai-chat-msg--error">
              <div className="ai-chat-msg__bubble">
                {error}
                {lastUserMessage && (
                  <button
                    type="button"
                    className="ai-chat-msg__retry-btn"
                    onClick={handleRetry}
                  >
                    <RotateCw size={12} strokeWidth={2} />
                    Réessayer
                  </button>
                )}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      )}

      {/* ── Contextual Suggestions ─────────────────────────── */}
      {suggestions.length > 0 && !isPending && (
        <div className="ai-chat-suggestions-bar">
          <span className="ai-chat-suggestions-bar__label">Suggestions</span>
          {suggestions.map((s: string) => (
            <button
              key={s}
              type="button"
              className="ai-chat-suggestion-chip"
              onClick={() => handleSend(s)}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* ── Input Area ─────────────────────────────────────── */}
      <div className="ai-chat-input-area">
        <div className="ai-chat-input-row">
          <textarea
            ref={textareaRef}
            className="ai-chat-textarea"
            placeholder="Posez votre question…"
            value={input}
            onChange={(e) => {
              if (e.target.value.length <= MAX_CHARS) {
                setInput(e.target.value);
              }
            }}
            onKeyDown={handleKeyDown}
            rows={1}
            maxLength={MAX_CHARS}
          />
          {isPending ? (
            <button
              type="button"
              className="ai-chat-send-btn ai-chat-send-btn--stop"
              onClick={cancelPendingRequest}
              aria-label="Arrêter"
            >
              <Square size={16} fill="currentColor" strokeWidth={2} />
            </button>
          ) : (
            <button
              type="button"
              className="ai-chat-send-btn"
              disabled={!input.trim()}
              onClick={() => handleSend()}
              aria-label="Envoyer"
            >
              <SendHorizontal size={18} strokeWidth={2} />
            </button>
          )}
        </div>
        {showCharCounter && (
          <div
            className={`ai-chat-char-counter${
              charCount >= MAX_CHARS
                ? " ai-chat-char-counter--max"
                : charCount > 900
                  ? " ai-chat-char-counter--warn"
                  : ""
            }`}
          >
            {charCount}/{MAX_CHARS}
          </div>
        )}
      </div>
    </div>
  );
}
