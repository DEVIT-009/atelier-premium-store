CREATE TYPE "public"."fulfilment_status" AS ENUM('unfulfilled', 'processing', 'shipped', 'delivered', 'ready_for_pickup', 'collected');--> statement-breakpoint
ALTER TYPE "public"."order_status" ADD VALUE 'cancelled';--> statement-breakpoint
ALTER TYPE "public"."order_status" ADD VALUE 'refunded';--> statement-breakpoint
CREATE TABLE "order_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"actor_id" text NOT NULL,
	"from_status" text NOT NULL,
	"to_status" text NOT NULL,
	"reason" text,
	"stock_changed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "fulfilment_status" "fulfilment_status" DEFAULT 'unfulfilled' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "tracking_reference" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "refunded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "refund_reference" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "refund_amount_cents" integer;--> statement-breakpoint
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_events_order_id_idx" ON "order_events" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "orders_created_at_id_idx" ON "orders" USING btree ("created_at","id");--> statement-breakpoint
CREATE INDEX "orders_status_created_at_idx" ON "orders" USING btree ("status","created_at");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_refund_amount_cents_check" CHECK ("orders"."refund_amount_cents" > 0);