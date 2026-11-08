CREATE TYPE "public"."product_status" AS ENUM('draft', 'active', 'archived');--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "status" "product_status" DEFAULT 'active' NOT NULL;--> statement-breakpoint
CREATE INDEX "products_status_created_at_idx" ON "products" USING btree ("status","created_at");