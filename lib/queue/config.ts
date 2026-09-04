export const INDEXING_QUEUE = "indexing";
export const INDEXING_DLQ = "indexing-dlq";
export const INDEX_JOB_NAME = "index-document";

export const INDEX_MAX_ATTEMPTS = 3;
export const INDEX_DLQ_MAX_ATTEMPTS = 5;

export const INDEX_CONCURRENCY = Math.max(
  1,
  Number.parseInt(process.env.INDEX_CONCURRENCY ?? "3", 10) || 3
);

export const INDEX_CONCURRENCY_PER_USER = Math.max(
  1,
  Number.parseInt(process.env.INDEX_CONCURRENCY_PER_USER ?? "2", 10) || 2
);

/** Worker lock must outlive a slow RAG ingest. */
export const INDEX_LOCK_DURATION_MS = 10 * 60 * 1000;

export const INDEX_BACKOFF_BASE_MS = 2_000;
export const INDEX_BACKOFF_CAP_MS = 15 * 60 * 1000;

export const INDEX_DLQ_BACKOFF_BASE_MS = 30_000;
export const INDEX_DLQ_BACKOFF_CAP_MS = 60 * 60 * 1000;

export const INDEX_BACKOFF_TYPE = "exponential-jitter";
export const INDEX_DLQ_BACKOFF_TYPE = "exponential-jitter-dlq";

export type IndexJobData = {
  fileId: string;
  userId: string;
};
