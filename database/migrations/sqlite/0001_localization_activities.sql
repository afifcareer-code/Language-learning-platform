CREATE TABLE `activities` (
	`id` text PRIMARY KEY NOT NULL,
	`language_code` text NOT NULL,
	`lesson_id` text,
	`type` text NOT NULL,
	`skill` text NOT NULL,
	`difficulty` integer NOT NULL,
	`evaluation` text NOT NULL,
	`success_criteria` text NOT NULL,
	`pass_score` real NOT NULL,
	`target_mastery` text NOT NULL,
	`sort_order` integer NOT NULL,
	FOREIGN KEY (`language_code`) REFERENCES `languages`(`code`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `activities_lesson` ON `activities` (`lesson_id`);--> statement-breakpoint
CREATE TABLE `activity_items` (
	`activity_id` text NOT NULL,
	`content_item_id` text NOT NULL,
	`sort_order` integer NOT NULL,
	PRIMARY KEY(`activity_id`, `content_item_id`),
	FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`content_item_id`) REFERENCES `content_items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `activity_translations` (
	`activity_id` text NOT NULL,
	`locale` text NOT NULL,
	`title` text NOT NULL,
	`objective` text NOT NULL,
	`instruction` text NOT NULL,
	`explanation` text NOT NULL,
	PRIMARY KEY(`activity_id`, `locale`),
	FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `confusion_pairs` (
	`learner_id` text NOT NULL,
	`item_a` text NOT NULL,
	`item_b` text NOT NULL,
	`error_count` integer NOT NULL,
	`correct_since_error` integer NOT NULL,
	`last_seen_at` integer NOT NULL,
	`status` text NOT NULL,
	PRIMARY KEY(`learner_id`, `item_a`, `item_b`),
	FOREIGN KEY (`learner_id`) REFERENCES `learners`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`item_a`) REFERENCES `content_items`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`item_b`) REFERENCES `content_items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `course_translations` (
	`course_id` text NOT NULL,
	`locale` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	PRIMARY KEY(`course_id`, `locale`),
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `lesson_translations` (
	`lesson_id` text NOT NULL,
	`locale` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	PRIMARY KEY(`lesson_id`, `locale`),
	FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `level_translations` (
	`level_id` text NOT NULL,
	`locale` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	PRIMARY KEY(`level_id`, `locale`),
	FOREIGN KEY (`level_id`) REFERENCES `levels`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `levels` (
	`id` text PRIMARY KEY NOT NULL,
	`language_code` text NOT NULL,
	`slug` text NOT NULL,
	`sort_order` integer NOT NULL,
	FOREIGN KEY (`language_code`) REFERENCES `languages`(`code`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `levels_slug_unique` ON `levels` (`slug`);--> statement-breakpoint
ALTER TABLE `courses` ADD `level_id` text REFERENCES levels(id);--> statement-breakpoint
ALTER TABLE `learners` ADD `ui_locale` text;--> statement-breakpoint
ALTER TABLE `learning_attempts` ADD `activity_id` text REFERENCES activities(id);