import request from 'supertest';
import express from 'express';
import autoAssignRoutes from '../routes/auto-assign';

// Mock Prisma
jest.mock('@krg-evisit/database', () => {
  const mockPrisma = {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    application: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  return {
    PrismaClient: jest.fn().mockImplementation(() => mockPrisma),
    prisma: mockPrisma,
  };
});

describe('Auto-Assignment API', () => {
  let app: express.Application;
  let prisma: any;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/auto-assign', autoAssignRoutes);

    const { prisma: mockPrisma } = require('@krg-evisit/database');
    prisma = mockPrisma as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/auto-assign/config', () => {
    it('should return auto-assign configuration', async () => {
      const response = await request(app).get('/api/auto-assign/config');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('enabled');
      expect(response.body.data).toHaveProperty('algorithm');
      expect(response.body.data).toHaveProperty('maxApplicationsPerOfficer');
    });
  });

  describe('PUT /api/auto-assign/config', () => {
    it('should update auto-assign configuration', async () => {
      const newConfig = {
        enabled: true,
        algorithm: 'load-balanced',
        maxApplicationsPerOfficer: 15,
      };

      const response = await request(app)
        .put('/api/auto-assign/config')
        .send(newConfig);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.enabled).toBe(true);
      expect(response.body.data.algorithm).toBe('load-balanced');
      expect(response.body.data.maxApplicationsPerOfficer).toBe(15);
    });

    it('should partially update configuration', async () => {
      const response = await request(app)
        .put('/api/auto-assign/config')
        .send({ enabled: false });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('enabled');
    });
  });

  describe('POST /api/auto-assign/trigger', () => {
    it('should return error when auto-assignment is disabled', async () => {
      // First disable auto-assignment
      await request(app)
        .put('/api/auto-assign/config')
        .send({ enabled: false });

      const response = await request(app).post('/api/auto-assign/trigger');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('not enabled');
    });

    it('should handle no unassigned applications', async () => {
      // Enable auto-assignment
      await request(app)
        .put('/api/auto-assign/config')
        .send({ enabled: true });

      // Mock empty unassigned applications
      const { PrismaClient } = require('@krg-evisit/database');
      const prismaInstance = new PrismaClient();
      (prismaInstance.application.findMany as jest.Mock).mockResolvedValue([]);

      const response = await request(app).post('/api/auto-assign/trigger');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.assigned).toBe(0);
    });
  });

  describe('POST /api/auto-assign/assign/:applicationId', () => {
    it('should return error when auto-assignment is disabled', async () => {
      // Disable auto-assignment
      await request(app)
        .put('/api/auto-assign/config')
        .send({ enabled: false });

      const response = await request(app)
        .post('/api/auto-assign/assign/test-app-id');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('not enabled');
    });

    it('should return 404 for non-existent application', async () => {
      // Enable auto-assignment
      await request(app)
        .put('/api/auto-assign/config')
        .send({ enabled: true });

      (prisma.application.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auto-assign/assign/non-existent-id');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('not found');
    });

    it('should return error for already assigned application', async () => {
      // Enable auto-assignment
      await request(app)
        .put('/api/auto-assign/config')
        .send({ enabled: true });

      (prisma.application.findUnique as jest.Mock).mockResolvedValue({
        id: 'test-app-id',
        assignedOfficerId: 'officer-id', // Already assigned
        status: 'UNDER_REVIEW',
      });

      const response = await request(app)
        .post('/api/auto-assign/assign/test-app-id');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('already assigned');
    });
  });

  describe('Algorithm Selection', () => {
    it('should accept round-robin algorithm', async () => {
      const response = await request(app)
        .put('/api/auto-assign/config')
        .send({ algorithm: 'round-robin' });

      expect(response.status).toBe(200);
      expect(response.body.data.algorithm).toBe('round-robin');
    });

    it('should accept load-balanced algorithm', async () => {
      const response = await request(app)
        .put('/api/auto-assign/config')
        .send({ algorithm: 'load-balanced' });

      expect(response.status).toBe(200);
      expect(response.body.data.algorithm).toBe('load-balanced');
    });

    it('should accept skill-based algorithm', async () => {
      const response = await request(app)
        .put('/api/auto-assign/config')
        .send({ algorithm: 'skill-based' });

      expect(response.status).toBe(200);
      expect(response.body.data.algorithm).toBe('skill-based');
    });
  });

  describe('Max Applications Threshold', () => {
    it('should update max applications per officer', async () => {
      const response = await request(app)
        .put('/api/auto-assign/config')
        .send({ maxApplicationsPerOfficer: 20 });

      expect(response.status).toBe(200);
      expect(response.body.data.maxApplicationsPerOfficer).toBe(20);
    });

    it('should handle minimum threshold', async () => {
      const response = await request(app)
        .put('/api/auto-assign/config')
        .send({ maxApplicationsPerOfficer: 1 });

      expect(response.status).toBe(200);
      expect(response.body.data.maxApplicationsPerOfficer).toBe(1);
    });

    it('should handle maximum threshold', async () => {
      const response = await request(app)
        .put('/api/auto-assign/config')
        .send({ maxApplicationsPerOfficer: 50 });

      expect(response.status).toBe(200);
      expect(response.body.data.maxApplicationsPerOfficer).toBe(50);
    });
  });
});
