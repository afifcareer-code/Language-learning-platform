CREATE TABLE `assessment_attempts` (
	`id` varchar(191) NOT NULL,
	`assessment_id` varchar(191) NOT NULL,
	`learner_id` varchar(191) NOT NULL,
	`started_at` datetime(3) NOT NULL,
	`completed_at` datetime(3),
	CONSTRAINT `assessment_attempts_id` PRIMARY KEY(`id`)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
CREATE TABLE `assessment_results` (
	`attempt_id` varchar(191) NOT NULL,
	`total` int NOT NULL,
	`correct` int NOT NULL,
	`score` double NOT NULL,
	`passed` boolean NOT NULL,
	`missed_item_ids` json NOT NULL,
	CONSTRAINT `assessment_results_attempt_id` PRIMARY KEY(`attempt_id`)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
CREATE TABLE `assessments` (
	`id` varchar(191) NOT NULL,
	`language_code` varchar(191) NOT NULL,
	`slug` varchar(191) NOT NULL,
	`title` varchar(191) NOT NULL,
	`skill` varchar(191) NOT NULL,
	`selector` json NOT NULL,
	`question_count` int NOT NULL,
	`pass_threshold` double NOT NULL,
	CONSTRAINT `assessments_id` PRIMARY KEY(`id`),
	CONSTRAINT `assessments_slug_unique` UNIQUE(`slug`)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
CREATE TABLE `content_items` (
	`id` varchar(191) NOT NULL,
	`language_code` varchar(191) NOT NULL,
	`type` varchar(191) NOT NULL,
	`key` varchar(191) NOT NULL,
	`data` json NOT NULL,
	`tags` json NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `content_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `content_items_language_key` UNIQUE(`language_code`,`key`)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
CREATE TABLE `courses` (
	`id` varchar(191) NOT NULL,
	`language_code` varchar(191) NOT NULL,
	`slug` varchar(191) NOT NULL,
	`title` varchar(191) NOT NULL,
	`description` text NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `courses_id` PRIMARY KEY(`id`),
	CONSTRAINT `courses_slug_unique` UNIQUE(`slug`)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
CREATE TABLE `languages` (
	`code` varchar(191) NOT NULL,
	`name` varchar(191) NOT NULL,
	`native_name` varchar(191) NOT NULL,
	CONSTRAINT `languages_code` PRIMARY KEY(`code`)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
CREATE TABLE `learners` (
	`id` varchar(191) NOT NULL,
	`display_name` varchar(191) NOT NULL,
	`target_language` varchar(191) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `learners_id` PRIMARY KEY(`id`)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
CREATE TABLE `learning_attempts` (
	`id` varchar(191) NOT NULL,
	`learner_id` varchar(191) NOT NULL,
	`content_item_id` varchar(191) NOT NULL,
	`skill` varchar(191) NOT NULL,
	`mode` varchar(191) NOT NULL,
	`session_id` varchar(191),
	`correct` boolean NOT NULL,
	`score` double NOT NULL,
	`response` text,
	`response_ms` int,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `learning_attempts_id` PRIMARY KEY(`id`)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
CREATE TABLE `learning_sessions` (
	`id` varchar(191) NOT NULL,
	`learner_id` varchar(191) NOT NULL,
	`mode` varchar(191) NOT NULL,
	`started_at` datetime(3) NOT NULL,
	`ended_at` datetime(3),
	CONSTRAINT `learning_sessions_id` PRIMARY KEY(`id`)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
CREATE TABLE `lesson_items` (
	`lesson_id` varchar(191) NOT NULL,
	`content_item_id` varchar(191) NOT NULL,
	`sort_order` int NOT NULL,
	CONSTRAINT `lesson_items_lesson_id_content_item_id_pk` PRIMARY KEY(`lesson_id`,`content_item_id`)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
CREATE TABLE `lessons` (
	`id` varchar(191) NOT NULL,
	`course_id` varchar(191) NOT NULL,
	`slug` varchar(191) NOT NULL,
	`title` varchar(191) NOT NULL,
	`sort_order` int NOT NULL,
	CONSTRAINT `lessons_id` PRIMARY KEY(`id`),
	CONSTRAINT `lessons_slug_unique` UNIQUE(`slug`)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
CREATE TABLE `mastery` (
	`learner_id` varchar(191) NOT NULL,
	`content_item_id` varchar(191) NOT NULL,
	`skill` varchar(191) NOT NULL,
	`state` varchar(191) NOT NULL,
	`attempts` int NOT NULL,
	`correct` int NOT NULL,
	`consecutive_correct` int NOT NULL,
	`last_attempt_at` datetime(3),
	CONSTRAINT `mastery_learner_id_content_item_id_skill_pk` PRIMARY KEY(`learner_id`,`content_item_id`,`skill`)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
CREATE TABLE `review_schedule` (
	`learner_id` varchar(191) NOT NULL,
	`content_item_id` varchar(191) NOT NULL,
	`skill` varchar(191) NOT NULL,
	`stage` int NOT NULL,
	`interval_days` double NOT NULL,
	`due_at` datetime(3) NOT NULL,
	`last_reviewed_at` datetime(3),
	`reviews` int NOT NULL,
	`lapses` int NOT NULL,
	CONSTRAINT `review_schedule_learner_id_content_item_id_skill_pk` PRIMARY KEY(`learner_id`,`content_item_id`,`skill`)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
CREATE TABLE `writing_samples` (
	`attempt_id` varchar(191) NOT NULL,
	`strokes` json NOT NULL,
	`width` int NOT NULL,
	`height` int NOT NULL,
	`guidance_stage` varchar(191) NOT NULL,
	`self_assessment` varchar(191) NOT NULL,
	`analysis` json NOT NULL,
	CONSTRAINT `writing_samples_attempt_id` PRIMARY KEY(`attempt_id`)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
ALTER TABLE `assessment_attempts` ADD CONSTRAINT `assessment_attempts_assessment_id_assessments_id_fk` FOREIGN KEY (`assessment_id`) REFERENCES `assessments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assessment_attempts` ADD CONSTRAINT `assessment_attempts_learner_id_learners_id_fk` FOREIGN KEY (`learner_id`) REFERENCES `learners`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assessment_results` ADD CONSTRAINT `assessment_results_attempt_id_assessment_attempts_id_fk` FOREIGN KEY (`attempt_id`) REFERENCES `assessment_attempts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assessments` ADD CONSTRAINT `assessments_language_code_languages_code_fk` FOREIGN KEY (`language_code`) REFERENCES `languages`(`code`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `content_items` ADD CONSTRAINT `content_items_language_code_languages_code_fk` FOREIGN KEY (`language_code`) REFERENCES `languages`(`code`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `courses` ADD CONSTRAINT `courses_language_code_languages_code_fk` FOREIGN KEY (`language_code`) REFERENCES `languages`(`code`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `learners` ADD CONSTRAINT `learners_target_language_languages_code_fk` FOREIGN KEY (`target_language`) REFERENCES `languages`(`code`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `learning_attempts` ADD CONSTRAINT `learning_attempts_learner_id_learners_id_fk` FOREIGN KEY (`learner_id`) REFERENCES `learners`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `learning_attempts` ADD CONSTRAINT `learning_attempts_content_item_id_content_items_id_fk` FOREIGN KEY (`content_item_id`) REFERENCES `content_items`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `learning_attempts` ADD CONSTRAINT `learning_attempts_session_id_learning_sessions_id_fk` FOREIGN KEY (`session_id`) REFERENCES `learning_sessions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `learning_sessions` ADD CONSTRAINT `learning_sessions_learner_id_learners_id_fk` FOREIGN KEY (`learner_id`) REFERENCES `learners`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lesson_items` ADD CONSTRAINT `lesson_items_lesson_id_lessons_id_fk` FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lesson_items` ADD CONSTRAINT `lesson_items_content_item_id_content_items_id_fk` FOREIGN KEY (`content_item_id`) REFERENCES `content_items`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lessons` ADD CONSTRAINT `lessons_course_id_courses_id_fk` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mastery` ADD CONSTRAINT `mastery_learner_id_learners_id_fk` FOREIGN KEY (`learner_id`) REFERENCES `learners`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mastery` ADD CONSTRAINT `mastery_content_item_id_content_items_id_fk` FOREIGN KEY (`content_item_id`) REFERENCES `content_items`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `review_schedule` ADD CONSTRAINT `review_schedule_learner_id_learners_id_fk` FOREIGN KEY (`learner_id`) REFERENCES `learners`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `review_schedule` ADD CONSTRAINT `review_schedule_content_item_id_content_items_id_fk` FOREIGN KEY (`content_item_id`) REFERENCES `content_items`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `writing_samples` ADD CONSTRAINT `writing_samples_attempt_id_learning_attempts_id_fk` FOREIGN KEY (`attempt_id`) REFERENCES `learning_attempts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `content_items_type` ON `content_items` (`type`);--> statement-breakpoint
CREATE INDEX `attempts_learner_created` ON `learning_attempts` (`learner_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `attempts_learner_item` ON `learning_attempts` (`learner_id`,`content_item_id`,`skill`);--> statement-breakpoint
CREATE INDEX `review_learner_due` ON `review_schedule` (`learner_id`,`due_at`);