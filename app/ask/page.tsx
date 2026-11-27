"use client"

import {
  FormEvent,
  KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  ArrowUp,
  ArrowUpRight,
  Check,
  ChevronDown,
  ExternalLink,
  FileText,
  Folder,
  Loader2,
  Menu,
  PanelRight,
  Search,
  SquarePen,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { MarkdownAnswer } from "@/components/MarkdownAnswer"
import { AppShell, NavLinks } from "@/components/app/AppShell"
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
  mode?: "documents" | "web" | "chat" | null
  statusNote?: string | null
}

type Conversation = {
  id: string
  title: string | null
  updatedAt: string
}

type IndexableFile = {
  id: string
  name: string
  parentId: string | null
  type: string
  chunkCount: number | null
}

type LibraryFolder = {
  id: string
  name: string
  parentId: string | null
}

const ROOT_PARENT = "00000000-0000-0000-0000-000000000000"

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
  footer,
}: {
  conversations: Conversation[]
  conversationId: string | null
  isLoadingList: boolean
  onSelect: (id: string) => void
  onNewChat: () => void
  footer?: ReactNode
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center justify-between px-4">
        <p className="text-sm font-semibold tracking-[-0.01em]">Chats</p>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onNewChat}
          title="New chat"
          aria-label="New chat"
          className="text-muted-foreground"
        >
          <SquarePen className="size-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-3 scrollbar-hide">
        {isLoadingList ? (
          <div className="space-y-1 px-1 pt-1">
            {[70, 52, 64, 45].map((w) => (
              <div key={w} className="h-9 animate-pulse rounded-md px-2.5 py-3">
                <div className="h-2.5 rounded bg-muted" style={{ width: `${w}%` }} />
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <p className="px-3 py-3 text-sm text-muted-foreground">
            No chats yet. Ask something about your files.
          </p>
        ) : (
          <div className="space-y-px">
            {conversations.map((c) => {
              const active = conversationId === c.id
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onSelect(c.id)}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left transition-colors",
                    active
                      ? "bg-sidebar-accent text-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
                  )}
                >
                  <span className={cn("min-w-0 flex-1 truncate text-sm", active && "font-medium")}>
                    {c.title || "Untitled chat"}
                  </span>
                  <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
                    {formatRelativeTime(c.updatedAt)}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {footer && <div className="mt-auto border-t border-sidebar-border p-2.5">{footer}</div>}
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
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4">
        <p className="text-sm font-semibold tracking-[-0.01em]">
          Sources
          {sources.length > 0 && (
            <span className="ml-1.5 font-normal text-muted-foreground tabular-nums">{sources.length}</span>
          )}
        </p>
        {onClose && (
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close sources">
            <X className="size-4" />
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 scrollbar-hide">
        {sources.length === 0 ? (
          <div className="px-1 py-2">
            <p className="text-sm font-medium">No sources yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Files Droply cites in its answers show up here.
            </p>
          </div>
        ) : (
          <div className="space-y-px">
            {sources.map((s, index) => {
              const active = (selected?.fileId ?? null) === s.fileId
              return (
                <button
                  key={s.fileId}
                  type="button"
                  onClick={() => onSelect(s.fileId)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors",
                    active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded text-[11px] font-medium tabular-nums",
                      active ? "bg-foreground text-background" : "bg-muted text-muted-foreground ring-1 ring-border"
                    )}
                  >
                    {index + 1}
                  </span>
                  <span className={cn("min-w-0 flex-1 truncate text-sm", active && "font-medium")}>
                    {s.fileName || "Document"}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {selected && (
          <div className="mt-3 rounded-lg border bg-card">
            <div className="flex items-center gap-2 border-b px-3 py-2.5">
              <FileText className="size-4 shrink-0 text-muted-foreground" />
              <p className="min-w-0 flex-1 truncate text-sm font-medium">{selected.fileName || "Document"}</p>
            </div>
            <div className="px-3 py-3">
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                {selected.snippet?.trim() || "No snippet available for this source."}
              </p>
              {selected.fileUrl && (
                <a
                  href={selected.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-brand underline-offset-4 hover:underline"
                >
                  Open file
                  <ExternalLink className="size-3" />
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Composer({
  scopeAll,
  onScopeAllChange,
  files,
  folders,
  selectedIds,
  onSelectedIdsChange,
  isLoading,
  children,
  actions,
}: {
  scopeAll: boolean
  onScopeAllChange: (value: boolean) => void
  files: IndexableFile[]
  folders: LibraryFolder[]
  selectedIds: string[]
  onSelectedIdsChange: (ids: string[]) => void
  isLoading: boolean
  children: ReactNode
  actions: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const folderNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const f of folders) map.set(f.id, f.name)
    return map
  }, [folders])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return files
    return files.filter((f) => f.name.toLowerCase().includes(q))
  }, [files, query])

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])

  const toggleFile = (id: string) => {
    if (selectedSet.has(id)) {
      onSelectedIdsChange(selectedIds.filter((x) => x !== id))
    } else {
      onSelectedIdsChange([...selectedIds, id])
    }
  }

  const selectFolder = (folderId: string) => {
    const inFolder = files
      .filter((f) => (f.parentId || ROOT_PARENT) === folderId)
      .map((f) => f.id)
    if (inFolder.length === 0) return
    const next = new Set(selectedIds)
    const allSelected = inFolder.every((id) => next.has(id))
    if (allSelected) {
      inFolder.forEach((id) => next.delete(id))
    } else {
      inFolder.forEach((id) => next.add(id))
    }
    onSelectedIdsChange(Array.from(next))
  }

  const scopeLabel =
    selectedIds.length === 0
      ? "Choose files"
      : selectedIds.length === 1
        ? files.find((f) => f.id === selectedIds[0])?.name || "1 file"
        : `${selectedIds.length} files`

  const segment = (active: boolean) =>
    cn(
      "h-7 rounded-md px-2.5 text-xs font-medium transition-colors",
      active ? "bg-card text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.08)] ring-1 ring-border" : "text-muted-foreground hover:text-foreground"
    )

  return (
    <div className="rounded-xl border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-colors focus-within:border-foreground/25">
      {!scopeAll && open && (
        <div className="border-b p-2">
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search indexed files"
              className="h-8 w-full rounded-md border bg-background pl-8 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-foreground/25"
            />
          </div>

          {folders.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {folders.map((folder) => {
                const childIds = files
                  .filter((f) => (f.parentId || ROOT_PARENT) === folder.id)
                  .map((f) => f.id)
                if (childIds.length === 0) return null
                const allOn = childIds.every((id) => selectedSet.has(id))
                return (
                  <button
                    key={folder.id}
                    type="button"
                    onClick={() => selectFolder(folder.id)}
                    className={cn(
                      "inline-flex h-6 items-center gap-1.5 rounded-md border px-2 text-xs transition-colors",
                      allOn
                        ? "border-brand/30 bg-brand-soft text-brand"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Folder className="size-3" />
                    {folder.name}
                  </button>
                )
              })}
            </div>
          )}

          <div className="max-h-44 space-y-px overflow-y-auto scrollbar-hide">
            {isLoading ? (
              <div className="flex items-center gap-2 px-2 py-3 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading files…
              </div>
            ) : filtered.length === 0 ? (
              <p className="px-2 py-3 text-sm text-muted-foreground">
                No indexed files found. Upload docs and wait for indexing.
              </p>
            ) : (
              filtered.map((file) => {
                const checked = selectedSet.has(file.id)
                const parentLabel =
                  file.parentId &&
                  file.parentId !== ROOT_PARENT &&
                  folderNameById.get(file.parentId)
                return (
                  <button
                    key={file.id}
                    type="button"
                    role="checkbox"
                    aria-checked={checked}
                    onClick={() => toggleFile(file.id)}
                    className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted/60"
                  >
                    <span
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded border",
                        checked ? "border-foreground bg-foreground text-background" : "border-input bg-background"
                      )}
                    >
                      {checked && <Check className="size-3" strokeWidth={3} />}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm">{file.name}</span>
                    {parentLabel && (
                      <span className="max-w-[40%] shrink-0 truncate text-xs text-muted-foreground">{parentLabel}</span>
                    )}
                  </button>
                )
              })
            )}
          </div>

          {files.length > 0 && (
            <div className="mt-2 flex items-center justify-between border-t pt-2 text-xs">
              <span className="text-muted-foreground tabular-nums">
                {selectedIds.length} of {files.length} selected
              </span>
              <span className="flex gap-1">
                <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => onSelectedIdsChange(files.map((f) => f.id))}>
                  Select all
                </Button>
                <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => onSelectedIdsChange([])}>
                  Clear
                </Button>
              </span>
            </div>
          )}
        </div>
      )}

      {children}

      <div className="flex items-center gap-2 px-2 pb-2">
        <div role="radiogroup" aria-label="Search scope" className="flex shrink-0 rounded-lg bg-muted p-0.5">
          <button
            type="button"
            role="radio"
            aria-checked={scopeAll}
            className={segment(scopeAll)}
            onClick={() => {
              onScopeAllChange(true)
              setOpen(false)
            }}
          >
            All files
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={!scopeAll}
            className={segment(!scopeAll)}
            onClick={() => {
              onScopeAllChange(false)
              setOpen(true)
            }}
          >
            Selected
          </button>
        </div>
        {!scopeAll && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex h-7 min-w-0 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <FileText className="size-3.5 shrink-0" />
            <span className="truncate">{scopeLabel}</span>
            <ChevronDown className={cn("size-3.5 shrink-0 transition-transform", open && "rotate-180")} />
          </button>
        )}
        <div className="ml-auto flex shrink-0 items-center">{actions}</div>
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

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="flex justify-end"
      >
        <p className="max-w-[min(85%,36rem)] whitespace-pre-wrap break-words rounded-xl bg-muted px-3.5 py-2.5 text-[15px] leading-relaxed">
          {message.content}
        </p>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="flex gap-3"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/droply.ico" alt="" className="mt-0.5 size-6 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex h-6 items-center gap-2">
          <span className="text-sm font-medium">Droply</span>
          {message.mode === "web" && (
            <span className="rounded-md bg-muted px-1.5 py-px text-[11px] font-medium text-muted-foreground">
              Web search
            </span>
          )}
          {message.mode === "documents" && message.sources && message.sources.length > 0 && (
            <span className="rounded-md bg-brand-soft px-1.5 py-px text-[11px] font-medium text-brand">
              From your documents
            </span>
          )}
        </div>

        <div className="text-[15px] leading-relaxed">
          {showTyping && message.statusNote ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
              <Loader2 className="size-3.5 shrink-0 animate-spin" />
              <span className="min-w-0">{message.statusNote}</span>
            </p>
          ) : showTyping ? (
            <div className="flex items-center gap-1.5 py-2" aria-label="Thinking">
              <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/70 [animation-delay:-0.2s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/70 [animation-delay:-0.1s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/70" />
            </div>
          ) : (
            <MarkdownAnswer text={message.content} />
          )}
        </div>

        {message.sources && message.sources.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {message.sources.map((s, index) => {
              const label = s.fileName || "Document"
              const body = (
                <>
                  <span className="text-muted-foreground/70 tabular-nums">{index + 1}</span>
                  <span className="truncate">{label}</span>
                </>
              )
              const className =
                "inline-flex h-7 max-w-[240px] items-center gap-1.5 rounded-md border bg-card px-2 text-xs text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
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
                    {body}
                  </a>
                )
              }
              return (
                <span key={`${message.id}-${s.fileId}`} className={className} title={s.snippet || label}>
                  {body}
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
  const [scopeAll, setScopeAll] = useState(true)
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([])
  const [libraryFiles, setLibraryFiles] = useState<IndexableFile[]>([])
  const [libraryFolders, setLibraryFolders] = useState<LibraryFolder[]>([])
  const [isLoadingFiles, setIsLoadingFiles] = useState(true)
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

  const loadLibraryFiles = useCallback(async () => {
    setIsLoadingFiles(true)
    try {
      const res = await fetch("/api/rag/files")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load files")
      setLibraryFiles(data.files || [])
      setLibraryFolders(data.folders || [])
      setSelectedFileIds((prev) =>
        prev.filter((id: string) =>
          (data.files || []).some((f: IndexableFile) => f.id === id)
        )
      )
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoadingFiles(false)
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
            answerMode?: "documents" | "web" | "chat" | null
          }) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            sources: m.sources,
            mode:
              m.answerMode ||
              (m.sources?.some((s) => String(s.fileId).startsWith("web-"))
                ? "web"
                : m.sources?.length
                  ? "documents"
                  : null),
          })
        )
    )
    setSelectedSourceId(null)
  }, [])

  useEffect(() => {
    void loadConversations()
    void loadLibraryFiles()
  }, [loadConversations, loadLibraryFiles])

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

  const canSend =
    !!question.trim() &&
    !isSending &&
    (scopeAll || selectedFileIds.length > 0)

  const onSubmit = async (e?: FormEvent) => {
    e?.preventDefault()
    const q = question.trim()
    if (!q || isSending) return
    if (!scopeAll && selectedFileIds.length === 0) {
      setError("Select at least one file, or enable All files.")
      return
    }

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
          scopeAll,
          fileIds: scopeAll ? [] : selectedFileIds,
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
              mode?: "documents" | "web" | "chat"
            }

            if (parsed.conversationId) {
              setConversationId(parsed.conversationId)
            }
            if (eventName === "status" && parsed.message) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, statusNote: parsed.message }
                    : m
                )
              )
            }
            if (eventName === "meta") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? {
                        ...m,
                        sources: parsed.sources ?? m.sources,
                        mode: parsed.mode ?? m.mode,
                        statusNote: parsed.message ?? m.statusNote,
                      }
                    : m
                )
              )
            }
            if (eventName === "token" && parsed.text) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? {
                        ...m,
                        content: m.content + parsed.text,
                        statusNote: null,
                      }
                    : m
                )
              )
            }
            if (eventName === "done") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? {
                        ...m,
                        sources: parsed.sources ?? m.sources,
                        mode: parsed.mode ?? m.mode,
                        statusNote: null,
                      }
                    : m
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

  const sendButton = (
    <Button
      type="submit"
      size="icon-sm"
      disabled={!canSend}
      className="rounded-lg"
      aria-label="Send message"
    >
      {isSending ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
    </Button>
  )

  return (
    <AppShell rail>
      <div className="flex h-[100dvh] min-h-0 overflow-hidden">
        <aside className="hidden w-[260px] shrink-0 border-r border-sidebar-border bg-sidebar lg:flex lg:flex-col">
          <ConversationList
            conversations={conversations}
            conversationId={conversationId}
            isLoadingList={isLoadingList}
            onSelect={selectConversation}
            onNewChat={startNewChat}
          />
        </aside>

        <div className="flex min-w-0 flex-1">
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b px-3 sm:px-5">
              <div className="flex min-w-0 items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground lg:hidden"
                  onClick={() => setHistoryOpen(true)}
                  aria-label="Open chats"
                >
                  <Menu className="size-[18px]" />
                </Button>
                <h1 className="truncate text-sm font-semibold tracking-[-0.01em]">{chatTitle}</h1>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                <Button variant="outline" size="sm" className="hidden sm:inline-flex" onClick={startNewChat}>
                  <SquarePen className="size-3.5" />
                  New chat
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="relative text-muted-foreground xl:hidden"
                  onClick={() => setSourcesOpen(true)}
                  aria-label="Open sources"
                >
                  <PanelRight className="size-4" />
                  {sources.length > 0 && (
                    <span className="absolute right-1 top-1 size-1.5 rounded-full bg-brand" />
                  )}
                </Button>
              </div>
            </header>

            <main className="flex min-h-0 min-w-0 flex-1 flex-col">
              <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8">
                {messages.length === 0 ? (
                  <div className="mx-auto flex h-full max-w-2xl flex-col justify-center">
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <h2 className="text-2xl font-semibold tracking-[-0.02em] sm:text-[28px]">
                        Ask your documents
                      </h2>
                      <p className="mt-2 max-w-lg text-[15px] leading-relaxed text-muted-foreground">
                        Droply searches your indexed PDFs and documents, then answers with the files it used.
                      </p>
                      <div className="mt-7 grid gap-2 sm:grid-cols-2">
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
                            className="group flex items-center justify-between gap-3 rounded-lg border bg-card px-3.5 py-3 text-left text-sm transition-colors hover:border-foreground/20"
                          >
                            {suggestion}
                            <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  </div>
                ) : (
                  <div className="mx-auto flex max-w-2xl flex-col gap-7">
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

              <div className="shrink-0 px-4 pb-4 sm:px-6 sm:pb-5">
                <div className="mx-auto max-w-2xl">
                  {error && (
                    <p className="mb-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
                  )}
                  <form onSubmit={onSubmit}>
                    <Composer
                      scopeAll={scopeAll}
                      onScopeAllChange={setScopeAll}
                      files={libraryFiles}
                      folders={libraryFolders}
                      selectedIds={selectedFileIds}
                      onSelectedIdsChange={setSelectedFileIds}
                      isLoading={isLoadingFiles}
                      actions={sendButton}
                    >
                      <textarea
                        ref={inputRef}
                        value={question}
                        onChange={(e) => onQuestionChange(e.target.value)}
                        onKeyDown={onKeyDown}
                        placeholder={
                          scopeAll
                            ? "Ask anything about your documents…"
                            : selectedFileIds.length
                              ? `Ask about ${selectedFileIds.length} selected file${selectedFileIds.length === 1 ? "" : "s"}…`
                              : "Choose files, then ask…"
                        }
                        disabled={isSending}
                        rows={1}
                        className="block max-h-36 min-h-[52px] w-full resize-none bg-transparent px-3.5 pb-2 pt-3.5 text-[15px] leading-relaxed outline-none placeholder:text-muted-foreground disabled:opacity-60"
                      />
                    </Composer>
                  </form>
                  <p className="mt-2 text-center text-xs text-muted-foreground">
                    Enter to send · Shift + Enter for a new line
                  </p>
                </div>
              </div>
            </main>
          </div>

          <aside className="hidden w-[300px] shrink-0 border-l xl:flex xl:flex-col">
            <SourcesPanel
              sources={sources}
              selectedId={selectedSourceId}
              onSelect={setSelectedSourceId}
            />
          </aside>
        </div>
      </div>

      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent side="left" showClose={false} className="w-[290px] bg-sidebar p-0 sm:max-w-[290px]">
          <SheetHeader className="sr-only">
            <SheetTitle>Chats</SheetTitle>
          </SheetHeader>
          <ConversationList
            conversations={conversations}
            conversationId={conversationId}
            isLoadingList={isLoadingList}
            onSelect={selectConversation}
            onNewChat={startNewChat}
            footer={<NavLinks onNavigate={() => setHistoryOpen(false)} />}
          />
        </SheetContent>
      </Sheet>

      <Sheet open={sourcesOpen} onOpenChange={setSourcesOpen}>
        <SheetContent side="right" showClose={false} className="w-[320px] bg-background p-0 sm:max-w-[320px]">
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
    </AppShell>
  )
}
