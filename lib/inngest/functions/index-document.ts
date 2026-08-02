import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { files } from "@/lib/db/schema";
import { inngest } from "@/lib/inngest/client";
import { isIndexableDocument } from "@/lib/rag/isIndexableDocument";
import {
  publishIndexingEvent,
  type IndexingStatusValue,
} from "@/lib/indexing-events-hub";

const MAX_INDEX_ATTEMPTS = 3;

/** Max simultaneous RAG ingests app-wide (protects Gemini + pgvector). */
const INDEX_CONCURRENCY = Math.max(
  1,
  Number.parseInt(process.env.INDEX_CONCURRENCY ?? "3", 10) || 3
);

/** Max simultaneous ingests per user so one bulk upload can't starve others. */
const INDEX_CONCURRENCY_PER_USER = Math.max(
  1,
  Number.parseInt(process.env.INDEX_CONCURRENCY_PER_USER ?? "2", 10) || 2
);

function emitStatus(payload: {
  fileId: string;
  userId: string;
  indexingStatus: IndexingStatusValue;
  indexError?: string | null;
  chunkCount?: number | null;
  indexedAt?: Date | null;
}) {
  publishIndexingEvent({
    fileId: payload.fileId,
    userId: payload.userId,
    indexingStatus: payload.indexingStatus,
    indexError: payload.indexError ?? null,
    chunkCount: payload.chunkCount ?? null,
    indexedAt: payload.indexedAt ? payload.indexedAt.toISOString() : null,
  });
}

export const indexDocument = inngest.createFunction(
  {
    id: "index-document",
    retries: 2,
    // Queue overflow: 50 uploads enqueue immediately, but only N run at once.
    // Excess stays PENDING until a concurrency slot frees up.
    concurrency: [
      { limit: INDEX_CONCURRENCY },
      { limit: INDEX_CONCURRENCY_PER_USER, key: "event.data.userId" },
    ],
    triggers: [{ event: "document/index" }],
  },
  async ({ event, step, attempt }) => {
    const { fileId, userId } = event.data as {
      fileId: string;
      userId: string;
    };
    const attemptNumber = attempt + 1;

    const file = await step.run("load-file", async () => {
      const [row] = await db
        .select()
        .from(files)
        .where(and(eq(files.id, fileId), eq(files.userId, userId)));

      if (!row) {
        throw new Error(`File not found: ${fileId}`);
      }
      if (row.isTrash) {
        return { skip: true as const, reason: "trashed" as const, row };
      }
      if (row.indexingStatus === "COMPLETED") {
        return {
          skip: true as const,
          reason: "already_completed" as const,
          row,
        };
      }
      if (row.indexingStatus === "INVALID" || !isIndexableDocument(row)) {
        return { skip: true as const, reason: "invalid" as const, row };
      }
      return { skip: false as const, row };
    });

    if (file.skip) {
      return { ok: true, skipped: true, reason: file.reason };
    }

    await step.run(`mark-inprogress-${attemptNumber}`, async () => {
      await db
        .update(files)
        .set({
          indexingStatus: "INPROGRESS",
          indexError: null,
          indexAttempts: attemptNumber,
          updatedAt: new Date(),
        })
        .where(and(eq(files.id, fileId), eq(files.userId, userId)));

      emitStatus({
        fileId,
        userId,
        indexingStatus: "INPROGRESS",
      });
    });

    try {
      const ingestResult = await step.run(
        `ingest-${attemptNumber}`,
        async () => {
          const ragUrl = process.env.RAG_INGEST_URL;
          const ragKey = process.env.RAG_INTERNAL_KEY;

          if (!ragUrl) {
            throw new Error("RAG_INGEST_URL is not configured");
          }
          if (!ragKey) {
            throw new Error("RAG_INTERNAL_KEY is not configured");
          }

          const response = await fetch(
            `${ragUrl.replace(/\/$/, "")}/ingest`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${ragKey}`,
              },
              body: JSON.stringify({
                file_id: file.row.id,
                user_id: file.row.userId,
                file_url: file.row.fileUrl,
                file_name: file.row.name,
                mime_or_type: file.row.type,
              }),
            }
          );

          const body = (await response.json().catch(() => ({}))) as {
            chunk_count?: number;
            status?: string;
            detail?: string | { msg?: string }[];
            error?: string;
          };

          if (!response.ok) {
            const detail =
              typeof body.detail === "string"
                ? body.detail
                : body.error ||
                  (Array.isArray(body.detail)
                    ? body.detail.map((d) => d.msg).join("; ")
                    : `Ingest failed with status ${response.status}`);
            throw new Error(detail || `Ingest failed (${response.status})`);
          }

          return {
            chunkCount: body.chunk_count ?? 0,
          };
        }
      );

      await step.run("mark-completed", async () => {
        const indexedAt = new Date();
        await db
          .update(files)
          .set({
            indexingStatus: "COMPLETED",
            indexedAt,
            chunkCount: ingestResult.chunkCount,
            indexError: null,
            updatedAt: new Date(),
          })
          .where(and(eq(files.id, fileId), eq(files.userId, userId)));

        emitStatus({
          fileId,
          userId,
          indexingStatus: "COMPLETED",
          chunkCount: ingestResult.chunkCount,
          indexedAt,
        });
      });

      return {
        ok: true,
        fileId,
        chunkCount: ingestResult.chunkCount,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown ingest error";
      const terminal = attemptNumber >= MAX_INDEX_ATTEMPTS;

      await step.run(`mark-failure-${attemptNumber}`, async () => {
        const indexingStatus = terminal ? "FAILED" : "PENDING";
        await db
          .update(files)
          .set({
            indexingStatus,
            indexError: message,
            updatedAt: new Date(),
          })
          .where(and(eq(files.id, fileId), eq(files.userId, userId)));

        emitStatus({
          fileId,
          userId,
          indexingStatus,
          indexError: message,
        });
      });

      if (terminal) {
        return {
          ok: false,
          fileId,
          failed: true,
          attempts: attemptNumber,
          error: message,
        };
      }

      throw error;
    }
  }
);
