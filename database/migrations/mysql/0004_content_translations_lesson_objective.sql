CREATE TABLE `content_item_translations` (
	`content_item_id` varchar(191) NOT NULL,
	`locale` varchar(191) NOT NULL,
	`data` json NOT NULL,
	CONSTRAINT `content_item_translations_content_item_id_locale_pk` PRIMARY KEY(`content_item_id`,`locale`)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
ALTER TABLE `content_items` ADD `level_id` varchar(191);--> statement-breakpoint
ALTER TABLE `lesson_translations` ADD `objective` text;--> statement-breakpoint
ALTER TABLE `content_item_translations` ADD CONSTRAINT `content_item_translations_content_item_id_content_items_id_fk` FOREIGN KEY (`content_item_id`) REFERENCES `content_items`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `content_items` ADD CONSTRAINT `content_items_level_id_levels_id_fk` FOREIGN KEY (`level_id`) REFERENCES `levels`(`id`) ON DELETE no action ON UPDATE no action;