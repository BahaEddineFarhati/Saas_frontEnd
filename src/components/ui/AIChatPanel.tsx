import { useState, useEffect, useRef, useCallback } from "react";
import { Sparkles, Trash2, SendHorizontal, RotateCw, Square, X as XIcon, Info } from "lucide-react";
import {
  fetchChatMessages,
  sendChatMessage,
  clearChatSession,
  fetchJobTitle,
  ChatMessage,
} from "../../api/chatApi";
import { useTranslation } from "../../i18n/I18nContext";

// ── Constants ────────────────────────────────────────────────────────────────

const MAX_CHARS = 1000;
const CHAR_WARN_THRESHOLD = 800;
const LLM_TIMEOUT_MS = 120_000;

// WELCOME_MESSAGE and INITIAL_CHIPS now resolved via t() at render time

// ── Helpers ──────────────────────────────────────────────────────────────────

// formatRelativeTime is now handled via t() at render time

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
  const { t } = useTranslation();

  // Resolved at render so translations are live
  const WELCOME_MESSAGE = t('chat.welcomeMessage');
  const INITIAL_CHIPS = [
    t('chat.chips.bestCandidate'),
    t('chat.chips.shortlist'),
    t('chat.chips.compare'),
    t('chat.chips.weakPoints'),
  ];

  function formatRelativeTime(value: string): string {
    const diffMs = Date.now() - new Date(value).getTime();
    const diffMinutes = Math.max(1, Math.round(diffMs / 60_000));
    if (diffMinutes < 60) return t('common.relativeTime.minutesAgo', { count: diffMinutes });
    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) return t('common.relativeTime.hoursAgo', { count: diffHours });
    const diffDays = Math.round(diffHours / 24);
    return t('common.relativeTime.daysAgo', { count: diffDays });
  }
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
  const [showFirstTimePopup, setShowFirstTimePopup] = useState(false);

  // Timer ref for the delayed first-time popup
  const firstTimePopupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    if (firstTimePopupTimerRef.current) {
      clearTimeout(firstTimePopupTimerRef.current);
      firstTimePopupTimerRef.current = null;
    }
    setShowFirstTimePopup(false);
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
        if (!cancelled) setJobTitle(t('chat.fallbackJobTitle'));
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

    // Show first-time popup after a short delay (only if response is still pending)
    // This avoids flashing the popup for instant responses (e.g. greetings)
    if (firstTimePopupTimerRef.current) {
      clearTimeout(firstTimePopupTimerRef.current);
    }
    firstTimePopupTimerRef.current = setTimeout(() => {
      setShowFirstTimePopup(true);
    }, 3000);

    // Set timeout
    timeoutRef.current = setTimeout(() => {
      setIsPending(false);
      setError(t('chat.timeoutError'));
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
      if (firstTimePopupTimerRef.current) {
        clearTimeout(firstTimePopupTimerRef.current);
        firstTimePopupTimerRef.current = null;
      }
      setShowFirstTimePopup(false);
    } catch (err: any) {
      // Clear timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      // If request was aborted, ignore and clean up UI peacefully
      if (err.name === "CanceledError" || err.code === "ERR_CANCELED") {
        if (firstTimePopupTimerRef.current) {
          clearTimeout(firstTimePopupTimerRef.current);
          firstTimePopupTimerRef.current = null;
        }
        setShowFirstTimePopup(false);
        // Restore previous suggestions or default chips
        if (prevSuggestionsRef.current.length > 0) {
          setSuggestions(prevSuggestionsRef.current);
        } else {
          setSuggestions(INITIAL_CHIPS);
        }
        return;
      }

      setError(t('chat.genericError'));
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
      aria-label={t('chat.headerTitle')}
    >
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="ai-chat-header">
        <span className="ai-chat-header__icon">
          <Sparkles size={18} strokeWidth={2} />
        </span>
        <span className="ai-chat-header__title">
          {t('chat.headerTitle')} — {truncate(jobTitle, 30) || "…"}
        </span>
        {showClearConfirm ? (
          <button
            type="button"
            className="ai-chat-header__clear-confirm"
            onClick={handleClear}
            onBlur={() => setShowClearConfirm(false)}
          >
            {t('chat.clearConfirm')}
          </button>
        ) : (
          <button
            type="button"
            className="ai-chat-header__clear-btn"
            onClick={() => setShowClearConfirm(true)}
            title={t('chat.clearTooltip')}
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
                    {t('chat.retry')}
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
          <span className="ai-chat-suggestions-bar__label">{t('chat.suggestionsLabel')}</span>
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

      {/* First-time popup toast - positioned absolutely at the bottom above input area */}
      {showFirstTimePopup && isPending && (
        <div className="ai-chat-first-time-popup">
          <Info size={16} strokeWidth={2} className="ai-chat-first-time-popup__icon" />
          <span className="ai-chat-first-time-popup__text">
            {t('chat.firstTimePopup')}
          </span>
          <button
            type="button"
            className="ai-chat-first-time-popup__close"
            onClick={() => setShowFirstTimePopup(false)}
            title={t('common.dismiss')}
          >
            <XIcon size={14} strokeWidth={2} />
          </button>
        </div>
      )}

      {/* ── Input Area ─────────────────────────────────────── */}
      <div className="ai-chat-input-area">
        <div className="ai-chat-input-row">
          <textarea
            ref={textareaRef}
            className="ai-chat-textarea"
            placeholder={t('chat.inputPlaceholder')}
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
              aria-label={t('chat.stopAriaLabel')}
            >
              <Square size={16} fill="currentColor" strokeWidth={2} />
            </button>
          ) : (
            <button
              type="button"
              className="ai-chat-send-btn"
              disabled={!input.trim()}
              onClick={() => handleSend()}
              aria-label={t('chat.sendAriaLabel')}
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
