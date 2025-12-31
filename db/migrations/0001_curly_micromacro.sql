CREATE TABLE "favorites" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"repo_url" text NOT NULL,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "github_requests" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"query" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"config" jsonb,
	"session_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hitl_reviews" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" text NOT NULL,
	"repo_snapshot_json" jsonb,
	"user_verdict" boolean,
	"rationale" text,
	"status" text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "repo_analysis" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" text NOT NULL,
	"repo_url" text NOT NULL,
	"agent_id" text,
	"status" text DEFAULT 'analyzing' NOT NULL,
	"ai_ranking" integer,
	"ai_summary" text,
	"ai_pros_cons" jsonb,
	"stars" integer,
	"tech_stack" jsonb
);
--> statement-breakpoint
CREATE TABLE "repo_tags" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tag_id" text NOT NULL,
	"repo_url" text NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"css_color" text,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_requests" ADD CONSTRAINT "github_requests_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hitl_reviews" ADD CONSTRAINT "hitl_reviews_request_id_github_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."github_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repo_analysis" ADD CONSTRAINT "repo_analysis_request_id_github_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."github_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repo_tags" ADD CONSTRAINT "repo_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;