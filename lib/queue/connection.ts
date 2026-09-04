import IORedis, { type RedisOptions } from "ioredis";

const DEFAULT_REDIS_URL = "redis://127.0.0.1:6379";

export function getRedisUrl(): string {
  return process.env.REDIS_URL?.trim() || DEFAULT_REDIS_URL;
}

export function getBullMqConnection(): RedisOptions {
  const parsed = new URL(getRedisUrl());
  const dbPath = parsed.pathname.replace(/^\//, "");
  const db = dbPath ? Number.parseInt(dbPath, 10) : undefined;

  return {
    host: parsed.hostname,
    port: parsed.port ? Number.parseInt(parsed.port, 10) : 6379,
    username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
    password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
    db: Number.isFinite(db) ? db : undefined,
    maxRetriesPerRequest: null,
  };
}

export function createRedis(): IORedis {
  return new IORedis(getBullMqConnection());
}
