import { Router, Request, Response } from 'express';
import { prisma } from '@krg-evisit/database';

const router = Router();

/**
 * POST /api/assignments/auto-assign
 * Automatically assign an application to an officer using load balancing
 */
router.post('/auto-assign', async (req: Request, res: Response): Promise<void> => {
  try {
    const { applicationId } = req.body;

    if (!applicationId) {
      res.status(400).json({
        success: false,
        error: { message: 'Application ID is required' }
      });
      return;
    }

    // Get the application
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      select: { priorityLevel: true, status: true }
    });

    if (!application) {
      res.status(404).json({
        success: false,
        error: { message: 'Application not found' }
      });
      return;
    }

    if (application.status !== 'SUBMITTED') {
      res.status(400).json({
        success: false,
        error: { message: 'Application is not in SUBMITTED status' }
      });
      return;
    }

    // Get all active officers
    const officers = await prisma.user.findMany({
      where: {
        role: 'OFFICER',
        isActive: true
      },
      select: {
        id: true,
        fullName: true,
        _count: {
          select: {
            assignedApplications: {
              where: {
                status: {
                  in: ['SUBMITTED', 'UNDER_REVIEW']
                }
              }
            }
          }
        }
      }
    });

    if (officers.length === 0) {
      res.status(500).json({
        success: false,
        error: { message: 'No active officers available' }
      });
      return;
    }

    // Find officer with lowest workload (load balancing)
    const officerWithLowestLoad = officers.reduce((prev, current) => {
      return (current._count.assignedApplications < prev._count.assignedApplications) ? current : prev;
    });

    // Assign application to officer
    const updatedApplication = await prisma.application.update({
      where: { id: applicationId },
      data: {
        assignedToId: officerWithLowestLoad.id,
        status: 'UNDER_REVIEW'
      },
      include: {
        assignedTo: {
          select: {
            fullName: true,
            email: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: {
        application: updatedApplication,
        assignedOfficer: {
          id: officerWithLowestLoad.id,
          name: officerWithLowestLoad.fullName,
          currentWorkload: officerWithLowestLoad._count.assignedApplications
        }
      }
    });
  } catch (error: any) {
    console.error('Auto-assign error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to auto-assign application' }
    });
  }
});

/**
 * POST /api/assignments/reassign
 * Manually reassign an application to a different officer
 */
router.post('/reassign', async (req: Request, res: Response): Promise<void> => {
  try {
    const { applicationId, officerId, reason } = req.body;

    if (!applicationId || !officerId) {
      res.status(400).json({
        success: false,
        error: { message: 'Application ID and Officer ID are required' }
      });
      return;
    }

    // Verify officer exists and is active
    const officer = await prisma.user.findFirst({
      where: {
        id: officerId,
        role: 'OFFICER',
        isActive: true
      }
    });

    if (!officer) {
      res.status(404).json({
        success: false,
        error: { message: 'Officer not found or inactive' }
      });
      return;
    }

    // Reassign application
    const updatedApplication = await prisma.application.update({
      where: { id: applicationId },
      data: {
        assignedToId: officerId,
        status: 'UNDER_REVIEW'
      },
      include: {
        assignedTo: {
          select: {
            fullName: true,
            email: true
          }
        }
      }
    });

    // Create audit log for reassignment
    await prisma.auditLog.create({
      data: {
        userId: officerId,
        action: 'REASSIGN_APPLICATION',
        details: reason || 'Application reassigned'
      }
    });

    res.json({
      success: true,
      data: updatedApplication
    });
  } catch (error: any) {
    console.error('Reassign error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to reassign application' }
    });
  }
});

/**
 * GET /api/assignments/workload
 * Get current workload for all officers
 */
router.get('/workload', async (req: Request, res: Response): Promise<void> => {
  try {
    const officers = await prisma.user.findMany({
      where: {
        role: 'OFFICER',
        isActive: true
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        _count: {
          select: {
            assignedApplications: {
              where: {
                status: {
                  in: ['SUBMITTED', 'UNDER_REVIEW']
                }
              }
            }
          }
        },
        assignedApplications: {
          where: {
            status: {
              in: ['SUBMITTED', 'UNDER_REVIEW']
            }
          },
          select: {
            id: true,
            referenceNumber: true,
            priorityLevel: true,
            status: true
          },
          take: 5 // Only show first 5 for preview
        }
      }
    });

    const workload = officers.map(officer => ({
      officerId: officer.id,
      officerName: officer.fullName,
      email: officer.email,
      pendingCount: officer._count.assignedApplications,
      recentApplications: officer.assignedApplications
    }));

    res.json({
      success: true,
      data: workload
    });
  } catch (error: any) {
    console.error('Get workload error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch workload data' }
    });
  }
});

/**
 * POST /api/assignments/batch-assign
 * Auto-assign multiple applications at once
 */
router.post('/batch-assign', async (req: Request, res: Response): Promise<void> => {
  try {
    // Get all unassigned applications
    const unassignedApplications = await prisma.application.findMany({
      where: {
        status: 'SUBMITTED',
        assignedToId: null
      },
      orderBy: [
        { priorityLevel: 'desc' }, // URGENT first
        { createdAt: 'asc' } // Oldest first
      ]
    });

    if (unassignedApplications.length === 0) {
      res.json({
        success: true,
        data: {
          assigned: 0,
          message: 'No unassigned applications found'
        }
      });
      return;
    }

    // Get all active officers
    const officers = await prisma.user.findMany({
      where: {
        role: 'OFFICER',
        isActive: true
      },
      select: {
        id: true
      }
    });

    if (officers.length === 0) {
      res.status(500).json({
        success: false,
        error: { message: 'No active officers available' }
      });
      return;
    }

    // Round-robin assignment
    let officerIndex = 0;
    const assignments = [];

    for (const app of unassignedApplications) {
      const officer = officers[officerIndex];
      
      await prisma.application.update({
        where: { id: app.id },
        data: {
          assignedToId: officer.id,
          status: 'UNDER_REVIEW'
        }
      });

      assignments.push({
        applicationId: app.id,
        officerId: officer.id
      });

      // Move to next officer (round-robin)
      officerIndex = (officerIndex + 1) % officers.length;
    }

    res.json({
      success: true,
      data: {
        assigned: assignments.length,
        assignments
      }
    });
  } catch (error: any) {
    console.error('Batch assign error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to batch assign applications' }
    });
  }
});

export default router;
