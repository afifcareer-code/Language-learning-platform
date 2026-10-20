CREATE TABLE "learner_languages" (
	"learner_id" text NOT NULL,
	"language_code" text NOT NULL,
	"current_level_id" text NOT NULL,
	"started_at" timestamp (3) with time zone NOT NULL,
	CONSTRAINT "learner_languages_learner_id_language_code_pk" PRIMARY KEY("learner_id","language_code")
);
--> statement-breakpoint
ALTER TABLE "languages" ADD COLUMN "status" text DEFAULT 'available' NOT NULL;--> statement-breakpoint
ALTER TABLE "languages" ADD COLUMN "writing_system" text;--> statement-breakpoint
ALTER TABLE "languages" ADD COLUMN "proficiency_framework" text;--> statement-breakpoint
ALTER TABLE "languages" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "levels" ADD COLUMN "framework_level" text;--> statement-breakpoint
ALTER TABLE "learner_languages" ADD CONSTRAINT "learner_languages_learner_id_learners_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learner_languages" ADD CONSTRAINT "learner_languages_language_code_languages_code_fk" FOREIGN KEY ("language_code") REFERENCES "public"."languages"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learner_languages" ADD CONSTRAINT "learner_languages_current_level_id_levels_id_fk" FOREIGN KEY ("current_level_id") REFERENCES "public"."levels"("id") ON DELETE no action ON UPDATE no action;