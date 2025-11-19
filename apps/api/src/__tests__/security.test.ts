import { runSecurityScreening, checkWatchlist, addToWatchlist, removeFromWatchlist } from '../services/security';
import { PrismaClient } from '@krg-evisit/database';

// Mock Prisma
jest.mock('@krg-evisit/database', () => {
  const mockPrisma = {
    internalWatchlist: {
      findFirst: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    application: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  return {
    PrismaClient: jest.fn().mockImplementation(() => mockPrisma),
    prisma: mockPrisma,
  };
});

describe('Security Service', () => {
  let prisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    const { prisma: mockPrisma } = require('@krg-evisit/database');
    prisma = mockPrisma as jest.Mocked<PrismaClient>;
    jest.clearAllMocks();
  });

  describe('runSecurityScreening', () => {
    it('should return LOW risk for clean applicant', async () => {
      (prisma.internalWatchlist.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.application.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.application.findMany as jest.Mock).mockResolvedValue([]);

      const result = await runSecurityScreening(
        '123456789',
        '+9647501234567',
        'Ahmad Hassan'
      );

      expect(result.riskScore).toBe(0);
      expect(result.severity).toBe('LOW');
      expect(result.passed).toBe(true);
      expect(result.requiresSupervisorReview).toBe(false);
      expect(result.requiresManualReview).toBe(false);
      expect(result.flags).toHaveLength(0);
    });

    it('should detect watchlist matches', async () => {
      const mockWatchlistEntry = {
        nationalId: '123456789',
        flagType: 'SECURITY_CONCERN',
        reason: 'Previous fraud attempt',
        severity: 'HIGH',
        isActive: true,
        expiresAt: null,
      };

      (prisma.internalWatchlist.findFirst as jest.Mock).mockResolvedValue(mockWatchlistEntry);
      (prisma.application.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.application.findMany as jest.Mock).mockResolvedValue([]);

      const result = await runSecurityScreening(
        '123456789',
        '+9647501234567',
        'Ahmad Hassan'
      );

      expect(result.details.watchlistMatch).toBe(true);
      expect(result.flags).toContain('WATCHLIST: SECURITY_CONCERN - Previous fraud attempt');
      expect(result.riskScore).toBeGreaterThanOrEqual(50);
      expect(result.severity).toBe('HIGH');
      expect(result.passed).toBe(false);
      expect(result.requiresSupervisorReview).toBe(true);
    });

    it('should calculate correct risk scores for watchlist severities', async () => {
      // Test CRITICAL severity
      const criticalEntry = {
        nationalId: '123456789',
        flagType: 'FRAUD',
        reason: 'Criminal record',
        severity: 'CRITICAL',
        isActive: true,
        expiresAt: null,
      };

      (prisma.internalWatchlist.findFirst as jest.Mock).mockResolvedValue(criticalEntry);
      (prisma.application.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.application.findMany as jest.Mock).mockResolvedValue([]);

      const criticalResult = await runSecurityScreening('123456789', '+9647501234567', 'Test');
      expect(criticalResult.riskScore).toBeGreaterThanOrEqual(80);
      expect(criticalResult.severity).toBe('CRITICAL');
      
      // Test HIGH severity
      const highEntry = { ...criticalEntry, severity: 'HIGH' };
      (prisma.internalWatchlist.findFirst as jest.Mock).mockResolvedValue(highEntry);
      const highResult = await runSecurityScreening('123456789', '+9647501234567', 'Test');
      expect(highResult.riskScore).toBeGreaterThanOrEqual(50);
      
      // Test MEDIUM severity
      const mediumEntry = { ...criticalEntry, severity: 'MEDIUM' };
      (prisma.internalWatchlist.findFirst as jest.Mock).mockResolvedValue(mediumEntry);
      const mediumResult = await runSecurityScreening('123456789', '+9647501234567', 'Test');
      expect(mediumResult.riskScore).toBe(30);
      
      // Test LOW severity
      const lowEntry = { ...criticalEntry, severity: 'LOW' };
      (prisma.internalWatchlist.findFirst as jest.Mock).mockResolvedValue(lowEntry);
      const lowResult = await runSecurityScreening('123456789', '+9647501234567', 'Test');
      expect(lowResult.riskScore).toBe(15);
    });

    it('should detect duplicate applications', async () => {
      const mockDuplicate = {
        id: 'existing-app',
        nationalId: '123456789',
        referenceNumber: 'KRG-2025-000001',
        status: 'APPROVED',
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      };

      (prisma.internalWatchlist.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.application.findFirst as jest.Mock)
        .mockResolvedValueOnce(mockDuplicate) // For duplicate check
        .mockResolvedValueOnce(null) // For recent rejection
        .mockResolvedValueOnce(null); // For overstay
      (prisma.application.findMany as jest.Mock).mockResolvedValue([]);

      const result = await runSecurityScreening(
        '123456789',
        '+9647501234567',
        'Ahmad Hassan',
        'new-app-id'
      );

      expect(result.details.duplicateApplication).toBe(true);
      expect(result.flags).toContain('DUPLICATE: Application KRG-2025-000001 already exists');
      expect(result.riskScore).toBeGreaterThanOrEqual(40);
    });

    it('should exclude current application from duplicate check', async () => {
      (prisma.internalWatchlist.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.application.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.application.findMany as jest.Mock).mockResolvedValue([]);

      const result = await runSecurityScreening(
        '123456789',
        '+9647501234567',
        'Ahmad Hassan',
        'current-app-id'
      );

      expect(result.details.duplicateApplication).toBeUndefined();
    });

    it('should detect recent rejections', async () => {
      const mockRejection = {
        nationalId: '123456789',
        status: 'REJECTED',
        rejectionDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
      };

      (prisma.internalWatchlist.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.application.findFirst as jest.Mock)
        .mockResolvedValueOnce(null) // For duplicate
        .mockResolvedValueOnce(mockRejection) // For recent rejection
        .mockResolvedValueOnce(null); // For overstay
      (prisma.application.findMany as jest.Mock).mockResolvedValue([]);

      const result = await runSecurityScreening(
        '123456789',
        '+9647501234567',
        'Ahmad Hassan'
      );

      expect(result.details.recentRejection).toBe(true);
      expect(result.flags.some(f => f.startsWith('RECENT_REJECTION:'))).toBe(true);
      expect(result.riskScore).toBeGreaterThanOrEqual(25);
    });

    it('should detect overstay history', async () => {
      const mockOverstay = {
        nationalId: '123456789',
        overstayDays: 15,
      };

      (prisma.internalWatchlist.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.application.findFirst as jest.Mock)
        .mockResolvedValueOnce(null) // For duplicate
        .mockResolvedValueOnce(null) // For recent rejection
        .mockResolvedValueOnce(mockOverstay); // For overstay
      (prisma.application.findMany as jest.Mock).mockResolvedValue([]);

      const result = await runSecurityScreening(
        '123456789',
        '+9647501234567',
        'Ahmad Hassan'
      );

      expect(result.details.overstayHistory).toBe(true);
      expect(result.flags).toContain('OVERSTAY_HISTORY: 15 days overstay');
      expect(result.riskScore).toBeGreaterThanOrEqual(35);
    });

    it('should detect suspicious patterns', async () => {
      const mockSamePhoneApps = [
        { nationalId: '111111111', phoneNumber: '+9647501234567' },
        { nationalId: '222222222', phoneNumber: '+9647501234567' },
        { nationalId: '333333333', phoneNumber: '+9647501234567' },
      ];

      (prisma.internalWatchlist.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.application.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.application.findMany as jest.Mock).mockResolvedValue(mockSamePhoneApps);

      const result = await runSecurityScreening(
        '123456789',
        '+9647501234567',
        'Ahmad Hassan'
      );

      expect(result.details.suspiciousPattern).toBe(true);
      expect(result.flags.some(f => f.startsWith('SUSPICIOUS:'))).toBe(true);
      expect(result.riskScore).toBeGreaterThanOrEqual(30);
    });

    it('should accumulate risk scores correctly', async () => {
      const mockWatchlist = {
        nationalId: '123456789',
        flagType: 'FRAUD',
        reason: 'Test',
        severity: 'MEDIUM',
        isActive: true,
      };

      const mockDuplicate = {
        nationalId: '123456789',
        referenceNumber: 'KRG-2025-000001',
        status: 'SUBMITTED',
        createdAt: new Date(),
      };

      (prisma.internalWatchlist.findFirst as jest.Mock).mockResolvedValue(mockWatchlist);
      (prisma.application.findFirst as jest.Mock).mockResolvedValue(mockDuplicate);
      (prisma.application.findMany as jest.Mock).mockResolvedValue([]);

      const result = await runSecurityScreening(
        '123456789',
        '+9647501234567',
        'Ahmad Hassan'
      );

      expect(result.riskScore).toBe(100); // 30 (MEDIUM) + 40 (DUPLICATE) + 30 (SUSPICIOUS)
      expect(result.severity).toBe('CRITICAL');
      expect(result.passed).toBe(false);
    });

    it('should cap risk score at 100', async () => {
      const mockCriticalWatchlist = {
        nationalId: '123456789',
        flagType: 'FRAUD',
        reason: 'Test',
        severity: 'CRITICAL',
        isActive: true,
      };

      const mockDuplicate = {
        nationalId: '123456789',
        referenceNumber: 'KRG-2025-000001',
        status: 'SUBMITTED',
        createdAt: new Date(),
      };

      const mockOverstay = {
        nationalId: '123456789',
        overstayDays: 30,
      };

      (prisma.internalWatchlist.findFirst as jest.Mock).mockResolvedValue(mockCriticalWatchlist);
      (prisma.application.findFirst as jest.Mock)
        .mockResolvedValueOnce(mockDuplicate)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockOverstay);
      (prisma.application.findMany as jest.Mock).mockResolvedValue([
        { nationalId: '111' }, { nationalId: '222' }, { nationalId: '333' }
      ]);

      const result = await runSecurityScreening(
        '123456789',
        '+9647501234567',
        'Ahmad Hassan'
      );

      expect(result.riskScore).toBe(100); // Capped at 100
      expect(result.severity).toBe('CRITICAL');
    });

    it('should require supervisor review for HIGH and CRITICAL risks', async () => {
      const highRiskWatchlist = {
        nationalId: '123456789',
        flagType: 'SECURITY_CONCERN',
        reason: 'Test',
        severity: 'HIGH',
        isActive: true,
      };

      (prisma.internalWatchlist.findFirst as jest.Mock).mockResolvedValue(highRiskWatchlist);
      (prisma.application.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.application.findMany as jest.Mock).mockResolvedValue([]);

      const result = await runSecurityScreening(
        '123456789',
        '+9647501234567',
        'Ahmad Hassan'
      );

      expect(result.severity).toBe('HIGH');
      expect(result.passed).toBe(false);
      expect(result.requiresSupervisorReview).toBe(true);
      expect(result.requiresManualReview).toBe(true);
    });

    it('should require manual review for MEDIUM risk', async () => {
      const mediumRiskWatchlist = {
        nationalId: '123456789',
        flagType: 'OVERSTAY',
        reason: 'Test',
        severity: 'MEDIUM',
        isActive: true,
      };

      (prisma.internalWatchlist.findFirst as jest.Mock).mockResolvedValue(mediumRiskWatchlist);
      (prisma.application.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.application.findMany as jest.Mock).mockResolvedValue([]);

      const result = await runSecurityScreening(
        '123456789',
        '+9647501234567',
        'Ahmad Hassan'
      );

      expect(result.severity).toBe('MEDIUM');
      expect(result.passed).toBe(true);
      expect(result.requiresSupervisorReview).toBe(false);
      expect(result.requiresManualReview).toBe(true);
    });
  });

  describe('checkWatchlist', () => {
    it('should return true if in active watchlist', async () => {
      const mockEntry = {
        nationalId: '123456789',
        isActive: true,
        expiresAt: null,
      };

      (prisma.internalWatchlist.findFirst as jest.Mock).mockResolvedValue(mockEntry);

      const result = await checkWatchlist('123456789');

      expect(result).toBe(true);
    });

    it('should return false if not in watchlist', async () => {
      (prisma.internalWatchlist.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await checkWatchlist('123456789');

      expect(result).toBe(false);
    });

    it('should check expiration date', async () => {
      const mockEntry = {
        nationalId: '123456789',
        isActive: true,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Expires tomorrow
      };

      (prisma.internalWatchlist.findFirst as jest.Mock).mockResolvedValue(mockEntry);

      const result = await checkWatchlist('123456789');

      expect(result).toBe(true);
    });

    it('should return false for inactive entries', async () => {
      const mockEntry = {
        nationalId: '123456789',
        isActive: false,
      };

      (prisma.internalWatchlist.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await checkWatchlist('123456789');

      expect(result).toBe(false);
    });
  });

  describe('addToWatchlist', () => {
    it('should add entry to watchlist successfully', async () => {
      (prisma.internalWatchlist.create as jest.Mock).mockResolvedValue({
        id: '1',
        nationalId: '123456789',
        fullName: 'Ahmad Hassan',
        reason: 'Test reason',
        flagType: 'FRAUD',
        severity: 'HIGH',
      });

      await addToWatchlist(
        '123456789',
        'Ahmad Hassan',
        'Test reason',
        'FRAUD',
        'HIGH'
      );

      expect(prisma.internalWatchlist.create).toHaveBeenCalledWith({
        data: {
          nationalId: '123456789',
          fullName: 'Ahmad Hassan',
          reason: 'Test reason',
          flagType: 'FRAUD',
          severity: 'HIGH',
          expiresAt: null,
          createdBy: null,
        },
      });
    });

    it('should accept expiration date', async () => {
      (prisma.internalWatchlist.create as jest.Mock).mockResolvedValue({});

      const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      await addToWatchlist(
        '123456789',
        'Ahmad Hassan',
        'Test reason',
        'OVERSTAY',
        'MEDIUM',
        expiryDate
      );

      expect(prisma.internalWatchlist.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            expiresAt: expiryDate,
          }),
        })
      );
    });

    it('should accept createdBy parameter', async () => {
      (prisma.internalWatchlist.create as jest.Mock).mockResolvedValue({});

      await addToWatchlist(
        '123456789',
        'Ahmad Hassan',
        'Test reason',
        'FRAUD',
        'HIGH',
        undefined,
        'officer-123'
      );

      expect(prisma.internalWatchlist.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            createdBy: 'officer-123',
          }),
        })
      );
    });
  });

  describe('removeFromWatchlist', () => {
    it('should deactivate watchlist entry', async () => {
      (prisma.internalWatchlist.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      await removeFromWatchlist('123456789');

      expect(prisma.internalWatchlist.updateMany).toHaveBeenCalledWith({
        where: {
          nationalId: '123456789',
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });
    });

    it('should remove specific flag type only', async () => {
      (prisma.internalWatchlist.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      await removeFromWatchlist('123456789', 'FRAUD');

      expect(prisma.internalWatchlist.updateMany).toHaveBeenCalledWith({
        where: {
          nationalId: '123456789',
          isActive: true,
          flagType: 'FRAUD',
        },
        data: {
          isActive: false,
        },
      });
    });

    it('should handle removing non-existent entry', async () => {
      (prisma.internalWatchlist.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

      await removeFromWatchlist('999999999');

      expect(prisma.internalWatchlist.updateMany).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null values gracefully', async () => {
      (prisma.internalWatchlist.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.application.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.application.findMany as jest.Mock).mockResolvedValue([]);

      const result = await runSecurityScreening(
        '123456789',
        '+9647501234567',
        'Ahmad Hassan'
      );

      expect(result).toBeDefined();
      expect(result.riskScore).toBe(0);
    });

    it('should handle database errors', async () => {
      (prisma.internalWatchlist.findFirst as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await expect(runSecurityScreening(
        '123456789',
        '+9647501234567',
        'Ahmad Hassan'
      )).rejects.toThrow('Database error');
    });
  });
});

