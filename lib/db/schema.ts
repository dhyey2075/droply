import { pgTable, text, timestamp, uuid, integer, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import path from "path";

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
    parentId: uuid("parent_id"),  // Made nullable for root folders

    isFolder: boolean("is_folder").notNull().default(false),
    isStarred: boolean("is_starred").notNull().default(false),
    isTrash: boolean("is_trash").notNull().default(false),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const filesRelations = relations(files, ({ one, many }) => ({
    // Define the parent relation
    parent: one(files, {
        fields: [files.parentId],
        references: [files.id],
        relationName: "parent_child"
    }),

    // Define the children relation
    children: many(files, {
        relationName: "parent_child"
    })
}));

export type File = typeof files.$inferSelect;
export type NewFile = typeof files.$inferInsert;