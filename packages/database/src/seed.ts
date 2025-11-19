import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create Admin User
  const adminPassword = await bcrypt.hash('Admin@123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@krg-evisit.gov' },
    update: {},
    create: {
      email: 'admin@krg-evisit.gov',
      passwordHash: adminPassword,
      fullName: 'System Administrator',
      role: 'ADMIN',
      isActive: true,
    },
  });
  console.log('✅ Admin user created:', admin.email);

  // Create Officer
  const officerPassword = await bcrypt.hash('password123', 10);
  const officer = await prisma.user.upsert({
    where: { email: 'officer@test.com' },
    update: {},
    create: {
      email: 'officer@test.com',
      passwordHash: officerPassword,
      fullName: 'Ahmad Hassan',
      role: 'OFFICER',
      isActive: true,
    },
  });
  console.log('✅ Officer user created:', officer.email);

  // Create Supervisor
  const supervisorPassword = await bcrypt.hash('password123', 10);
  const supervisor = await prisma.user.upsert({
    where: { email: 'supervisor@test.com' },
    update: {},
    create: {
      email: 'supervisor@test.com',
      passwordHash: supervisorPassword,
      fullName: 'Sara Mohammed',
      role: 'SUPERVISOR',
      isActive: true,
    },
  });
  console.log('✅ Supervisor user created:', supervisor.email);

  // Create Director
  const directorPassword = await bcrypt.hash('password123', 10);
  const director = await prisma.user.upsert({
    where: { email: 'director@test.com' },
    update: {},
    create: {
      email: 'director@test.com',
      passwordHash: directorPassword,
      fullName: 'Dr. Omar Ali',
      role: 'DIRECTOR',
      isActive: true,
    },
  });
  console.log('✅ Director user created:', director.email);

  // Create additional officers for workload testing
  const officer2Password = await bcrypt.hash('password123', 10);
  const officer2 = await prisma.user.upsert({
    where: { email: 'sara@test.com' },
    update: {},
    create: {
      email: 'sara@test.com',
      passwordHash: officer2Password,
      fullName: 'Sara Mohammed',
      role: 'OFFICER',
      isActive: true,
    },
  });
  console.log('✅ Officer 2 user created:', officer2.email);

  const officer3Password = await bcrypt.hash('password123', 10);
  const officer3 = await prisma.user.upsert({
    where: { email: 'omar@test.com' },
    update: {},
    create: {
      email: 'omar@test.com',
      passwordHash: officer3Password,
      fullName: 'Omar Ali',
      role: 'OFFICER',
      isActive: true,
    },
  });
  console.log('✅ Officer 3 user created:', officer3.email);

  // Create sample watchlist entries
  try {
    await prisma.internalWatchlist.create({
      data: {
        nationalId: '198001011111',
        fullName: 'Suspicious Person 1',
        reason: 'Previous overstay of 45 days',
        flagType: 'OVERSTAY',
        severity: 'HIGH',
        isActive: true
      }
    });
    console.log('✅ Watchlist entry 1 created');

    await prisma.internalWatchlist.create({
      data: {
        nationalId: '199002022222',
        fullName: 'Suspicious Person 2',
        reason: 'Fraudulent documents detected',
        flagType: 'FRAUD',
        severity: 'CRITICAL',
        isActive: true
      }
    });
    console.log('✅ Watchlist entry 2 created');
  } catch (e) {
    console.log('⚠️ Watchlist entries may already exist');
  }

  // Create sample application (skip if already exists)
  try {
    const sampleApp = await prisma.application.upsert({
      where: { referenceNumber: 'KRG-2025-000001' },
      update: {},
      create: {
        referenceNumber: 'KRG-2025-000001',
        fullName: 'Ali Ahmed Hassan',
        nationalId: '199001011234',
        phoneNumber: '+9647501234567',
        email: 'ali.ahmed@example.com',
        dateOfBirth: new Date('1990-01-01'),
        nationality: 'Iraq',
        originGovernorate: 'Baghdad',
        destinationGovernorate: 'Erbil',
        visitPurpose: 'TOURISM',
        visitStartDate: new Date('2025-12-01'),
        visitEndDate: new Date('2025-12-15'),
        declaredAccommodation: 'Erbil Rotana Hotel',
        status: 'SUBMITTED',
        priorityLevel: 'NORMAL',
      },
    });
    console.log('✅ Sample application created:', sampleApp.referenceNumber);
  } catch (e) {
    console.log('⚠️ Sample application may already exist');
  }

  console.log('✅ Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
