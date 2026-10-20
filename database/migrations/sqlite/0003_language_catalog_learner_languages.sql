CREATE TABLE `learner_languages` (
	`learner_id` text NOT NULL,
	`language_code` text NOT NULL,
	`current_level_id` text NOT NULL,
	`started_at` integer NOT NULL,
	PRIMARY KEY(`learner_id`, `language_code`),
	FOREIGN KEY (`learner_id`) REFERENCES `learners`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`language_code`) REFERENCES `languages`(`code`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`current_level_id`) REFERENCES `levels`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `languages` ADD `status` text DEFAULT 'available' NOT NULL;--> statement-breakpoint
ALTER TABLE `languages` ADD `writing_system` text;--> statement-breakpoint
ALTER TABLE `languages` ADD `proficiency_framework` text;--> statement-breakpoint
ALTER TABLE `languages` ADD `sort_order` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `levels` ADD `framework_level` text;