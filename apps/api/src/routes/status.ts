import { Router, Request, Response } from 'express';
import { prisma } from '@krg-evisit/database';

const router = Router();

/**
 * GET /api/status/:referenceNumber
 * Get application status by reference number (public endpoint for tracking)
 */
router.get('/:referenceNumber', async (req: Request, res: Response): Promise<void> => {
  try {
    const { referenceNumber } = req.params;

    const application = await prisma.application.findUnique({
      where: { referenceNumber },
      select: {
        id: true,
        referenceNumber: true,
        fullName: true,
        motherFullName: true,
        nationality: true,
        nationalId: true,
        dateOfBirth: true,
        status: true,
        visitPurpose: true,
        visitStartDate: true,
        visitEndDate: true,
        destinationGovernorate: true,
        createdAt: true,
        approvalDate: true,
        rejectionDate: true,
        permitExpiryDate: true,
        qrCode: true,
        documents: {
          where: {
            documentType: 'VISITOR_PHOTO'
          },
          select: {
            fileUrl: true
          },
          take: 1
        }
      }
    });

    if (!application) {
      res.status(404).json({
        success: false,
        error: { message: 'Application not found' }
      });
      return;
    }

    // Extract photo URL from documents
    const photoUrl = (application as any).documents && (application as any).documents.length > 0 
      ? (application as any).documents[0].fileUrl 
      : undefined;

    // Remove documents from response and add photoUrl
    const { documents, ...applicationData } = application as any;

    res.json({ 
      success: true, 
      data: {
        ...applicationData,
        photoUrl
      }
    });
  } catch (error: any) {
    console.error('Get application error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error message:', error.message);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch application', details: error.message }
    });
  }
});

/**
 * PATCH /api/status/:id/submit-to-review
 * Transition: SUBMITTED → UNDER_REVIEW
 */
router.patch('/:id/submit-to-review', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const application = await prisma.application.update({
      where: { id, status: 'SUBMITTED' },
      data: { status: 'UNDER_REVIEW' }
    });

    res.json({ success: true, data: application });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { message: 'Failed to update status' }
    });
  }
});

/**
 * PATCH /api/status/:id/activate
 * Transition: APPROVED → ACTIVE (when visitor enters KRG)
 */
router.patch('/:id/activate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const application = await prisma.application.update({
      where: { id, status: 'APPROVED' },
      data: { status: 'ACTIVE' }
    });

    res.json({ success: true, data: application });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { message: 'Failed to activate permit' }
    });
  }
});

/**
 * PATCH /api/status/:id/exit
 * Transition: ACTIVE → EXITED (when visitor leaves KRG)
 */
router.patch('/:id/exit', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const application = await prisma.application.update({
      where: { id, status: 'ACTIVE' },
      data: { status: 'EXITED' }
    });

    res.json({ success: true, data: application });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { message: 'Failed to mark as exited' }
    });
  }
});

/**
 * PATCH /api/status/:id/expire
 * Mark permit as expired (manual or automated)
 */
router.patch('/:id/expire', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const application = await prisma.application.update({
      where: { id },
      data: { status: 'EXPIRED' }
    });

    res.json({ success: true, data: application });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { message: 'Failed to expire permit' }
    });
  }
});

/**
 * POST /api/status/detect-expired
 * Automated job to detect and mark expired permits
 */
router.post('/detect-expired', async (req: Request, res: Response): Promise<void> => {
  try {
    const now = new Date();

    // Find all active permits that have passed their expiry date
    const expiredPermits = await prisma.application.updateMany({
      where: {
        status: 'ACTIVE',
        permitExpiryDate: {
          lt: now
        }
      },
      data: {
        status: 'EXPIRED'
      }
    });

    res.json({
      success: true,
      data: {
        expired: expiredPermits.count,
        message: `${expiredPermits.count} permits marked as expired`
      }
    });
  } catch (error: any) {
    console.error('Detect expired error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to detect expired permits' }
    });
  }
});

/**
 * POST /api/status/detect-overstays
 * Automated job to detect overstays
 */
router.post('/detect-overstays', async (req: Request, res: Response): Promise<void> => {
  try {
    const now = new Date();

    // Find applications that are still active but visit end date has passed
    const overstays = await prisma.application.findMany({
      where: {
        status: 'ACTIVE',
        visitEndDate: {
          lt: now
        }
      }
    });

    // Update each overstay with calculated days
    const updates = await Promise.all(
      overstays.map(async (app) => {
        const daysOverstayed = Math.floor(
          (now.getTime() - new Date(app.visitEndDate).getTime()) / (1000 * 60 * 60 * 24)
        );

        return prisma.application.update({
          where: { id: app.id },
          data: {
            status: 'OVERSTAYED',
            overstayDays: daysOverstayed
          }
        });
      })
    );

    res.json({
      success: true,
      data: {
        overstays: updates.length,
        message: `${updates.length} permits marked as overstayed`
      }
    });
  } catch (error: any) {
    console.error('Detect overstays error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to detect overstays' }
    });
  }
});

/**
 * GET /api/status/lifecycle/:id
 * Get complete status history/lifecycle for an application
 */
router.get('/lifecycle/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const application = await prisma.application.findUnique({
      where: { id },
      select: {
        id: true,
        referenceNumber: true,
        status: true,
        createdAt: true,
        approvalDate: true,
        rejectionDate: true,
        permitExpiryDate: true,
        entryExitLogs: {
          orderBy: { recordedAt: 'desc' },
          select: {
            logType: true,
            checkpointName: true,
            checkpointLocation: true,
            recordedAt: true
          }
        }
      }
    });

    if (!application) {
      res.status(404).json({
        success: false,
        error: { message: 'Application not found' }
      });
      return;
    }

    // Build timeline
    const timeline = [
      {
        status: 'SUBMITTED',
        timestamp: application.createdAt,
        description: 'Application submitted'
      }
    ];

    if (application.approvalDate) {
      timeline.push({
        status: 'APPROVED',
        timestamp: application.approvalDate,
        description: 'Application approved'
      });
    }

    if (application.rejectionDate) {
      timeline.push({
        status: 'REJECTED',
        timestamp: application.rejectionDate,
        description: 'Application rejected'
      });
    }

    // Add entry/exit logs
    application.entryExitLogs.forEach(log => {
      timeline.push({
        status: log.logType === 'ENTRY' ? 'ACTIVE' : 'EXITED',
        timestamp: log.recordedAt,
        description: `${log.logType} at ${log.checkpointName}`
      });
    });

    // Sort by timestamp
    timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    res.json({
      success: true,
      data: {
        application: {
          id: application.id,
          referenceNumber: application.referenceNumber,
          currentStatus: application.status
        },
        timeline
      }
    });
  } catch (error: any) {
    console.error('Get lifecycle error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch lifecycle' }
    });
  }
});

export default router;
