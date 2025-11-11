# 🏛️ KRG e-Visit System

> **Government-Grade Digital Immigration Management Platform**  
> Complete end-to-end solution for electronic visa applications, officer workflows, supervisor management, and director analytics for the Kurdistan Region of Iraq.

[![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)]()
[![Progress](https://img.shields.io/badge/Feature%20Complete-100%25-success)]()
[![Tests](https://img.shields.io/badge/Tests-Passing-success)]()
[![Stack](https://img.shields.io/badge/Stack-PNPM%20Monorepo-purple)]()

---

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Testing](#testing)
- [Deployment](#deployment)
- [API Documentation](#api-documentation)
- [User Roles](#user-roles)
- [Screenshots](#screenshots)
- [Contributing](#contributing)
- [License](#license)

---

## 🎯 Overview

The **KRG e-Visit System** is a comprehensive digital platform designed to modernize and streamline immigration processes. Built with Next.js 14, Express.js, and Prisma, it provides:

- **Public-facing application portal** with multi-step form, document upload, and phone verification
- **Officer dashboard** for application review, document verification, and decision making
- **Supervisor management portal** with workload distribution, auto-assignment, and watchlist management
- **Director analytics dashboard** with real-time insights, advanced filtering, and data export
- **Checkpoint verification system** with QR code scanning for entry/exit tracking
- **Full bilingual support** (English/Arabic) with RTL layout support

### Problem Statement
Traditional visa/permit systems rely on paper forms, manual processing, long queues, and lack of transparency. This creates:
- Delays in application processing
- Security concerns with duplicate/fraudulent applications
- Inefficient officer workload distribution
- Limited visibility for management

### Our Solution
A modern, secure, and efficient digital platform that:
- Automates application processing with intelligent assignment algorithms
- Provides real-time tracking and transparency for applicants
- Enables data-driven decision making with comprehensive analytics
- Supports multiple languages with cultural considerations (RTL for Arabic)

---

## ✨ Key Features

### 🌐 Public Features
- **Multi-step Application Form**: 4-step progressive form with validation
- **SMS/OTP Verification**: Twilio-powered phone number verification
- **Document Upload**: Secure file storage with Supabase integration
- **Application Tracking**: Real-time status updates with reference number
- **Bilingual Interface**: English and Arabic with automatic RTL support

### 👮 Officer Dashboard
- **Application Queue**: View all assigned applications
- **Document Review**: Inline document viewer with notes
- **Decision Making**: Approve/Reject with detailed reasoning
- **Workload Tracking**: Personal statistics and efficiency metrics

### 👔 Supervisor Dashboard
- **Officer Workload Management**: Visual workload distribution
- **Auto-Assignment Settings**: 3 algorithms (round-robin, load-balanced, skill-based)
- **Watchlist Management**: Add/remove suspicious persons with severity levels
- **Assignment Review**: Reassign applications, monitor processing times
- **Real-time Overview**: Active officers, unassigned applications, watchlist matches

### 📊 Director Analytics Dashboard
- **7 Analytics Sections**: Overview, Demographics, Geographic, Temporal, Purposes, Performance, Activity
- **Advanced Charts**: Area, Line, Bar, Pie, Donut charts powered by Recharts
- **Multi-filter System**: 6 independent filters (governorate, gender, age, purpose, duration, date range)
- **Data Export**: CSV, PDF, Excel export functionality
- **Real-time Auto-refresh**: Configurable 30s/60s intervals

### 🚨 Checkpoint System
- **QR Code Scanning**: HTML5 QR scanner for entry/exit verification
- **HMAC Signature Validation**: Cryptographic permit verification
- **Entry/Exit Logging**: Complete audit trail with timestamps
- **Overstay Detection**: Automatic flagging of expired permits

### 🔒 Security Features
- **JWT Authentication**: Secure token-based auth with role-based access control
- **Password Hashing**: bcrypt with salt rounds
- **Rate Limiting**: 100 req/15min general, 10 req/15min for auth endpoints
- **Security Headers**: Helmet.js with CSP, HSTS, X-Frame-Options
- **CORS Protection**: Whitelist-based origin validation
- **Environment Validation**: Zod schema validation on server startup

### 🧪 Testing & Quality
- **Unit Tests**: Jest tests for auth, auto-assignment, components
- **Integration Tests**: Supertest for API endpoint testing
- **Component Tests**: React Testing Library for UI components
- **Coverage Threshold**: 70%+ for critical paths
- **Continuous Testing**: Watch mode for development

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **UI Library**: React 18
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Internationalization**: next-intl 4.5.0
- **Charts**: Recharts 3.3.0
- **Icons**: Lucide React
- **Date Utilities**: date-fns
- **QR Scanner**: html5-qrcode

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js 4
- **Language**: TypeScript
- **ORM**: Prisma 6
- **Database**: SQLite (dev), PostgreSQL (prod)
- **Authentication**: JWT + bcrypt
- **File Storage**: Supabase Storage
- **SMS/WhatsApp**: Twilio
- **Email**: Resend

### DevOps & Tools
- **Package Manager**: pnpm 8 (monorepo)
- **Testing**: Jest 30, React Testing Library, Supertest
- **Validation**: Zod
- **Logging**: Winston 3
- **Security**: Helmet, express-rate-limit
- **Build Tool**: TypeScript Compiler, esbuild
- **Version Control**: Git

### Deployment
- **Frontend**: Vercel (Edge Network)
- **Backend**: Railway (Managed Containers)
- **Database**: Railway PostgreSQL
- **File Storage**: Supabase Storage

---

## 🏗️ Architecture

```
KRGv3/
├── apps/
│   ├── api/                    # Express.js Backend API
│   │   ├── src/
│   │   │   ├── routes/         # API route handlers
│   │   │   │   ├── auth.ts     # JWT authentication
│   │   │   │   ├── applications.ts
│   │   │   │   ├── auto-assign.ts
│   │   │   │   ├── watchlist.ts
│   │   │   │   ├── analytics.ts
│   │   │   │   ├── checkpoint.ts
│   │   │   │   └── ...
│   │   │   ├── services/       # Business logic
│   │   │   ├── middleware/     # Auth, validation
│   │   │   ├── config/         # Env validation, logger
│   │   │   └── __tests__/      # Jest unit tests
│   │   ├── railway.json        # Railway deployment config
│   │   └── package.json
│   │
│   └── web/                    # Next.js Frontend
│       ├── src/
│       │   ├── app/            # App Router pages
│       │   │   ├── [locale]/   # Internationalized routes
│       │   │   │   ├── dashboard/
│       │   │   │   │   ├── officer/
│       │   │   │   │   ├── supervisor/
│       │   │   │   │   └── director/
│       │   │   │   ├── apply/
│       │   │   │   ├── track/
│       │   │   │   └── checkpoint/
│       │   │   └── globals.css
│       │   ├── components/     # Reusable components
│       │   ├── i18n/           # Translation files
│       │   │   ├── en.json
│       │   │   └── ar.json
│       │   ├── middleware.ts   # next-intl middleware
│       │   └── i18n.ts         # i18n config
│       ├── vercel.json         # Vercel deployment config
│       └── package.json
│
├── packages/
│   ├── database/               # Prisma ORM
│   │   ├── prisma/
│   │   │   └── schema.prisma   # Database schema
│   │   └── src/
│   │       ├── index.ts        # Prisma client export
│   │       └── seed.ts         # Database seeding
│   │
│   └── shared-types/           # Shared TypeScript types
│       └── src/index.ts
│
├── pnpm-workspace.yaml         # PNPM monorepo config
├── package.json                # Root package scripts
└── README.md                   # This file
```

### Data Flow

1. **Application Submission**: User fills form → Phone OTP verification → Document upload → API stores in DB → Auto-assignment triggered
2. **Officer Review**: Officer views assigned apps → Reviews documents → Approves/Rejects → System generates QR code
3. **Supervisor Management**: Monitors workload → Configures auto-assignment → Manages watchlist → Reassigns apps if needed
4. **Director Analytics**: Real-time dashboard → Filters data → Exports reports → Tracks KPIs
5. **Checkpoint Verification**: Scan QR code → Validate signature → Log entry/exit → Check overstay

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18.0 or higher ([Download](https://nodejs.org/))
- **pnpm** 8.0 or higher (`npm install -g pnpm`)
- **Git** ([Download](https://git-scm.com/))
- **Supabase Account** (for file storage)
- **Twilio Account** (for SMS/WhatsApp)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/krg-evisit.git
   cd krg-evisit
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**

   Create `.env` file in `apps/api/`:
   ```bash
   cd apps/api
   cp .env.example .env
   ```

   Edit `.env` with your credentials (see [Environment Variables](#environment-variables))

4. **Initialize database**
   ```bash
   cd ../../packages/database
   pnpm prisma generate
   pnpm prisma migrate dev --name init
   pnpm prisma db seed
   ```

   This creates test users:
   - `admin@krg-evisit.gov` / `Admin@123` (ADMIN)
   - `officer@test.com` / `password123` (OFFICER)
   - `supervisor@test.com` / `password123` (SUPERVISOR)
   - `director@test.com` / `password123` (DIRECTOR)

5. **Start development servers**

   **Option A: Run both servers together (recommended)**
   ```bash
   cd ../../
   pnpm run dev
   ```

   **Option B: Run servers separately**
   ```bash
   # Terminal 1: Start API server
   cd apps/api
   pnpm run dev
   # API runs on http://localhost:3001

   # Terminal 2: Start web server
   cd apps/web
   pnpm run dev
   # Web runs on http://localhost:3000
   ```

6. **Access the application**
   - Frontend: http://localhost:3000/en
   - API Health: http://localhost:3001/health
   - Login: http://localhost:3000/en/login

---

## 🔐 Environment Variables

### Required Variables (apps/api/.env)

```env
# Server Configuration
NODE_ENV=development
PORT=3001

# JWT Secret (generate with: openssl rand -base64 32)
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters

# Database
DATABASE_URL="file:./dev.db"  # SQLite for development
# DATABASE_URL="postgresql://user:password@host:5432/dbname"  # PostgreSQL for production

# Twilio (SMS/WhatsApp)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_WHATSAPP_NUMBER=+1234567890

# Supabase (File Storage)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key
SUPABASE_BUCKET_NAME=evisit-documents

# Email (Optional - Resend)
RESEND_API_KEY=re_your_resend_api_key

# CORS
FRONTEND_URL=http://localhost:3000
```

### Optional Variables

```env
# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=./logs
```

---

## 🧪 Testing

### Run All Tests

```bash
# Run all tests in monorepo
pnpm test

# Run API tests only
cd apps/api
pnpm test

# Run web tests only
cd apps/web
pnpm test
```

### Watch Mode (Development)

```bash
pnpm test:watch
```

### Coverage Report

```bash
pnpm test:coverage
```

Target coverage: **70%+** for critical paths

### Test Structure

- **API Tests**: `apps/api/src/__tests__/`
  - `auth.test.ts` - Authentication & JWT
  - `auto-assign.test.ts` - Auto-assignment algorithms
  - More tests for watchlist, analytics, etc.

- **Component Tests**: `apps/web/src/components/__tests__/`
  - `LanguageSwitcher.test.tsx` - Language switching
  - More tests for dashboard components

---

## 🚢 Deployment

### Automatic Deployment (Recommended)

**Frontend (Vercel)**

1. Connect GitHub repo to Vercel
2. Configure build settings:
   - **Root Directory**: `apps/web`
   - **Build Command**: `cd ../.. && pnpm run build --filter @krg-evisit/web`
   - **Output Directory**: `.next`
3. Add environment variables (none required for frontend)
4. Deploy!

**Backend (Railway)**

1. Create new Railway project
2. Add PostgreSQL database plugin
3. Add web service from GitHub repo
4. Configure settings:
   - **Root Directory**: `apps/api`
   - **Build Command**: `cd ../.. && pnpm install && pnpm run build --filter @krg-evisit/api`
   - **Start Command**: `cd apps/api && pnpm start`
5. Add environment variables (see `.env` section)
6. Deploy!

### Manual Deployment

```bash
# Build all packages
pnpm run build

# Production API server
cd apps/api
NODE_ENV=production pnpm start

# Production web server
cd apps/web
NODE_ENV=production pnpm start
```

---

## 📚 API Documentation

### Base URL
- Development: `http://localhost:3001/api`
- Production: `https://your-api.railway.app/api`

### Authentication

All protected endpoints require JWT token in header:
```
Authorization: Bearer <your_jwt_token>
```

### Key Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/login` | User login, returns JWT | No |
| GET | `/applications` | List all applications | Yes (OFFICER+) |
| POST | `/applications` | Submit new application | No |
| GET | `/applications/:id` | Get application details | Yes |
| PATCH | `/applications/:id` | Update application | Yes (OFFICER+) |
| GET | `/analytics/director` | Director analytics data | Yes (DIRECTOR) |
| GET | `/analytics/supervisor` | Supervisor analytics data | Yes (SUPERVISOR) |
| GET | `/watchlist` | List watchlist entries | Yes (SUPERVISOR+) |
| POST | `/watchlist` | Add watchlist entry | Yes (SUPERVISOR+) |
| DELETE | `/watchlist/:id` | Remove watchlist entry | Yes (SUPERVISOR+) |
| GET | `/auto-assign/config` | Get auto-assign settings | Yes (SUPERVISOR+) |
| PUT | `/auto-assign/config` | Update auto-assign settings | Yes (SUPERVISOR+) |
| POST | `/auto-assign/trigger` | Trigger auto-assignment | Yes (SUPERVISOR+) |
| POST | `/checkpoint/scan` | Verify QR code | Yes (CHECKPOINT_OFFICER) |

For complete API documentation with request/response examples, see [API_REFERENCE.md](./API_REFERENCE.md)

---

## 👥 User Roles

### 1. **Applicant** (Public)
- Submit new applications
- Upload required documents
- Verify phone number with OTP
- Track application status
- No login required

### 2. **Officer**
- Review assigned applications
- View uploaded documents
- Approve or reject applications
- Add processing notes
- View personal workload statistics

### 3. **Supervisor**
- View all applications and officers
- Manage officer workload distribution
- Configure auto-assignment algorithms
- Manage internal watchlist
- Reassign applications
- View team performance metrics

### 4. **Director**
- Access comprehensive analytics dashboard
- View application trends and patterns
- Filter data by multiple dimensions
- Export reports (CSV, PDF, Excel)
- Monitor system-wide KPIs
- No direct application management

### 5. **Checkpoint Officer**
- Scan QR codes at checkpoints
- Verify permit validity
- Log entry/exit events
- Flag overstay violations

---

## 📸 Screenshots

### Public Application Portal
![Application Form](./screenshots/application-form.png)

### Officer Dashboard
![Officer Dashboard](./screenshots/officer-dashboard.png)

### Supervisor Management Portal
![Supervisor Dashboard](./screenshots/supervisor-dashboard.png)

### Director Analytics Dashboard
![Director Analytics](./screenshots/director-analytics.png)

### Language Switching (English/Arabic)
![Language Switch](./screenshots/language-switch.png)

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Code Standards
- TypeScript for all new code
- Follow existing code style
- Write tests for new features
- Update documentation
- Ensure 70%+ test coverage

---

## 📊 Project Status

- ✅ **Phase 1**: Core application system (Complete)
- ✅ **Phase 2**: Officer & Supervisor dashboards (Complete)
- ✅ **Phase 3**: Director analytics & reporting (Complete)
- ✅ **Phase 4**: Arabic language support (Complete)
- ✅ **Phase 5**: Auto-assignment algorithm (Complete)
- ✅ **Phase 6**: Testing infrastructure (Complete)
- ✅ **Phase 7**: Production hardening (Complete)
- 🔄 **Phase 8**: Documentation & demo materials (In Progress)

**Overall Progress**: 12/12 features complete (100%)  
**Production Ready**: Yes  
**Test Coverage**: 70%+ (critical paths)  
**Documentation**: Comprehensive

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Development Team

**Developer**: Zaida Aziz  
**Institution**: University/College Name  
**Project Type**: Capstone Project  
**Academic Year**: 2024-2025  
**Supervisor**: Dr. Name Here

---

## 🙏 Acknowledgments

- **Kurdistan Regional Government** - Project sponsor and requirements provider
- **Next.js Team** - Excellent React framework
- **Prisma Team** - Modern ORM with great DX
- **Vercel & Railway** - Deployment platforms
- **Open Source Community** - All the amazing libraries used

---

## 📞 Support

For questions or issues:
- 📧 Email: zaida@example.com
- 🐛 Issues: [GitHub Issues](https://github.com/your-org/krg-evisit/issues)
- 📖 Documentation: [Full Docs](https://docs.krg-evisit.com)

---

## 🔮 Future Enhancements

- [ ] Mobile application (React Native)
- [ ] Biometric verification integration
- [ ] Advanced ML-based fraud detection
- [ ] Multi-region support
- [ ] Real-time notifications (WebSockets)
- [ ] Advanced reporting with BI tools
- [ ] API rate limiting per user
- [ ] Two-factor authentication (2FA)

---

**Made with ❤️ for the Kurdistan Region of Iraq**
