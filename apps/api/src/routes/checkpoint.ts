import { Router, Request, Response } from 'express';
import { prisma } from '@krg-evisit/database';
import { ApplicationStatus } from '@krg-evisit/shared-types';
import { SMSService } from '../services/sms';
import { verifyQRCode } from '../services/qr';

const router = Router();

// Verify QR code and record entry/exit
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { qrPayload, checkpointName, logType } = req.body;

    // Verify QR signature
    const verificationResult = await verifyQRCode(qrPayload);

    if (!verificationResult.valid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_QR',
          message: verificationResult.error || 'Invalid QR code'
        }
      });
    }

    const { applicationId } = verificationResult;

    // Get application
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        entryExitLogs: {
          orderBy: { recordedAt: 'desc' },
          take: 1
        }
      }
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        error: { code: 'APPLICATION_NOT_FOUND', message: 'Application not found' }
      });
    }

    // Check if approved or active
    if (application.status !== 'APPROVED' && application.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'NOT_APPROVED',
          message: 'Application is not approved'
        }
      });
    }

    // Check permit expiry
    const now = new Date();
    if (application.permitExpiryDate && now > new Date(application.permitExpiryDate)) {
      return res.status(403).json({
        success: false,
        error: { code: 'PERMIT_EXPIRED', message: 'Permit has expired' }
      });
    }

    // Determine new status based on log type
    let newStatus = application.status;
    if (logType === 'ENTRY') {
      newStatus = 'ACTIVE';
    } else if (logType === 'EXIT') {
      newStatus = 'COMPLETED';
    }

    // Record entry/exit log
    const entryExitLog = await prisma.entryExitLog.create({
      data: {
        applicationId,
        checkpointName: checkpointName || 'Checkpoint',
        logType: logType,
        recordedAt: new Date()
      }
    });

    // Update application status
    const updatedApplication = await prisma.application.update({
      where: { id: applicationId },
      data: {
        status: newStatus,
        entryTimestamp: logType === 'ENTRY' ? new Date() : application.entryTimestamp,
        exitTimestamp: logType === 'EXIT' ? new Date() : application.exitTimestamp
      }
    });

    // Send SMS notification
    await SMSService.sendEntryRecorded(
      application.phoneNumber,
      application.fullName,
      checkpointName || 'Kurdistan Region'
    );

    return res.json({
      success: true,
      data: {
        application: {
          referenceNumber: updatedApplication.referenceNumber,
          fullName: updatedApplication.fullName,
          nationality: updatedApplication.nationality,
          visitPurpose: updatedApplication.visitPurpose,
          status: updatedApplication.status
        },
        entryExitLog,
        message: `${logType === 'ENTRY' ? 'Entry' : 'Exit'} recorded successfully`
      }
    });
  } catch (error) {
    console.error('Checkpoint verification error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to verify QR code' }
    });
  }
});

// Get checkpoint logs (for checkpoint officers)
router.get('/logs', async (req: Request, res: Response) => {
  try {
    const { checkpointName, page = '1', limit = '50' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where = checkpointName ? { checkpointName: checkpointName as string } : {};

    const [logs, total] = await Promise.all([
      prisma.entryExitLog.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        orderBy: { recordedAt: 'desc' },
        include: {
          application: {
            select: {
              referenceNumber: true,
              fullName: true,
              nationality: true,
              visitPurpose: true
            }
          }
        }
      }),
      prisma.entryExitLog.count({ where })
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
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve logs' }
    });
  }
});

export default router;
