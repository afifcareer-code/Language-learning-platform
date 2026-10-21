CREATE TABLE `content_item_translations` (
	`content_item_id` text NOT NULL,
	`locale` text NOT NULL,
	`data` text NOT NULL,
	PRIMARY KEY(`content_item_id`, `locale`),
	FOREIGN KEY (`content_item_id`) REFERENCES `content_items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `content_items` ADD `level_id` text REFERENCES levels(id);--> statement-breakpoint
ALTER TABLE `lesson_translations` ADD `objective` text;