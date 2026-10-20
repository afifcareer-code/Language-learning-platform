CREATE TABLE `learner_languages` (
	`learner_id` varchar(191) NOT NULL,
	`language_code` varchar(191) NOT NULL,
	`current_level_id` varchar(191) NOT NULL,
	`started_at` datetime(3) NOT NULL,
	CONSTRAINT `learner_languages_learner_id_language_code_pk` PRIMARY KEY(`learner_id`,`language_code`)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
ALTER TABLE `languages` ADD `status` varchar(191) DEFAULT 'available' NOT NULL;--> statement-breakpoint
ALTER TABLE `languages` ADD `writing_system` varchar(191);--> statement-breakpoint
ALTER TABLE `languages` ADD `proficiency_framework` varchar(191);--> statement-breakpoint
ALTER TABLE `languages` ADD `sort_order` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `levels` ADD `framework_level` varchar(191);--> statement-breakpoint
ALTER TABLE `learner_languages` ADD CONSTRAINT `learner_languages_learner_id_learners_id_fk` FOREIGN KEY (`learner_id`) REFERENCES `learners`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `learner_languages` ADD CONSTRAINT `learner_languages_language_code_languages_code_fk` FOREIGN KEY (`language_code`) REFERENCES `languages`(`code`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `learner_languages` ADD CONSTRAINT `learner_languages_current_level_id_levels_id_fk` FOREIGN KEY (`current_level_id`) REFERENCES `levels`(`id`) ON DELETE no action ON UPDATE no action;