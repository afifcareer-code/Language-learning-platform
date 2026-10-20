CREATE TABLE `assessment_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`assessment_id` text NOT NULL,
	`learner_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`assessment_id`) REFERENCES `assessments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`learner_id`) REFERENCES `learners`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `assessment_results` (
	`attempt_id` text PRIMARY KEY NOT NULL,
	`total` integer NOT NULL,
	`correct` integer NOT NULL,
	`score` real NOT NULL,
	`passed` integer NOT NULL,
	`missed_item_ids` text NOT NULL,
	FOREIGN KEY (`attempt_id`) REFERENCES `assessment_attempts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `assessments` (
	`id` text PRIMARY KEY NOT NULL,
	`language_code` text NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`skill` text NOT NULL,
	`selector` text NOT NULL,
	`question_count` integer NOT NULL,
	`pass_threshold` real NOT NULL,
	FOREIGN KEY (`language_code`) REFERENCES `languages`(`code`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `assessments_slug_unique` ON `assessments` (`slug`);--> statement-breakpoint
CREATE TABLE `content_items` (
	`id` text PRIMARY KEY NOT NULL,
	`language_code` text NOT NULL,
	`type` text NOT NULL,
	`key` text NOT NULL,
	`data` text NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`language_code`) REFERENCES `languages`(`code`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `content_items_language_key` ON `content_items` (`language_code`,`key`);--> statement-breakpoint
CREATE INDEX `content_items_type` ON `content_items` (`type`);--> statement-breakpoint
CREATE TABLE `courses` (
	`id` text PRIMARY KEY NOT NULL,
	`language_code` text NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`language_code`) REFERENCES `languages`(`code`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `courses_slug_unique` ON `courses` (`slug`);--> statement-breakpoint
CREATE TABLE `languages` (
	`code` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`native_name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `learners` (
	`id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`target_language` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`target_language`) REFERENCES `languages`(`code`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `learning_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`learner_id` text NOT NULL,
	`content_item_id` text NOT NULL,
	`skill` text NOT NULL,
	`mode` text NOT NULL,
	`session_id` text,
	`correct` integer NOT NULL,
	`score` real NOT NULL,
	`response` text,
	`response_ms` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`learner_id`) REFERENCES `learners`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`content_item_id`) REFERENCES `content_items`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`session_id`) REFERENCES `learning_sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `attempts_learner_created` ON `learning_attempts` (`learner_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `attempts_learner_item` ON `learning_attempts` (`learner_id`,`content_item_id`,`skill`);--> statement-breakpoint
CREATE TABLE `learning_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`learner_id` text NOT NULL,
	`mode` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`ended_at` integer,
	FOREIGN KEY (`learner_id`) REFERENCES `learners`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `lesson_items` (
	`lesson_id` text NOT NULL,
	`content_item_id` text NOT NULL,
	`sort_order` integer NOT NULL,
	PRIMARY KEY(`lesson_id`, `content_item_id`),
	FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`content_item_id`) REFERENCES `content_items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `lessons` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`sort_order` integer NOT NULL,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lessons_slug_unique` ON `lessons` (`slug`);--> statement-breakpoint
CREATE TABLE `mastery` (
	`learner_id` text NOT NULL,
	`content_item_id` text NOT NULL,
	`skill` text NOT NULL,
	`state` text NOT NULL,
	`attempts` integer NOT NULL,
	`correct` integer NOT NULL,
	`consecutive_correct` integer NOT NULL,
	`last_attempt_at` integer,
	PRIMARY KEY(`learner_id`, `content_item_id`, `skill`),
	FOREIGN KEY (`learner_id`) REFERENCES `learners`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`content_item_id`) REFERENCES `content_items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `review_schedule` (
	`learner_id` text NOT NULL,
	`content_item_id` text NOT NULL,
	`skill` text NOT NULL,
	`stage` integer NOT NULL,
	`interval_days` real NOT NULL,
	`due_at` integer NOT NULL,
	`last_reviewed_at` integer,
	`reviews` integer NOT NULL,
	`lapses` integer NOT NULL,
	PRIMARY KEY(`learner_id`, `content_item_id`, `skill`),
	FOREIGN KEY (`learner_id`) REFERENCES `learners`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`content_item_id`) REFERENCES `content_items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `review_learner_due` ON `review_schedule` (`learner_id`,`due_at`);--> statement-breakpoint
CREATE TABLE `writing_samples` (
	`attempt_id` text PRIMARY KEY NOT NULL,
	`strokes` text NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`guidance_stage` text NOT NULL,
	`self_assessment` text NOT NULL,
	`analysis` text NOT NULL,
	FOREIGN KEY (`attempt_id`) REFERENCES `learning_attempts`(`id`) ON UPDATE no action ON DELETE cascade
);
