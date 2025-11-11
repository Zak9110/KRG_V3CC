import { Router, Request, Response } from 'express';
import { prisma } from '@krg-evisit/database';
import { authMiddleware, roleMiddleware, AuthRequest } from '../middleware/auth';
import { ApplicationStatus, UserRole } from '@krg-evisit/shared-types';
import { generateQRCode } from '../services/qr';
import { sendEmail } from '../services/email';

const router = Router();

// Create new application (public)
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      fullName,
      motherFullName,
      gender,
      nationality,
      passportNumber,
      dateOfBirth,
      email,
      phoneNumber,
      visitPurpose,
      organizationName,
      contactPersonName,
      contactPersonPhone,
      intendedEntryDate,
      intendedExitDate,
      accommodationAddress,
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelation
    } = req.body;

    // Generate reference number
    const count = await prisma.application.count();
    const referenceNumber = `KRG-2025-${String(count + 1).padStart(6, '0')}`;

    const application = await prisma.application.create({
      data: {
        referenceNumber,
        fullName,
        motherFullName: motherFullName || null,
        gender: gender || 'MALE',
        nationalId: req.body.nationalId || '',
        phoneNumber,
        email,
        dateOfBirth: new Date(dateOfBirth),
        nationality: nationality || 'Iraq',
        originGovernorate: req.body.originGovernorate || '',
        destinationGovernorate: req.body.destinationGovernorate || '',
        visitPurpose,
        visitStartDate: new Date(req.body.visitStartDate),
        visitEndDate: new Date(req.body.visitEndDate),
        declaredAccommodation: req.body.declaredAccommodation,
        status: 'SUBMITTED'
      }
    });

    // Send confirmation email
    await sendEmail({
      to: email,
      subject: 'KRG e-Visit Application Received',
      html: `
        <h2>Application Received</h2>
        <p>Dear ${fullName},</p>
        <p>Your e-Visit application has been received successfully.</p>
        <p><strong>Reference Number:</strong> ${referenceNumber}</p>
        <p>You can track your application status using this reference number.</p>
        <p>Thank you for using KRG e-Visit System.</p>
      `
    });

    return res.status(201).json({ success: true, data: application });
  } catch (error) {
    console.error('Application creation error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to create application' }
    });
  }
});

// Get application by reference number for checkpoint (authenticated)
router.get('/checkpoint/:referenceNumber', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { referenceNumber } = req.params;

    const application = await prisma.application.findUnique({
      where: { referenceNumber },
      include: {
        documents: true,
        assignedOfficer: { select: { fullName: true, email: true } },
        approvedBy: { select: { fullName: true, email: true } },
        rejectedBy: { select: { fullName: true, email: true } },
        entryExitLogs: { orderBy: { recordedAt: 'desc' } }
      }
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Application not found' }
      });
    }

    return res.json({ success: true, data: application });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve application' }
    });
  }
});

// Get application by reference number (public)
router.get('/track/:referenceNumber', async (req: Request, res: Response) => {
  try {
    const { referenceNumber } = req.params;

    const application = await prisma.application.findUnique({
      where: { referenceNumber },
      select: {
        referenceNumber: true,
        fullName: true,
        status: true,
        createdAt: true,
        approvalDate: true,
        rejectionDate: true,
        rejectionReason: true,
        visitStartDate: true,
        visitEndDate: true,
        permitExpiryDate: true
      }
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Application not found' }
      });
    }

    return res.json({ success: true, data: application });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve application' }
    });
  }
});

// Get all applications (officer/supervisor/director)
router.get('/', authMiddleware, roleMiddleware([UserRole.OFFICER, UserRole.SUPERVISOR, UserRole.DIRECTOR]), async (req: AuthRequest, res: Response) => {
  try {
    const { status, page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where = status ? { status: status as ApplicationStatus } : {};

    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        orderBy: { createdAt: 'desc' },
        include: {
          assignedOfficer: { select: { fullName: true, email: true } },
          approvedBy: { select: { fullName: true } }
        }
      }),
      prisma.application.count({ where })
    ]);

    return res.json({
      success: true,
      data: applications,
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
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve applications' }
    });
  }
});

// Get single application (officer/supervisor/director)
router.get('/:id', authMiddleware, roleMiddleware([UserRole.OFFICER, UserRole.SUPERVISOR, UserRole.DIRECTOR]), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        documents: true,
        assignedOfficer: { select: { fullName: true, email: true } },
        approvedBy: { select: { fullName: true, email: true } },
        rejectedBy: { select: { fullName: true, email: true } },
        entryExitLogs: { orderBy: { recordedAt: 'desc' } }
      }
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Application not found' }
      });
    }

    return res.json({ success: true, data: application });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve application' }
    });
  }
});

// Assign application (supervisor)
router.patch('/:id/assign', authMiddleware, roleMiddleware([UserRole.SUPERVISOR]), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { officerId } = req.body;

    const application = await prisma.application.update({
      where: { id },
      data: {
        assignedOfficerId: officerId,
        status: 'ASSIGNED'
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'ASSIGN_APPLICATION',
        applicationId: id,
        details: JSON.stringify({ officerId })
      }
    });

    return res.json({ success: true, data: application });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to assign application' }
    });
  }
});

// Review application (officer)
router.patch('/:id/review', authMiddleware, roleMiddleware([UserRole.OFFICER]), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { recommendation, notes } = req.body;

    const application = await prisma.application.update({
      where: { id },
      data: {
        status: 'UNDER_REVIEW',
        approvalNotes: notes
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'REVIEW_APPLICATION',
        applicationId: id,
        details: JSON.stringify({ recommendation, notes })
      }
    });

    return res.json({ success: true, data: application });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to review application' }
    });
  }
});

// Approve application (officer/director)
router.patch('/:id/approve', authMiddleware, roleMiddleware([UserRole.OFFICER, UserRole.DIRECTOR]), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    // Generate QR code
    const qrData = await generateQRCode(id);

    const application = await prisma.application.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById: req.user!.id,
        approvalDate: new Date(),
        approvalNotes: notes,
        qrCode: qrData.qrCode,
        qrCodeSignature: qrData.signature,
        permitExpiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days validity
      },
      include: {
        assignedOfficer: { select: { fullName: true, email: true } },
        approvedBy: { select: { fullName: true } }
      }
    });

    // Send approval email with QR code
    if (application.email) {
      await sendEmail({
        to: application.email,
        subject: 'KRG e-Visit Application Approved',
        html: `
          <h2>Application Approved</h2>
          <p>Dear ${application.fullName},</p>
          <p>Your e-Visit application has been approved!</p>
          <p><strong>Reference Number:</strong> ${application.referenceNumber}</p>
          <p><strong>Visit Period:</strong> ${new Date(application.visitStartDate).toLocaleDateString()} - ${new Date(application.visitEndDate).toLocaleDateString()}</p>
          <p><strong>Permit Valid Until:</strong> ${new Date(application.permitExpiryDate!).toLocaleDateString()}</p>
          <p>Your digital residency card with QR code is available for download at: <a href="http://localhost:3000/en/track">Track Your Application</a></p>
          <p>Please present your QR code at checkpoints when entering the Kurdistan Region.</p>
          <img src="${qrData.qrCode}" alt="QR Code" style="max-width: 300px; margin: 20px 0;" />
          <p>Thank you for using KRG e-Visit System.</p>
        `
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        applicationId: id,
        action: 'APPROVE_APPLICATION',
        details: JSON.stringify({ 
          qrGenerated: true,
          permitExpiry: application.permitExpiryDate
        })
      }
    });

    return res.json({ success: true, data: application });
  } catch (error) {
    console.error('Approval error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to approve application' }
    });
  }
});

// Reject application (officer/director)
router.patch('/:id/reject', authMiddleware, roleMiddleware([UserRole.OFFICER, UserRole.DIRECTOR]), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const application = await prisma.application.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectedById: req.user!.id,
        rejectionDate: new Date(),
        rejectionReason: reason
      }
    });

    // Send rejection email
    if (application.email) {
      await sendEmail({
        to: application.email,
        subject: 'KRG e-Visit Application Rejected',
        html: `
          <h2>Application Rejected</h2>
          <p>Dear ${application.fullName},</p>
          <p>We regret to inform you that your e-Visit application has been rejected.</p>
          <p><strong>Reference Number:</strong> ${application.referenceNumber}</p>
          <p><strong>Reason:</strong> ${reason}</p>
          <p>You may submit a new application with corrected information.</p>
          <p>Thank you for using KRG e-Visit System.</p>
        `
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        applicationId: id,
        action: 'REJECT_APPLICATION',
        details: JSON.stringify({ reason })
      }
    });

    return res.json({ success: true, data: application });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to reject application' }
    });
  }
});

// Request additional documents (officer)
router.patch('/:id/request-documents', authMiddleware, roleMiddleware([UserRole.OFFICER, UserRole.DIRECTOR]), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { requestedDocuments, notes } = req.body;

    const application = await prisma.application.update({
      where: { id },
      data: {
        status: 'PENDING_DOCUMENTS',
        approvalNotes: notes
      }
    });

    // Send email to applicant requesting documents
    if (application.email) {
      await sendEmail({
        to: application.email,
        subject: 'KRG e-Visit: Additional Documents Required',
        html: `
          <h2>Additional Documents Required</h2>
          <p>Dear ${application.fullName},</p>
          <p>Your e-Visit application requires additional documentation before it can be processed.</p>
          <p><strong>Reference Number:</strong> ${application.referenceNumber}</p>
          <p><strong>Required Documents:</strong></p>
          <ul>
            ${requestedDocuments.split(',').map((doc: string) => `<li>${doc.trim()}</li>`).join('')}
          </ul>
          <p><strong>Notes:</strong> ${notes}</p>
          <p>Please upload the requested documents at: <a href="http://localhost:3000/en/track">Track Your Application</a></p>
          <p>Thank you for your cooperation.</p>
        `
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        applicationId: id,
        action: 'REQUEST_DOCUMENTS',
        details: JSON.stringify({ requestedDocuments, notes })
      }
    });

    return res.json({ success: true, data: application });
  } catch (error) {
    console.error('Request documents error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to request documents' }
    });
  }
});

export default router;
