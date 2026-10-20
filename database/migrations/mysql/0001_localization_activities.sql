CREATE TABLE `activities` (
	`id` varchar(191) NOT NULL,
	`language_code` varchar(191) NOT NULL,
	`lesson_id` varchar(191),
	`type` varchar(191) NOT NULL,
	`skill` varchar(191) NOT NULL,
	`difficulty` int NOT NULL,
	`evaluation` varchar(191) NOT NULL,
	`success_criteria` json NOT NULL,
	`pass_score` double NOT NULL,
	`target_mastery` varchar(191) NOT NULL,
	`sort_order` int NOT NULL,
	CONSTRAINT `activities_id` PRIMARY KEY(`id`)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
CREATE TABLE `activity_items` (
	`activity_id` varchar(191) NOT NULL,
	`content_item_id` varchar(191) NOT NULL,
	`sort_order` int NOT NULL,
	CONSTRAINT `activity_items_activity_id_content_item_id_pk` PRIMARY KEY(`activity_id`,`content_item_id`)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
CREATE TABLE `activity_translations` (
	`activity_id` varchar(191) NOT NULL,
	`locale` varchar(191) NOT NULL,
	`title` varchar(191) NOT NULL,
	`objective` text NOT NULL,
	`instruction` text NOT NULL,
	`explanation` text NOT NULL,
	CONSTRAINT `activity_translations_activity_id_locale_pk` PRIMARY KEY(`activity_id`,`locale`)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
CREATE TABLE `confusion_pairs` (
	`learner_id` varchar(191) NOT NULL,
	`item_a` varchar(191) NOT NULL,
	`item_b` varchar(191) NOT NULL,
	`error_count` int NOT NULL,
	`correct_since_error` int NOT NULL,
	`last_seen_at` datetime(3) NOT NULL,
	`status` varchar(191) NOT NULL,
	CONSTRAINT `confusion_pairs_learner_id_item_a_item_b_pk` PRIMARY KEY(`learner_id`,`item_a`,`item_b`)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
CREATE TABLE `course_translations` (
	`course_id` varchar(191) NOT NULL,
	`locale` varchar(191) NOT NULL,
	`title` varchar(191) NOT NULL,
	`description` text,
	CONSTRAINT `course_translations_course_id_locale_pk` PRIMARY KEY(`course_id`,`locale`)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
CREATE TABLE `lesson_translations` (
	`lesson_id` varchar(191) NOT NULL,
	`locale` varchar(191) NOT NULL,
	`title` varchar(191) NOT NULL,
	`description` text,
	CONSTRAINT `lesson_translations_lesson_id_locale_pk` PRIMARY KEY(`lesson_id`,`locale`)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
CREATE TABLE `level_translations` (
	`level_id` varchar(191) NOT NULL,
	`locale` varchar(191) NOT NULL,
	`title` varchar(191) NOT NULL,
	`description` text,
	CONSTRAINT `level_translations_level_id_locale_pk` PRIMARY KEY(`level_id`,`locale`)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
CREATE TABLE `levels` (
	`id` varchar(191) NOT NULL,
	`language_code` varchar(191) NOT NULL,
	`slug` varchar(191) NOT NULL,
	`sort_order` int NOT NULL,
	CONSTRAINT `levels_id` PRIMARY KEY(`id`),
	CONSTRAINT `levels_slug_unique` UNIQUE(`slug`)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
ALTER TABLE `courses` ADD `level_id` varchar(191);--> statement-breakpoint
ALTER TABLE `learners` ADD `ui_locale` varchar(191);--> statement-breakpoint
ALTER TABLE `learning_attempts` ADD `activity_id` varchar(191);--> statement-breakpoint
ALTER TABLE `activities` ADD CONSTRAINT `activities_language_code_languages_code_fk` FOREIGN KEY (`language_code`) REFERENCES `languages`(`code`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `activities` ADD CONSTRAINT `activities_lesson_id_lessons_id_fk` FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `activity_items` ADD CONSTRAINT `activity_items_activity_id_activities_id_fk` FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `activity_items` ADD CONSTRAINT `activity_items_content_item_id_content_items_id_fk` FOREIGN KEY (`content_item_id`) REFERENCES `content_items`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `activity_translations` ADD CONSTRAINT `activity_translations_activity_id_activities_id_fk` FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `confusion_pairs` ADD CONSTRAINT `confusion_pairs_learner_id_learners_id_fk` FOREIGN KEY (`learner_id`) REFERENCES `learners`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `confusion_pairs` ADD CONSTRAINT `confusion_pairs_item_a_content_items_id_fk` FOREIGN KEY (`item_a`) REFERENCES `content_items`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `confusion_pairs` ADD CONSTRAINT `confusion_pairs_item_b_content_items_id_fk` FOREIGN KEY (`item_b`) REFERENCES `content_items`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `course_translations` ADD CONSTRAINT `course_translations_course_id_courses_id_fk` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lesson_translations` ADD CONSTRAINT `lesson_translations_lesson_id_lessons_id_fk` FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `level_translations` ADD CONSTRAINT `level_translations_level_id_levels_id_fk` FOREIGN KEY (`level_id`) REFERENCES `levels`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `levels` ADD CONSTRAINT `levels_language_code_languages_code_fk` FOREIGN KEY (`language_code`) REFERENCES `languages`(`code`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `activities_lesson` ON `activities` (`lesson_id`);--> statement-breakpoint
ALTER TABLE `courses` ADD CONSTRAINT `courses_level_id_levels_id_fk` FOREIGN KEY (`level_id`) REFERENCES `levels`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `learning_attempts` ADD CONSTRAINT `learning_attempts_activity_id_activities_id_fk` FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON DELETE set null ON UPDATE no action;