-- CreateTable
CREATE TABLE "carousel_slides" (
    "id" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "caption" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carousel_slides_pkey" PRIMARY KEY ("id")
);
