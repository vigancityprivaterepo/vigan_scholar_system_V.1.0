require('dotenv').config({ path: '../../../.env' });
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "users"
    ADD COLUMN IF NOT EXISTS "is_email_verified" BOOLEAN NOT NULL DEFAULT false
  `);

  // Create admin user
  const adminExists = await prisma.user.findUnique({ where: { email: 'data@vigancity.gov.ph' } });
  if (!adminExists) {
    const passwordHash = await bcrypt.hash('4gR7B5gmJ<Z36rG<12345', 12);
    await prisma.user.create({
      data: {
        email: 'data@vigancity.gov.ph',
        passwordHash,
        fullName: 'System Administrator',
        role: 'ADMIN',
      },
    });
    console.log('Admin user created: data@vigancity.gov.ph');
  }

  await prisma.$executeRawUnsafe(`
    UPDATE "users"
    SET "is_email_verified" = true
    WHERE "email" = 'data@vigancity.gov.ph'
  `);

  // Create sample applicant
  const applicantExists = await prisma.user.findUnique({ where: { email: 'applicant@test.com' } });
  if (!applicantExists) {
    const passwordHash = await bcrypt.hash('Test@2024', 12);
    await prisma.user.create({
      data: {
        email: 'applicant@test.com',
        passwordHash,
        fullName: 'Juan dela Cruz',
        role: 'APPLICANT',
      },
    });
    console.log('Test applicant created: applicant@test.com / Test@2024');
  }

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "site_settings" (
      "id" TEXT NOT NULL DEFAULT 'default',
      "facebook_page_name" TEXT,
      "facebook_page_url" TEXT,
      "facebook_page_description" TEXT,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
    )
  `);

  await prisma.$executeRawUnsafe(`
    INSERT INTO "site_settings" ("id", "updated_at")
    VALUES ('default', CURRENT_TIMESTAMP)
    ON CONFLICT ("id") DO NOTHING
  `);

  console.log('Seed complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
