-- Custom SQL migration file, put your code below! --
-- Keep the store's menu and homepage as they were when they were hard-coded:
-- Bags, Shoes and Jewelry in the menu, Shoes and Jewelry on the homepage.
-- Every other category follows them, by name.
UPDATE "categories" SET
	"position" = ordered."position",
	"show_in_menu" = "categories"."slug" IN ('bags', 'shoes', 'jewelry'),
	"show_on_home" = "categories"."slug" IN ('shoes', 'jewelry')
FROM (
	SELECT "id", row_number() OVER (
		ORDER BY array_position(ARRAY['bags', 'shoes', 'jewelry'], "slug") NULLS LAST, "name"
	)::int AS "position"
	FROM "categories"
) AS ordered
WHERE "categories"."id" = ordered."id";
