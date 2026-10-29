CREATE INDEX "todos_owner_created_idx" ON "todos" USING btree ("user_id","deleted_at","created_at","id");--> statement-breakpoint
CREATE INDEX "todos_owner_name_idx" ON "todos" USING btree ("user_id","deleted_at","name","id");--> statement-breakpoint
CREATE INDEX "todos_owner_updated_idx" ON "todos" USING btree ("user_id","deleted_at","updated_at","id");--> statement-breakpoint
CREATE INDEX "todos_owner_priority_idx" ON "todos" USING btree ("user_id","deleted_at","priority","id");--> statement-breakpoint
CREATE INDEX "todos_owner_status_idx" ON "todos" USING btree ("user_id","deleted_at","status","id");