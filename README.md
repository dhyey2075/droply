# Droply

File library app with document Q&A (RAG).

## Prerequisites

- Node.js 20+
- Python 3.12+ (for the RAG chat API and indexing worker)
- Redis (Docker Compose in this repo, or any Redis reachable at `REDIS_URL`)
- Env vars configured in `.env` (see `RAG_INGEST_URL`, `RAG_INTERNAL_KEY`, `REDIS_URL`, etc.)

## Docker Compose (Next + RAG + worker + Caddy)

From `droply`, with `.env` filled in both `droply` and `droply-rag`:

```bash
docker compose up --build -d
```

| Service | Container | Public |
| --- | --- | --- |
| Caddy | `caddy` | `:80` / `:443` |
| Next.js | `web` | internal only |
| RAG chat | `rag` | internal only |
| Indexing worker | `worker` | internal only |
| Redis | `redis` | internal only |

Caddy terminates HTTPS and reverse-proxies to Next. Next talks to RAG at `http://rag:8001`. Redis is not published.

### VPS deploy

1. Point a DNS **A record** at the VPS (`droply.dhyey2075.fun` or whatever you set as `DOMAIN`).
2. Open **80** and **443** on the firewall. Nothing else needs to be public.
3. On the VPS, clone `droply` and `droply-rag` as siblings, copy `.env` files.
4. In `droply/.env` set:

```env
DOMAIN=droply.dhyey2075.fun
NEXT_PUBLIC_APP_URL=https://droply.dhyey2075.fun
```

5. In Clerk, add that HTTPS origin (and sign-in redirect URLs).
6. Rebuild Next so `NEXT_PUBLIC_*` values are baked in, then start:

```bash
cd droply
docker compose up --build -d
```

Caddy fetches a Let’s Encrypt cert automatically. Logs: `docker compose logs -f caddy web worker rag`.

Stop with `docker compose down`.

## Local processes (without Docker)

Local development needs **four** processes running together.

### 1. Redis (port 6379)

From `droply`:

```bash
docker compose up redis
```

### 2. Next.js app (port 3000)

From `droply`:

```bash
npm install
npm run dev
```

App: [http://localhost:3000](http://localhost:3000)

### 3. Indexing worker (BullMQ, Python)

This process does download / chunk / embed / upsert. It is **not** the FastAPI server.

From `droply-rag`:

```bash
.\.venv\Scripts\activate
python -m app.ingest.worker
```

Consumes the `indexing` queue and the `indexing-dlq`. Failed jobs retry with exponential backoff + jitter, then move to the DLQ for slower retries.

### 4. Droply RAG chat API

Chat only (`/health`, `/chat`). Do not send ingest traffic here.

From `droply-rag`:

```bash
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8081
```

Health: [http://localhost:8081/health](http://localhost:8081/health)

Droply `.env` (chat still uses the RAG URL):

```env
RAG_INGEST_URL=http://localhost:8081
RAG_INTERNAL_KEY=dev-rag-internal-key-change-me
REDIS_URL=redis://127.0.0.1:6379
```

droply-rag `.env` also needs `REDIS_URL` and `APP_URL=http://localhost:3000` so the worker can publish indexing SSE.

If 50 files upload at once, all jobs are enqueued immediately, but only `INDEX_CONCURRENCY` run at a time; the rest stay `PENDING` until a slot frees.

## Quick reference

| Service          | Command                                      | URL                    |
| ---------------- | -------------------------------------------- | ---------------------- |
| Redis            | `docker compose up redis`                    | redis://127.0.0.1:6379 |
| Next.js          | `npm run dev`                                | http://localhost:3000  |
| Indexing worker  | `python -m app.ingest.worker` (droply-rag)   | —                      |
| RAG chat API     | `uvicorn main:app --reload --port 8081`      | http://localhost:8081  |

## Useful scripts

```bash
npm run db:push
npm run db:studio
npm run db:enable-pgvector
npm run lint
npm run build
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [BullMQ](https://docs.bullmq.io/)
- [droply-rag README](../droply-rag/README.md) (sibling folder)
