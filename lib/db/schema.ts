import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  boolean,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
  customType,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const indexingStatusEnum = pgEnum("indexing_status", [
  "INVALID",
  "PENDING",
  "INPROGRESS",
  "COMPLETED",
  "FAILED",
]);

const vector768 = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return "vector(768)";
  },
  toDriver(value: number[]): string {
    return `[${value.join(",")}]`;
  },
  fromDriver(value: string): number[] {
    const trimmed = value.replace(/^\[/, "").replace(/\]$/, "");
    if (!trimmed) return [];
    return trimmed.split(",").map(Number);
  },
});

export const files = pgTable("files", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  path: text("path").notNull(),
  size: integer("size").notNull(),
  type: text("type").notNull(),

  fileUrl: text("file_url").notNull(),
  fileId: text("imagekit_file_id").notNull(),
  thumbnailUrl: text("thumbnail_url"),

  userId: text("user_id").notNull(),
  parentId: uuid("parent_id"),

  isFolder: boolean("is_folder").notNull().default(false),
  isStarred: boolean("is_starred").notNull().default(false),
  isTrash: boolean("is_trash").notNull().default(false),

  indexingStatus: indexingStatusEnum("indexing_status")
    .notNull()
    .default("INVALID"),
  indexAttempts: integer("index_attempts").notNull().default(0),
  indexError: text("index_error"),
  indexedAt: timestamp("indexed_at"),
  chunkCount: integer("chunk_count"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const documentChunks = pgTable(
  "document_chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    fileId: uuid("file_id")
      .notNull()
      .references(() => files.id, { onDelete: "cascade" }),
    chunkIndex: integer("chunk_index").notNull(),
    content: text("content").notNull(),
    embedding: vector768("embedding").notNull(),
    metadata: jsonb("metadata").notNull().$type<{
      user_id: string;
      file_id: string;
      source?: string;
      page?: number;
      chunk_index?: number;
      [key: string]: unknown;
    }>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("document_chunks_file_chunk_uidx").on(
      table.fileId,
      table.chunkIndex
    ),
    index("document_chunks_user_file_idx").on(table.userId, table.fileId),
  ]
);

export const filesRelations = relations(files, ({ one, many }) => ({
  parent: one(files, {
    fields: [files.parentId],
    references: [files.id],
    relationName: "parent_child",
  }),
  children: many(files, {
    relationName: "parent_child",
  }),
  chunks: many(documentChunks),
}));

export const documentChunksRelations = relations(documentChunks, ({ one }) => ({
  file: one(files, {
    fields: [documentChunks.fileId],
    references: [files.id],
  }),
}));

export const messageRoleEnum = pgEnum("message_role", [
  "user",
  "assistant",
  "system",
]);

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    title: text("title"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("conversations_user_id_idx").on(table.userId)]
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: messageRoleEnum("role").notNull(),
    content: text("content").notNull(),
    sources: jsonb("sources").$type<
      Array<{
        fileId: string;
        fileName: string;
        fileUrl?: string;
        snippet: string;
      }>
    >(),
    /** RAG answer path: documents (pgvector) or web (CRAG fallback) */
    answerMode: text("answer_mode").$type<"documents" | "web">(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("messages_conversation_id_idx").on(table.conversationId),
  ]
);

export const conversationsRelations = relations(conversations, ({ many }) => ({
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

export const googleDriveTokens = pgTable("google_drive_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().unique(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  tokenType: text("token_type").default("Bearer"),
  expiryDate: timestamp("expiry_date"),
  scope: text("scope"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const oneDriveTokens = pgTable("onedrive_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().unique(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  tokenType: text("token_type").default("Bearer"),
  expiryDate: timestamp("expiry_date"),
  scope: text("scope"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type File = typeof files.$inferSelect;
export type NewFile = typeof files.$inferInsert;
export type DocumentChunk = typeof documentChunks.$inferSelect;
export type NewDocumentChunk = typeof documentChunks.$inferInsert;
export type IndexingStatus = (typeof indexingStatusEnum.enumValues)[number];
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type GoogleDriveToken = typeof googleDriveTokens.$inferSelect;
export type NewGoogleDriveToken = typeof googleDriveTokens.$inferInsert;
export type OneDriveToken = typeof oneDriveTokens.$inferSelect;
export type NewOneDriveToken = typeof oneDriveTokens.$inferInsert;
