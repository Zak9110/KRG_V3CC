import { Router, Request, Response } from 'express';
import multer from 'multer';
import { prisma } from '@krg-evisit/database';
import { uploadDocument, validateFile } from '../services/storage';

const router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 5, // Max 5 files per request
  },
});

/**
 * POST /api/upload
 * Upload documents for an application
 */
router.post(
  '/',
  upload.array('files', 5),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const files = req.files as Express.Multer.File[];
      const { applicationId, documentType } = req.body;

      // Validation
      if (!files || files.length === 0) {
        res.status(400).json({
          success: false,
          error: { message: 'No files provided' },
        });
        return;
      }

      if (!applicationId) {
        res.status(400).json({
          success: false,
          error: { message: 'Application ID is required' },
        });
        return;
      }

      if (!documentType) {
        res.status(400).json({
          success: false,
          error: { message: 'Document type is required' },
        });
        return;
      }

      // Valid document types
      const validTypes = ['NATIONAL_ID', 'NATIONAL_ID_BACK', 'PASSPORT', 'SUPPORTING_DOC', 'VISITOR_PHOTO'];
      if (!validTypes.includes(documentType)) {
        res.status(400).json({
          success: false,
          error: {
            message: `Invalid document type. Allowed: ${validTypes.join(', ')}`,
          },
        });
        return;
      }

      // Check if application exists
      const application = await prisma.application.findUnique({
        where: { id: applicationId },
      });

      if (!application) {
        res.status(404).json({
          success: false,
          error: { message: 'Application not found' },
        });
        return;
      }

      // Validate and upload each file
      const uploadedDocuments = [];
      const errors = [];

      for (const file of files) {
        // Validate file
        const validation = validateFile(file);
        if (!validation.valid) {
          errors.push({
            fileName: file.originalname,
            error: validation.error,
          });
          continue;
        }

        try {
          // Upload to Supabase
          const { url, path } = await uploadDocument(file, applicationId, documentType);

          // Save to database
          const document = await prisma.document.create({
            data: {
              applicationId,
              documentType,
              fileUrl: url,
              fileName: file.originalname,
              fileSize: file.size,
              mimeType: file.mimetype,
            },
          });

          uploadedDocuments.push(document);
        } catch (uploadError: any) {
          errors.push({
            fileName: file.originalname,
            error: uploadError.message,
          });
        }
      }

      res.status(200).json({
        success: true,
        data: {
          uploaded: uploadedDocuments,
          errors: errors.length > 0 ? errors : undefined,
        },
        message: `Successfully uploaded ${uploadedDocuments.length} of ${files.length} files`,
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to upload files', details: error.message },
      });
    }
  }
);

/**
 * GET /api/upload/:applicationId
 * Get all documents for an application
 */
router.get('/:applicationId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { applicationId } = req.params;

    const documents = await prisma.document.findMany({
      where: { applicationId },
      orderBy: { uploadedAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      data: documents,
    });
  } catch (error: any) {
    console.error('Get documents error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to retrieve documents' },
    });
  }
});

/**
 * DELETE /api/upload/:documentId
 * Delete a document
 */
router.delete('/:documentId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { documentId } = req.params;

    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      res.status(404).json({
        success: false,
        error: { message: 'Document not found' },
      });
      return;
    }

    // Delete from database
    await prisma.document.delete({
      where: { id: documentId },
    });

    // Note: File deletion from Supabase would require storing the file path
    // For now, we only delete the database record

    res.status(200).json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete document error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to delete document' },
    });
  }
});

export default router;
