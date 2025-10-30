CREATE TABLE "ai_conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"chat_id" text NOT NULL,
	"user_id" text NOT NULL,
	"user_message" text NOT NULL,
	"ai_response" text NOT NULL,
	"action_type" text,
	"processing_time" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "chat_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"chat_id" text NOT NULL,
	"user_id" text NOT NULL,
	"username" text,
	"first_name" text,
	"last_name" text,
	"is_active" boolean DEFAULT true,
	"last_seen" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "conversation_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"chat_id" text NOT NULL,
	"user_id" text NOT NULL,
	"message_type" text NOT NULL,
	"content" text NOT NULL,
	"token_count" integer DEFAULT 0,
	"timestamp" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "conversation_summaries" (
	"id" serial PRIMARY KEY NOT NULL,
	"chat_id" text NOT NULL,
	"user_id" text NOT NULL,
	"summary" text NOT NULL,
	"message_count" integer NOT NULL,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"token_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "debts" (
	"id" serial PRIMARY KEY NOT NULL,
	"chat_id" text NOT NULL,
	"debtor_user_id" text NOT NULL,
	"debtor_username" text,
	"creditor_user_id" text NOT NULL,
	"creditor_username" text,
	"amount" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'VND',
	"description" text,
	"is_paid" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"paid_at" timestamp,
	"ai_detection" text
);
--> statement-breakpoint
CREATE TABLE "food_suggestions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"chat_id" text NOT NULL,
	"username" text,
	"suggestion" text NOT NULL,
	"prompt" text,
	"ai_response" text,
	"created_at" timestamp DEFAULT now()
);
