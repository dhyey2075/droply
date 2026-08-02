"use client"

import Link from "next/link"
import {
  FormEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  ArrowLeft,
  ArrowUp,
  ExternalLink,
  FileText,
  FolderOpen,
  Loader2,
  Menu,
  MessageSquare,
  MessageSquarePlus,
  PanelRight,
  Sparkles,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

type Source = {
  fileId: string
  fileName: string
  fileUrl?: string
  snippet: string
}

type ChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  sources?: Source[] | null
}

type Conversation = {
  id: string
  title: string | null
  updatedAt: string
}

function uniqueSources(messages: ChatMessage[]): Source[] {
  const map = new Map<string, Source>()
  for (const m of messages) {
    if (m.role !== "assistant" || !m.sources) continue
    for (const s of m.sources) {
      if (!map.has(s.fileId)) map.set(s.fileId, s)
    }
  }
  return Array.from(map.values())
}

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ""
  const diff = Date.now() - then
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })
}

function ConversationList({
  conversations,
  conversationId,
  isLoadingList,
  onSelect,
  onNewChat,
}: {
  conversations: Conversation[]
  conversationId: string | null
  isLoadingList: boolean
  onSelect: (id: string) => void
  onNewChat: () => void
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="p-3 pb-2">
        <Button
          onClick={onNewChat}
          className="h-11 w-full justify-start gap-2 rounded-2xl text-sm font-medium shadow-sm"
        >
          <MessageSquarePlus className="h-4 w-4" />
          New chat
        </Button>
      </div>

      <div className="px-4 pb-2 pt-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Chats
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-3 scrollbar-hide">
        {isLoadingList ? (
          <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : conversations.length === 0 ? (
          <p className="px-3 py-4 text-sm text-muted-foreground">
            No chats yet. Ask something about your files.
          </p>
        ) : (
          <div className="space-y-1">
            {conversations.map((c) => {
              const active = conversationId === c.id
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onSelect(c.id)}
                  className={cn(
                    "group flex w-full items-start gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors",
                    active
                      ? "bg-background shadow-sm ring-1 ring-border/70"
                      : "hover:bg-background/70"
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium leading-5">
                      {c.title || "Untitled chat"}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">
                      {formatRelativeTime(c.updatedAt)}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="mt-auto border-t border-border/60 p-3">
        <Link href="/dashboard">
          <Button
            variant="ghost"
            className="h-10 w-full justify-start gap-2 rounded-xl text-muted-foreground hover:text-foreground"
          >
            <FolderOpen className="h-4 w-4" />
            Back to files
          </Button>
        </Link>
      </div>
    </div>
  )
}

function SourcesPanel({
  sources,
  selectedId,
  onSelect,
  onClose,
}: {
  sources: Source[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  onClose?: () => void
}) {
  const selected = sources.find((s) => s.fileId === selectedId) ?? sources[0] ?? null

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-3.5">
        <div>
          <p className="text-sm font-semibold tracking-tight">Sources</p>
          <p className="text-xs text-muted-foreground">
            {sources.length === 0
              ? "Cited files appear here"
              : `${sources.length} document${sources.length === 1 ? "" : "s"}`}
          </p>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={onClose}
            aria-label="Close sources"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 scrollbar-hide">
        {sources.length === 0 ? (
          <div className="flex h-full min-h-[12rem] flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-muted/20 px-4 text-center">
            <FileText className="mb-3 h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm font-medium">No sources yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Ask a question and Droply will show the documents used to answer.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {sources.map((s, index) => {
              const active = (selected?.fileId ?? null) === s.fileId
              return (
                <button
                  key={s.fileId}
                  type="button"
                  onClick={() => onSelect(s.fileId)}
                  className={cn(
                    "w-full rounded-2xl border px-3 py-3 text-left transition-all",
                    active
                      ? "border-foreground/15 bg-background shadow-sm"
                      : "border-transparent bg-muted/40 hover:bg-muted/70"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-foreground/[0.06] text-foreground">
                      <FileText className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        Source {index + 1}
                      </span>
                      <span className="block truncate text-sm font-medium">
                        {s.fileName || "Document"}
                      </span>
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {selected && (
          <div className="mt-4 overflow-hidden rounded-2xl border border-border/70 bg-background shadow-sm">
            <div className="border-b border-border/60 px-3.5 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Preview
              </p>
              <p className="mt-1 truncate text-sm font-medium">
                {selected.fileName || "Document"}
              </p>
            </div>
            <div className="px-3.5 py-3">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {selected.snippet?.trim() ||
                  "No snippet available for this source."}
              </p>
              {selected.fileUrl && (
                <a
                  href={selected.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-foreground underline-offset-4 hover:underline"
                >
                  Open file
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function MessageBubble({
  message,
  isStreaming,
}: {
  message: ChatMessage
  isStreaming: boolean
}) {
  const isUser = message.role === "user"
  const showTyping = !isUser && !message.content && isStreaming

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[min(100%,42rem)]",
          isUser ? "ml-8 sm:ml-16" : "mr-4 sm:mr-12"
        )}
      >
        {!isUser && (
          <div className="mb-2 flex items-center gap-2 px-1">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-background">
              <Sparkles className="h-3 w-3" />
            </span>
            <span className="text-xs font-medium text-muted-foreground">
              Droply
            </span>
          </div>
        )}

        <div
          className={cn(
            "rounded-[1.35rem] px-4 py-3 text-sm leading-relaxed",
            isUser
              ? "rounded-br-md bg-primary text-primary-foreground shadow-sm"
              : "rounded-bl-md bg-muted/70 text-foreground ring-1 ring-border/40"
          )}
        >
          {showTyping ? (
            <div className="flex items-center gap-1.5 py-1" aria-label="Thinking">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/70 [animation-delay:-0.2s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/70 [animation-delay:-0.1s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/70" />
            </div>
          ) : (
            <p className="whitespace-pre-wrap break-words">
              {message.content}
            </p>
          )}
        </div>

        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5 px-1">
            {message.sources.map((s) => {
              const label = s.fileName || "Document"
              const className =
                "inline-flex max-w-[220px] items-center gap-1.5 rounded-full border border-border/70 bg-background/90 px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-border hover:text-foreground"
              if (s.fileUrl) {
                return (
                  <a
                    key={`${message.id}-${s.fileId}`}
                    href={s.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={className}
                    title={s.snippet || `Open ${label}`}
                  >
                    <FileText className="h-3 w-3 shrink-0" />
                    <span className="truncate">{label}</span>
                  </a>
                )
              }
              return (
                <span
                  key={`${message.id}-${s.fileId}`}
                  className={className}
                  title={s.snippet || label}
                >
                  <FileText className="h-3 w-3 shrink-0" />
                  <span className="truncate">{label}</span>
                </span>
              )
            })}
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default function AskPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [question, setQuestion] = useState("")
  const [isLoadingList, setIsLoadingList] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const sources = useMemo(() => uniqueSources(messages), [messages])
  const chatTitle = useMemo(() => {
    if (conversationId) {
      const match = conversations.find((c) => c.id === conversationId)
      if (match?.title) return match.title
    }
    const firstUser = messages.find((m) => m.role === "user")
    return firstUser?.content?.slice(0, 72) || "Ask your documents"
  }, [conversationId, conversations, messages])

  const loadConversations = useCallback(async () => {
    setIsLoadingList(true)
    try {
      const res = await fetch("/api/rag/conversations")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load conversations")
      setConversations(data.conversations || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load conversations")
    } finally {
      setIsLoadingList(false)
    }
  }, [])

  const loadConversation = useCallback(async (id: string) => {
    setError(null)
    const res = await fetch(`/api/rag/conversations/${id}`)
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Failed to load conversation")
    setConversationId(id)
    setMessages(
      (data.messages || [])
        .filter((m: { role: string }) => m.role === "user" || m.role === "assistant")
        .map(
          (m: {
            id: string
            role: "user" | "assistant"
            content: string
            sources?: Source[]
          }) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            sources: m.sources,
          })
        )
    )
    setSelectedSourceId(null)
  }, [])

  useEffect(() => {
    void loadConversations()
  }, [loadConversations])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isSending])

  useEffect(() => {
    if (sources.length === 0) {
      setSelectedSourceId(null)
      return
    }
    if (!selectedSourceId || !sources.some((s) => s.fileId === selectedSourceId)) {
      setSelectedSourceId(sources[0].fileId)
    }
  }, [sources, selectedSourceId])

  const startNewChat = () => {
    setConversationId(null)
    setMessages([])
    setError(null)
    setSelectedSourceId(null)
    setHistoryOpen(false)
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  const selectConversation = (id: string) => {
    void loadConversation(id)
      .then(() => setHistoryOpen(false))
      .catch((err) => setError(String(err.message || err)))
  }

  const onSubmit = async (e?: FormEvent) => {
    e?.preventDefault()
    const q = question.trim()
    if (!q || isSending) return

    setIsSending(true)
    setError(null)
    setQuestion("")
    if (inputRef.current) {
      inputRef.current.style.height = "auto"
    }

    const userMsg: ChatMessage = {
      id: `local-user-${Date.now()}`,
      role: "user",
      content: q,
    }
    const assistantId = `local-assistant-${Date.now()}`
    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: assistantId, role: "assistant", content: "", sources: [] },
    ])

    try {
      const res = await fetch("/api/rag/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q,
          conversationId,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Request failed (${res.status})`)
      }
      if (!res.body) throw new Error("No response stream")

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        let splitAt = buffer.indexOf("\n\n")
        while (splitAt !== -1) {
          const rawEvent = buffer.slice(0, splitAt)
          buffer = buffer.slice(splitAt + 2)
          const lines = rawEvent.split("\n")
          let eventName = "message"
          let dataLine = ""
          for (const line of lines) {
            if (line.startsWith("event:")) eventName = line.slice(6).trim()
            else if (line.startsWith("data:")) dataLine += line.slice(5).trim()
          }

          if (dataLine) {
            const parsed = JSON.parse(dataLine) as {
              conversationId?: string
              text?: string
              sources?: Source[]
              message?: string
            }

            if (parsed.conversationId) {
              setConversationId(parsed.conversationId)
            }
            if (eventName === "meta" && parsed.sources) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, sources: parsed.sources } : m
                )
              )
            }
            if (eventName === "token" && parsed.text) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content + parsed.text }
                    : m
                )
              )
            }
            if (eventName === "done" && parsed.sources) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, sources: parsed.sources } : m
                )
              )
            }
            if (eventName === "error") {
              throw new Error(parsed.message || "Chat failed")
            }
          }
          splitAt = buffer.indexOf("\n\n")
        }
      }

      await loadConversations()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Chat failed"
      setError(message)
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId && !m.content
            ? { ...m, content: `Error: ${message}` }
            : m
        )
      )
    } finally {
      setIsSending(false)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      void onSubmit()
    }
  }

  const onQuestionChange = (value: string) => {
    setQuestion(value)
    const el = inputRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 144)}px`
  }

  return (
    <div className="relative flex h-[100dvh] overflow-hidden bg-background">
      {/* Soft atmosphere — stays within Droply neutrals */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_oklch(0.97_0_0)_0%,_transparent_55%),radial-gradient(ellipse_at_bottom_right,_oklch(0.96_0_0)_0%,_transparent_45%)] dark:bg-[radial-gradient(ellipse_at_top,_oklch(0.22_0_0)_0%,_transparent_55%),radial-gradient(ellipse_at_bottom_right,_oklch(0.2_0_0)_0%,_transparent_45%)]"
      />

      {/* Left sidebar — desktop */}
      <aside className="relative z-10 hidden w-[280px] shrink-0 border-r border-border/60 bg-sidebar/80 backdrop-blur-xl lg:flex lg:flex-col">
        <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3.5">
          <Link
            href="/dashboard"
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Back to files"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight">Droply Ask</p>
            <p className="truncate text-[11px] text-muted-foreground">
              Grounded in your library
            </p>
          </div>
        </div>
        <ConversationList
          conversations={conversations}
          conversationId={conversationId}
          isLoadingList={isLoadingList}
          onSelect={selectConversation}
          onNewChat={startNewChat}
        />
      </aside>

      {/* Main column */}
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-border/60 bg-background/70 px-3 py-3 backdrop-blur-xl sm:px-5">
          <div className="flex min-w-0 items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full lg:hidden"
              onClick={() => setHistoryOpen(true)}
              aria-label="Open chats"
            >
              <Menu className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold tracking-tight sm:text-base">
                {chatTitle}
              </h1>
              <p className="truncate text-[11px] text-muted-foreground sm:text-xs">
                Answers use only your indexed documents
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="hidden h-9 gap-1.5 rounded-full sm:inline-flex"
              onClick={startNewChat}
            >
              <MessageSquarePlus className="h-3.5 w-3.5" />
              New
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full xl:hidden"
              onClick={() => setSourcesOpen(true)}
              aria-label="Open sources"
            >
              <PanelRight className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <div className="relative flex min-h-0 flex-1">
          <main className="flex min-w-0 flex-1 flex-col">
            <div className="flex-1 overflow-y-auto px-3 py-5 sm:px-6 sm:py-6">
              {messages.length === 0 ? (
                <div className="mx-auto flex h-full min-h-[50vh] max-w-xl flex-col items-center justify-center px-2 text-center">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                    className="w-full"
                  >
                    <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground text-background shadow-sm">
                      <Sparkles className="h-6 w-6" />
                    </div>
                    <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                      Ask anything about your files
                    </h2>
                    <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
                      Droply searches your indexed PDFs and documents, then streams
                      an answer with the sources it used.
                    </p>
                    <div className="mt-8 grid gap-2 sm:grid-cols-2">
                      {[
                        "Summarize the latest uploaded report",
                        "What deadlines are mentioned?",
                        "List key action items",
                        "Compare findings across my docs",
                      ].map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => {
                            setQuestion(suggestion)
                            requestAnimationFrame(() => inputRef.current?.focus())
                          }}
                          className="rounded-2xl border border-border/70 bg-background/80 px-3.5 py-3 text-left text-sm text-muted-foreground transition-colors hover:border-border hover:bg-muted/40 hover:text-foreground"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                </div>
              ) : (
                <div className="mx-auto flex max-w-3xl flex-col gap-5">
                  <AnimatePresence initial={false}>
                    {messages.map((m) => (
                      <MessageBubble
                        key={m.id}
                        message={m}
                        isStreaming={
                          isSending &&
                          m.role === "assistant" &&
                          m.id === messages[messages.length - 1]?.id
                        }
                      />
                    ))}
                  </AnimatePresence>
                  <div ref={bottomRef} />
                </div>
              )}
            </div>

            <div className="shrink-0 px-3 pb-4 pt-1 sm:px-6 sm:pb-5">
              <div className="mx-auto max-w-3xl">
                {error && (
                  <p className="mb-2 px-1 text-sm text-destructive">{error}</p>
                )}
                <form
                  onSubmit={onSubmit}
                  className="relative rounded-[1.75rem] border border-border/70 bg-background/90 p-2 shadow-[0_10px_40px_-18px_rgba(0,0,0,0.35)] backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/5"
                >
                  <textarea
                    ref={inputRef}
                    value={question}
                    onChange={(e) => onQuestionChange(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder="Ask anything about your documents…"
                    disabled={isSending}
                    rows={1}
                    className="max-h-36 min-h-[48px] w-full resize-none bg-transparent px-3 py-3 pr-14 text-sm leading-relaxed outline-none placeholder:text-muted-foreground disabled:opacity-60"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={isSending || !question.trim()}
                    className="absolute bottom-3 right-3 h-10 w-10 rounded-full shadow-sm"
                    aria-label="Send message"
                  >
                    {isSending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowUp className="h-4 w-4" />
                    )}
                  </Button>
                </form>
                <p className="mt-2 px-1 text-center text-[11px] text-muted-foreground">
                  Enter to send · Shift+Enter for a new line
                </p>
              </div>
            </div>
          </main>

          {/* Right sources — desktop */}
          <aside className="hidden w-[300px] shrink-0 border-l border-border/60 bg-sidebar/50 backdrop-blur-xl xl:flex xl:flex-col">
            <SourcesPanel
              sources={sources}
              selectedId={selectedSourceId}
              onSelect={setSelectedSourceId}
            />
          </aside>
        </div>
      </div>

      {/* Mobile / tablet sheets */}
      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent side="left" className="w-[300px] p-0 sm:max-w-[300px]">
          <SheetHeader className="sr-only">
            <SheetTitle>Chats</SheetTitle>
          </SheetHeader>
          <ConversationList
            conversations={conversations}
            conversationId={conversationId}
            isLoadingList={isLoadingList}
            onSelect={selectConversation}
            onNewChat={startNewChat}
          />
        </SheetContent>
      </Sheet>

      <Sheet open={sourcesOpen} onOpenChange={setSourcesOpen}>
        <SheetContent side="right" className="w-[320px] p-0 sm:max-w-[320px]">
          <SheetHeader className="sr-only">
            <SheetTitle>Sources</SheetTitle>
          </SheetHeader>
          <SourcesPanel
            sources={sources}
            selectedId={selectedSourceId}
            onSelect={setSelectedSourceId}
            onClose={() => setSourcesOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </div>
  )
}
