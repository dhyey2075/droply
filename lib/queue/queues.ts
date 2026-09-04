import { Queue, type JobsOptions } from "bullmq";
import { getBullMqConnection } from "@/lib/queue/connection";
import {
  INDEXING_DLQ,
  INDEXING_QUEUE,
  INDEX_BACKOFF_TYPE,
  INDEX_DLQ_BACKOFF_TYPE,
  INDEX_DLQ_MAX_ATTEMPTS,
  INDEX_JOB_NAME,
  INDEX_MAX_ATTEMPTS,
  type IndexJobData,
} from "@/lib/queue/config";

const globalForQueues = globalThis as unknown as {
  droplyIndexingQueue?: Queue;
  droplyIndexingDlq?: Queue;
};

function mainJobOptions(): JobsOptions {
  return {
    attempts: INDEX_MAX_ATTEMPTS,
    backoff: { type: INDEX_BACKOFF_TYPE },
    removeOnComplete: { count: 1000 },
    removeOnFail: false,
  };
}

function dlqJobOptions(): JobsOptions {
  return {
    attempts: INDEX_DLQ_MAX_ATTEMPTS,
    backoff: { type: INDEX_DLQ_BACKOFF_TYPE },
    removeOnComplete: { count: 1000 },
    removeOnFail: false,
  };
}

export function getIndexingQueue(): Queue {
  if (!globalForQueues.droplyIndexingQueue) {
    globalForQueues.droplyIndexingQueue = new Queue(INDEXING_QUEUE, {
      connection: getBullMqConnection(),
    });
  }
  return globalForQueues.droplyIndexingQueue;
}

export function getIndexingDlq(): Queue {
  if (!globalForQueues.droplyIndexingDlq) {
    globalForQueues.droplyIndexingDlq = new Queue(INDEXING_DLQ, {
      connection: getBullMqConnection(),
    });
  }
  return globalForQueues.droplyIndexingDlq;
}

export async function enqueueIndexJob(data: IndexJobData): Promise<void> {
  await getIndexingQueue().add(INDEX_JOB_NAME, data, {
    ...mainJobOptions(),
    jobId: `index-${data.fileId}`,
  });
}

export async function enqueueIndexJobToDlq(data: IndexJobData): Promise<void> {
  await getIndexingDlq().add(INDEX_JOB_NAME, data, {
    ...dlqJobOptions(),
    jobId: `dlq-${data.fileId}`,
  });
}

export function isDuplicateJobError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /already (exists|exist)/i.test(message);
}
