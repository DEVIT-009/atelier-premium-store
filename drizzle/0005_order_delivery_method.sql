CREATE TYPE "public"."delivery_method" AS ENUM('delivery', 'pickup');--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "delivery" SET DATA TYPE "public"."delivery_method" USING "delivery"::"public"."delivery_method";--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "receiver_name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "first_name";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "last_name";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "address1";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "address2";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "city";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "state";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "postal_code";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "country";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "gift_note";--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_delivery_address_check" CHECK ("orders"."delivery" = 'pickup' or ("orders"."province" is not null and "orders"."address_detail" is not null));