ALTER TABLE "drawings" ADD COLUMN IF NOT EXISTS "consequence_class" varchar(10) NOT NULL DEFAULT 'CC2';
