import { Router, Request, Response } from 'express';
import { prisma } from '@krg-evisit/database';

const router = Router();

/**
 * GET /api/watchlist
 * Get all watchlist entries (with optional filters)
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { isActive, flagType, severity } = req.query;

    const where: any = {};
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (flagType) where.flagType = flagType;
    if (severity) where.severity = severity;

    const watchlistEntries = await prisma.internalWatchlist.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: watchlistEntries });
  } catch (error: any) {
    console.error('Get watchlist error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch watchlist' }
    });
  }
});

/**
 * POST /api/watchlist
 * Add a new entry to the watchlist
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      nationalId, 
      fullName, 
      motherFullName,
      dateOfBirth,
      phoneNumber,
      nationality,
      governorate,
      reason, 
      flagType, 
      severity, 
      notes,
      expiresAt, 
      createdBy 
    } = req.body;

    // Validate required fields
    if (!nationalId || !fullName || !reason || !flagType) {
      res.status(400).json({
        success: false,
        error: { message: 'Missing required fields: nationalId, fullName, reason, flagType' }
      });
      return;
    }

    // Check if already exists
    const existing = await prisma.internalWatchlist.findFirst({
      where: { nationalId, isActive: true }
    });

    if (existing) {
      res.status(400).json({
        success: false,
        error: { message: 'This person is already on the watchlist' }
      });
      return;
    }

    const entry = await prisma.internalWatchlist.create({
      data: {
        nationalId,
        fullName,
        motherFullName: motherFullName || null,
        dateOfBirth: dateOfBirth || null,
        phoneNumber: phoneNumber || null,
        nationality: nationality || null,
        governorate: governorate || null,
        reason,
        flagType,
        severity: severity || 'MEDIUM',
        notes: notes || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdBy: createdBy || 'supervisor-1',
        isActive: true
      }
    });

    res.json({ success: true, data: entry });
  } catch (error: any) {
    console.error('Add watchlist entry error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta
    });
    res.status(500).json({
      success: false,
      error: { 
        message: 'Failed to add watchlist entry',
        details: error.message 
      }
    });
  }
});

/**
 * PATCH /api/watchlist/:id
 * Update a watchlist entry
 */
router.patch('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { fullName, reason, flagType, severity, isActive, expiresAt } = req.body;

    const data: any = {};
    if (fullName !== undefined) data.fullName = fullName;
    if (reason !== undefined) data.reason = reason;
    if (flagType !== undefined) data.flagType = flagType;
    if (severity !== undefined) data.severity = severity;
    if (isActive !== undefined) data.isActive = isActive;
    if (expiresAt !== undefined) data.expiresAt = expiresAt ? new Date(expiresAt) : null;

    const entry = await prisma.internalWatchlist.update({
      where: { id },
      data
    });

    res.json({ success: true, data: entry });
  } catch (error: any) {
    console.error('Update watchlist entry error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to update watchlist entry' }
    });
  }
});

/**
 * DELETE /api/watchlist/:id
 * Remove an entry from the watchlist (soft delete by setting isActive=false)
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const entry = await prisma.internalWatchlist.update({
      where: { id },
      data: { isActive: false }
    });

    res.json({ success: true, data: entry });
  } catch (error: any) {
    console.error('Delete watchlist entry error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to delete watchlist entry' }
    });
  }
});

/**
 * GET /api/watchlist/check/:nationalId
 * Check if a person is on the watchlist
 */
router.get('/check/:nationalId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { nationalId } = req.params;

    const entry = await prisma.internalWatchlist.findFirst({
      where: {
        nationalId,
        isActive: true
      }
    });

    if (entry) {
      res.json({
        success: true,
        data: {
          onWatchlist: true,
          entry
        }
      });
    } else {
      res.json({
        success: true,
        data: {
          onWatchlist: false,
          entry: null
        }
      });
    }
  } catch (error: any) {
    console.error('Check watchlist error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to check watchlist' }
    });
  }
});

/**
 * GET /api/watchlist/stats
 * Get watchlist statistics
 */
router.get('/stats', async (req: Request, res: Response): Promise<void> => {
  try {
    const total = await prisma.internalWatchlist.count({ where: { isActive: true } });
    
    const byFlagType = await prisma.internalWatchlist.groupBy({
      by: ['flagType'],
      where: { isActive: true },
      _count: true
    });

    const bySeverity = await prisma.internalWatchlist.groupBy({
      by: ['severity'],
      where: { isActive: true },
      _count: true
    });

    res.json({
      success: true,
      data: {
        total,
        byFlagType: Object.fromEntries(byFlagType.map(f => [f.flagType, f._count])),
        bySeverity: Object.fromEntries(bySeverity.map(s => [s.severity, s._count]))
      }
    });
  } catch (error: any) {
    console.error('Get watchlist stats error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch watchlist stats' }
    });
  }
});

export default router;
