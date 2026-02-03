import prisma from '../src/lib/prisma.js';

async function main() {
  console.log('Seeding database...');

  // Create default staff member
  const staff = await prisma.staff.upsert({
    where: { id: 'STAFF_001' },
    update: {},
    create: {
      id: 'STAFF_001',
      name: 'Default Staff',
      pin: '1234'
    }
  });
  console.log('Created staff:', staff);

  // Create a test user for development
  const testUser = await prisma.user.upsert({
    where: { phone: '5551234567' },
    update: {},
    create: {
      name: 'Test Customer',
      phone: '5551234567',
      currentStamps: 3,
      lifetimeVisits: 5
    }
  });
  console.log('Created test user:', testUser);

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });