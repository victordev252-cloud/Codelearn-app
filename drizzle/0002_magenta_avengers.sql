CREATE TABLE `campaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`name` varchar(180) NOT NULL,
	`subject` varchar(200) NOT NULL,
	`html` text NOT NULL,
	`status` enum('draft','scheduled','sending','sent','failed') NOT NULL DEFAULT 'draft',
	`scheduledAt` timestamp,
	`sentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `campaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `email_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int,
	`ownerId` int NOT NULL,
	`recipient` varchar(320) NOT NULL,
	`status` enum('queued','sent','failed','bounced') NOT NULL DEFAULT 'queued',
	`providerMessageId` varchar(255),
	`errorMessage` varchar(500),
	`sentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `email_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `smtp_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`host` varchar(255) NOT NULL,
	`port` int NOT NULL DEFAULT 587,
	`username` varchar(320) NOT NULL,
	`encryptedPassword` text NOT NULL,
	`fromEmail` varchar(320) NOT NULL,
	`fromName` varchar(160) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `smtp_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `smtp_settings_ownerId_unique` UNIQUE(`ownerId`)
);
--> statement-breakpoint
CREATE TABLE `subscribers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`email` varchar(320) NOT NULL,
	`group` varchar(80) NOT NULL DEFAULT 'Newsletter',
	`status` enum('active','unsubscribed') NOT NULL DEFAULT 'active',
	`unsubscribeToken` varchar(96) NOT NULL,
	`consentedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscribers_id` PRIMARY KEY(`id`),
	CONSTRAINT `subscribers_email_unique` UNIQUE(`email`),
	CONSTRAINT `subscribers_unsubscribeToken_unique` UNIQUE(`unsubscribeToken`)
);
