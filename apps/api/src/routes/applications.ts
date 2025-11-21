import { Router, Request, Response } from 'express';
import { prisma } from '@krg-evisit/database';
import { authMiddleware, roleMiddleware, AuthRequest } from '../middleware/auth';
import { ApplicationStatus, UserRole } from '@krg-evisit/shared-types';
import { generateQRCode } from '../services/qr';
import { sendEmail } from '../services/email';
import { handleError, errors, asyncHandler } from '../utils/errorHandler';

const router = Router();

// Create new application (public)
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      fullName,
      nationalId,
      phoneNumber,
      dateOfBirth,
      originGovernorate,
      destinationGovernorate,
      visitPurpose,
      visitStartDate,
      visitEndDate,
      motherFullName,
      gender,
      nationality,
      email,
      occupation,
      educationLevel,
      monthlyIncome,
      previousVisits,
      declaredAccommodation,
      accommodationType,
      dailySpending
    } = req.body;

    // Validate required fields
    const requiredFields = [
      { field: 'fullName', value: fullName },
      { field: 'nationalId', value: nationalId },
      { field: 'phoneNumber', value: phoneNumber },
      { field: 'dateOfBirth', value: dateOfBirth },
      { field: 'originGovernorate', value: originGovernorate },
      { field: 'destinationGovernorate', value: destinationGovernorate },
      { field: 'visitPurpose', value: visitPurpose },
      { field: 'visitStartDate', value: visitStartDate },
      { field: 'visitEndDate', value: visitEndDate }
    ];

    const missingFields = requiredFields.filter(f => !f.value || f.value.trim() === '').map(f => f.field);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FIELDS',
          message: `Missing or empty required fields: ${missingFields.join(', ')}`
        }
      });
    }

    // Validate date formats
    const startDate = new Date(visitStartDate);
    const endDate = new Date(visitEndDate);
    const birthDate = new Date(dateOfBirth);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || isNaN(birthDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_DATES',
          message: 'Invalid date format. Use YYYY-MM-DD format.'
        }
      });
    }

    // Validate date logic
    const now = new Date();
    if (startDate <= now || endDate <= startDate) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_DATE_RANGE',
          message: 'Visit start date must be in the future and end date must be after start date.'
        }
      });
    }

    // Generate reference number
    let count = 0;
    try {
      count = await prisma.application.count();
    } catch (countError) {
      console.error('Error counting applications:', countError);
      // Use timestamp-based reference if count fails
      count = Date.now() % 1000000;
    }
    const referenceNumber = `KRG-2025-${String(count + 1).padStart(6, '0')}`;

    // Calculate stay duration
    const stayDuration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    const application = await prisma.application.create({
      data: {
        referenceNumber,
        fullName: fullName.trim(),
        motherFullName: motherFullName?.trim() || null,
        gender: gender || 'MALE',
        nationalId: nationalId.trim(),
        phoneNumber: phoneNumber.trim(),
        phoneVerified: false,
        email: email?.trim() || null,
        dateOfBirth: birthDate,
        nationality: nationality || 'Iraq',

        // Enhanced Visitor Profiling
        occupation: occupation || null,
        educationLevel: educationLevel || null,
        monthlyIncome: monthlyIncome || null,
        previousVisits: previousVisits || 0,

        // Visit Details
        originGovernorate: originGovernorate.trim(),
        destinationGovernorate: destinationGovernorate.trim(),
        visitPurpose: visitPurpose.trim(),
        visitStartDate: startDate,
        visitEndDate: endDate,
        declaredAccommodation: declaredAccommodation?.trim() || null,

        // Economic Impact Tracking
        estimatedStayDuration: stayDuration,
        accommodationType: accommodationType || null,
        dailySpending: dailySpending || null,

        status: 'SUBMITTED',
        priorityLevel: 'NORMAL'
      }
    });

    // Send confirmation email (optional - don't fail if email service is not configured)
    try {
      if (email) {
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
      }
    } catch (emailError) {
      // Log email error but don't fail the application creation
      console.warn('Email sending failed, but application was created:', emailError);
    }

    return res.status(201).json({ success: true, data: application });
  } catch (error: any) {
    console.error('Application creation error:', error);
    // Provide more detailed error message for debugging
    const errorMessage = error?.message || 'Failed to create application';
    const errorCode = error?.code || 'SERVER_ERROR';
    
    // Log full error details for debugging
    if (error?.meta) {
      console.error('Prisma error details:', error.meta);
    }
    
    return res.status(500).json({
      success: false,
      error: { 
        code: errorCode, 
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      }
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
          approvedBy: { select: { fullName: true } },
          documents: true
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

// Approve application (officer/supervisor/director)
router.patch('/:id/approve', authMiddleware, roleMiddleware([UserRole.OFFICER, UserRole.SUPERVISOR, UserRole.DIRECTOR]), async (req: AuthRequest, res: Response) => {
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

// Reject application (officer/supervisor/director)
router.patch('/:id/reject', authMiddleware, roleMiddleware([UserRole.OFFICER, UserRole.SUPERVISOR, UserRole.DIRECTOR]), async (req: AuthRequest, res: Response) => {
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

// Request additional documents (officer/supervisor/director)
router.patch('/:id/request-documents', authMiddleware, roleMiddleware([UserRole.OFFICER, UserRole.SUPERVISOR, UserRole.DIRECTOR]), async (req: AuthRequest, res: Response) => {
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

// Get daily applications for supervisor review
router.get('/supervisor/daily', authMiddleware, roleMiddleware([UserRole.SUPERVISOR, UserRole.DIRECTOR]), async (req: AuthRequest, res: Response) => {
  try {
    const { status, page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const where: any = {
      createdAt: {
        gte: today,
        lt: tomorrow
      }
    };

    // Add status filter if provided
    if (status) {
      where.status = status as ApplicationStatus;
    } else {
      // Default to pending applications for supervisor review
      where.status = {
        in: [ApplicationStatus.SUBMITTED, ApplicationStatus.UNDER_REVIEW, ApplicationStatus.PENDING_DOCUMENTS]
      };
    }

    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        orderBy: { createdAt: 'desc' },
        include: {
          assignedOfficer: { select: { fullName: true, email: true } },
          documents: true
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
      },
      summary: {
        totalToday: total,
        pending: applications.filter(a => a.status === 'SUBMITTED' || a.status === 'UNDER_REVIEW').length,
        withDocuments: applications.filter(a => a.documents && a.documents.length > 0).length,
        pendingDocuments: applications.filter(a => a.status === 'PENDING_DOCUMENTS').length
      }
    });
  } catch (error) {
    console.error('Supervisor daily applications error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve daily applications' }
    });
  }
});

export default router;
