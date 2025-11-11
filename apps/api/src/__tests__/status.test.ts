import request from 'supertest';
import express from 'express';
import statusRoutes from '../routes/status';
import { PrismaClient } from '@krg-evisit/database';

// Mock Prisma
jest.mock('@krg-evisit/database', () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      application: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    })),
    prisma: {
      application: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    },
  };
});

describe('Status API', () => {
  let app: express.Application;
  let prisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/status', statusRoutes);
    
    const { prisma: mockPrisma } = require('@krg-evisit/database');
    prisma = mockPrisma as jest.Mocked<PrismaClient>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/status/:referenceNumber', () => {
    it('should return application status with valid reference number', async () => {
      const mockApplication = {
        id: '1',
        referenceNumber: 'KRG-2025-000001',
        fullName: 'Ahmad Hassan',
        motherFullName: 'Fatima Ali',
        nationality: 'Iraq',
        nationalId: '123456789',
        dateOfBirth: new Date('1990-01-01'),
        status: 'APPROVED',
        visitPurpose: 'Business',
        visitStartDate: new Date('2025-02-01'),
        visitEndDate: new Date('2025-02-15'),
        destinationGovernorate: 'Erbil',
        createdAt: new Date('2025-01-15'),
        approvalDate: new Date('2025-01-20'),
        rejectionDate: null,
        permitExpiryDate: new Date('2025-05-01'),
        qrCode: 'data:image/png;base64,mockQRCode',
        documents: [
          {
            fileUrl: 'https://example.com/photo.jpg',
          },
        ],
      };

      (prisma.application.findUnique as jest.Mock).mockResolvedValue(mockApplication);

      const response = await request(app).get('/api/status/KRG-2025-000001');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.referenceNumber).toBe('KRG-2025-000001');
      expect(response.body.data.status).toBe('APPROVED');
      expect(response.body.data.fullName).toBe('Ahmad Hassan');
      expect(response.body.data.photoUrl).toBe('https://example.com/photo.jpg');
      expect(response.body.data).toHaveProperty('qrCode');
    });

    it('should return 404 for invalid reference number', async () => {
      (prisma.application.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app).get('/api/status/INVALID-REF-12345');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Application not found');
    });

    it('should return application without documents', async () => {
      const mockApplication = {
        id: '1',
        referenceNumber: 'KRG-2025-000001',
        fullName: 'Ahmad Hassan',
        status: 'SUBMITTED',
        documents: [],
      };

      (prisma.application.findUnique as jest.Mock).mockResolvedValue(mockApplication);

      const response = await request(app).get('/api/status/KRG-2025-000001');

      expect(response.status).toBe(200);
      expect(response.body.data.photoUrl).toBeUndefined();
    });

    it('should include all required fields in response', async () => {
      const mockApplication = {
        id: '1',
        referenceNumber: 'KRG-2025-000001',
        fullName: 'Ahmad Hassan',
        motherFullName: 'Fatima Ali',
        nationality: 'Iraq',
        nationalId: '123456789',
        dateOfBirth: new Date('1990-01-01'),
        status: 'UNDER_REVIEW',
        visitPurpose: 'Tourism',
        visitStartDate: new Date('2025-02-01'),
        visitEndDate: new Date('2025-02-15'),
        destinationGovernorate: 'Sulaymaniyah',
        createdAt: new Date(),
        approvalDate: null,
        rejectionDate: null,
        permitExpiryDate: null,
        qrCode: null,
        documents: [],
      };

      (prisma.application.findUnique as jest.Mock).mockResolvedValue(mockApplication);

      const response = await request(app).get('/api/status/KRG-2025-000001');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('referenceNumber');
      expect(response.body.data).toHaveProperty('fullName');
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('visitPurpose');
      expect(response.body.data).toHaveProperty('visitStartDate');
      expect(response.body.data).toHaveProperty('visitEndDate');
    });
  });

  describe('Status Transitions', () => {
    describe('PATCH /api/status/:id/submit-to-review', () => {
      it('should transition from SUBMITTED to UNDER_REVIEW', async () => {
        const mockApplication = {
          id: '1',
          referenceNumber: 'KRG-2025-000001',
          status: 'UNDER_REVIEW',
        };

        (prisma.application.update as jest.Mock).mockResolvedValue(mockApplication);

        const response = await request(app).patch('/api/status/1/submit-to-review');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.status).toBe('UNDER_REVIEW');
      });

      it('should handle invalid status transition', async () => {
        (prisma.application.update as jest.Mock).mockRejectedValue(
          new Error('Invalid status transition')
        );

        const response = await request(app).patch('/api/status/1/submit-to-review');

        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
      });
    });

    describe('PATCH /api/status/:id/activate', () => {
      it('should transition from APPROVED to ACTIVE', async () => {
        const mockApplication = {
          id: '1',
          referenceNumber: 'KRG-2025-000001',
          status: 'ACTIVE',
        };

        (prisma.application.update as jest.Mock).mockResolvedValue(mockApplication);

        const response = await request(app).patch('/api/status/1/activate');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.status).toBe('ACTIVE');
      });

      it('should only activate APPROVED applications', async () => {
        (prisma.application.update as jest.Mock).mockRejectedValue(
          new Error('Cannot activate non-approved application')
        );

        const response = await request(app).patch('/api/status/1/activate');

        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
      });
    });

    describe('PATCH /api/status/:id/exit', () => {
      it('should transition from ACTIVE to EXITED', async () => {
        const mockApplication = {
          id: '1',
          referenceNumber: 'KRG-2025-000001',
          status: 'EXITED',
        };

        (prisma.application.update as jest.Mock).mockResolvedValue(mockApplication);

        const response = await request(app).patch('/api/status/1/exit');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.status).toBe('EXITED');
      });
    });

    describe('PATCH /api/status/:id/expire', () => {
      it('should mark permit as EXPIRED', async () => {
        const mockApplication = {
          id: '1',
          referenceNumber: 'KRG-2025-000001',
          status: 'EXPIRED',
        };

        (prisma.application.update as jest.Mock).mockResolvedValue(mockApplication);

        const response = await request(app).patch('/api/status/1/expire');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.status).toBe('EXPIRED');
      });
    });
  });

  describe('Automated Detection', () => {
    describe('POST /api/status/detect-expired', () => {
      it('should detect and mark expired permits', async () => {
        (prisma.application.updateMany as jest.Mock).mockResolvedValue({ count: 5 });

        const response = await request(app).post('/api/status/detect-expired');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.expired).toBe(5);
        expect(response.body.data.message).toContain('5 permits marked as expired');
      });

      it('should handle no expired permits', async () => {
        (prisma.application.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

        const response = await request(app).post('/api/status/detect-expired');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.expired).toBe(0);
      });

      it('should handle errors gracefully', async () => {
        (prisma.application.updateMany as jest.Mock).mockRejectedValue(
          new Error('Database error')
        );

        const response = await request(app).post('/api/status/detect-expired');

        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toContain('Failed to detect expired permits');
      });
    });

    describe('POST /api/status/detect-overstays', () => {
      it('should detect and mark overstayed applications', async () => {
        const mockOverstays = [
          {
            id: '1',
            visitEndDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
          },
          {
            id: '2',
            visitEndDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
          },
        ];

        (prisma.application.findMany as jest.Mock).mockResolvedValue(mockOverstays);
        (prisma.application.update as jest.Mock).mockResolvedValue({ status: 'OVERSTAYED' });

        const response = await request(app).post('/api/status/detect-overstays');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.overstays).toBe(2);
        expect(prisma.application.update).toHaveBeenCalledTimes(2);
      });

      it('should calculate overstay days correctly', async () => {
        const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
        const mockOverstays = [
          {
            id: '1',
            visitEndDate: tenDaysAgo,
          },
        ];

        (prisma.application.findMany as jest.Mock).mockResolvedValue(mockOverstays);
        (prisma.application.update as jest.Mock).mockResolvedValue({ status: 'OVERSTAYED' });

        await request(app).post('/api/status/detect-overstays');

        expect(prisma.application.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              status: 'OVERSTAYED',
              overstayDays: expect.any(Number),
            }),
          })
        );
      });

      it('should handle no overstays', async () => {
        (prisma.application.findMany as jest.Mock).mockResolvedValue([]);

        const response = await request(app).post('/api/status/detect-overstays');

        expect(response.status).toBe(200);
        expect(response.body.data.overstays).toBe(0);
      });
    });
  });

  describe('GET /api/status/lifecycle/:id', () => {
    it('should return complete application lifecycle', async () => {
      const mockApplication = {
        id: '1',
        referenceNumber: 'KRG-2025-000001',
        status: 'ACTIVE',
        createdAt: new Date('2025-01-15'),
        approvalDate: new Date('2025-01-20'),
        rejectionDate: null,
        permitExpiryDate: new Date('2025-05-01'),
        entryExitLogs: [
          {
            logType: 'ENTRY',
            checkpointName: 'Ibrahim Khalil Border',
            checkpointLocation: 'Duhok',
            recordedAt: new Date('2025-02-01'),
          },
        ],
      };

      (prisma.application.findUnique as jest.Mock).mockResolvedValue(mockApplication);

      const response = await request(app).get('/api/status/lifecycle/1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.application.referenceNumber).toBe('KRG-2025-000001');
      expect(response.body.data.timeline).toBeDefined();
      expect(response.body.data.timeline.length).toBeGreaterThan(0);
    });

    it('should include all timeline events', async () => {
      const mockApplication = {
        id: '1',
        referenceNumber: 'KRG-2025-000001',
        status: 'EXITED',
        createdAt: new Date('2025-01-15'),
        approvalDate: new Date('2025-01-20'),
        rejectionDate: null,
        permitExpiryDate: new Date('2025-05-01'),
        entryExitLogs: [
          {
            logType: 'ENTRY',
            checkpointName: 'Ibrahim Khalil Border',
            recordedAt: new Date('2025-02-01'),
          },
          {
            logType: 'EXIT',
            checkpointName: 'Ibrahim Khalil Border',
            recordedAt: new Date('2025-02-14'),
          },
        ],
      };

      (prisma.application.findUnique as jest.Mock).mockResolvedValue(mockApplication);

      const response = await request(app).get('/api/status/lifecycle/1');

      expect(response.status).toBe(200);
      expect(response.body.data.timeline).toHaveLength(4); // SUBMITTED, APPROVED, ENTRY, EXIT
      expect(response.body.data.timeline[0].status).toBe('SUBMITTED');
      expect(response.body.data.timeline[1].status).toBe('APPROVED');
    });

    it('should handle rejected applications', async () => {
      const mockApplication = {
        id: '1',
        referenceNumber: 'KRG-2025-000001',
        status: 'REJECTED',
        createdAt: new Date('2025-01-15'),
        approvalDate: null,
        rejectionDate: new Date('2025-01-20'),
        permitExpiryDate: null,
        entryExitLogs: [],
      };

      (prisma.application.findUnique as jest.Mock).mockResolvedValue(mockApplication);

      const response = await request(app).get('/api/status/lifecycle/1');

      expect(response.status).toBe(200);
      expect(response.body.data.timeline).toHaveLength(2); // SUBMITTED, REJECTED
      expect(response.body.data.timeline[1].status).toBe('REJECTED');
    });

    it('should return 404 for non-existent application', async () => {
      (prisma.application.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app).get('/api/status/lifecycle/999');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Application not found');
    });

    it('should sort timeline by timestamp', async () => {
      const mockApplication = {
        id: '1',
        referenceNumber: 'KRG-2025-000001',
        status: 'ACTIVE',
        createdAt: new Date('2025-01-15T10:00:00Z'),
        approvalDate: new Date('2025-01-20T14:00:00Z'),
        rejectionDate: null,
        permitExpiryDate: new Date('2025-05-01'),
        entryExitLogs: [
          {
            logType: 'ENTRY',
            checkpointName: 'Checkpoint A',
            recordedAt: new Date('2025-02-01T08:00:00Z'),
          },
        ],
      };

      (prisma.application.findUnique as jest.Mock).mockResolvedValue(mockApplication);

      const response = await request(app).get('/api/status/lifecycle/1');

      expect(response.status).toBe(200);
      const timeline = response.body.data.timeline;
      
      // Verify chronological order
      for (let i = 0; i < timeline.length - 1; i++) {
        const currentTime = new Date(timeline[i].timestamp).getTime();
        const nextTime = new Date(timeline[i + 1].timestamp).getTime();
        expect(currentTime).toBeLessThanOrEqual(nextTime);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      (prisma.application.findUnique as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app).get('/api/status/KRG-2025-000001');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBeDefined();
    });

    it('should handle malformed requests', async () => {
      const response = await request(app).patch('/api/status//activate');

      expect(response.status).toBe(404);
    });
  });
});

