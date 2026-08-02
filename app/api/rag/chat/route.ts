import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { and, count, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { conversations, files, messages } from "@/lib/db/schema";

type Source = {
  fileId: string;
  fileName: string;
  fileUrl?: string;
  snippet: string;
};

type HistoryItem = { role: "user" | "assistant"; content: string };

function sseEncode(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    question?: string;
    conversationId?: string | null;
  } | null;

  const question = body?.question?.trim();
  if (!question) {
    return NextResponse.json({ error: "question is required" }, { status: 400 });
  }

  const [{ value: completedCount }] = await db
    .select({ value: count() })
    .from(files)
    .where(
      and(
        eq(files.userId, userId),
        eq(files.isFolder, false),
        eq(files.isTrash, false),
        eq(files.indexingStatus, "COMPLETED")
      )
    );

  if (Number(completedCount) === 0) {
    return NextResponse.json(
      { error: "No indexed documents yet. Upload a document and wait for indexing." },
      { status: 409 }
    );
  }

  let conversationId = body?.conversationId || null;
  let conversation;

  if (conversationId) {
    const [existing] = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.id, conversationId),
          eq(conversations.userId, userId)
        )
      );
    if (!existing) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }
    conversation = existing;
  } else {
    const title =
      question.length > 80 ? `${question.slice(0, 77)}...` : question;
    const [created] = await db
      .insert(conversations)
      .values({
        userId,
        title,
      })
      .returning();
    conversation = created;
    conversationId = created.id;
  }

  await db.insert(messages).values({
    conversationId: conversation.id,
    role: "user",
    content: question,
  });

  const prior = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversation.id))
    .orderBy(desc(messages.createdAt))
    .limit(12);

  const history: HistoryItem[] = prior
    .reverse()
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(0, -1) // exclude the user message we just inserted
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  const ragUrl = process.env.RAG_INGEST_URL;
  const ragKey = process.env.RAG_INTERNAL_KEY;
  if (!ragUrl || !ragKey) {
    return NextResponse.json(
      { error: "RAG service is not configured" },
      { status: 500 }
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(sseEncode(event, data)));
      };

      send("meta", { conversationId: conversation.id });

      let assistantText = "";
      let sources: Source[] = [];

      try {
        const upstream = await fetch(`${ragUrl.replace(/\/$/, "")}/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${ragKey}`,
            Accept: "text/event-stream",
          },
          body: JSON.stringify({
            user_id: userId,
            question,
            history,
          }),
        });

        if (!upstream.ok || !upstream.body) {
          const errText = await upstream.text().catch(() => "");
          throw new Error(errText || `RAG chat failed (${upstream.status})`);
        }

        const reader = upstream.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let splitAt = buffer.indexOf("\n\n");
          while (splitAt !== -1) {
            const rawEvent = buffer.slice(0, splitAt);
            buffer = buffer.slice(splitAt + 2);

            const lines = rawEvent.split("\n");
            let eventName = "message";
            let dataLine = "";
            for (const line of lines) {
              if (line.startsWith("event:")) {
                eventName = line.slice(6).trim();
              } else if (line.startsWith("data:")) {
                dataLine += line.slice(5).trim();
              }
            }

            if (dataLine) {
              const parsed = JSON.parse(dataLine) as {
                text?: string;
                sources?: Source[];
                message?: string;
              };

              if (eventName === "meta" && parsed.sources) {
                sources = parsed.sources;
                send("meta", {
                  conversationId: conversation.id,
                  sources,
                });
              } else if (eventName === "token" && parsed.text) {
                assistantText += parsed.text;
                send("token", { text: parsed.text });
              } else if (eventName === "done") {
                if (parsed.sources) sources = parsed.sources;
              } else if (eventName === "error") {
                throw new Error(parsed.message || "RAG error");
              }
            }

            splitAt = buffer.indexOf("\n\n");
          }
        }

        if (!assistantText.trim()) {
          assistantText =
            "I couldn't generate an answer from your documents right now.";
          send("token", { text: assistantText });
        }

        await db.insert(messages).values({
          conversationId: conversation.id,
          role: "assistant",
          content: assistantText,
          sources: sources.length ? sources : null,
        });

        await db
          .update(conversations)
          .set({ updatedAt: new Date() })
          .where(eq(conversations.id, conversation.id));

        send("done", {
          conversationId: conversation.id,
          sources,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to answer question";
        send("error", { message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
