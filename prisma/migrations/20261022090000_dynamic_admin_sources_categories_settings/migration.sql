-- Additive only: admin-managed scraper sources, categories, site settings and
-- per-employer automatic publication.
ALTER TABLE "ScraperSourceSetting" ADD COLUMN "name" TEXT;
ALTER TABLE "ScraperSourceSetting" ADD COLUMN "url" TEXT;
ALTER TABLE "ScraperSourceSetting" ADD COLUMN "adapter" TEXT;
ALTER TABLE "ScraperSourceSetting" ADD COLUMN "category" TEXT;
ALTER TABLE "ScraperSourceSetting" ADD COLUMN "autoPublish" BOOLEAN;
ALTER TABLE "ScraperSourceSetting" ADD COLUMN "precedence" INTEGER;
ALTER TABLE "ScraperSourceSetting" ADD COLUMN "config" JSONB;
ALTER TABLE "ScraperSourceSetting" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "ScraperSourceSetting" ADD COLUMN "createdById" TEXT;

ALTER TABLE "Employer" ADD COLUMN "autoPublish" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "Category" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "isFallback" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- Seed with the categories the site already uses.
INSERT INTO "Category" ("id", "name", "slug", "sortOrder", "isFallback", "updatedAt") VALUES
  ('cat_government', 'Government', 'government', 0, false, CURRENT_TIMESTAMP),
  ('cat_ngo_and_development', 'NGO & Development', 'ngo-and-development', 1, false, CURRENT_TIMESTAMP),
  ('cat_banking_and_finance', 'Banking & Finance', 'banking-and-finance', 2, false, CURRENT_TIMESTAMP),
  ('cat_technology', 'Technology', 'technology', 3, false, CURRENT_TIMESTAMP),
  ('cat_creative_design_and_media', 'Creative, Design & Media', 'creative-design-and-media', 4, false, CURRENT_TIMESTAMP),
  ('cat_health', 'Health', 'health', 5, false, CURRENT_TIMESTAMP),
  ('cat_education', 'Education', 'education', 6, false, CURRENT_TIMESTAMP),
  ('cat_engineering', 'Engineering', 'engineering', 7, false, CURRENT_TIMESTAMP),
  ('cat_sales_and_marketing', 'Sales & Marketing', 'sales-and-marketing', 8, false, CURRENT_TIMESTAMP),
  ('cat_accounting_and_audit', 'Accounting & Audit', 'accounting-and-audit', 9, false, CURRENT_TIMESTAMP),
  ('cat_hr_and_administration', 'HR & Administration', 'hr-and-administration', 10, false, CURRENT_TIMESTAMP),
  ('cat_legal', 'Legal', 'legal', 11, false, CURRENT_TIMESTAMP),
  ('cat_logistics_and_transport', 'Logistics & Transport', 'logistics-and-transport', 12, false, CURRENT_TIMESTAMP),
  ('cat_hospitality_and_tourism', 'Hospitality & Tourism', 'hospitality-and-tourism', 13, false, CURRENT_TIMESTAMP),
  ('cat_agriculture', 'Agriculture', 'agriculture', 14, false, CURRENT_TIMESTAMP),
  ('cat_mining_energy_oil_and_gas', 'Mining, Energy, Oil & Gas', 'mining-energy-oil-and-gas', 15, false, CURRENT_TIMESTAMP),
  ('cat_manufacturing', 'Manufacturing', 'manufacturing', 16, false, CURRENT_TIMESTAMP),
  ('cat_construction_and_real_estate', 'Construction & Real Estate', 'construction-and-real-estate', 17, false, CURRENT_TIMESTAMP),
  ('cat_security_and_protective_services', 'Security & Protective Services', 'security-and-protective-services', 18, false, CURRENT_TIMESTAMP),
  ('cat_internships_and_graduate_programs', 'Internships & Graduate Programs', 'internships-and-graduate-programs', 19, false, CURRENT_TIMESTAMP),
  ('cat_general', 'General', 'general', 20, true, CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;

CREATE TABLE "SiteSetting" (
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "updatedById" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("key")
);
