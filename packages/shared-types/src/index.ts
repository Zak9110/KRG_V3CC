// ===================================================================
// ENUMS
// ===================================================================

export enum ApplicationStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  PENDING_DOCUMENTS = 'PENDING_DOCUMENTS',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PERMIT_ISSUED = 'PERMIT_ISSUED',
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  EXITED = 'EXITED'
}

export enum UserRole {
  OFFICER = 'OFFICER',
  SUPERVISOR = 'SUPERVISOR',
  DIRECTOR = 'DIRECTOR',
  ADMIN = 'ADMIN'
}

export enum VisitPurpose {
  TOURISM = 'TOURISM',
  BUSINESS = 'BUSINESS',
  FAMILY_VISIT = 'FAMILY_VISIT',
  MEDICAL = 'MEDICAL',
  EDUCATION = 'EDUCATION',
  OTHER = 'OTHER'
}

export enum DocumentType {
  PASSPORT = 'PASSPORT',
  NATIONAL_ID = 'NATIONAL_ID',
  ACCOMMODATION_PROOF = 'ACCOMMODATION_PROOF',
  OTHER = 'OTHER'
}

export enum PriorityLevel {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

// ===================================================================
// INTERFACES
// ===================================================================

export interface Application {
  id: string;
  referenceNumber: string;

  // Visitor Information
  fullName: string;
  nationalId: string;
  phoneNumber: string;
  email?: string;
  dateOfBirth: Date;
  nationality: string;

  // Enhanced Visitor Profiling
  occupation?: string;
  educationLevel?: string;
  monthlyIncome?: string;
  previousVisits?: number;
  
  // Visit Details
  originGovernorate: string;
  destinationGovernorate: string;
  visitPurpose: VisitPurpose;
  visitStartDate: Date;
  visitEndDate: Date;
  declaredAccommodation?: string;

  // Economic Impact Tracking
  estimatedStayDuration?: number;
  accommodationType?: string;
  dailySpending?: number;
  
  // Processing
  status: ApplicationStatus;
  assignedOfficerId?: string;
  priorityLevel: PriorityLevel;
  
  // Decisions
  approvalDate?: Date;
  rejectionDate?: Date;
  rejectionReason?: string;
  
  // Entry/Exit
  entryTimestamp?: Date;
  exitTimestamp?: Date;
  qrCode?: string;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
}

export interface Document {
  id: string;
  applicationId: string;
  documentType: DocumentType;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: Date;
}

export interface EntryExitLog {
  id: string;
  applicationId: string;
  logType: 'ENTRY' | 'EXIT';
  checkpointName: string;
  officerId?: string;
  recordedAt: Date;
  notes?: string;
}

// ===================================================================
// API TYPES
// ===================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface PaginatedResponse<T = any> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

// ===================================================================
// FORM DATA TYPES
// ===================================================================

export interface ApplicationFormData {
  fullName: string;
  nationalId: string;
  phoneNumber: string;
  email?: string;
  dateOfBirth: string;
  nationality: string;

  // Enhanced Visitor Profiling
  occupation?: string;
  educationLevel?: string;
  monthlyIncome?: string;
  previousVisits?: number;

  // Visit Details
  originGovernorate: string;
  destinationGovernorate: string;
  visitPurpose: VisitPurpose;
  visitStartDate: string;
  visitEndDate: string;
  declaredAccommodation?: string;

  // Economic Impact Tracking
  accommodationType?: string;
  dailySpending?: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface ApprovalDecision {
  applicationId: string;
  action: 'APPROVE' | 'REJECT' | 'REQUEST_MORE_INFO';
  reason?: string;
  notes?: string;
}

export interface QRPayload {
  v: string; // version
  ref: string; // reference number
  appId: string;
  name: string;
  exp: string; // expiry date
  sig: string; // signature
}

// ===================================================================
// CONSTANTS
// ===================================================================

export const GOVERNORATES = {
  IRAQ: [
    'Baghdad',
    'Basra',
    'Najaf',
    'Karbala',
    'Babylon',
    'Anbar',
    'Diyala',
    'Wasit',
    'Saladin',
    'Nineveh',
    'Kirkuk',
    'Dhi Qar',
    'Maysan',
    'Al-Qādisiyyah',
    'Muthanna'
  ],
  KRG: [
    'Erbil',
    'Sulaymaniyah',
    'Duhok',
    'Halabja'
  ]
};

export const VISIT_PURPOSES = [
  { value: 'TOURISM', label: { en: 'Tourism', ar: 'سياحة' } },
  { value: 'BUSINESS', label: { en: 'Business', ar: 'عمل' } },
  { value: 'FAMILY_VISIT', label: { en: 'Family Visit', ar: 'زيارة عائلية' } },
  { value: 'MEDICAL', label: { en: 'Medical', ar: 'طبي' } },
  { value: 'EDUCATION', label: { en: 'Education', ar: 'تعليم' } },
  { value: 'OTHER', label: { en: 'Other', ar: 'أخرى' } }
];

export const OCCUPATIONS = [
  { value: 'STUDENT', label: { en: 'Student', ar: 'طالب' } },
  { value: 'BUSINESS', label: { en: 'Business Professional', ar: 'مهني أعمال' } },
  { value: 'TOURISM', label: { en: 'Tourism/Hospitality', ar: 'سياحة/ضيافة' } },
  { value: 'MEDICAL', label: { en: 'Medical Professional', ar: 'مهني طبي' } },
  { value: 'ENGINEERING', label: { en: 'Engineering', ar: 'هندسة' } },
  { value: 'TEACHING', label: { en: 'Teaching/Education', ar: 'تعليم' } },
  { value: 'GOVERNMENT', label: { en: 'Government Employee', ar: 'موظف حكومي' } },
  { value: 'OTHER', label: { en: 'Other', ar: 'أخرى' } }
];

export const EDUCATION_LEVELS = [
  { value: 'PRIMARY', label: { en: 'Primary School', ar: 'مدرسة ابتدائية' } },
  { value: 'SECONDARY', label: { en: 'Secondary School', ar: 'مدرسة ثانوية' } },
  { value: 'UNIVERSITY', label: { en: 'University', ar: 'جامعة' } },
  { value: 'POSTGRADUATE', label: { en: 'Postgraduate', ar: 'دراسات عليا' } },
  { value: 'NONE', label: { en: 'No Formal Education', ar: 'لا تعليم رسمي' } }
];

export const INCOME_RANGES = [
  { value: 'UNDER_500', label: { en: 'Under $500', ar: 'أقل من 500 دولار' } },
  { value: '500_1000', label: { en: '$500 - $1,000', ar: '500 - 1000 دولار' } },
  { value: '1000_2000', label: { en: '$1,000 - $2,000', ar: '1000 - 2000 دولار' } },
  { value: '2000_5000', label: { en: '$2,000 - $5,000', ar: '2000 - 5000 دولار' } },
  { value: 'OVER_5000', label: { en: 'Over $5,000', ar: 'أكثر من 5000 دولار' } },
  { value: 'PREFER_NOT_SAY', label: { en: 'Prefer not to say', ar: 'أفضل عدم الإفصاح' } }
];

export const ACCOMMODATION_TYPES = [
  { value: 'HOTEL', label: { en: 'Hotel/Resort', ar: 'فندق/منتجع' } },
  { value: 'RENTAL', label: { en: 'Rental Apartment', ar: 'شقة مستأجرة' } },
  { value: 'FAMILY_HOME', label: { en: 'Family/Friends Home', ar: 'منزل عائلة/أصدقاء' } },
  { value: 'HOSTEL', label: { en: 'Hostel/Backpacker', ar: 'نزل/مضيف' } },
  { value: 'OTHER', label: { en: 'Other', ar: 'أخرى' } }
];
