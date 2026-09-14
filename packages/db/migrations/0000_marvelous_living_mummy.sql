CREATE TABLE `activities` (
	`id` text PRIMARY KEY NOT NULL,
	`interest_id` text NOT NULL,
	`goal_id` text,
	`section` text NOT NULL,
	`tier` text NOT NULL,
	`library_item_id` text NOT NULL,
	`title` text NOT NULL,
	`est_minutes` integer NOT NULL,
	`doc` text,
	`status` text DEFAULT 'planned' NOT NULL,
	`current_page` integer DEFAULT 0 NOT NULL,
	`planned_for` text NOT NULL,
	`started_at` integer,
	`completed_at` integer,
	`rating` text,
	`rating_text` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`interest_id`) REFERENCES `interests`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`goal_id`) REFERENCES `goals`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `activities_history_idx` ON `activities` (`interest_id`,`completed_at`);--> statement-breakpoint
CREATE INDEX `activities_planned_idx` ON `activities` (`interest_id`,`planned_for`);--> statement-breakpoint
CREATE TABLE `analytics_buffer` (
	`id` text PRIMARY KEY NOT NULL,
	`event` text NOT NULL,
	`properties` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `contexts` (
	`id` text PRIMARY KEY NOT NULL,
	`interest_id` text NOT NULL,
	`kind` text NOT NULL,
	`label` text NOT NULL,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`interest_id`) REFERENCES `interests`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `contexts_interest_idx` ON `contexts` (`interest_id`);--> statement-breakpoint
CREATE TABLE `gen_cache` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`scope_key` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer
);
--> statement-breakpoint
CREATE INDEX `gen_cache_scope_idx` ON `gen_cache` (`kind`,`scope_key`);--> statement-breakpoint
CREATE TABLE `goals` (
	`id` text PRIMARY KEY NOT NULL,
	`interest_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`concepts` text NOT NULL,
	`status` text DEFAULT 'not_started' NOT NULL,
	`sort_order` real NOT NULL,
	`source` text NOT NULL,
	`introduced_at` integer,
	`strengthened_at` integer,
	`applied_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`interest_id`) REFERENCES `interests`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `goals_interest_idx` ON `goals` (`interest_id`);--> statement-breakpoint
CREATE TABLE `interests` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`want_to_learn` text NOT NULL,
	`why_choice` text NOT NULL,
	`why_text` text,
	`experience_choice` text NOT NULL,
	`experience_text` text,
	`frequency` text NOT NULL,
	`session_minutes` integer NOT NULL,
	`approach_notes` text DEFAULT '' NOT NULL,
	`status` text NOT NULL,
	`sort_order` real NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE TABLE `library_prefs` (
	`id` text PRIMARY KEY NOT NULL,
	`interest_id` text NOT NULL,
	`section` text NOT NULL,
	`library_item_id` text NOT NULL,
	`active` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`interest_id`) REFERENCES `interests`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `library_prefs_interest_idx` ON `library_prefs` (`interest_id`);--> statement-breakpoint
CREATE TABLE `llm_calls` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`model` text NOT NULL,
	`interest_id` text,
	`activity_id` text,
	`request` text NOT NULL,
	`response` text,
	`input_tokens` integer,
	`output_tokens` integer,
	`latency_ms` integer,
	`status` text NOT NULL,
	`error` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reflections` (
	`id` text PRIMARY KEY NOT NULL,
	`interest_id` text NOT NULL,
	`feeling_text` text NOT NULL,
	`changes` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`interest_id`) REFERENCES `interests`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `reflections_interest_idx` ON `reflections` (`interest_id`);--> statement-breakpoint
CREATE TABLE `resources` (
	`id` text PRIMARY KEY NOT NULL,
	`interest_id` text NOT NULL,
	`url` text NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`how_to_use` text,
	`summary` text,
	`source` text NOT NULL,
	`goal_ids` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`interest_id`) REFERENCES `interests`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `resources_interest_idx` ON `resources` (`interest_id`);--> statement-breakpoint
CREATE TABLE `responses` (
	`id` text PRIMARY KEY NOT NULL,
	`activity_id` text NOT NULL,
	`page_id` text NOT NULL,
	`block_id` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `responses_activity_idx` ON `responses` (`activity_id`);--> statement-breakpoint
CREATE TABLE `routine_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`interest_id` text,
	`note` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`interest_id`) REFERENCES `interests`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `topics` (
	`id` text PRIMARY KEY NOT NULL,
	`interest_id` text NOT NULL,
	`label` text NOT NULL,
	`origin` text NOT NULL,
	`selected` integer NOT NULL,
	`sort_order` real NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`interest_id`) REFERENCES `interests`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `topics_interest_idx` ON `topics` (`interest_id`);