CREATE TABLE "bot_memories" (
	"id" serial PRIMARY KEY NOT NULL,
	"chat_id" text NOT NULL,
	"user_id" text NOT NULL,
	"user_name" text,
	"nick_name" text,
	"personal_info" text,
	"relationship_level" text DEFAULT 'stranger',
	"important_events" text,
	"preferences" text,
	"last_interaction" timestamp DEFAULT now(),
	"interaction_count" integer DEFAULT 1,
	"trust_level" integer DEFAULT 50,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "bot_moods" (
	"id" serial PRIMARY KEY NOT NULL,
	"chat_id" text NOT NULL,
	"current_mood" text NOT NULL,
	"mood_level" integer DEFAULT 50,
	"mood_reason" text,
	"mood_trigger" text,
	"response_style" text,
	"last_mood_change" timestamp DEFAULT now(),
	"mood_duration" integer DEFAULT 60,
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "debt_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"chat_id" text NOT NULL,
	"debtor_user_id" text NOT NULL,
	"debtor_name" text NOT NULL,
	"creditor_user_id" text NOT NULL,
	"creditor_name" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'VND',
	"description" text,
	"created_date" timestamp DEFAULT now(),
	"due_date" timestamp,
	"is_paid" boolean DEFAULT false,
	"paid_date" timestamp,
	"paid_amount" numeric(10, 2),
	"witnesses" text,
	"ai_confidence" integer DEFAULT 90,
	"status" text DEFAULT 'active',
	"notes" text,
	"updated_at" timestamp DEFAULT now()
);
