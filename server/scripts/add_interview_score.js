const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

p.$executeRawUnsafe('ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "interview_score" DECIMAL(5,2)')
  .then(() => {
    console.log('Column interview_score added successfully.');
    return p.$disconnect();
  })
  .catch(e => {
    console.error('Error:', e.message);
    return p.$disconnect();
  });
