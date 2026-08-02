# Droply

File library app with document Q&A (RAG). Local development needs **three** processes running together.

## Prerequisites

- Node.js 20+
- Python 3.12+ (for the RAG service)
- Env vars configured in `.env` (see `RAG_INGEST_URL`, `RAG_INTERNAL_KEY`, `INNGEST_DEV`, etc.)

## Run all 3 servers

Open **three terminals** from the repo root (`droply`).

### 1. Next.js app (port 3000)

```bash
pnpm install
pnpm dev
```

App: [http://localhost:3000](http://localhost:3000)

### 2. Inngest Dev Server (background jobs / indexing)

```bash
npx inngest-cli@latest dev -u http://localhost:3000/api/inngest
```

Dashboard: [http://localhost:8288](http://localhost:8288)

### 3. Droply RAG service (port 8001)

The RAG API lives in the sibling `droply-rag` folder (or `droply-rag/` if nested in this repo).

```bash
cd ../droply-rag
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env   # first time only — fill keys
uvicorn main:app --reload --port 8001
```

Health: [http://localhost:8001/health](http://localhost:8001/health)

`RAG_INGEST_URL` in Droply’s `.env` should point at this service, e.g.:

```env
RAG_INGEST_URL=http://localhost:8001
RAG_INTERNAL_KEY=dev-rag-internal-key-change-me
INNGEST_DEV=1

# Optional: cap parallel RAG ingests (defaults: 3 global, 2 per user)
# INDEX_CONCURRENCY=3
# INDEX_CONCURRENCY_PER_USER=2
```

Indexing is queued by Inngest. If 50 files upload at once, all jobs are enqueued immediately, but only `INDEX_CONCURRENCY` run against RAG at a time; the rest stay `PENDING` until a slot frees.

## Quick reference

| Service   | Command                                                              | URL                          |
| --------- | -------------------------------------------------------------------- | ---------------------------- |
| Next.js   | `pnpm dev`                                                           | http://localhost:3000        |
| Inngest   | `npx inngest-cli@latest dev -u http://localhost:3000/api/inngest`    | http://localhost:8288        |
| RAG       | `uvicorn main:app --reload --port 8001` (from `droply-rag`)          | http://localhost:8001        |

## Useful scripts

```bash
pnpm db:push                 # push Drizzle schema
pnpm db:studio               # open Drizzle Studio
pnpm db:enable-pgvector      # enable pgvector extension
pnpm lint
pnpm build
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Inngest Dev Server](https://www.inngest.com/docs/local-development)
- [droply-rag README](../droply-rag/README.md) (sibling folder)
