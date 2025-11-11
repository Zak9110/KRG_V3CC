import request from 'supertest';
import express from 'express';
import otpRoutes from '../routes/otp';
import { PrismaClient } from '@krg-evisit/database';
import crypto from 'crypto';

// Mock Prisma
jest.mock('@krg-evisit/database', () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      otpVerification: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      application: {
        update: jest.fn(),
      },
    })),
    prisma: {
      otpVerification: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      application: {
        update: jest.fn(),
      },
    },
  };
});

// Mock SMS Service
jest.mock('../services/sms', () => ({
  SMSService: {
    sendOTP: jest.fn().mockResolvedValue(true),
  },
}));

describe('OTP API', () => {
  let app: express.Application;
  let prisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/otp', otpRoutes);
    
    const { prisma: mockPrisma } = require('@krg-evisit/database');
    prisma = mockPrisma as jest.Mocked<PrismaClient>;
    
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/otp/send', () => {
    it('should send OTP successfully', async () => {
      (prisma.otpVerification.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.otpVerification.create as jest.Mock).mockResolvedValue({
        id: '1',
        phoneNumber: '+9647501234567',
        purpose: 'APPLICATION',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });

      const response = await request(app)
        .post('/api/otp/send')
        .send({
          phoneNumber: '+9647501234567',
          purpose: 'APPLICATION',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('OTP sent successfully');
      expect(response.body.data).toHaveProperty('expiresAt');
      expect(response.body.data).toHaveProperty('code'); // Development mode
    });

    it('should return OTP code in development mode', async () => {
      (prisma.otpVerification.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.otpVerification.create as jest.Mock).mockResolvedValue({});

      const response = await request(app)
        .post('/api/otp/send')
        .send({
          phoneNumber: '+9647501234567',
          purpose: 'APPLICATION',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.code).toBeDefined();
      expect(response.body.data.code).toMatch(/^\d{6}$/);
    });

    it('should validate phone number format', async () => {
      const response = await request(app)
        .post('/api/otp/send')
        .send({
          phoneNumber: '0750123456', // Invalid format
          purpose: 'APPLICATION',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Invalid phone number format');
    });

    it('should require phone number', async () => {
      const response = await request(app)
        .post('/api/otp/send')
        .send({
          purpose: 'APPLICATION',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Phone number is required');
    });

    it('should require purpose', async () => {
      const response = await request(app)
        .post('/api/otp/send')
        .send({
          phoneNumber: '+9647501234567',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Purpose is required');
    });

    it('should enforce rate limiting', async () => {
      const recentOTP = {
        id: '1',
        phoneNumber: '+9647501234567',
        createdAt: new Date(),
      };

      (prisma.otpVerification.findFirst as jest.Mock).mockResolvedValue(recentOTP);

      const response = await request(app)
        .post('/api/otp/send')
        .send({
          phoneNumber: '+9647501234567',
          purpose: 'APPLICATION',
        });

      expect(response.status).toBe(429);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Please wait 60 seconds');
    });

    it('should allow OTP after rate limit expires', async () => {
      const oldOTP = {
        id: '1',
        phoneNumber: '+9647501234567',
        createdAt: new Date(Date.now() - 70 * 1000), // 70 seconds ago
      };

      (prisma.otpVerification.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.otpVerification.create as jest.Mock).mockResolvedValue({});

      const response = await request(app)
        .post('/api/otp/send')
        .send({
          phoneNumber: '+9647501234567',
          purpose: 'APPLICATION',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should handle SMS service failure', async () => {
      const { SMSService } = require('../services/sms');
      (SMSService.sendOTP as jest.Mock).mockResolvedValue(false);
      (prisma.otpVerification.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.otpVerification.create as jest.Mock).mockResolvedValue({});

      const response = await request(app)
        .post('/api/otp/send')
        .send({
          phoneNumber: '+9647501234567',
          purpose: 'APPLICATION',
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Failed to send SMS');
    });

    it('should accept optional applicationId', async () => {
      (prisma.otpVerification.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.otpVerification.create as jest.Mock).mockResolvedValue({});

      const response = await request(app)
        .post('/api/otp/send')
        .send({
          phoneNumber: '+9647501234567',
          purpose: 'APPLICATION',
          applicationId: 'app-123',
        });

      expect(response.status).toBe(200);
      expect(prisma.otpVerification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            applicationId: 'app-123',
          }),
        })
      );
    });
  });

  describe('POST /api/otp/verify', () => {
    it('should verify correct OTP', async () => {
      const otpCode = '123456';
      const hashedOTP = crypto.createHash('sha256').update(otpCode).digest('hex');
      const mockOTP = {
        id: '1',
        phoneNumber: '+9647501234567',
        otpCode: hashedOTP,
        purpose: 'APPLICATION',
        verified: false,
        attempts: 0,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        applicationId: null,
      };

      (prisma.otpVerification.findFirst as jest.Mock).mockResolvedValue(mockOTP);
      (prisma.otpVerification.update as jest.Mock).mockResolvedValue({ verified: true });

      const response = await request(app)
        .post('/api/otp/verify')
        .send({
          phoneNumber: '+9647501234567',
          otpCode: '123456',
          purpose: 'APPLICATION',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('verified successfully');
      expect(response.body.data.verified).toBe(true);
    });

    it('should reject incorrect OTP', async () => {
      const correctOTP = '123456';
      const hashedOTP = crypto.createHash('sha256').update(correctOTP).digest('hex');
      const mockOTP = {
        id: '1',
        phoneNumber: '+9647501234567',
        otpCode: hashedOTP,
        verified: false,
        attempts: 0,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      };

      (prisma.otpVerification.findFirst as jest.Mock).mockResolvedValue(mockOTP);
      (prisma.otpVerification.update as jest.Mock).mockResolvedValue({});

      const response = await request(app)
        .post('/api/otp/verify')
        .send({
          phoneNumber: '+9647501234567',
          otpCode: '654321', // Wrong OTP
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Incorrect OTP');
      expect(response.body.error.attemptsRemaining).toBe(2);
    });

    it('should increment attempts on failed verification', async () => {
      const correctOTP = '123456';
      const hashedOTP = crypto.createHash('sha256').update(correctOTP).digest('hex');
      const mockOTP = {
        id: '1',
        phoneNumber: '+9647501234567',
        otpCode: hashedOTP,
        verified: false,
        attempts: 1,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      };

      (prisma.otpVerification.findFirst as jest.Mock).mockResolvedValue(mockOTP);
      (prisma.otpVerification.update as jest.Mock).mockResolvedValue({});

      const response = await request(app)
        .post('/api/otp/verify')
        .send({
          phoneNumber: '+9647501234567',
          otpCode: '654321',
        });

      expect(response.status).toBe(400);
      expect(prisma.otpVerification.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { attempts: 2 },
      });
    });

    it('should block verification after max attempts', async () => {
      const mockOTP = {
        id: '1',
        phoneNumber: '+9647501234567',
        attempts: 3, // Max attempts reached
        verified: false,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      };

      (prisma.otpVerification.findFirst as jest.Mock).mockResolvedValue(mockOTP);

      const response = await request(app)
        .post('/api/otp/verify')
        .send({
          phoneNumber: '+9647501234567',
          otpCode: '123456',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Maximum verification attempts exceeded');
    });

    it('should reject expired OTP', async () => {
      const mockOTP = {
        id: '1',
        phoneNumber: '+9647501234567',
        verified: false,
        attempts: 0,
        expiresAt: new Date(Date.now() - 1000), // Expired
      };

      (prisma.otpVerification.findFirst as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/otp/verify')
        .send({
          phoneNumber: '+9647501234567',
          otpCode: '123456',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Invalid or expired OTP');
    });

    it('should require phone number and OTP code', async () => {
      const response = await request(app)
        .post('/api/otp/verify')
        .send({
          phoneNumber: '+9647501234567',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('required');
    });

    it('should validate OTP format', async () => {
      const response = await request(app)
        .post('/api/otp/verify')
        .send({
          phoneNumber: '+9647501234567',
          otpCode: '12345', // Only 5 digits
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Invalid OTP format');
    });

    it('should update application phone verification status', async () => {
      const otpCode = '123456';
      const hashedOTP = crypto.createHash('sha256').update(otpCode).digest('hex');
      const mockOTP = {
        id: '1',
        phoneNumber: '+9647501234567',
        otpCode: hashedOTP,
        verified: false,
        attempts: 0,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        applicationId: 'app-123',
      };

      (prisma.otpVerification.findFirst as jest.Mock).mockResolvedValue(mockOTP);
      (prisma.otpVerification.update as jest.Mock).mockResolvedValue({});
      (prisma.application.update as jest.Mock).mockResolvedValue({});

      const response = await request(app)
        .post('/api/otp/verify')
        .send({
          phoneNumber: '+9647501234567',
          otpCode: '123456',
        });

      expect(response.status).toBe(200);
      expect(prisma.application.update).toHaveBeenCalledWith({
        where: { id: 'app-123' },
        data: { phoneVerified: true },
      });
    });

    it('should handle OTP verification without application', async () => {
      const otpCode = '123456';
      const hashedOTP = crypto.createHash('sha256').update(otpCode).digest('hex');
      const mockOTP = {
        id: '1',
        phoneNumber: '+9647501234567',
        otpCode: hashedOTP,
        verified: false,
        attempts: 0,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        applicationId: null,
      };

      (prisma.otpVerification.findFirst as jest.Mock).mockResolvedValue(mockOTP);
      (prisma.otpVerification.update as jest.Mock).mockResolvedValue({});

      const response = await request(app)
        .post('/api/otp/verify')
        .send({
          phoneNumber: '+9647501234567',
          otpCode: '123456',
        });

      expect(response.status).toBe(200);
      expect(prisma.application.update).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/otp/resend', () => {
    it('should resend OTP successfully', async () => {
      (prisma.otpVerification.updateMany as jest.Mock).mockResolvedValue({});
      (prisma.otpVerification.create as jest.Mock).mockResolvedValue({});

      const response = await request(app)
        .post('/api/otp/resend')
        .send({
          phoneNumber: '+9647501234567',
          purpose: 'APPLICATION',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('OTP resent successfully');
    });

    it('should invalidate previous OTPs', async () => {
      (prisma.otpVerification.updateMany as jest.Mock).mockResolvedValue({});
      (prisma.otpVerification.create as jest.Mock).mockResolvedValue({});

      await request(app)
        .post('/api/otp/resend')
        .send({
          phoneNumber: '+9647501234567',
          purpose: 'APPLICATION',
        });

      expect(prisma.otpVerification.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            phoneNumber: '+9647501234567',
            purpose: 'APPLICATION',
            verified: false,
          },
          data: {
            expiresAt: expect.any(Date),
          },
        })
      );
    });

    it('should handle resend SMS failure', async () => {
      const { SMSService } = require('../services/sms');
      (SMSService.sendOTP as jest.Mock).mockResolvedValue(false);
      (prisma.otpVerification.updateMany as jest.Mock).mockResolvedValue({});
      (prisma.otpVerification.create as jest.Mock).mockResolvedValue({});

      const response = await request(app)
        .post('/api/otp/resend')
        .send({
          phoneNumber: '+9647501234567',
          purpose: 'APPLICATION',
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Failed to resend SMS');
    });
  });

  describe('OTP Expiration', () => {
    it('should set OTP to expire in 10 minutes', async () => {
      (prisma.otpVerification.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.otpVerification.create as jest.Mock).mockResolvedValue({});

      const beforeTime = Date.now() + 9 * 60 * 1000;
      await request(app)
        .post('/api/otp/send')
        .send({
          phoneNumber: '+9647501234567',
          purpose: 'APPLICATION',
        });
      const afterTime = Date.now() + 11 * 60 * 1000;

      expect(prisma.otpVerification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            expiresAt: expect.any(Date),
          }),
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      (prisma.otpVerification.findFirst as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      const response = await request(app)
        .post('/api/otp/send')
        .send({
          phoneNumber: '+9647501234567',
          purpose: 'APPLICATION',
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    it('should handle malformed requests', async () => {
      const response = await request(app)
        .post('/api/otp/verify')
        .send({
          invalidField: 'value',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
});

