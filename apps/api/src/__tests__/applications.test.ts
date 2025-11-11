import request from 'supertest';
import express from 'express';
import applicationsRoutes from '../routes/applications';
import { PrismaClient } from '@krg-evisit/database';

// Mock Prisma
jest.mock('@krg-evisit/database', () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      application: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
    })),
    prisma: {
      application: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
    },
  };
});

// Mock email service
jest.mock('../services/email', () => ({
  sendEmail: jest.fn().mockResolvedValue(true),
}));

// Mock QR service
jest.mock('../services/qr', () => ({
  generateQRCode: jest.fn().mockResolvedValue({
    qrCode: 'data:image/png;base64,mockQRCode',
    signature: 'mockSignature',
  }),
}));

describe('Applications API', () => {
  let app: express.Application;
  let prisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/applications', applicationsRoutes);
    
    const { prisma: mockPrisma } = require('@krg-evisit/database');
    prisma = mockPrisma as jest.Mocked<PrismaClient>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/applications', () => {
    it('should create a new application successfully', async () => {
      const mockApplication = {
        id: '1',
        referenceNumber: 'KRG-2025-000001',
        fullName: 'Ahmad Hassan',
        nationalId: '123456789',
        phoneNumber: '+9647501234567',
        email: 'ahmad@example.com',
        dateOfBirth: new Date('1990-01-01'),
        nationality: 'Iraq',
        originGovernorate: 'Baghdad',
        destinationGovernorate: 'Erbil',
        visitPurpose: 'Business',
        visitStartDate: new Date('2025-02-01'),
        visitEndDate: new Date('2025-02-15'),
        status: 'SUBMITTED',
        createdAt: new Date(),
      };

      (prisma.application.count as jest.Mock).mockResolvedValue(0);
      (prisma.application.create as jest.Mock).mockResolvedValue(mockApplication);

      const response = await request(app)
        .post('/api/applications')
        .send({
          fullName: 'Ahmad Hassan',
          nationalId: '123456789',
          phoneNumber: '+9647501234567',
          email: 'ahmad@example.com',
          dateOfBirth: '1990-01-01',
          nationality: 'Iraq',
          originGovernorate: 'Baghdad',
          destinationGovernorate: 'Erbil',
          visitPurpose: 'Business',
          visitStartDate: '2025-02-01',
          visitEndDate: '2025-02-15',
          declaredAccommodation: 'Hotel XYZ',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('referenceNumber');
      expect(response.body.data.referenceNumber).toMatch(/^KRG-2025-\d{6}$/);
      expect(response.body.data.fullName).toBe('Ahmad Hassan');
      expect(response.body.data.status).toBe('SUBMITTED');
    });

    it('should generate sequential reference numbers', async () => {
      (prisma.application.count as jest.Mock).mockResolvedValue(99);
      (prisma.application.create as jest.Mock).mockResolvedValue({
        id: '1',
        referenceNumber: 'KRG-2025-000100',
        status: 'SUBMITTED',
      });

      const response = await request(app)
        .post('/api/applications')
        .send({
          fullName: 'Test User',
          nationalId: '123456789',
          phoneNumber: '+9647501234567',
          email: 'test@example.com',
          dateOfBirth: '1990-01-01',
          nationality: 'Iraq',
          originGovernorate: 'Baghdad',
          destinationGovernorate: 'Erbil',
          visitPurpose: 'Tourism',
          visitStartDate: '2025-02-01',
          visitEndDate: '2025-02-15',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.referenceNumber).toBe('KRG-2025-000100');
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/applications')
        .send({
          fullName: 'Ahmad Hassan',
          // Missing required fields
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    it('should send confirmation email after application creation', async () => {
      const mockApplication = {
        id: '1',
        referenceNumber: 'KRG-2025-000001',
        fullName: 'Ahmad Hassan',
        email: 'ahmad@example.com',
        status: 'SUBMITTED',
      };

      (prisma.application.count as jest.Mock).mockResolvedValue(0);
      (prisma.application.create as jest.Mock).mockResolvedValue(mockApplication);

      const { sendEmail } = require('../services/email');

      await request(app)
        .post('/api/applications')
        .send({
          fullName: 'Ahmad Hassan',
          nationalId: '123456789',
          phoneNumber: '+9647501234567',
          email: 'ahmad@example.com',
          dateOfBirth: '1990-01-01',
          nationality: 'Iraq',
          originGovernorate: 'Baghdad',
          destinationGovernorate: 'Erbil',
          visitPurpose: 'Business',
          visitStartDate: '2025-02-01',
          visitEndDate: '2025-02-15',
        });

      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'ahmad@example.com',
          subject: expect.stringContaining('Application Received'),
        })
      );
    });
  });

  describe('GET /api/applications/:id', () => {
    it('should return application by ID', async () => {
      const mockApplication = {
        id: '1',
        referenceNumber: 'KRG-2025-000001',
        fullName: 'Ahmad Hassan',
        status: 'SUBMITTED',
        documents: [],
        assignedOfficer: null,
        approvedBy: null,
        rejectedBy: null,
        entryExitLogs: [],
      };

      (prisma.application.findUnique as jest.Mock).mockResolvedValue(mockApplication);

      const response = await request(app).get('/api/applications/1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('1');
      expect(response.body.data.referenceNumber).toBe('KRG-2025-000001');
    });

    it('should return 404 for non-existent application', async () => {
      (prisma.application.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app).get('/api/applications/999');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('not found');
    });
  });

  describe('GET /api/applications', () => {
    it('should return paginated applications', async () => {
      const mockApplications = [
        { id: '1', referenceNumber: 'KRG-2025-000001', status: 'SUBMITTED' },
        { id: '2', referenceNumber: 'KRG-2025-000002', status: 'UNDER_REVIEW' },
      ];

      (prisma.application.findMany as jest.Mock).mockResolvedValue(mockApplications);
      (prisma.application.count as jest.Mock).mockResolvedValue(2);

      const response = await request(app).get('/api/applications');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination).toHaveProperty('total', 2);
      expect(response.body.pagination).toHaveProperty('page', 1);
    });

    it('should filter by status', async () => {
      const mockApplications = [
        { id: '1', referenceNumber: 'KRG-2025-000001', status: 'APPROVED' },
      ];

      (prisma.application.findMany as jest.Mock).mockResolvedValue(mockApplications);
      (prisma.application.count as jest.Mock).mockResolvedValue(1);

      const response = await request(app)
        .get('/api/applications')
        .query({ status: 'APPROVED' });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].status).toBe('APPROVED');
    });

    it('should handle pagination parameters', async () => {
      (prisma.application.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.application.count as jest.Mock).mockResolvedValue(100);

      const response = await request(app)
        .get('/api/applications')
        .query({ page: '2', limit: '10' });

      expect(response.status).toBe(200);
      expect(response.body.pagination.page).toBe(2);
      expect(response.body.pagination.limit).toBe(10);
      expect(response.body.pagination.pages).toBe(10);
    });
  });

  describe('PATCH /api/applications/:id', () => {
    it('should update application successfully', async () => {
      const mockApplication = {
        id: '1',
        referenceNumber: 'KRG-2025-000001',
        fullName: 'Ahmad Hassan',
        status: 'SUBMITTED',
      };

      (prisma.application.update as jest.Mock).mockResolvedValue(mockApplication);

      const response = await request(app)
        .patch('/api/applications/1')
        .send({ fullName: 'Ahmad Hassan Updated' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('PATCH /api/applications/:id/approve', () => {
    it('should approve application and generate QR code', async () => {
      const mockApplication = {
        id: '1',
        referenceNumber: 'KRG-2025-000001',
        fullName: 'Ahmad Hassan',
        email: 'ahmad@example.com',
        status: 'APPROVED',
        qrCode: 'data:image/png;base64,mockQRCode',
        permitExpiryDate: new Date(),
        visitStartDate: new Date(),
        visitEndDate: new Date(),
      };

      (prisma.application.update as jest.Mock).mockResolvedValue(mockApplication);
      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

      const response = await request(app)
        .patch('/api/applications/1/approve')
        .send({ notes: 'Approved after review' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('APPROVED');
      expect(response.body.data.qrCode).toBeDefined();
    });

    it('should create audit log on approval', async () => {
      const mockApplication = {
        id: '1',
        status: 'APPROVED',
        email: 'ahmad@example.com',
        fullName: 'Ahmad Hassan',
        permitExpiryDate: new Date(),
      };

      (prisma.application.update as jest.Mock).mockResolvedValue(mockApplication);
      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

      await request(app)
        .patch('/api/applications/1/approve')
        .send({ notes: 'Approved' });

      expect(prisma.auditLog.create).toHaveBeenCalled();
    });
  });

  describe('PATCH /api/applications/:id/reject', () => {
    it('should reject application with reason', async () => {
      const mockApplication = {
        id: '1',
        referenceNumber: 'KRG-2025-000001',
        fullName: 'Ahmad Hassan',
        email: 'ahmad@example.com',
        status: 'REJECTED',
        rejectionReason: 'Invalid documents',
      };

      (prisma.application.update as jest.Mock).mockResolvedValue(mockApplication);
      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

      const response = await request(app)
        .patch('/api/applications/1/reject')
        .send({ reason: 'Invalid documents' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('REJECTED');
      expect(response.body.data.rejectionReason).toBe('Invalid documents');
    });

    it('should send rejection email', async () => {
      const mockApplication = {
        id: '1',
        referenceNumber: 'KRG-2025-000001',
        fullName: 'Ahmad Hassan',
        email: 'ahmad@example.com',
        status: 'REJECTED',
        rejectionReason: 'Invalid documents',
      };

      (prisma.application.update as jest.Mock).mockResolvedValue(mockApplication);
      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

      const { sendEmail } = require('../services/email');

      await request(app)
        .patch('/api/applications/1/reject')
        .send({ reason: 'Invalid documents' });

      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'ahmad@example.com',
          subject: expect.stringContaining('Rejected'),
        })
      );
    });
  });

  describe('GET /api/applications/track/:referenceNumber', () => {
    it('should track application by reference number', async () => {
      const mockApplication = {
        referenceNumber: 'KRG-2025-000001',
        fullName: 'Ahmad Hassan',
        status: 'APPROVED',
        createdAt: new Date(),
        approvalDate: new Date(),
        rejectionDate: null,
        rejectionReason: null,
        visitStartDate: new Date(),
        visitEndDate: new Date(),
        permitExpiryDate: new Date(),
      };

      (prisma.application.findUnique as jest.Mock).mockResolvedValue(mockApplication);

      const response = await request(app).get('/api/applications/track/KRG-2025-000001');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.referenceNumber).toBe('KRG-2025-000001');
      expect(response.body.data.status).toBe('APPROVED');
    });

    it('should return 404 for invalid reference number', async () => {
      (prisma.application.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app).get('/api/applications/track/INVALID-REF');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Validation', () => {
    it('should validate phone number format', async () => {
      const response = await request(app)
        .post('/api/applications')
        .send({
          fullName: 'Test User',
          nationalId: '123456789',
          phoneNumber: 'invalid-phone',
          email: 'test@example.com',
          dateOfBirth: '1990-01-01',
          nationality: 'Iraq',
          originGovernorate: 'Baghdad',
          destinationGovernorate: 'Erbil',
          visitPurpose: 'Tourism',
          visitStartDate: '2025-02-01',
          visitEndDate: '2025-02-15',
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/applications')
        .send({
          fullName: 'Test User',
          nationalId: '123456789',
          phoneNumber: '+9647501234567',
          email: 'invalid-email',
          dateOfBirth: '1990-01-01',
          nationality: 'Iraq',
          originGovernorate: 'Baghdad',
          destinationGovernorate: 'Erbil',
          visitPurpose: 'Tourism',
          visitStartDate: '2025-02-01',
          visitEndDate: '2025-02-15',
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    it('should validate date formats', async () => {
      const response = await request(app)
        .post('/api/applications')
        .send({
          fullName: 'Test User',
          nationalId: '123456789',
          phoneNumber: '+9647501234567',
          email: 'test@example.com',
          dateOfBirth: 'invalid-date',
          nationality: 'Iraq',
          originGovernorate: 'Baghdad',
          destinationGovernorate: 'Erbil',
          visitPurpose: 'Tourism',
          visitStartDate: '2025-02-01',
          visitEndDate: '2025-02-15',
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });
});

