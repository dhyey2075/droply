export type IndexingStatusValue =
  | "INVALID"
  | "PENDING"
  | "INPROGRESS"
  | "COMPLETED"
  | "FAILED";

export type IndexingEventPayload = {
  fileId: string;
  userId: string;
  indexingStatus: IndexingStatusValue;
  indexError?: string | null;
  chunkCount?: number | null;
  indexedAt?: string | null;
};

type Subscriber = (event: IndexingEventPayload) => void;

type Hub = {
  subscribers: Map<string, Set<Subscriber>>;
};

const globalForHub = globalThis as unknown as {
  __droplyIndexingHub?: Hub;
};

function getHub(): Hub {
  if (!globalForHub.__droplyIndexingHub) {
    globalForHub.__droplyIndexingHub = {
      subscribers: new Map(),
    };
  }
  return globalForHub.__droplyIndexingHub;
}

export function subscribeIndexingEvents(
  userId: string,
  subscriber: Subscriber
): () => void {
  const hub = getHub();
  let set = hub.subscribers.get(userId);
  if (!set) {
    set = new Set();
    hub.subscribers.set(userId, set);
  }
  set.add(subscriber);

  return () => {
    set?.delete(subscriber);
    if (set && set.size === 0) {
      hub.subscribers.delete(userId);
    }
  };
}

export function publishIndexingEvent(event: IndexingEventPayload): void {
  const hub = getHub();
  const set = hub.subscribers.get(event.userId);
  if (!set || set.size === 0) return;
  for (const subscriber of set) {
    try {
      subscriber(event);
    } catch (error) {
      console.error("Indexing event subscriber failed:", error);
    }
  }
}
