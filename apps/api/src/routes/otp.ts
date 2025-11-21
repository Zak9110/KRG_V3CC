import { Router, Request, Response } from 'express';
import { prisma } from '@krg-evisit/database';
import crypto from 'crypto';
import { SMSService } from '../services/sms';

const router = Router();

/**
 * Generate a 6-digit OTP
 */
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Hash OTP for secure storage
 */
function hashOTP(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

/**
 * POST /api/otp/send
 * Send OTP to phone number
 */
router.post('/send', async (req: Request, res: Response): Promise<void> => {
  try {
    const { phoneNumber, purpose, applicationId } = req.body;

    // Validation
    if (!phoneNumber) {
      res.status(400).json({
        success: false,
        error: { message: 'Phone number is required' },
      });
      return;
    }

    if (!purpose) {
      res.status(400).json({
        success: false,
        error: { message: 'Purpose is required (APPLICATION, RENEWAL, APPEAL)' },
      });
      return;
    }

    // Validate phone number format (Iraqi: +964)
    const phoneRegex = /^\+964[0-9]{10}$/;
    if (!phoneRegex.test(phoneNumber)) {
      res.status(400).json({
        success: false,
        error: { message: 'Invalid phone number format. Expected: +964XXXXXXXXXX' },
      });
      return;
    }

    // Rate limiting: Check if OTP was sent recently (prevent spam)
    // In development, reduce cooldown to 10 seconds for easier testing
    const cooldownSeconds = process.env.NODE_ENV === 'development' ? 10 : 60;
    const recentOTP = await prisma.otpVerification.findFirst({
      where: {
        phoneNumber,
        createdAt: {
          gte: new Date(Date.now() - cooldownSeconds * 1000),
        },
      },
    });

    if (recentOTP) {
      res.status(429).json({
        success: false,
        error: {
          message: `OTP already sent. Please wait ${cooldownSeconds} seconds before requesting again.`,
        },
      });
      return;
    }

    // Generate OTP
    const otpCode = generateOTP();
    const hashedOTP = hashOTP(otpCode);

    // Save to database
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await prisma.otpVerification.create({
      data: {
        phoneNumber,
        otpCode: hashedOTP,
        purpose,
        applicationId: applicationId || null,
        expiresAt,
      },
    });

    // Send OTP via SMS
    const sent = await SMSService.sendOTP(phoneNumber, otpCode);

    if (!sent) {
      res.status(500).json({
        success: false,
        error: { message: 'Failed to send SMS. Please try again.' },
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      data: {
        expiresAt,
        // In development, return OTP (remove in production!)
        code: otpCode, // Always return in development for testing
      },
    });
  } catch (error: any) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to send OTP' },
    });
  }
});

/**
 * POST /api/otp/verify
 * Verify OTP code
 */
router.post('/verify', async (req: Request, res: Response): Promise<void> => {
  try {
    const { phoneNumber, otpCode, purpose } = req.body;

    // Validation
    if (!phoneNumber || !otpCode) {
      res.status(400).json({
        success: false,
        error: { message: 'Phone number and OTP code are required' },
      });
      return;
    }

    if (!/^\d{6}$/.test(otpCode)) {
      res.status(400).json({
        success: false,
        error: { message: 'Invalid OTP format. Must be 6 digits.' },
      });
      return;
    }

    // Find OTP record
    const hashedOTP = hashOTP(otpCode);
    const otpRecord = await prisma.otpVerification.findFirst({
      where: {
        phoneNumber,
        purpose: purpose || undefined,
        verified: false,
        expiresAt: {
          gte: new Date(), // Not expired
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!otpRecord) {
      res.status(400).json({
        success: false,
        error: { message: 'Invalid or expired OTP' },
      });
      return;
    }

    // Check attempts
    if (otpRecord.attempts >= 3) {
      res.status(400).json({
        success: false,
        error: { message: 'Maximum verification attempts exceeded. Request a new OTP.' },
      });
      return;
    }

    // Verify OTP
    if (otpRecord.otpCode !== hashedOTP) {
      // Increment attempts
      await prisma.otpVerification.update({
        where: { id: otpRecord.id },
        data: { attempts: otpRecord.attempts + 1 },
      });

      res.status(400).json({
        success: false,
        error: {
          message: 'Incorrect OTP',
          attemptsRemaining: 3 - (otpRecord.attempts + 1),
        },
      });
      return;
    }

    // Mark as verified
    await prisma.otpVerification.update({
      where: { id: otpRecord.id },
      data: { verified: true },
    });

    // If linked to application, update phone verification status
    if (otpRecord.applicationId) {
      await prisma.application.update({
        where: { id: otpRecord.applicationId },
        data: { phoneVerified: true },
      });
    }

    res.status(200).json({
      success: true,
      message: 'Phone number verified successfully',
      data: {
        phoneNumber,
        verified: true,
      },
    });
  } catch (error: any) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to verify OTP' },
    });
  }
});

/**
 * POST /api/otp/resend
 * Resend OTP (invalidates previous one)
 */
router.post('/resend', async (req: Request, res: Response): Promise<void> => {
  try {
    const { phoneNumber, purpose } = req.body;

    // Invalidate previous OTPs
    await prisma.otpVerification.updateMany({
      where: {
        phoneNumber,
        purpose,
        verified: false,
      },
      data: {
        expiresAt: new Date(), // Expire immediately
      },
    });

    // Send new OTP (reuse send endpoint logic)
    const otpCode = generateOTP();
    const hashedOTP = hashOTP(otpCode);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.otpVerification.create({
      data: {
        phoneNumber,
        otpCode: hashedOTP,
        purpose,
        expiresAt,
      },
    });

    const sent = await SMSService.sendOTP(phoneNumber, otpCode);

    if (!sent) {
      res.status(500).json({
        success: false,
        error: { message: 'Failed to resend SMS' },
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'OTP resent successfully',
      data: {
        expiresAt,
        ...(process.env.NODE_ENV === 'development' && { otp: otpCode }),
      },
    });
  } catch (error: any) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to resend OTP' },
    });
  }
});

export default router;
