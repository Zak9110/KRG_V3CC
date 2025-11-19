import { prisma } from './src/index';

// Example: Query all tables
async function queryAllTables() {
  console.log('=== DATABASE TABLES ACCESS EXAMPLES ===\n');

  // 1. Get all users
  console.log('1. USERS table:');
  const users = await prisma.user.findMany();
  console.log(`   Found ${users.length} users\n`);

  // 2. Get all applications
  console.log('2. APPLICATIONS table:');
  const applications = await prisma.application.findMany({
    take: 5, // Limit to 5 for display
    include: {
      documents: true,
      assignedOfficer: { select: { fullName: true } }
    }
  });
  console.log(`   Found ${applications.length} applications (showing first 5)\n`);

  // 3. Get documents
  console.log('3. DOCUMENTS table:');
  const documents = await prisma.document.findMany();
  console.log(`   Found ${documents.length} documents\n`);

  // 4. Get watchlist entries
  console.log('4. INTERNAL_WATCHLIST table:');
  const watchlist = await prisma.internalWatchlist.findMany();
  console.log(`   Found ${watchlist.length} watchlist entries\n`);

  // 5. Get entry/exit logs
  console.log('5. ENTRY_EXIT_LOGS table:');
  const logs = await prisma.entryExitLog.findMany();
  console.log(`   Found ${logs.length} entry/exit logs\n`);

  // 6. Get OTP verifications
  console.log('6. OTP_VERIFICATIONS table:');
  const otps = await prisma.otpVerification.findMany();
  console.log(`   Found ${otps.length} OTP records\n`);

  // 7. Get audit logs
  console.log('7. AUDIT_LOGS table:');
  const audits = await prisma.auditLog.findMany();
  console.log(`   Found ${audits.length} audit log entries\n`);

  // 8. Get renewal applications
  console.log('8. RENEWAL_APPLICATIONS table:');
  const renewals = await prisma.renewalApplication.findMany();
  console.log(`   Found ${renewals.length} renewal applications\n`);

  // 9. Get appeals
  console.log('9. APPEALS table:');
  const appeals = await prisma.appeal.findMany();
  console.log(`   Found ${appeals.length} appeals\n`);

  console.log('=== QUERY COMPLETED ===');
}

// Example: Insert sample data
async function insertSampleData() {
  console.log('\n=== INSERTING SAMPLE DATA ===');

  // Insert a sample application
  const sampleApp = await prisma.application.create({
    data: {
      referenceNumber: `TEST-${Date.now()}`,
      fullName: 'John Doe',
      nationalId: '123456789',
      phoneNumber: '+9647501234567',
      email: 'john.doe@example.com',
      dateOfBirth: new Date('1990-01-01'),
      nationality: 'Iraq',
      originGovernorate: 'Baghdad',
      destinationGovernorate: 'Erbil',
      visitPurpose: 'TOURISM',
      visitStartDate: new Date(),
      visitEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      declaredAccommodation: 'Hotel',
      status: 'SUBMITTED'
    }
  });

  console.log(`Created sample application: ${sampleApp.referenceNumber}`);
  console.log('=== INSERT COMPLETED ===');
}

// Run examples
async function main() {
  try {
    await queryAllTables();
    await insertSampleData();
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Uncomment to run:
// main();
