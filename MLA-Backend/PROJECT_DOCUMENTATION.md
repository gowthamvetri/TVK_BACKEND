# 🏛️ MLA-Backend: Enterprise Smart Grievance Management System

**Complete Project Documentation**

---

## 📚 Table of Contents

1. [Project Overview](#project-overview)
2. [Directory Structure](#directory-structure)
3. [Architecture](#architecture)
4. [Technology Stack](#technology-stack)
5. [Setup Instructions](#setup-instructions)
6. [API Endpoints (67 Total)](#api-endpoints-67-total)
7. [Testing Guide](#testing-guide)
8. [Coverage Directory](#coverage-directory)
9. [Database Models](#database-models)
10. [Security & Authorization](#security--authorization)
11. [Deployment](#deployment)

---

## Project Overview

### What is MLA-Backend?

An **Enterprise-grade Modular Monolith** backend system for constituency-level civic governance. It enables:

- **Citizens** to file and track grievances (complaints) about public services
- **Service Officers** to manage and resolve assigned complaints
- **Ward Councillors** to oversee ward-level grievance management
- **MLAs** to monitor constituency-wide metrics and escalations

### Key Features

✅ **67 API Endpoints** across 14 modules  
✅ **Role-Based Access Control (RBAC)** - 4 roles with ward-level scoping  
✅ **OTP-based Authentication** - Phone-based registration and login  
✅ **Real-time Notifications** - Socket.IO for live updates  
✅ **SLA Monitoring** - Automatic escalation for overdue complaints  
✅ **File Uploads** - Cloudinary integration for images  
✅ **Analytics Dashboard** - Constituency and ward-level KPIs  
✅ **Comprehensive Testing** - 151+ tests with full coverage  
✅ **Production-Ready** - Security hardened, documented, and scalable  

### Technology Stack

| Layer | Technology |
|-------|-----------|
| **Runtime** | Node.js 18+ |
| **Framework** | Express.js 4.x |
| **Language** | TypeScript 5.5.4 |
| **Database** | MongoDB 6.0+ |
| **Cache** | Redis/ioredis |
| **Real-time** | Socket.IO |
| **File Storage** | Cloudinary |
| **Testing** | Jest 29.7.0, Supertest, MongoMemoryServer |
| **API Docs** | Swagger/OpenAPI |
| **Logging** | Winston |

---

## Directory Structure

### Root Structure
```
MLA-Backend/
├── src/                          # Source code
├── coverage/                      # Test coverage reports (auto-generated)
├── api-test/                      # API testing interface
├── docker-compose.yml             # Docker development environment
├── Dockerfile                     # Container configuration
├── package.json                   # Dependencies & scripts
├── tsconfig.json                  # TypeScript configuration
├── jest.config.js                 # Jest testing configuration
└── PROJECT_DOCUMENTATION.md       # This file
```

### Source Code Structure
```
src/
├── app.ts                         # Express app entry point
├── config/
│   ├── index.ts                   # Environment config & validation
│   └── swagger.ts                 # Swagger/OpenAPI setup
├── database/
│   ├── connection.ts              # MongoDB connection manager
│   └── seed.ts                    # Development seed data
├── modules/                       # 14 domain modules
│   ├── auth/                      # Authentication (OTP, PIN, JWT)
│   ├── users/                     # User management & profiles
│   ├── complaints/                # Complaint lifecycle & SLA
│   ├── assignments/               # Auto-assignment engine
│   ├── escalations/               # Escalation management
│   ├── notifications/             # Multi-channel notifications
│   ├── analytics/                 # KPI & aggregation
│   ├── reports/                   # PDF/CSV exports
│   ├── announcements/             # Public announcements
│   ├── schemes/                   # Government schemes/events
│   ├── dashboard/                 # Role-specific dashboards
│   ├── feedback/                  # App feedback collection
│   ├── uploads/                   # File upload management
│   └── officials/                 # Official registry
├── shared/
│   ├── constants/                 # Enums & configuration constants
│   ├── events/                    # Event bus & event names
│   ├── logger/                    # Winston structured logging
│   ├── middlewares/               # Auth, RBAC, validation, errors
│   ├── security/                  # Helmet, CORS, rate limiting
│   ├── services/                  # Shared business logic
│   ├── utils/                     # Helper utilities
│   ├── validators/                # Reusable validation rules
│   └── cache/                     # Redis caching layer
├── types/
│   └── express.d.ts              # Express type extensions
├── websocket/
│   └── index.ts                  # Socket.IO event handlers
├── workers/
│   └── index.ts                  # Background job schedulers
├── jest.d.ts                     # Jest custom matcher types
└── __tests__/                    # Test suite
    ├── setup.ts                  # Global test configuration
    ├── utils.ts                  # Test factories & mocks
    ├── integration/              # Route/HTTP tests
    └── unit/                     # Unit tests
```

---

## Architecture

### System Architecture Diagram

```
┌──────────────────────────────────────────────────┐
│         Flutter Mobile Application               │
│    (Citizen / Officer / Councillor / MLA)        │
├──────────────────────────────────────────────────┤
│         REST API + WebSocket (Socket.IO)         │
├──────────────────────────────────────────────────┤
│           Express.js Middleware Stack            │
│  ┌──────────┬──────────┬──────────────────────┐  │
│  │ Security │   RBAC   │  Validation & Error  │  │
│  │ (Helmet) │  (JWT)   │   Handling          │  │
│  └──────────┴──────────┴──────────────────────┘  │
├──────────────────────────────────────────────────┤
│        14 Domain Modules (Service Layer)         │
│  ┌────────┬────────┬──────────┬──────────────┐  │
│  │ Auth   │Complnts│Escalation│Analytics    │  │
│  │ Users  │ SLA    │Events    │ Notifications│  │
│  │ Uploads│Assign  │Dashboard │ Reports     │  │
│  └────────┴────────┴──────────┴──────────────┘  │
│                                                  │
│  ┌──────────────────────────────────────────┐  │
│  │   In-Process Event Bus (EventEmitter)    │  │
│  │ (Future: Redis Pub/Sub / RabbitMQ)       │  │
│  └──────────────────────────────────────────┘  │
├──────────────────────────────────────────────────┤
│              Repository/Data Layer               │
│  ┌──────────────────┬──────────────────────┐    │
│  │ MongoDB (Atlas)  │ Redis Cache (ioredis)│    │
│  └──────────────────┴──────────────────────┘    │
├──────────────────────────────────────────────────┤
│            External Services (Mocked)            │
│  ┌──────────────────┬──────────────────────┐    │
│  │ Twilio (SMS)     │ Cloudinary (Images)  │    │
│  └──────────────────┴──────────────────────┘    │
└──────────────────────────────────────────────────┘
```

### Design Patterns Used

**Domain-Driven Design (DDD)**
- Each module owns its domain logic
- Clear boundaries between domains
- Event-driven inter-module communication

**Modular Monolith Pattern**
- Single deployment unit
- Module-based organization
- Upgrade path to microservices

**Service-Repository Pattern**
- Controllers → Services → Repositories → Database
- Clear separation of concerns
- Easy testing and maintenance

**RBAC (Role-Based Access Control)**
- 4 roles: citizen, service_officer, ward_councillor, mla
- Ward-level scoping for officers and councillors
- Explicit authorization checks per endpoint

---

## Setup Instructions

### Prerequisites
- Node.js 18+
- MongoDB 6.0+ (Cloud: MongoDB Atlas free tier)
- Redis 6.0+ (Cloud: Redis Cloud free tier)
- npm or yarn

### Installation Steps

#### 1. Clone and Install
```bash
cd MLA-Backend
npm install
```

#### 2. Configure Environment
```bash
cp .env.example .env
```

Edit `.env` with your credentials:
```env
# MongoDB
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/mla-db

# Redis
REDIS_URL=redis://user:pass@host:port

# JWT
JWT_SECRET=your-super-secret-key-min-32-chars
JWT_EXPIRE=7d

# Twilio (SMS)
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=+1234567890

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Environment
NODE_ENV=development
PORT=5000
```

#### 3. Start Services (Docker)
```bash
# Start MongoDB and Redis
docker-compose up -d

# Or use cloud services (MongoDB Atlas, Redis Cloud)
```

#### 4. Seed Database (Optional)
```bash
npm run seed
```

#### 5. Start Development Server
```bash
npm run dev
```

**API Documentation**: http://localhost:5000/api-docs  
**Health Check**: http://localhost:5000/health

### Available Scripts

```bash
# Development
npm run dev           # Start with nodemon watch
npm run typecheck     # Check TypeScript errors

# Testing
npm test              # Run all tests
npm test -- --watch   # Watch mode
npm test -- --coverage  # With coverage report
npm test -- --coverage --runInBand  # Sequential with coverage

# Build & Production
npm run build         # Compile TypeScript
npm start            # Run production build

# Database
npm run seed         # Seed development data
npm run migrate      # Run database migrations

# Code Quality
npm run lint         # ESLint check
npm run format       # Prettier formatting
```

---

## API Endpoints (67 Total)

### Authentication (9 Endpoints)
```
POST   /auth/register/send-otp           Send OTP for registration
POST   /auth/register/verify-phone       Verify OTP and get registration token
POST   /auth/register/complete           Complete registration
POST   /auth/login/pin                   Login with phone and PIN
POST   /auth/forgot-pin/send-otp         Send OTP for PIN reset
POST   /auth/forgot-pin/verify-otp       Verify OTP and get reset token
POST   /auth/forgot-pin/reset-pin        Reset PIN
POST   /auth/refresh-token               Refresh access token
POST   /auth/logout                      Logout
```

### Users (7 Endpoints)
```
GET    /users/profile                    Get current user's profile
PUT    /users/profile                    Update current user's profile
GET    /users                            List all users
GET    /users/:id                        Get user by ID
GET    /users/ward/:ward/officers        Get ward officers
PATCH  /users/:id/deactivate            Deactivate user
PATCH  /users/:id/activate              Activate user
```

### Complaints (10 Endpoints)
```
POST   /complaints                       Create complaint
GET    /complaints                       List complaints (paginated)
GET    /complaints/nearby                Get nearby complaints
GET    /complaints/track/:trackingId    Track by tracking ID
GET    /complaints/:id                   Get complaint details
PATCH  /complaints/:id/status            Update complaint status
POST   /complaints/:id/resolution-proof  Add resolution proof
GET    /complaints/:id/timeline          Get status timeline
POST   /complaints/:id/upvote            Upvote complaint
DELETE /complaints/:id/upvote            Remove upvote
```

### Escalations (4 Endpoints)
```
GET    /escalations                      List escalations
POST   /escalations/:complaintId/escalate Escalate complaint
PATCH  /escalations/:id/resolve          Resolve escalation
GET    /escalations/complaint/:complaintId Get complaint escalations
```

### Assignments (2 Endpoints)
```
POST   /assignments/:complaintId/reassign Reassign complaint
GET    /assignments/officer/:officerId/workload Get officer workload
```

### Notifications (4 Endpoints)
```
GET    /notifications                    Get notifications
GET    /notifications/unread-count       Get unread count
PATCH  /notifications/:id/read           Mark as read
PATCH  /notifications/read-all           Mark all as read
```

### Announcements (5 Endpoints)
```
GET    /announcements                    List announcements
GET    /announcements/:id                Get announcement
POST   /announcements                    Create announcement
PUT    /announcements/:id                Update announcement
PATCH  /announcements/:id/deactivate    Deactivate announcement
```

### Schemes (5 Endpoints)
```
GET    /schemes                          List schemes
GET    /schemes/:id                      Get scheme
POST   /schemes                          Create scheme
PUT    /schemes/:id                      Update scheme
PATCH  /schemes/:id/deactivate          Deactivate scheme
```

### Analytics (4 Endpoints)
```
GET    /analytics/constituency           Constituency KPIs
GET    /analytics/ward/:ward             Ward analytics
GET    /analytics/officer/:officerId    Officer analytics
GET    /analytics/ward-comparison        Ward comparison
```

### Reports (2 Endpoints)
```
GET    /reports/complaints/csv          Download CSV
GET    /reports/complaints/pdf          Download PDF
```

### Uploads (3 Endpoints)
```
POST   /uploads/single                   Upload single image
POST   /uploads/multiple                 Upload multiple images
DELETE /uploads                          Delete image
```

### Feedback (2 Endpoints)
```
POST   /feedback                         Submit feedback
GET    /feedback                         List feedback (MLA only)
```

### Officials (1 Endpoint)
```
POST   /officials/upload-csv            Upload officials CSV
```

### Dashboard (1 Endpoint)
```
GET    /dashboard                        Get dashboard data
```

---

## Testing Guide

### Test Suite Overview

**Total Tests**: 151 tests  
**Status**: ✅ All passing  
**Coverage**: Core business logic, security, and authorization

### Test Categories

| Category | Count | Focus |
|----------|-------|-------|
| Authentication | 28 | OTP flows, login, PIN reset, tokens |
| Complaints | 30 | CRUD, status, timeline, upvoting |
| Authorization | 35 | 4 roles, ward scoping, access control |
| Uploads | 18 | Validation, ownership, security |
| Users | 20 | Profile, scoping, search |
| Configuration | 20 | Environment validation |
| **Total** | **151** | **Comprehensive coverage** |

### Running Tests

```bash
# Run all tests
npm test -- --coverage --runInBand

# Run specific test file
npm test -- src/__tests__/integration/auth.routes.test.ts

# Run tests in watch mode
npm test -- --watch

# Run only integration tests
npm test -- src/__tests__/integration

# Run only unit tests
npm test -- src/__tests__/unit
```

### Test Infrastructure

**Setup Files**:
- `src/__tests__/setup.ts` - Global Jest configuration, MongoMemoryServer
- `src/__tests__/utils.ts` - Test factories, mocks, JWT helpers
- `src/jest.d.ts` - Custom Jest matcher types

**Test Factories** (in utils.ts):
- `createTestUser()`, `createTestOfficer()`, `createTestWardCouncillor()`, `createTestMLA()`
- `createTestComplaint()`, `createTestOTP()`, `createTestNotification()`
- `generateTestToken(userId, role, ward?)` - Generate valid JWT tokens

**Mocked Services**:
- Twilio SMS - `mockTwilioSMS()`
- Cloudinary - `mockCloudinaryUpload()`, `mockCloudinaryDelete()`
- Redis - `mockRedis()` (set, get, del, etc.)
- Socket.IO - `mockSocketIO()`
- node-cron - `mockCron()`

### Test Data Cleanup

Each test automatically:
1. Starts fresh MongoMemoryServer instance (beforeAll)
2. Clears all collections before each test (beforeEach)
3. Disconnects after all tests (afterAll)

---

## Coverage Directory

### What It Contains

The `coverage/` directory is **auto-generated** during test runs and contains:

```
coverage/
├── clover.xml           # Clover XML format (CI/CD tools, SonarQube)
├── coverage-final.json  # Final coverage metrics (JSON)
├── lcov-report/         # HTML coverage report (open in browser)
└── lcov.info           # LCOV format (code coverage tools)
```

### Coverage Files Explained

**clover.xml**
- XML format compatible with CI/CD systems (Jenkins, GitLab CI, GitHub Actions)
- Used for: Quality gates, historical tracking, dashboards
- View in: CI/CD platform or SonarQube

**coverage-final.json**
- Machine-readable coverage metrics
- Used for: Programmatic access, scripts, integrations
- Contains: Line, branch, function, statement coverage percentages

**lcov-report/ (HTML)**
- Human-readable interactive HTML report
- Open `lcov-report/index.html` in browser
- Shows: Files, lines covered/uncovered, heatmaps
- Click files to see detailed line-by-line coverage

**lcov.info**
- LCOV format (used by code coverage tools)
- Compatible with: Codecov, Coveralls, Code Climate
- Used for: Coverage tracking and reporting

### Viewing Coverage

```bash
# Generate coverage report
npm test -- --coverage

# Open HTML report (Windows)
start coverage/lcov-report/index.html

# Open HTML report (Mac)
open coverage/lcov-report/index.html

# Open HTML report (Linux)
xdg-open coverage/lcov-report/index.html
```

### Coverage Metrics

Typical coverage metrics measured:
- **Statements**: Percentage of statements executed
- **Branches**: Percentage of conditional branches executed
- **Functions**: Percentage of functions called
- **Lines**: Percentage of lines executed

Target: > 80% coverage on core modules

### CI/CD Integration

```yaml
# Example: GitHub Actions
- name: Run Tests with Coverage
  run: npm test -- --coverage --runInBand

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/coverage-final.json
    flags: backend
```

---

## Database Models

### 1. User Model
```typescript
{
  _id: ObjectId
  phone: string (unique, required)
  pin: string (hashed)
  role: 'citizen' | 'service_officer' | 'ward_councillor' | 'mla'
  ward: number (required for roles except mla)
  name: string
  email: string
  status: 'active' | 'inactive'
  createdAt: Date
  updatedAt: Date
}
```

### 2. Complaint Model
```typescript
{
  _id: ObjectId
  title: string (required)
  description: string
  trackingId: string (unique, auto-generated: GRV-YYYY-XXXXX)
  category: string (enum: water_supply, roads, electricity, sanitation, etc.)
  priority: 'low' | 'medium' | 'high'
  status: 'created' | 'assigned' | 'in_progress' | 'escalated' | 'resolved'
  ward: number (required)
  location: { coordinates: [longitude, latitude], address, landmark }
  attachments: [{ url, publicId }]
  citizenId: ObjectId (ref: User)
  assignedOfficerId: ObjectId (ref: User)
  upvoteCount: number
  upvotedBy: [ObjectId]
  slaDeadline: Date
  resolvedAt: Date
  createdAt: Date
  updatedAt: Date
}
```

### 3. OTP Model
```typescript
{
  _id: ObjectId
  phone: string
  otp: string (6-digit)
  purpose: 'registration' | 'login' | 'forgot_pin'
  attempts: number (max: 5)
  expiresAt: Date
  createdAt: Date
}
```

### 4. Notification Model
```typescript
{
  _id: ObjectId
  userId: ObjectId (ref: User)
  title: string
  message: string
  type: 'push' | 'sms' | 'in_app'
  relatedResource: { type, id }
  isRead: boolean
  createdAt: Date
}
```

### 5. Escalation Model
```typescript
{
  _id: ObjectId
  complaintId: ObjectId (ref: Complaint)
  reason: 'sla_breach' | 'inactivity' | 'unresolved' | 'manual' | 'citizen_request'
  status: 'pending' | 'acknowledged' | 'resolved'
  escalatedAt: Date
  resolvedAt: Date
  createdAt: Date
}
```

---

## Security & Authorization

### Authentication Flow

**OTP-Based Registration**:
1. User sends phone → System generates 6-digit OTP
2. User verifies OTP → System issues registrationToken
3. User completes registration → JWT tokens issued (access + refresh)

**PIN-Based Login**:
1. User sends phone + PIN → System validates
2. Valid → JWT tokens issued
3. Invalid → Error response

**Token Management**:
- Access Token: 7-day expiry
- Refresh Token: 30-day expiry (stored in DB)
- Refresh endpoint: Validate refreshToken and issue new access token

### Role-Based Access Control

| Role | Permissions |
|------|-------------|
| **citizen** | Own profile, file complaints, upvote, track own complaints |
| **service_officer** | Ward-scoped complaints, update status, assign to self |
| **ward_councillor** | Ward-scoped all, reassign, escalation management |
| **mla** | Full access, constituency analytics, user management |

### Authorization Middleware

```typescript
// Protect endpoint
app.get('/complaints', 
  authenticate,              // Verify JWT token
  authorize(['citizen', 'service_officer', 'ward_councillor', 'mla']),
  complaintController.list
);

// Ward-scoped access
app.get('/complaints/:id',
  authenticate,
  authorize(['service_officer']),
  wardScopedAccess,          // Check user.ward === complaint.ward
  complaintController.getById
);
```

### Security Features

✅ **HTTPS/TLS** - CORS configured for secure origin  
✅ **Helmet** - Security headers (XSS, CSRF, clickjacking protection)  
✅ **Rate Limiting** - Prevent brute force (15 requests/15 min per IP)  
✅ **Password Hashing** - bcrypt for PIN hashing (10 rounds)  
✅ **JWT Signing** - HS256 algorithm with secret key  
✅ **Input Validation** - express-validator on all inputs  
✅ **SQL/NoSQL Injection** - Mongoose schema validation  
✅ **File Upload Validation** - Type, size, MIME validation  
✅ **CORS** - Origin whitelist configuration  

---

## Deployment

### Docker Deployment

```bash
# Build image
docker build -t mla-backend:1.0 .

# Run container
docker run -d \
  -p 5000:5000 \
  -e MONGODB_URI=mongodb://... \
  -e REDIS_URL=redis://... \
  --name mla-backend \
  mla-backend:1.0
```

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use strong JWT secret (32+ chars)
- [ ] Configure MongoDB Atlas with IP whitelist
- [ ] Use Redis Cloud or self-hosted Redis
- [ ] Set up Cloudinary API credentials
- [ ] Configure Twilio for SMS
- [ ] Enable HTTPS/SSL certificates
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy
- [ ] Set up error tracking (Sentry, etc.)

### Environment Variables for Production

```env
NODE_ENV=production
PORT=5000

# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/mla-db

# Cache
REDIS_URL=redis://user:pass@host:port

# Security
JWT_SECRET=your-production-secret-key-min-32-chars
JWT_EXPIRE=7d
CORS_ORIGIN=https://yourdomain.com

# External Services
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=+1234567890

CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Logging
LOG_LEVEL=info
```

---

## Contact & Support

- **Repository**: [GitHub Link]
- **Documentation**: See PROJECT_DOCUMENTATION.md (this file)
- **API Testing**: Open `api-test/index.html` in browser
- **Issues**: File on GitHub Issues

---

**Last Updated**: May 2026  
**Version**: 1.0.0  
**Status**: Production Ready ✅
