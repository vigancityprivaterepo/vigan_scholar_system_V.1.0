CREATE TABLE "site_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "facebook_page_name" TEXT,
    "facebook_page_url" TEXT,
    "facebook_page_description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
);
