-- Custom SQL migration file, put your code below! --
-- Carry orders placed with the old US-style address over to the new fields
-- before 0005 drops the old columns. Every old order was a delivery.
UPDATE "orders" SET
	"receiver_name" = trim("first_name" || ' ' || "last_name"),
	"province" = "city",
	"address_detail" = concat_ws(', ', "address1", nullif("address2", ''), "state", "postal_code", "country"),
	"note" = "gift_note",
	"delivery" = 'delivery';
