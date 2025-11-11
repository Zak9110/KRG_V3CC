import { Router, Response } from 'express';
import { prisma } from '@krg-evisit/database';
import { authMiddleware, roleMiddleware, AuthRequest } from '../middleware/auth';
import { UserRole, ApplicationStatus } from '@krg-evisit/shared-types';

const router = Router();

// Dashboard statistics (director/supervisor)
router.get('/dashboard', authMiddleware, roleMiddleware([UserRole.DIRECTOR, UserRole.SUPERVISOR]), async (req: AuthRequest, res: Response) => {
  try {
    const [
      totalApplications,
      pendingApplications,
      approvedApplications,
      rejectedApplications,
      currentlyInside,
      totalEntries,
      totalExits,
      recentApplications,
      statusBreakdown,
      nationalityBreakdown
    ] = await Promise.all([
      // Total applications
      prisma.application.count(),
      
      // Pending review
      prisma.application.count({
        where: {
          status: {
            in: [
              ApplicationStatus.PENDING_REVIEW,
              ApplicationStatus.ASSIGNED,
              ApplicationStatus.UNDER_REVIEW,
              ApplicationStatus.PENDING_APPROVAL
            ]
          }
        }
      }),
      
      // Approved
      prisma.application.count({
        where: { status: ApplicationStatus.APPROVED }
      }),
      
      // Rejected
      prisma.application.count({
        where: { status: ApplicationStatus.REJECTED }
      }),
      
      // Currently inside KRG
      prisma.application.count({
        where: {
          status: {
            in: [
              ApplicationStatus.ENTERED,
              ApplicationStatus.RE_ENTERED
            ]
          },
          currentLocation: {
            not: 'EXITED'
          }
        }
      }),
      
      // Total entries
      prisma.entryExitLog.count({
        where: { action: 'ENTRY' }
      }),
      
      // Total exits
      prisma.entryExitLog.count({
        where: { action: 'EXIT' }
      }),
      
      // Recent applications (last 10)
      prisma.application.findMany({
        take: 10,
        orderBy: { applicationDate: 'desc' },
        select: {
          id: true,
          referenceNumber: true,
          fullName: true,
          nationality: true,
          status: true,
          applicationDate: true
        }
      }),
      
      // Status breakdown
      prisma.application.groupBy({
        by: ['status'],
        _count: {
          status: true
        }
      }),
      
      // Nationality breakdown (top 10)
      prisma.application.groupBy({
        by: ['nationality'],
        _count: {
          nationality: true
        },
        orderBy: {
          _count: {
            nationality: 'desc'
          }
        },
        take: 10
      })
    ]);

    return res.json({
      success: true,
      data: {
        overview: {
          totalApplications,
          pendingApplications,
          approvedApplications,
          rejectedApplications,
          currentlyInside,
          totalEntries,
          totalExits
        },
        recentApplications,
        statusBreakdown: statusBreakdown.map(item => ({
          status: item.status,
          count: item._count.status
        })),
        nationalityBreakdown: nationalityBreakdown.map(item => ({
          nationality: item.nationality,
          count: item._count.nationality
        }))
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve analytics' }
    });
  }
});

// Entry/Exit statistics
router.get('/entry-exit', authMiddleware, roleMiddleware([UserRole.DIRECTOR, UserRole.SUPERVISOR]), async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const where: any = {};
    if (startDate && endDate) {
      where.timestamp = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }

    const [
      entryLogs,
      exitLogs,
      checkpointBreakdown,
      dailyStats
    ] = await Promise.all([
      // Entry logs
      prisma.entryExitLog.findMany({
        where: { ...where, action: 'ENTRY' },
        orderBy: { timestamp: 'desc' },
        take: 100,
        include: {
          application: {
            select: {
              referenceNumber: true,
              fullName: true,
              nationality: true
            }
          }
        }
      }),
      
      // Exit logs
      prisma.entryExitLog.findMany({
        where: { ...where, action: 'EXIT' },
        orderBy: { timestamp: 'desc' },
        take: 100,
        include: {
          application: {
            select: {
              referenceNumber: true,
              fullName: true,
              nationality: true
            }
          }
        }
      }),
      
      // Breakdown by checkpoint
      prisma.entryExitLog.groupBy({
        by: ['checkpointName', 'action'],
        where,
        _count: {
          id: true
        }
      }),
      
      // Daily statistics
      prisma.$queryRaw`
        SELECT 
          DATE(timestamp) as date,
          action,
          COUNT(*) as count
        FROM EntryExitLog
        ${where.timestamp ? `WHERE timestamp BETWEEN ${where.timestamp.gte} AND ${where.timestamp.lte}` : ''}
        GROUP BY DATE(timestamp), action
        ORDER BY date DESC
        LIMIT 30
      `
    ]);

    return res.json({
      success: true,
      data: {
        entryLogs,
        exitLogs,
        checkpointBreakdown: checkpointBreakdown.map(item => ({
          checkpoint: item.checkpointName,
          action: item.action,
          count: item._count.id
        })),
        dailyStats
      }
    });
  } catch (error) {
    console.error('Entry/Exit analytics error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve entry/exit analytics' }
    });
  }
});

// Application processing time statistics
router.get('/processing-time', authMiddleware, roleMiddleware([UserRole.DIRECTOR, UserRole.SUPERVISOR]), async (req: AuthRequest, res: Response) => {
  try {
    const applications = await prisma.application.findMany({
      where: {
        approvedAt: { not: null }
      },
      select: {
        applicationDate: true,
        approvedAt: true,
        reviewedAt: true
      }
    });

    const processingTimes = applications.map(app => {
      if (!app.approvalDate) return 0;
      const processingTime = new Date(app.approvalDate).getTime() - new Date(app.createdAt).getTime();
      return Math.floor(processingTime / (1000 * 60 * 60)); // Convert to hours
    });

    const avgProcessingTime = processingTimes.length > 0
      ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length
      : 0;

    const minProcessingTime = processingTimes.length > 0 ? Math.min(...processingTimes) : 0;
    const maxProcessingTime = processingTimes.length > 0 ? Math.max(...processingTimes) : 0;

    return res.json({
      success: true,
      data: {
        averageProcessingTimeHours: Math.round(avgProcessingTime),
        minimumProcessingTimeHours: minProcessingTime,
        maximumProcessingTimeHours: maxProcessingTime,
        totalProcessed: applications.length
      }
    });
  } catch (error) {
    console.error('Processing time analytics error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve processing time analytics' }
    });
  }
});

// Audit logs
router.get('/audit-logs', authMiddleware, roleMiddleware([UserRole.DIRECTOR]), async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '50', userId, action } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = {};
    if (userId) where.userId = userId;
    if (action) where.action = action;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        orderBy: { timestamp: 'desc' },
        include: {
          user: {
            select: {
              fullName: true,
              email: true,
              role: true
            }
          }
        }
      }),
      prisma.auditLog.count({ where })
    ]);

    return res.json({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string))
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve audit logs' }
    });
  }
});

// Director analytics endpoint with charts data (temporarily without auth for testing)
router.get('/director', async (req: any, res: Response) => {
  try {
    // Get current date and 30 days ago
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Summary statistics
    const [totalApplications, approvedCount, rejectedCount, pendingCount, activeCount, allApplications] = await Promise.all([
      prisma.application.count(),
      prisma.application.count({ where: { status: ApplicationStatus.APPROVED } }),
      prisma.application.count({ where: { status: ApplicationStatus.REJECTED } }),
      prisma.application.count({ 
        where: { 
          status: { 
            in: [ApplicationStatus.SUBMITTED, ApplicationStatus.UNDER_REVIEW, ApplicationStatus.PENDING_DOCUMENTS] 
          } 
        } 
      }),
      prisma.application.count({ where: { status: ApplicationStatus.ACTIVE } }),
      prisma.application.findMany({
        include: {
          assignedOfficer: true
        }
      })
    ]);

    // Calculate approval rate
    const approvalRate = totalApplications > 0 
      ? Math.round((approvedCount / totalApplications) * 100) 
      : 0;

    // Calculate average processing time (in days)
    const processedApps = allApplications.filter(app => 
      app.status === ApplicationStatus.APPROVED || app.status === ApplicationStatus.REJECTED
    );
    const avgProcessingTime = processedApps.length > 0
      ? Math.round(
          processedApps.reduce((sum, app) => {
            const days = Math.floor((app.updatedAt.getTime() - app.createdAt.getTime()) / (1000 * 60 * 60 * 24));
            return sum + days;
          }, 0) / processedApps.length
        )
      : 0;

    // Applications per day (last 30 days)
    const applicationsPerDay = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const startOfDay = new Date(date.setHours(0, 0, 0, 0));
      const endOfDay = new Date(date.setHours(23, 59, 59, 999));
      
      const count = allApplications.filter(app => 
        app.createdAt >= startOfDay && app.createdAt <= endOfDay
      ).length;

      applicationsPerDay.push({
        date: startOfDay.toISOString().split('T')[0],
        applications: count
      });
    }

    // Status breakdown
    const statusBreakdown = {
      SUBMITTED: allApplications.filter(a => a.status === ApplicationStatus.SUBMITTED).length,
      UNDER_REVIEW: allApplications.filter(a => a.status === ApplicationStatus.UNDER_REVIEW).length,
      APPROVED: approvedCount,
      REJECTED: rejectedCount,
      ACTIVE: activeCount,
      COMPLETED: 0 // Not tracking completed status yet
    };

    // Get all officers
    const officers = await prisma.user.findMany({
      where: { role: UserRole.OFFICER }
    });

    // Officer performance
    const officerPerformance = officers.map(officer => {
      const assignedApps = allApplications.filter(app => app.assignedOfficerId === officer.id);
      const approvedApps = assignedApps.filter(app => app.status === ApplicationStatus.APPROVED);
      const rejectedApps = assignedApps.filter(app => app.status === ApplicationStatus.REJECTED);
      const pendingApps = assignedApps.filter(app => 
        app.status === ApplicationStatus.UNDER_REVIEW || 
        app.status === ApplicationStatus.SUBMITTED ||
        app.status === ApplicationStatus.PENDING_DOCUMENTS
      );

      return {
        id: officer.id,
        name: officer.fullName,
        assigned: assignedApps.length,
        approved: approvedApps.length,
        rejected: rejectedApps.length,
        pending: pendingApps.length
      };
    });

    return res.json({
      success: true,
      data: {
        summary: {
          total: totalApplications,
          approved: approvedCount,
          rejected: rejectedCount,
          pending: pendingCount,
          active: activeCount,
          approvalRate,
          avgProcessingTime
        },
        applicationsPerDay,
        statusBreakdown,
        officerPerformance
      }
    });
  } catch (error) {
    console.error('Director analytics error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve director analytics' }
    });
  }
});

// Enhanced Director analytics endpoint for professional dashboard
router.get('/director-pro', async (req: any, res: Response) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Get all applications with related data
    const allApplications = await prisma.application.findMany({
      include: {
        assignedOfficer: true
      }
    });

    // Summary statistics
    const totalApplications = allApplications.length;
    const approvedCount = allApplications.filter(a => a.status === ApplicationStatus.APPROVED).length;
    const rejectedCount = allApplications.filter(a => a.status === ApplicationStatus.REJECTED).length;
    const pendingCount = allApplications.filter(a => 
      a.status === ApplicationStatus.SUBMITTED || a.status === ApplicationStatus.UNDER_REVIEW || a.status === ApplicationStatus.PENDING_DOCUMENTS
    ).length;
    const activeCount = allApplications.filter(a => a.status === ApplicationStatus.ACTIVE).length;

    const approvalRate = totalApplications > 0 ? Math.round((approvedCount / totalApplications) * 100) : 0;

    // Average processing time
    const processedApps = allApplications.filter(app => 
      app.status === ApplicationStatus.APPROVED || app.status === ApplicationStatus.REJECTED
    );
    const avgProcessingTime = processedApps.length > 0
      ? Math.round(
          processedApps.reduce((sum, app) => {
            const days = Math.floor((app.updatedAt.getTime() - app.createdAt.getTime()) / (1000 * 60 * 60 * 24));
            return sum + days;
          }, 0) / processedApps.length
        )
      : 0;

    // Applications over last 90 days (daily)
    const applicationsPerDay = [];
    for (let i = 89; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const startOfDay = new Date(date.setHours(0, 0, 0, 0));
      const endOfDay = new Date(date.setHours(23, 59, 59, 999));
      
      const count = allApplications.filter(app => 
        app.createdAt >= startOfDay && app.createdAt <= endOfDay
      ).length;

      applicationsPerDay.push({
        date: startOfDay.toISOString().split('T')[0],
        applications: count
      });
    }

    // Status breakdown
    const statusBreakdown = {
      SUBMITTED: allApplications.filter(a => a.status === ApplicationStatus.SUBMITTED).length,
      UNDER_REVIEW: allApplications.filter(a => a.status === ApplicationStatus.UNDER_REVIEW).length,
      APPROVED: approvedCount,
      REJECTED: rejectedCount,
      ACTIVE: activeCount,
      COMPLETED: 0
    };

    // Demographics (mock data for now - add gender field to schema later)
    const maleCount = Math.floor(totalApplications * 0.6);
    const femaleCount = totalApplications - maleCount;

    // Age groups
    const ageGroups = { '18-25': 0, '26-35': 0, '36-45': 0, '46-55': 0, '56+': 0 };
    allApplications.forEach(app => {
      const age = Math.floor((now.getTime() - new Date(app.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      if (age >= 18 && age <= 25) ageGroups['18-25']++;
      else if (age >= 26 && age <= 35) ageGroups['26-35']++;
      else if (age >= 36 && age <= 45) ageGroups['36-45']++;
      else if (age >= 46 && age <= 55) ageGroups['46-55']++;
      else if (age >= 56) ageGroups['56+']++;
    });

    // Nationality breakdown
    const nationalityCounts: Record<string, number> = {};
    allApplications.forEach(app => {
      nationalityCounts[app.nationality] = (nationalityCounts[app.nationality] || 0) + 1;
    });
    const nationalities = Object.entries(nationalityCounts)
      .map(([country, count]) => ({
        country,
        count,
        percentage: Math.round((count / totalApplications) * 100)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Occupation breakdown
    const occupationCounts: Record<string, number> = {};
    allApplications.forEach(app => {
      if (app.occupation) {
        occupationCounts[app.occupation] = (occupationCounts[app.occupation] || 0) + 1;
      }
    });
    const occupationStats = Object.entries(occupationCounts)
      .map(([occupation, count]) => ({
        occupation,
        count,
        percentage: Math.round((count / totalApplications) * 100)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Education level breakdown
    const educationCounts: Record<string, number> = {};
    allApplications.forEach(app => {
      if (app.educationLevel) {
        educationCounts[app.educationLevel] = (educationCounts[app.educationLevel] || 0) + 1;
      }
    });
    const educationStats = Object.entries(educationCounts)
      .map(([level, count]) => ({
        level,
        count,
        percentage: Math.round((count / totalApplications) * 100)
      }))
      .sort((a, b) => b.count - a.count);

    // Income range breakdown
    const incomeCounts: Record<string, number> = {};
    allApplications.forEach(app => {
      if (app.monthlyIncome) {
        incomeCounts[app.monthlyIncome] = (incomeCounts[app.monthlyIncome] || 0) + 1;
      }
    });
    const incomeStats = Object.entries(incomeCounts)
      .map(([range, count]) => ({
        range,
        count,
        percentage: Math.round((count / totalApplications) * 100)
      }))
      .sort((a, b) => b.count - a.count);

    // Economic Impact Analysis
    const applicationsWithEconomicData = allApplications.filter(app =>
      app.dailySpending !== null && app.dailySpending !== undefined &&
      app.estimatedStayDuration !== null && app.estimatedStayDuration !== undefined &&
      app.dailySpending > 0 && app.estimatedStayDuration > 0
    );

    const totalEconomicImpact = applicationsWithEconomicData.reduce((sum, app) => {
      return sum + (app.dailySpending! * app.estimatedStayDuration!);
    }, 0);

    const avgDailySpending = applicationsWithEconomicData.length > 0
      ? Math.round(applicationsWithEconomicData.reduce((sum, app) => sum + app.dailySpending!, 0) / applicationsWithEconomicData.length)
      : 0;

    // Accommodation type breakdown
    const accommodationCounts: Record<string, number> = {};
    allApplications.forEach(app => {
      if (app.accommodationType) {
        accommodationCounts[app.accommodationType] = (accommodationCounts[app.accommodationType] || 0) + 1;
      }
    });
    const accommodationStats = Object.entries(accommodationCounts)
      .map(([type, count]) => ({
        type,
        count,
        percentage: Math.round((count / totalApplications) * 100)
      }))
      .sort((a, b) => b.count - a.count);

    // Spending by purpose
    const spendingByPurposeData: Record<string, { total: number, applications: number }> = {};
    applicationsWithEconomicData.forEach(app => {
      const purpose = app.visitPurpose;
      if (!spendingByPurposeData[purpose]) {
        spendingByPurposeData[purpose] = { total: 0, applications: 0 };
      }
      spendingByPurposeData[purpose].total += app.dailySpending! * app.estimatedStayDuration!;
      spendingByPurposeData[purpose].applications += 1;
    });
    const spendingByPurpose = Object.entries(spendingByPurposeData)
      .map(([purpose, data]) => ({
        purpose,
        totalSpending: data.total,
        avgSpendingPerApplication: Math.round(data.total / data.applications),
        applications: data.applications
      }))
      .sort((a, b) => b.totalSpending - a.totalSpending);

    // Geographic data (mock - replace with real data when available)
    const governorates = ['Erbil', 'Duhok', 'Sulaymaniyah', 'Halabja', 'Baghdad', 'Basra', 'Mosul', 'Kirkuk'];
    const originGovernorates = governorates.map(gov => ({
      name: gov,
      count: Math.floor(Math.random() * 200) + 50,
      percentage: 0
    }));
    const totalOrigin = originGovernorates.reduce((sum, g) => sum + g.count, 0);
    originGovernorates.forEach(g => g.percentage = Math.round((g.count / totalOrigin) * 100));

    // Visit purposes (mock - replace with real field)
    const purposes = {
      TOURISM: Math.floor(totalApplications * 0.35),
      BUSINESS: Math.floor(totalApplications * 0.25),
      FAMILY: Math.floor(totalApplications * 0.20),
      MEDICAL: Math.floor(totalApplications * 0.10),
      EDUCATION: Math.floor(totalApplications * 0.07),
      OTHER: Math.floor(totalApplications * 0.03)
    };

    // Officer performance
    const officers = await prisma.user.findMany({
      where: { role: UserRole.OFFICER }
    });

    const officerPerformance = officers.map(officer => {
      const assignedApps = allApplications.filter(app => app.assignedOfficerId === officer.id);
      const approvedApps = assignedApps.filter(app => app.status === ApplicationStatus.APPROVED);
      const rejectedApps = assignedApps.filter(app => app.status === ApplicationStatus.REJECTED);
      const pendingApps = assignedApps.filter(app => 
        app.status === ApplicationStatus.UNDER_REVIEW || app.status === ApplicationStatus.SUBMITTED || app.status === ApplicationStatus.PENDING_DOCUMENTS
      );

      return {
        id: officer.id,
        name: officer.fullName,
        assigned: assignedApps.length,
        approved: approvedApps.length,
        rejected: rejectedApps.length,
        pending: pendingApps.length,
        efficiency: assignedApps.length > 0 ? Math.round((approvedApps.length / assignedApps.length) * 100) : 0
      };
    }).sort((a, b) => b.efficiency - a.efficiency);

    // Recent activity (last 20 applications)
    const recentActivity = allApplications
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, 20)
      .map(app => ({
        id: app.id,
        applicant: app.fullName,
        action: app.status,
        timestamp: app.updatedAt.toISOString(),
        officer: app.assignedOfficer?.fullName || 'Unassigned',
        status: app.status
      }));

    return res.json({
      success: true,
      data: {
        summary: {
          total: totalApplications,
          approved: approvedCount,
          rejected: rejectedCount,
          pending: pendingCount,
          active: activeCount,
          approvalRate,
          avgProcessingTime,
          last30Days: allApplications.filter(a => a.createdAt >= thirtyDaysAgo).length,
          trend: 'up' // Calculate actual trend later
        },
        applicationsPerDay,
        statusBreakdown,
        demographics: {
          gender: { male: maleCount, female: femaleCount },
          ageGroups,
          nationalities,
          occupations: occupationStats,
          educationLevels: educationStats,
          incomeRanges: incomeStats
        },
        geographic: {
          originGovernorates: originGovernorates.slice(0, 10)
        },
        economic: {
          totalEconomicImpact: totalEconomicImpact,
          averageDailySpending: avgDailySpending,
          accommodationTypes: accommodationStats,
          spendingByPurpose: spendingByPurpose
        },
        purposes,
        officerPerformance,
        recentActivity
      }
    });
  } catch (error) {
    console.error('Enhanced director analytics error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve analytics' }
    });
  }
});

/**
 * GET /api/analytics/supervisor
 * Enhanced supervisor analytics with officer workload and real-time data
 */
router.get('/supervisor', async (req, res) => {
  try {
    const allApplications = await prisma.application.findMany({
      include: {
        assignedOfficer: {
          select: { id: true, fullName: true, email: true }
        }
      }
    });

    // Get all active officers
    const officers = await prisma.user.findMany({
      where: {
        role: 'OFFICER',
        isActive: true
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        lastLogin: true
      }
    });

    // Calculate workload per officer
    const officerWorkload = officers.map(officer => {
      const assignedApps = allApplications.filter(app => app.assignedOfficerId === officer.id);
      const pending = assignedApps.filter(app => 
        ['SUBMITTED', 'UNDER_REVIEW'].includes(app.status)
      ).length;
      const approved = assignedApps.filter(app => app.status === 'APPROVED').length;
      const rejected = assignedApps.filter(app => app.status === 'REJECTED').length;

      // Calculate avg processing time
      const processedApps = assignedApps.filter(app => 
        app.approvalDate || app.rejectionDate
      );
      const totalProcessingTime = processedApps.reduce((sum, app) => {
        const endDate = app.approvalDate || app.rejectionDate;
        if (!endDate) return sum;
        return sum + (endDate.getTime() - new Date(app.createdAt).getTime());
      }, 0);
      const avgProcessingHours = processedApps.length > 0
        ? Math.round(totalProcessingTime / processedApps.length / (1000 * 60 * 60))
        : 0;

      return {
        officer: {
          id: officer.id,
          name: officer.fullName,
          email: officer.email,
          lastLogin: officer.lastLogin
        },
        stats: {
          total: assignedApps.length,
          pending,
          approved,
          rejected,
          avgProcessingHours,
          efficiency: assignedApps.length > 0
            ? Math.round((approved / assignedApps.length) * 100)
            : 0
        }
      };
    });

    // Status breakdown
    const statusCounts: Record<string, number> = {
      SUBMITTED: 0,
      UNDER_REVIEW: 0,
      APPROVED: 0,
      REJECTED: 0,
      ACTIVE: 0,
      PENDING_DOCUMENTS: 0
    };

    allApplications.forEach(app => {
      if (statusCounts[app.status] !== undefined) {
        statusCounts[app.status]++;
      }
    });

    // Recent assignments (last 20)
    const recentAssignments = allApplications
      .filter(app => app.assignedOfficerId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 20)
      .map(app => ({
        id: app.id,
        referenceNumber: app.referenceNumber,
        applicant: app.fullName,
        officer: app.assignedOfficer?.fullName || 'Unknown',
        status: app.status,
        assignedAt: app.updatedAt,
        createdAt: app.createdAt
      }));

    // Unassigned applications
    const unassignedCount = allApplications.filter(app => !app.assignedOfficerId).length;

    // Check watchlist matches
    const watchlistEntries = await prisma.internalWatchlist.findMany({
      where: { isActive: true }
    });

    const watchlistMatches = allApplications.filter(app =>
      watchlistEntries.some(entry => entry.nationalId === app.nationalId)
    ).length;

    return res.json({
      success: true,
      data: {
        summary: {
          totalApplications: allApplications.length,
          unassignedApplications: unassignedCount,
          totalOfficers: officers.length,
          watchlistMatches,
          statusBreakdown: statusCounts
        },
        officerWorkload,
        recentAssignments,
        activeOfficers: officers.filter(o => 
          o.lastLogin && 
          (new Date().getTime() - new Date(o.lastLogin).getTime()) < 24 * 60 * 60 * 1000
        ).length
      }
    });
  } catch (error) {
    console.error('Supervisor analytics error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve supervisor analytics' }
    });
  }
});

export default router;
