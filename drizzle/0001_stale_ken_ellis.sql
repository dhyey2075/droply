ALTER TABLE "files" ALTER COLUMN "thumbnail_url" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "files" ALTER COLUMN "parent_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "imagekit_file_id" text NOT NULL;