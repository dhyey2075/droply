import { auth } from "@clerk/nextjs/server";
import {
  publishIndexingEvent,
  subscribeIndexingEvents,
  type IndexingEventPayload,
} from "@/lib/indexing-events-hub";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sseEncode(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

/** Browser EventSource subscription — Clerk cookie auth, push updates (no polling). */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(sseEncode(event, data)));
      };

      send("ready", { ok: true });

      unsubscribe = subscribeIndexingEvents(userId, (payload) => {
        send("indexing", payload);
      });

      // Keepalive comments so proxies don't close the idle stream
      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          // stream closed
        }
      }, 25000);
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat);
      unsubscribe?.();
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

/** Optional internal publish (same process also publishes directly from Inngest). */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expected = process.env.RAG_INTERNAL_KEY;
  if (!expected || authHeader !== `Bearer ${expected}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as IndexingEventPayload | null;
  if (!body?.fileId || !body?.userId || !body?.indexingStatus) {
    return new Response("Invalid payload", { status: 400 });
  }

  publishIndexingEvent(body);
  return Response.json({ ok: true });
}
