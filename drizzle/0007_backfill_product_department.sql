-- Custom SQL migration file, put your code below! --
-- Sort the existing catalogue into departments. Everything else stays unisex.
-- Not done through db:seed because that also resets stock and created_at.
UPDATE "products" SET "department" = 'women' WHERE "slug" IN (
	'chevron-chain-shoulder-bag',
	'cropped-leather-biker-jacket',
	'twisted-gold-hoop-earrings',
	'top-handle-satchel'
);--> statement-breakpoint
UPDATE "products" SET "department" = 'men' WHERE "slug" = 'technical-bomber-jacket';
