import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';

const hasCredentials = !!(supabaseUrl && supabaseKey);

if (!hasCredentials) {
  console.warn('⚠️  Supabase credentials not configured. File uploads will be disabled.');
}

// Only create client if credentials are available
export const supabase = hasCredentials 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

const BUCKET_NAME = 'evisit-documents';

/**
 * Upload a file to Supabase Storage
 */
export async function uploadDocument(
  file: Express.Multer.File,
  applicationId: string,
  documentType: string
): Promise<{ url: string; path: string }> {
  // If Supabase is not configured, use local mock storage for development
  if (!supabase) {
    console.warn('⚠️  Using mock storage (Supabase not configured)');
    const timestamp = Date.now();
    const sanitizedFileName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${applicationId}/${documentType}/${timestamp}_${sanitizedFileName}`;
    
    // Convert buffer to base64 data URL for inline display
    const base64 = file.buffer.toString('base64');
    const dataUrl = `data:${file.mimetype};base64,${base64}`;
    
    return {
      url: dataUrl,
      path: filePath,
    };
  }
  
  try {
    // Generate unique file path
    const timestamp = Date.now();
    const sanitizedFileName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${applicationId}/${documentType}/${timestamp}_${sanitizedFileName}`;

    // Upload to Supabase
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      throw new Error(`Supabase upload error: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    return {
      url: urlData.publicUrl,
      path: filePath,
    };
  } catch (error: any) {
    console.error('File upload error:', error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteDocument(filePath: string): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase storage is not configured');
  }
  
  try {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      throw new Error(`Delete error: ${error.message}`);
    }
  } catch (error: any) {
    console.error('File delete error:', error);
    throw new Error(`Failed to delete file: ${error.message}`);
  }
}

/**
 * Validate file before upload
 */
export function validateFile(file: Express.Multer.File): { valid: boolean; error?: string } {
  // Max file size: 10MB
  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  
  // Allowed MIME types
  const ALLOWED_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'application/pdf',
  ];

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds 10MB limit. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
    };
  }

  if (!ALLOWED_TYPES.includes(file.mimetype)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed: JPEG, PNG, WebP, PDF. Received: ${file.mimetype}`,
    };
  }

  return { valid: true };
}

/**
 * Create storage bucket if it doesn't exist (run once during setup)
 */
export async function initializeStorage(): Promise<void> {
  if (!supabase) {
    console.warn('⚠️  Skipping storage initialization - Supabase not configured');
    return;
  }
  
  try {
    // Check if bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    
    const bucketExists = buckets?.some((bucket) => bucket.name === BUCKET_NAME);

    if (!bucketExists) {
      const { error } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/webp',
          'application/pdf',
        ],
      });

      if (error) {
        console.error('Failed to create bucket:', error);
      } else {
        console.log(`✅ Storage bucket '${BUCKET_NAME}' created successfully`);
      }
    } else {
      console.log(`✅ Storage bucket '${BUCKET_NAME}' already exists`);
    }
  } catch (error) {
    console.error('Storage initialization error:', error);
  }
}
