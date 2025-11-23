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

  // Create Checkpoint Officer
  const checkpointOfficerPassword = await bcrypt.hash('password123', 10);
  const checkpointOfficer = await prisma.user.upsert({
    where: { email: 'checkpoint@test.com' },
    update: {},
    create: {
      email: 'checkpoint@test.com',
      passwordHash: checkpointOfficerPassword,
      fullName: 'Mustafa Karim',
      role: 'CHECKPOINT_OFFICER',
      isActive: true,
    },
  });
  console.log('✅ Checkpoint Officer user created:', checkpointOfficer.email);

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

  // Helper function to generate reference number
  const generateRefNumber = (index: number) => {
    const year = new Date().getFullYear();
    return `KRG-${year}-${String(index).padStart(6, '0')}`;
  };

  // Helper function to get random date in last N days
  const getRandomDate = (daysAgo: number) => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    date.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60), 0, 0);
    return date;
  };

  // Sample data arrays
  const firstNames = ['Ali', 'Ahmed', 'Mohammed', 'Hassan', 'Omar', 'Khalid', 'Fatima', 'Sara', 'Layla', 'Noor', 'Yusuf', 'Ibrahim', 'Zainab', 'Aisha', 'Maryam'];
  const lastNames = ['Hassan', 'Ahmed', 'Mohammed', 'Ali', 'Karim', 'Salih', 'Hussein', 'Mahmoud', 'Abdullah', 'Ibrahim', 'Omar', 'Khalil', 'Noor', 'Rashid', 'Tariq'];
  const governorates = ['Baghdad', 'Erbil', 'Sulaymaniyah', 'Dohuk', 'Kirkuk', 'Mosul', 'Basra', 'Najaf', 'Karbala', 'Anbar'];
  const visitPurposes = ['TOURISM', 'BUSINESS', 'FAMILY_VISIT', 'MEDICAL', 'EDUCATION', 'RELIGIOUS', 'WORK'];
  const occupations = ['Student', 'Business Owner', 'Employee', 'Unemployed', 'Retired', 'Teacher', 'Engineer', 'Doctor'];
  const educationLevels = ['Primary', 'Secondary', 'University', 'Postgraduate'];
  const incomeRanges = ['Under 500', '500-1000', '1000-2000', '2000-5000', 'Over 5000'];
  const genders = ['MALE', 'FEMALE'];
  const statuses = ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ACTIVE', 'PENDING_DOCUMENTS'];
  const priorityLevels = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];

  // Create multiple test applications
  console.log('📝 Creating test applications...');
  const applications = [];
  const now = new Date();
  
  for (let i = 1; i <= 150; i++) {
    try {
      const daysAgo = Math.floor(Math.random() * 30); // Last 30 days
      const createdAt = getRandomDate(daysAgo);
      const visitStartDate = new Date(now);
      visitStartDate.setDate(visitStartDate.getDate() + Math.floor(Math.random() * 60)); // Next 60 days
      const visitEndDate = new Date(visitStartDate);
      visitEndDate.setDate(visitEndDate.getDate() + Math.floor(Math.random() * 30) + 1); // 1-30 days duration
      
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const fullName = `${firstName} ${lastName}`;
      const nationalId = `19${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`;
      const gender = genders[Math.floor(Math.random() * genders.length)];
      const birthYear = 1960 + Math.floor(Math.random() * 50); // Age 15-65
      const dateOfBirth = new Date(birthYear, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
      
      // Determine status and assignment
      let status = statuses[Math.floor(Math.random() * statuses.length)];
      let assignedOfficerId: string | null = null;
      let approvalDate: Date | null = null;
      let rejectionDate: Date | null = null;
      let approvedById: string | null = null;
      let rejectedById: string | null = null;
      
      // Assign some applications to officers
      if (Math.random() > 0.3) { // 70% assigned
        const officers = [officer.id, officer2.id, officer3.id];
        assignedOfficerId = officers[Math.floor(Math.random() * officers.length)];
      }
      
      // Set approval/rejection dates based on status
      if (status === 'APPROVED' && assignedOfficerId) {
        approvalDate = new Date(createdAt);
        approvalDate.setDate(approvalDate.getDate() + Math.floor(Math.random() * 3) + 1); // 1-3 days after submission
        approvedById = assignedOfficerId;
      } else if (status === 'REJECTED' && assignedOfficerId) {
        rejectionDate = new Date(createdAt);
        rejectionDate.setDate(rejectionDate.getDate() + Math.floor(Math.random() * 3) + 1);
        rejectedById = assignedOfficerId;
      } else if (status === 'ACTIVE' && assignedOfficerId) {
        approvalDate = new Date(createdAt);
        approvalDate.setDate(approvalDate.getDate() + Math.floor(Math.random() * 2) + 1);
        approvedById = assignedOfficerId;
      }
      
      const priority = priorityLevels[Math.floor(Math.random() * priorityLevels.length)];
      const securityRiskScore = Math.floor(Math.random() * 100);
      
      const app = await prisma.application.create({
        data: {
          referenceNumber: generateRefNumber(i),
          fullName,
          nationalId,
          phoneNumber: `+964750${String(Math.floor(Math.random() * 10000000)).padStart(7, '0')}`,
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
          dateOfBirth,
          gender,
          nationality: Math.random() > 0.7 ? 'Syria' : 'Iraq', // 30% foreign
          phoneVerified: Math.random() > 0.2, // 80% verified
          originGovernorate: governorates[Math.floor(Math.random() * governorates.length)],
          destinationGovernorate: governorates[Math.floor(Math.random() * governorates.length)],
          visitPurpose: visitPurposes[Math.floor(Math.random() * visitPurposes.length)],
          visitStartDate,
          visitEndDate,
          declaredAccommodation: Math.random() > 0.5 ? 'Hotel' : 'Family Home',
          accommodationType: Math.random() > 0.5 ? 'Hotel' : 'Family Home',
          dailySpending: Math.floor(Math.random() * 200) + 50, // $50-$250
          estimatedStayDuration: Math.ceil((visitEndDate.getTime() - visitStartDate.getTime()) / (1000 * 60 * 60 * 24)),
          status,
          assignedOfficerId,
          priorityLevel: priority,
          securityRiskScore,
          occupation: occupations[Math.floor(Math.random() * occupations.length)],
          educationLevel: educationLevels[Math.floor(Math.random() * educationLevels.length)],
          monthlyIncome: incomeRanges[Math.floor(Math.random() * incomeRanges.length)],
          previousVisits: Math.floor(Math.random() * 5),
          approvalDate,
          approvedById,
          rejectionDate,
          rejectedById,
          rejectionReason: status === 'REJECTED' ? 'Incomplete documentation' : null,
          processingDeadline: new Date(createdAt.getTime() + 72 * 60 * 60 * 1000), // 72 hours from creation
          createdAt,
          updatedAt: status === 'APPROVED' || status === 'REJECTED' ? (approvalDate || rejectionDate || createdAt) : createdAt,
        },
      });
      
      applications.push(app);
      
      // Add documents to some applications
      if (Math.random() > 0.3) { // 70% have documents
        const docTypes = ['NATIONAL_ID', 'PASSPORT', 'SUPPORTING_DOC'];
        const numDocs = Math.floor(Math.random() * 3) + 1; // 1-3 documents
        
        for (let j = 0; j < numDocs; j++) {
          await prisma.document.create({
            data: {
              applicationId: app.id,
              documentType: docTypes[Math.floor(Math.random() * docTypes.length)],
              fileUrl: `https://example.com/documents/${app.id}/doc-${j}.pdf`,
              fileName: `document-${j}.pdf`,
              fileSize: Math.floor(Math.random() * 2000000) + 100000, // 100KB - 2MB
              mimeType: 'application/pdf',
              isVerified: Math.random() > 0.4, // 60% verified
            },
          });
        }
      }
      
      // Add entry/exit logs for active applications
      if (status === 'ACTIVE' && approvalDate) {
        const entryDate = new Date(approvalDate);
        entryDate.setDate(entryDate.getDate() + Math.floor(Math.random() * 5) + 1);
        
        await prisma.entryExitLog.create({
          data: {
            applicationId: app.id,
            logType: 'ENTRY',
            checkpointName: 'Erbil International Airport',
            checkpointLocation: '36.1911,44.0092',
            officerId: checkpointOfficer.id,
            recordedAt: entryDate,
          },
        });
        
        // Some have exit logs too
        if (Math.random() > 0.6) {
          const exitDate = new Date(entryDate);
          exitDate.setDate(exitDate.getDate() + Math.floor(Math.random() * 20) + 1);
          
          await prisma.entryExitLog.create({
    data: {
              applicationId: app.id,
              logType: 'EXIT',
              checkpointName: 'Erbil International Airport',
              checkpointLocation: '36.1911,44.0092',
              officerId: checkpointOfficer.id,
              recordedAt: exitDate,
    },
  });
        }
      }
      
      if (i % 25 === 0) {
        console.log(`  ✅ Created ${i} applications...`);
      }
    } catch (e: any) {
      if (!e.message?.includes('Unique constraint')) {
        console.log(`  ⚠️ Error creating application ${i}:`, e.message);
      }
    }
  }
  
  console.log(`✅ Created ${applications.length} test applications`);

  // Update officer last login times for active officers
  await prisma.user.updateMany({
    where: { role: 'OFFICER', isActive: true },
    data: { lastLogin: new Date() },
  });
  console.log('✅ Updated officer last login times');

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
