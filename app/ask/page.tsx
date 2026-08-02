"use client"

import Link from "next/link"
import { FormEvent, useCallback, useEffect, useRef, useState } from "react"
import { ArrowLeft, ExternalLink, FileText, Loader2, MessageSquarePlus, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

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

export default function AskPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [question, setQuestion] = useState("")
  const [isLoadingList, setIsLoadingList] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

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
        .map((m: { id: string; role: "user" | "assistant"; content: string; sources?: Source[] }) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          sources: m.sources,
        }))
    )
  }, [])

  useEffect(() => {
    void loadConversations()
  }, [loadConversations])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isSending])

  const startNewChat = () => {
    setConversationId(null)
    setMessages([])
    setError(null)
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const q = question.trim()
    if (!q || isSending) return

    setIsSending(true)
    setError(null)
    setQuestion("")

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
      let sources: Source[] = []

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
              sources = parsed.sources
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, sources } : m
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
              sources = parsed.sources
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, sources } : m
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
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b sticky top-0 z-40 bg-background/95 backdrop-blur">
        <div className="container mx-auto px-3 sm:px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Files
              </Button>
            </Link>
            <h1 className="text-lg sm:text-xl font-semibold truncate">Ask your documents</h1>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={startNewChat}>
            <MessageSquarePlus className="h-4 w-4" />
            New chat
          </Button>
        </div>
      </header>

      <div className="container mx-auto flex-1 grid grid-cols-1 md:grid-cols-[240px_1fr] gap-0 md:gap-4 px-0 md:px-4 py-0 md:py-4 min-h-0">
        <aside className="border-b md:border-b-0 md:border-r bg-muted/20 p-3 overflow-y-auto max-h-40 md:max-h-[calc(100vh-5.5rem)]">
          <p className="text-xs font-medium text-muted-foreground mb-2 px-1">Conversations</p>
          {isLoadingList ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground px-1">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : conversations.length === 0 ? (
            <p className="text-sm text-muted-foreground px-1">No chats yet</p>
          ) : (
            <div className="space-y-1">
              {conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => void loadConversation(c.id).catch((err) => setError(String(err.message || err)))}
                  className={`w-full text-left rounded-md px-2 py-2 text-sm truncate transition-colors ${
                    conversationId === c.id
                      ? "bg-background shadow-sm"
                      : "hover:bg-background/70"
                  }`}
                >
                  {c.title || "Untitled chat"}
                </button>
              ))}
            </div>
          )}
        </aside>

        <main className="flex flex-col min-h-[70vh] md:min-h-[calc(100vh-6rem)] p-3 sm:p-4">
          <div className="flex-1 overflow-y-auto space-y-4 pb-4">
            {messages.length === 0 ? (
              <div className="h-full min-h-[40vh] flex items-center justify-center text-center px-4">
                <div>
                  <h2 className="text-xl font-semibold mb-2">Ask anything about your files</h2>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Answers are grounded in your indexed documents only. Upload PDFs/DOCX on the dashboard and wait until indexing is COMPLETED.
                  </p>
                </div>
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`rounded-lg px-3 py-2 max-w-3xl whitespace-pre-wrap ${
                    m.role === "user"
                      ? "ml-auto bg-primary text-primary-foreground"
                      : "mr-auto bg-muted"
                  }`}
                >
                  <p className="text-sm leading-relaxed">{m.content || (isSending ? "…" : "")}</p>
                  {m.role === "assistant" && m.sources && m.sources.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {m.sources.map((s) => {
                        const label = s.fileName || "Document"
                        const className =
                          "inline-flex items-center gap-1.5 text-[11px] rounded-full border bg-background/80 px-2.5 py-1 hover:bg-background transition-colors max-w-[220px]"
                        if (s.fileUrl) {
                          return (
                            <a
                              key={s.fileId}
                              href={s.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={className}
                              title={s.snippet || `Open ${label}`}
                            >
                              <FileText className="h-3 w-3 shrink-0" />
                              <span className="truncate">{label}</span>
                              <ExternalLink className="h-3 w-3 shrink-0 opacity-70" />
                            </a>
                          )
                        }
                        return (
                          <span
                            key={s.fileId}
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
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {error && (
            <p className="text-sm text-destructive mb-2">{error}</p>
          )}

          <form onSubmit={onSubmit} className="flex gap-2 items-center">
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question about your documents…"
              disabled={isSending}
              className="flex-1"
            />
            <Button type="submit" disabled={isSending || !question.trim()} className="gap-2">
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Ask
            </Button>
          </form>
        </main>
      </div>
    </div>
  )
}
