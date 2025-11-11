import express from 'express';
import { prisma } from '@krg-evisit/database';

const router = express.Router();

// Auto-assignment configuration (in production, store in database)
let autoAssignConfig = {
  enabled: false,
  algorithm: 'round-robin' as 'round-robin' | 'load-balanced' | 'skill-based',
  maxApplicationsPerOfficer: 10,
};

// GET current auto-assign configuration
router.get('/config', async (req, res) => {
  try {
    res.json({
      success: true,
      data: autoAssignConfig,
    });
  } catch (error) {
    console.error('Error fetching auto-assign config:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch configuration' },
    });
  }
});

// UPDATE auto-assign configuration
router.put('/config', async (req, res) => {
  try {
    const { enabled, algorithm, maxApplicationsPerOfficer } = req.body;

    if (enabled !== undefined) autoAssignConfig.enabled = enabled;
    if (algorithm) autoAssignConfig.algorithm = algorithm;
    if (maxApplicationsPerOfficer) autoAssignConfig.maxApplicationsPerOfficer = maxApplicationsPerOfficer;

    res.json({
      success: true,
      data: autoAssignConfig,
      message: 'Configuration updated successfully',
    });
  } catch (error) {
    console.error('Error updating auto-assign config:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to update configuration' },
    });
  }
});

// Round-robin assignment
async function assignRoundRobin(applicationId: string): Promise<string | null> {
  // Get all active officers
  const officers = await prisma.user.findMany({
    where: { role: 'OFFICER' },
    select: { id: true },
  });

  if (officers.length === 0) return null;

  // Get assignment counts for each officer
  const assignmentCounts = await Promise.all(
    officers.map(async (officer) => ({
      officerId: officer.id,
      count: await prisma.application.count({
        where: {
          assignedOfficerId: officer.id,
          status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'PENDING_DOCUMENTS'] },
        },
      }),
    }))
  );

  // Filter officers who haven't reached max capacity
  const availableOfficers = assignmentCounts.filter(
    (o) => o.count < autoAssignConfig.maxApplicationsPerOfficer
  );

  if (availableOfficers.length === 0) return null;

  // Find officer with least assignments
  const selectedOfficer = availableOfficers.reduce((min, officer) =>
    officer.count < min.count ? officer : min
  );

  return selectedOfficer.officerId;
}

// Load-balanced assignment (assign to least busy officer)
async function assignLoadBalanced(applicationId: string): Promise<string | null> {
  const officers = await prisma.user.findMany({
    where: { role: 'OFFICER' },
    include: {
      assignedApplications: {
        where: {
          status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'PENDING_DOCUMENTS'] },
        },
      },
    },
  });

  if (officers.length === 0) return null;

  // Calculate workload for each officer
  const officerWorkloads = officers.map((officer) => ({
    id: officer.id,
    activeCount: officer.assignedApplications.length,
  }));

  // Filter officers under max capacity
  const availableOfficers = officerWorkloads.filter(
    (o) => o.activeCount < autoAssignConfig.maxApplicationsPerOfficer
  );

  if (availableOfficers.length === 0) return null;

  // Find officer with minimum active applications
  const selectedOfficer = availableOfficers.reduce((min, officer) =>
    officer.activeCount < min.activeCount ? officer : min
  );

  return selectedOfficer.id;
}

// Skill-based assignment (match officer expertise to application purpose)
async function assignSkillBased(applicationId: string): Promise<string | null> {
  // Get application details
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    select: { visitPurpose: true },
  });

  if (!application) return null;

  // Define officer specializations (in production, store in database)
  const specializations: Record<string, string[]> = {
    TOURISM: ['Tourism', 'Travel', 'Leisure'],
    BUSINESS: ['Business', 'Investment', 'Trade'],
    WORK: ['Employment', 'Work', 'Labor'],
    STUDY: ['Education', 'Academic', 'Student'],
    FAMILY_VISIT: ['Family', 'Visit', 'Reunion'],
    MEDICAL: ['Medical', 'Healthcare', 'Treatment'],
    CONFERENCE: ['Conference', 'Event', 'Seminar'],
    TRANSIT: ['Transit', 'Connection', 'Stopover'],
  };

  // Get officers and their workloads
  const officers = await prisma.user.findMany({
    where: { role: 'OFFICER' },
    include: {
      assignedApplications: {
        where: {
          status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'PENDING_DOCUMENTS'] },
        },
      },
    },
  });

  if (officers.length === 0) return null;

  // Filter available officers
  const availableOfficers = officers.filter(
    (o) => o.assignedApplications.length < autoAssignConfig.maxApplicationsPerOfficer
  );

  if (availableOfficers.length === 0) return null;

  // For now, fall back to load-balanced if no specialization match
  // In production, implement proper skill matching
  const selectedOfficer = availableOfficers.reduce((min, officer) =>
    officer.assignedApplications.length < min.assignedApplications.length ? officer : min
  );

  return selectedOfficer.id;
}

// POST - Manually trigger auto-assignment for unassigned applications
router.post('/trigger', async (req, res) => {
  try {
    if (!autoAssignConfig.enabled) {
      return res.status(400).json({
        success: false,
        error: { message: 'Auto-assignment is not enabled' },
      });
    }

    // Get all unassigned submitted applications
    const unassignedApplications = await prisma.application.findMany({
      where: {
        status: 'SUBMITTED',
        assignedOfficerId: null,
      },
      select: { id: true },
    });

    if (unassignedApplications.length === 0) {
      return res.json({
        success: true,
        data: { assigned: 0, message: 'No unassigned applications found' },
      });
    }

    let assignedCount = 0;
    const errors: string[] = [];

    // Assign each application based on selected algorithm
    for (const app of unassignedApplications) {
      try {
        let selectedOfficerId: string | null = null;

        switch (autoAssignConfig.algorithm) {
          case 'round-robin':
            selectedOfficerId = await assignRoundRobin(app.id);
            break;
          case 'load-balanced':
            selectedOfficerId = await assignLoadBalanced(app.id);
            break;
          case 'skill-based':
            selectedOfficerId = await assignSkillBased(app.id);
            break;
        }

        if (selectedOfficerId) {
          // Assign officer and update application status
          await prisma.application.update({
            where: { id: app.id },
            data: { 
              assignedOfficerId: selectedOfficerId,
              status: 'UNDER_REVIEW' 
            },
          });

          assignedCount++;
        } else {
          errors.push(`No available officer for application ${app.id}`);
        }
      } catch (error) {
        console.error(`Error assigning application ${app.id}:`, error);
        errors.push(`Failed to assign application ${app.id}`);
      }
    }

    res.json({
      success: true,
      data: {
        assigned: assignedCount,
        total: unassignedApplications.length,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error) {
    console.error('Error triggering auto-assignment:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to trigger auto-assignment' },
    });
  }
});

// POST - Auto-assign a specific application
router.post('/assign/:applicationId', async (req, res) => {
  try {
    const { applicationId } = req.params;

    if (!autoAssignConfig.enabled) {
      return res.status(400).json({
        success: false,
        error: { message: 'Auto-assignment is not enabled' },
      });
    }

    // Check if application exists and is unassigned
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      select: { 
        id: true, 
        assignedOfficerId: true, 
        status: true 
      },
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        error: { message: 'Application not found' },
      });
    }

    if (application.assignedOfficerId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Application is already assigned' },
      });
    }

    // Select officer based on algorithm
    let selectedOfficerId: string | null = null;

    switch (autoAssignConfig.algorithm) {
      case 'round-robin':
        selectedOfficerId = await assignRoundRobin(applicationId);
        break;
      case 'load-balanced':
        selectedOfficerId = await assignLoadBalanced(applicationId);
        break;
      case 'skill-based':
        selectedOfficerId = await assignSkillBased(applicationId);
        break;
    }

    if (!selectedOfficerId) {
      return res.status(503).json({
        success: false,
        error: { message: 'No available officers at this time' },
      });
    }

    // Get officer details
    const officer = await prisma.user.findUnique({
      where: { id: selectedOfficerId },
      select: { id: true, fullName: true, email: true },
    });

    // Assign officer and update application status
    await prisma.application.update({
      where: { id: applicationId },
      data: { 
        assignedOfficerId: selectedOfficerId,
        status: 'UNDER_REVIEW' 
      },
    });

    res.json({
      success: true,
      data: {
        applicationId,
        officer,
        message: `Application assigned to ${officer?.fullName}`,
      },
    });
  } catch (error) {
    console.error('Error auto-assigning application:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to auto-assign application' },
    });
  }
});

export default router;
