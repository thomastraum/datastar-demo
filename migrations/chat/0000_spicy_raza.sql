CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`content` text NOT NULL,
	`created_at` integer NOT NULL
);
