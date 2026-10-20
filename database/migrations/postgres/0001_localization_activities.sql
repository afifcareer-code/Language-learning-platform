CREATE TABLE "activities" (
	"id" text PRIMARY KEY NOT NULL,
	"language_code" text NOT NULL,
	"lesson_id" text,
	"type" text NOT NULL,
	"skill" text NOT NULL,
	"difficulty" integer NOT NULL,
	"evaluation" text NOT NULL,
	"success_criteria" jsonb NOT NULL,
	"pass_score" double precision NOT NULL,
	"target_mastery" text NOT NULL,
	"sort_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_items" (
	"activity_id" text NOT NULL,
	"content_item_id" text NOT NULL,
	"sort_order" integer NOT NULL,
	CONSTRAINT "activity_items_activity_id_content_item_id_pk" PRIMARY KEY("activity_id","content_item_id")
);
--> statement-breakpoint
CREATE TABLE "activity_translations" (
	"activity_id" text NOT NULL,
	"locale" text NOT NULL,
	"title" text NOT NULL,
	"objective" text NOT NULL,
	"instruction" text NOT NULL,
	"explanation" text NOT NULL,
	CONSTRAINT "activity_translations_activity_id_locale_pk" PRIMARY KEY("activity_id","locale")
);
--> statement-breakpoint
CREATE TABLE "confusion_pairs" (
	"learner_id" text NOT NULL,
	"item_a" text NOT NULL,
	"item_b" text NOT NULL,
	"error_count" integer NOT NULL,
	"correct_since_error" integer NOT NULL,
	"last_seen_at" timestamp (3) with time zone NOT NULL,
	"status" text NOT NULL,
	CONSTRAINT "confusion_pairs_learner_id_item_a_item_b_pk" PRIMARY KEY("learner_id","item_a","item_b")
);
--> statement-breakpoint
CREATE TABLE "course_translations" (
	"course_id" text NOT NULL,
	"locale" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	CONSTRAINT "course_translations_course_id_locale_pk" PRIMARY KEY("course_id","locale")
);
--> statement-breakpoint
CREATE TABLE "lesson_translations" (
	"lesson_id" text NOT NULL,
	"locale" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	CONSTRAINT "lesson_translations_lesson_id_locale_pk" PRIMARY KEY("lesson_id","locale")
);
--> statement-breakpoint
CREATE TABLE "level_translations" (
	"level_id" text NOT NULL,
	"locale" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	CONSTRAINT "level_translations_level_id_locale_pk" PRIMARY KEY("level_id","locale")
);
--> statement-breakpoint
CREATE TABLE "levels" (
	"id" text PRIMARY KEY NOT NULL,
	"language_code" text NOT NULL,
	"slug" text NOT NULL,
	"sort_order" integer NOT NULL,
	CONSTRAINT "levels_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "level_id" text;--> statement-breakpoint
ALTER TABLE "learners" ADD COLUMN "ui_locale" text;--> statement-breakpoint
ALTER TABLE "learning_attempts" ADD COLUMN "activity_id" text;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_language_code_languages_code_fk" FOREIGN KEY ("language_code") REFERENCES "public"."languages"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_items" ADD CONSTRAINT "activity_items_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_items" ADD CONSTRAINT "activity_items_content_item_id_content_items_id_fk" FOREIGN KEY ("content_item_id") REFERENCES "public"."content_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_translations" ADD CONSTRAINT "activity_translations_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "confusion_pairs" ADD CONSTRAINT "confusion_pairs_learner_id_learners_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "confusion_pairs" ADD CONSTRAINT "confusion_pairs_item_a_content_items_id_fk" FOREIGN KEY ("item_a") REFERENCES "public"."content_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "confusion_pairs" ADD CONSTRAINT "confusion_pairs_item_b_content_items_id_fk" FOREIGN KEY ("item_b") REFERENCES "public"."content_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_translations" ADD CONSTRAINT "course_translations_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_translations" ADD CONSTRAINT "lesson_translations_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "level_translations" ADD CONSTRAINT "level_translations_level_id_levels_id_fk" FOREIGN KEY ("level_id") REFERENCES "public"."levels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "levels" ADD CONSTRAINT "levels_language_code_languages_code_fk" FOREIGN KEY ("language_code") REFERENCES "public"."languages"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activities_lesson" ON "activities" USING btree ("lesson_id");--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_level_id_levels_id_fk" FOREIGN KEY ("level_id") REFERENCES "public"."levels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_attempts" ADD CONSTRAINT "learning_attempts_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE set null ON UPDATE no action;