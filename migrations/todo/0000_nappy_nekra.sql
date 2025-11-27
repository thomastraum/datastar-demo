CREATE TABLE `todos` (
	`id` text PRIMARY KEY NOT NULL,
	`content` text NOT NULL,
	`completed` integer DEFAULT false,
	`created_at` integer NOT NULL
);
