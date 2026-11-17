CREATE TABLE "google_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdAt" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"userId" uuid NOT NULL,
	"googleSubject" text NOT NULL,
	"email" text NOT NULL,
	"encryptedRefreshToken" text NOT NULL,
	"scopes" text NOT NULL,
	"needsReauth" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdAt" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"userId" uuid NOT NULL,
	"tokenHash" text NOT NULL,
	"expiresAt" timestamp (3) with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdAt" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"userId" uuid NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdAt" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"email" text NOT NULL,
	"displayName" text
);
--> statement-breakpoint
ALTER TABLE "google_accounts" ADD CONSTRAINT "google_accounts_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "google_accounts_googleSubject_key" ON "google_accounts" USING btree ("googleSubject");--> statement-breakpoint
CREATE UNIQUE INDEX "google_accounts_userId_key" ON "google_accounts" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_tokenHash_key" ON "sessions" USING btree ("tokenHash");--> statement-breakpoint
CREATE INDEX "sessions_userId_idx" ON "sessions" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "settings_userId_key" ON "settings" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_key" ON "users" USING btree ("email");