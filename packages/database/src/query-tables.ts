import { prisma } from './index';

export async function getTableCounts() {
  const counts = {
    users: await prisma.user.count(),
    applications: await prisma.application.count(),
    documents: await prisma.document.count(),
    entryExitLogs: await prisma.entryExitLog.count(),
    auditLogs: await prisma.auditLog.count(),
    internalWatchlist: await prisma.internalWatchlist.count(),
    otpVerifications: await prisma.otpVerification.count(),
    renewalApplications: await prisma.renewalApplication.count(),
    appeals: await prisma.appeal.count(),
  };

  console.table(counts);
  return counts;
}

// Usage: await getTableCounts()
