CREATE TABLE "assessment_attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"assessment_id" text NOT NULL,
	"learner_id" text NOT NULL,
	"started_at" timestamp (3) with time zone NOT NULL,
	"completed_at" timestamp (3) with time zone
);
--> statement-breakpoint
CREATE TABLE "assessment_results" (
	"attempt_id" text PRIMARY KEY NOT NULL,
	"total" integer NOT NULL,
	"correct" integer NOT NULL,
	"score" double precision NOT NULL,
	"passed" boolean NOT NULL,
	"missed_item_ids" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessments" (
	"id" text PRIMARY KEY NOT NULL,
	"language_code" text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"skill" text NOT NULL,
	"selector" jsonb NOT NULL,
	"question_count" integer NOT NULL,
	"pass_threshold" double precision NOT NULL,
	CONSTRAINT "assessments_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "content_items" (
	"id" text PRIMARY KEY NOT NULL,
	"language_code" text NOT NULL,
	"type" text NOT NULL,
	"key" text NOT NULL,
	"data" jsonb NOT NULL,
	"tags" jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" text PRIMARY KEY NOT NULL,
	"language_code" text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "courses_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "languages" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"native_name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learners" (
	"id" text PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"target_language" text NOT NULL,
	"created_at" timestamp (3) with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learning_attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"learner_id" text NOT NULL,
	"content_item_id" text NOT NULL,
	"skill" text NOT NULL,
	"mode" text NOT NULL,
	"session_id" text,
	"correct" boolean NOT NULL,
	"score" double precision NOT NULL,
	"response" text,
	"response_ms" integer,
	"created_at" timestamp (3) with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learning_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"learner_id" text NOT NULL,
	"mode" text NOT NULL,
	"started_at" timestamp (3) with time zone NOT NULL,
	"ended_at" timestamp (3) with time zone
);
--> statement-breakpoint
CREATE TABLE "lesson_items" (
	"lesson_id" text NOT NULL,
	"content_item_id" text NOT NULL,
	"sort_order" integer NOT NULL,
	CONSTRAINT "lesson_items_lesson_id_content_item_id_pk" PRIMARY KEY("lesson_id","content_item_id")
);
--> statement-breakpoint
CREATE TABLE "lessons" (
	"id" text PRIMARY KEY NOT NULL,
	"course_id" text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"sort_order" integer NOT NULL,
	CONSTRAINT "lessons_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "mastery" (
	"learner_id" text NOT NULL,
	"content_item_id" text NOT NULL,
	"skill" text NOT NULL,
	"state" text NOT NULL,
	"attempts" integer NOT NULL,
	"correct" integer NOT NULL,
	"consecutive_correct" integer NOT NULL,
	"last_attempt_at" timestamp (3) with time zone,
	CONSTRAINT "mastery_learner_id_content_item_id_skill_pk" PRIMARY KEY("learner_id","content_item_id","skill")
);
--> statement-breakpoint
CREATE TABLE "review_schedule" (
	"learner_id" text NOT NULL,
	"content_item_id" text NOT NULL,
	"skill" text NOT NULL,
	"stage" integer NOT NULL,
	"interval_days" double precision NOT NULL,
	"due_at" timestamp (3) with time zone NOT NULL,
	"last_reviewed_at" timestamp (3) with time zone,
	"reviews" integer NOT NULL,
	"lapses" integer NOT NULL,
	CONSTRAINT "review_schedule_learner_id_content_item_id_skill_pk" PRIMARY KEY("learner_id","content_item_id","skill")
);
--> statement-breakpoint
CREATE TABLE "writing_samples" (
	"attempt_id" text PRIMARY KEY NOT NULL,
	"strokes" jsonb NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"guidance_stage" text NOT NULL,
	"self_assessment" text NOT NULL,
	"analysis" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_learner_id_learners_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_results" ADD CONSTRAINT "assessment_results_attempt_id_assessment_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."assessment_attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_language_code_languages_code_fk" FOREIGN KEY ("language_code") REFERENCES "public"."languages"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_language_code_languages_code_fk" FOREIGN KEY ("language_code") REFERENCES "public"."languages"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_language_code_languages_code_fk" FOREIGN KEY ("language_code") REFERENCES "public"."languages"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learners" ADD CONSTRAINT "learners_target_language_languages_code_fk" FOREIGN KEY ("target_language") REFERENCES "public"."languages"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_attempts" ADD CONSTRAINT "learning_attempts_learner_id_learners_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_attempts" ADD CONSTRAINT "learning_attempts_content_item_id_content_items_id_fk" FOREIGN KEY ("content_item_id") REFERENCES "public"."content_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_attempts" ADD CONSTRAINT "learning_attempts_session_id_learning_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."learning_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_sessions" ADD CONSTRAINT "learning_sessions_learner_id_learners_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_items" ADD CONSTRAINT "lesson_items_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_items" ADD CONSTRAINT "lesson_items_content_item_id_content_items_id_fk" FOREIGN KEY ("content_item_id") REFERENCES "public"."content_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mastery" ADD CONSTRAINT "mastery_learner_id_learners_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mastery" ADD CONSTRAINT "mastery_content_item_id_content_items_id_fk" FOREIGN KEY ("content_item_id") REFERENCES "public"."content_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_schedule" ADD CONSTRAINT "review_schedule_learner_id_learners_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_schedule" ADD CONSTRAINT "review_schedule_content_item_id_content_items_id_fk" FOREIGN KEY ("content_item_id") REFERENCES "public"."content_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "writing_samples" ADD CONSTRAINT "writing_samples_attempt_id_learning_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."learning_attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "content_items_language_key" ON "content_items" USING btree ("language_code","key");--> statement-breakpoint
CREATE INDEX "content_items_type" ON "content_items" USING btree ("type");--> statement-breakpoint
CREATE INDEX "attempts_learner_created" ON "learning_attempts" USING btree ("learner_id","created_at");--> statement-breakpoint
CREATE INDEX "attempts_learner_item" ON "learning_attempts" USING btree ("learner_id","content_item_id","skill");--> statement-breakpoint
CREATE INDEX "review_learner_due" ON "review_schedule" USING btree ("learner_id","due_at");