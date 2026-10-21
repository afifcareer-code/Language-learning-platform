CREATE TABLE "content_item_translations" (
	"content_item_id" text NOT NULL,
	"locale" text NOT NULL,
	"data" jsonb NOT NULL,
	CONSTRAINT "content_item_translations_content_item_id_locale_pk" PRIMARY KEY("content_item_id","locale")
);
--> statement-breakpoint
ALTER TABLE "content_items" ADD COLUMN "level_id" text;--> statement-breakpoint
ALTER TABLE "lesson_translations" ADD COLUMN "objective" text;--> statement-breakpoint
ALTER TABLE "content_item_translations" ADD CONSTRAINT "content_item_translations_content_item_id_content_items_id_fk" FOREIGN KEY ("content_item_id") REFERENCES "public"."content_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_level_id_levels_id_fk" FOREIGN KEY ("level_id") REFERENCES "public"."levels"("id") ON DELETE no action ON UPDATE no action;