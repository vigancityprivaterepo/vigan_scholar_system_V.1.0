require('dotenv').config({ path: '../../../.env' });
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  // Create or update the primary admin account.
  // isEmailVerified is set to true so the account works immediately without
  // going through the email verification flow.
  const adminEmail = process.env.PRIMARY_ADMIN_EMAIL || 'data@vigancity.gov.ph';
  const adminExists = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!adminExists) {
    const passwordHash = await bcrypt.hash('4gR7B5gmJ<Z36rG<12345', 12);
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        fullName: 'System Administrator',
        role: 'ADMIN',
        isEmailVerified: true,
      },
    });
    console.log(`Admin user created: ${adminEmail}`);
  } else if (!adminExists.isEmailVerified) {
    await prisma.user.update({
      where: { email: adminEmail },
      data: { isEmailVerified: true },
    });
    console.log(`Admin email verification flag set for: ${adminEmail}`);
  }

  // Seed default site settings (no-op if already present).
  await prisma.siteSetting.upsert({
    where: { id: 'default' },
    create: { id: 'default' },
    update: {},
  });

  console.log('Seed complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
