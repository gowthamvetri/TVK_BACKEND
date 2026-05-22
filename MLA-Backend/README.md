# 🏛️ Enterprise Smart Grievance Management & Public Service Monitoring System

## MLA-Backend

A scalable, modular backend system for constituency-level civic governance. Built as a **Modular Monolith** optimized for **free-tier infrastructure** with a clear upgrade path to enterprise-scale microservices.

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────┐
│                  Flutter App                      │
│         (Citizen / Officer / Councillor / MLA)    │
├──────────────────────────────────────────────────┤
│              REST API + Socket.IO                 │
├──────────────────────────────────────────────────┤
│              Express.js + Middleware              │
│   ┌────────┬────────┬────────┬────────────────┐  │
│   │Security│  RBAC  │  Rate  │ Validation     │  │
│   │Helmet  │  JWT   │ Limit  │ express-valid. │  │
│   └────────┴────────┴────────┴────────────────┘  │
├──────────────────────────────────────────────────┤
│              Domain Modules                       │
│  ┌──────┬────────┬──────────┬─────────────────┐  │
│  │ Auth │Complnts│Escalation│ Notifications   │  │
│  │ Users│ SLA    │Analytics │ Announcements   │  │
│  │Upload│Assign  │Dashboard │ Reports/Schemes │  │
│  └──────┴────────┴──────────┴─────────────────┘  │
│  ┌─────────────────────────────────────────────┐  │
│  │            In-Process Event Bus             │  │
│  │    (Future: Redis Pub/Sub / RabbitMQ)       │  │
│  └─────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────┤
│  MongoDB Atlas (Free Tier) │ Cloudinary (Free)   │
└──────────────────────────────────────────────────┘
```

### Design Patterns
- **Domain-Driven Design (DDD)**
- **Service Layer Pattern** — Business logic isolation
- **Repository Pattern** — Data access abstraction
- **Event-Driven Internal Communication** — Decoupled modules via EventBus

---

## 🚀 Quick Start

```bash
# 1. Clone and install
git clone <repo-url>
cd MLA-Backend
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your MongoDB URI and other credentials

# 3. Seed database (development)
npm run seed

# 4. Start development server
npm run dev

# 5. View API docs
# Open http://localhost:5000/api-docs
```

---

## 📁 Project Structure

```
src/
├── app.js                          # Application entry point
├── config/
│   ├── index.js                    # Environment configuration
│   └── swagger.js                  # OpenAPI/Swagger setup
├── database/
│   ├── connection.js               # MongoDB connection manager
│   └── seed.js                     # Database seeding script
├── modules/
│   ├── auth/                       # Authentication (OTP, PIN, JWT)
│   ├── users/                      # User management & profiles
│   ├── complaints/                 # Complaint lifecycle & SLA
│   ├── assignments/                # Auto-assignment engine
│   ├── escalations/                # Escalation management
│   ├── notifications/              # Push, SMS, in-app notifications
│   ├── analytics/                  # KPI & aggregation pipelines
│   ├── reports/                    # PDF/CSV report generation
│   ├── announcements/              # Public announcements
│   ├── schemes/                    # Government schemes/events
│   ├── dashboard/                  # Role-specific dashboards
│   └── uploads/                    # Cloudinary file uploads
├── shared/
│   ├── constants/                  # Enums & configuration constants
│   ├── events/                     # Event bus & event names
│   ├── logger/                     # Winston structured logging
│   ├── middlewares/                # Auth, RBAC, validation, errors
│   ├── security/                   # Helmet, CORS, rate limiting
│   ├── utils/                      # Helpers, errors, responses
│   └── validators/                 # Shared validation chains
├── websocket/                      # Socket.IO configuration
└── workers/                        # Cron jobs & background tasks
```

Each module follows: `Model → Repository → Service → Controller → Routes`

---

## 👥 User Roles

| Role | Access Level |
|------|-------------|
| **Citizen** | Create/track complaints, upvote, view schemes |
| **Service Officer** | Handle assigned complaints, update status, upload proof |
| **Ward Councillor** | Monitor ward, verify resolutions, manage escalations |
| **MLA** | Full constituency monitoring, analytics, announcements |

---

## 🔑 Authentication Flow

```
Flutter App → POST /auth/register/send-otp
           → POST /auth/register/verify-otp (creates account)
           → POST /auth/login/pin (JWT + Refresh Token)
           → POST /auth/refresh-token (rotate tokens)
```

- **OTP-based registration** with MongoDB TTL auto-cleanup
- **PIN-based login** with bcrypt hashing
- **JWT access tokens** (15min) + **Refresh tokens** (7 days)
- **Role-based middleware** for route protection

---

## 📋 Complaint Lifecycle

```
CREATED → ASSIGNED → IN_PROGRESS → RESOLVED → VERIFIED → CLOSED
                 ↘ ESCALATED ↗         ↘ REOPENED ↗
                 ↘ REJECTED
```

- **Automatic assignment** based on category → department → ward → officer load balancing
- **SLA monitoring** with cron-based deadline checks
- **Auto-escalation** on SLA breach: Officer → Councillor → MLA
- **Geolocation support** with 2dsphere indexing
- **Duplicate detection** via nearby complaint queries

---

## 📊 API Endpoints

| Module | Base Path | Key Endpoints |
|--------|-----------|--------------|
| Auth | `/api/v1/auth` | register, login, refresh, logout |
| Users | `/api/v1/users` | profile, list |
| Complaints | `/api/v1/complaints` | CRUD, status, timeline, upvote, nearby |
| Assignments | `/api/v1/assignments` | reassign, workload |
| Escalations | `/api/v1/escalations` | escalate, resolve, list |
| Notifications | `/api/v1/notifications` | list, mark read, unread count |
| Announcements | `/api/v1/announcements` | CRUD |
| Schemes | `/api/v1/schemes` | CRUD |
| Analytics | `/api/v1/analytics` | constituency, ward, officer KPIs |
| Reports | `/api/v1/reports` | CSV/PDF download |
| Dashboard | `/api/v1/dashboard` | role-specific dashboard data |
| Uploads | `/api/v1/uploads` | single/multiple image upload |

Full API docs: `http://localhost:5000/api-docs`

---

## 🔒 Security

- **helmet.js** — Secure HTTP headers
- **CORS** — Configurable origin whitelist
- **Rate limiting** — Tiered (API: 100/15min, Auth: 20/15min, OTP: 5/10min)
- **express-mongo-sanitize** — NoSQL injection prevention
- **hpp** — HTTP parameter pollution protection
- **JWT** — Stateless authentication
- **bcrypt** — PIN hashing
- **express-validator** — Input validation on every endpoint

---

## 🔄 Real-time (Socket.IO)

```javascript
// Client connection
const socket = io('http://localhost:5000', {
  auth: { token: 'your-jwt-token' }
});

// Auto-joined rooms: user:{id}, role:{role}, ward:{ward}
socket.on('notification', (data) => { /* real-time notification */ });
socket.emit('track:complaint', complaintId); // subscribe to complaint updates
```

---

## 🚢 Deployment

### Render / Railway
```bash
# Build command: npm install
# Start command: node src/app.js
# Set environment variables from .env.example
```

### Docker
```bash
docker build -t mla-backend .
docker run -p 5000:5000 --env-file .env mla-backend
```

### Docker Compose
```bash
docker-compose up -d
```

---

## 🔮 Future Upgrade Path

| Current (Free-Tier) | Future (Enterprise) |
|---------------------|-------------------|
| In-process EventBus | Redis Pub/Sub / RabbitMQ |
| node-cron schedulers | BullMQ + Redis workers |
| MongoDB text search | Elasticsearch |
| In-memory Socket.IO | Redis Socket.IO adapter |
| Single server | Kubernetes + load balancer |
| Modular monolith | Extract to microservices |
| MongoDB aggregation | Dedicated analytics DB |
| Local file storage | AWS S3 / Azure Blob |

All modules are designed with **interface boundaries** that make these upgrades possible **without full rewrites**.

---

## 📝 Environment Variables

See [`.env.example`](.env.example) for all configuration options.

---

## 📜 License

ISC
