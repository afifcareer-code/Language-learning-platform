CREATE TABLE `account_sessions` (
	`token_hash` varchar(191) NOT NULL,
	`account_id` varchar(191) NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `account_sessions_token_hash` PRIMARY KEY(`token_hash`)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
CREATE TABLE `accounts` (
	`id` varchar(191) NOT NULL,
	`learner_id` varchar(191) NOT NULL,
	`email` varchar(191) NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `accounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `accounts_email` UNIQUE(`email`),
	CONSTRAINT `accounts_learner` UNIQUE(`learner_id`)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
ALTER TABLE `account_sessions` ADD CONSTRAINT `account_sessions_account_id_accounts_id_fk` FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `accounts` ADD CONSTRAINT `accounts_learner_id_learners_id_fk` FOREIGN KEY (`learner_id`) REFERENCES `learners`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `account_sessions_account` ON `account_sessions` (`account_id`);