ALTER TABLE "todos" ADD COLUMN "slug" varchar(200);--> statement-breakpoint
ALTER TABLE "todos" ADD CONSTRAINT "todos_slug_unique" UNIQUE("slug");