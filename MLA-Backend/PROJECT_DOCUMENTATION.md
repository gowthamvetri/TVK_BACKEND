# 🏛️ MLA-Backend: Enterprise Smart Grievance Management System

**Complete Project Documentation**

---

## 📚 Table of Contents

1. [Project Overview](#project-overview)
2. [Directory Structure](#directory-structure)
3. [Enterprise Architecture](#enterprise-architecture)
4. [Technology Stack](#technology-stack)
5. [Setup Instructions](#setup-instructions)
6. [API Endpoints (78 Total)](#api-endpoints-78-total)
7. [Advanced Search Capabilities](#advanced-search-capabilities)
8. [Testing Guide](#testing-guide)
9. [Database Models](#database-models)
10. [Security & Authorization](#security--authorization)
11. [Deployment & Scaling](#deployment--scaling)

---

## Project Overview

### What is MLA-Backend?

An **Enterprise-grade Modular Monolith** backend system for constituency-level civic governance. It enables:

- **Citizens** to file and track grievances (complaints) about public services
- **Service Officers** to manage and resolve assigned complaints
- **Ward Councillors** to oversee ward-level grievance management
- **MLAs** to monitor constituency-wide metrics and escalations

### Key Features

✅ **Enterprise Infrastructure** - NGINX Edge Gateway, PM2 Clustering, Docker Network Isolation  
✅ **78 API Endpoints** across 15 modules  
✅ **Role-Based Access Control (RBAC)** - 4 roles with ward-level scoping  
✅ **Real-time Notifications** - Socket.IO for live updates  
✅ **Distributed Job Processing** - BullMQ backed by Redis for background tasks & SLAs  
✅ **Fuzzy Search Engine** - Native MongoDB Text Index + N-Gram Regex Tokenizer  
✅ **Analytics Dashboard** - Constituency and ward-level KPIs  
✅ **File Uploads** - Cloudinary integration for images  

### Technology Stack

| Layer | Technology |
|-------|-----------|
| **Edge / Proxy** | NGINX Alpine |
| **Runtime** | Node.js 18+ (PM2 Cluster Mode) |
| **Framework** | Express.js 4.x |
| **Language** | TypeScript 5.5.4 |
| **Database** | MongoDB 6.0+ |
| **Cache & Queue** | Redis / BullMQ |
| **Real-time** | Socket.IO |
| **File Storage** | Cloudinary |

---

## Directory Structure

### Root Structure
```
MLA-Backend/
├── src/                          # Source code
├── nginx/                        # NGINX Configuration Layer
│   └── nginx.conf               # Enterprise 20-Rule Proxy Config
├── docker-compose.yml             # Docker Orchestration (App, NGINX, Redis)
├── Dockerfile                     # Multi-stage container build
├── ecosystem.config.js            # PM2 Cluster configuration
└── PROJECT_DOCUMENTATION.md       # This file
```

### Source Code Structure
```
src/
├── app.ts                         # Express app entry point
├── config/                        # Environment config & Swagger
├── database/                      # MongoDB connection & seeds
├── modules/                       # 15 domain modules
├── shared/                        # Constants, events, logger, middlewares
├── workers/                       # BullMQ Distributed Workers (OTP, SLA, Notifications)
├── queues/                        # BullMQ Queue Instances
└── __tests__/                     # Test suite
```

---

## Enterprise Architecture

### System Architecture Diagram

```
                Internet
                    ↓
   ┌────────────────────────────────┐
   │             NGINX              │ (Reverse Proxy, Load Balancer, SSL,
   │      (Port 80 / 443 SSL)       │  Rate Limiting, WebSocket Upgrades)
   └────────────────────────────────┘
                    ↓
   ┌────────────────────────────────┐
   │    Node.js (PM2 Cluster)       │ (Runs 'max' instances per CPU core)
   │  ┌────────┬────────┬────────┐  │
   │  │ API-1  │ API-2  │ API-3  │  │
   │  └────────┴────────┴────────┘  │
   └────────────────────────────────┘
                    ↓
   ┌────────────────────────────────┐
   │       Redis / BullMQ           │ (In-memory message broker)
   └────────────────────────────────┘
                    ↓
   ┌────────────────────────────────┐
   │    Distributed Workers         │ (Processes SLAs, OTPs, WebSockets)
   └────────────────────────────────┘
                    ↓
   ┌────────────────────────────────┐
   │      MongoDB (Atlas)           │ (Persistent Data Storage + Text Indexes)
   └────────────────────────────────┘
```

### Infrastructure Capabilities
- **NGINX API Gateway**: Protects Node.js from direct internet exposure. Handles GZIP compression, payload limits (20MB), rate limiting (`10r/s`), and drops malformed packets.
- **PM2 Clustering**: Runs the Node.js API utilizing all available CPU threads (`instances: max`), allowing horizontal scalability.
- **BullMQ Workers**: Entirely decoupled background processing. Heavy tasks (SMS, Email, Notifications, SLA calculations) are offloaded to Redis queues and instantly picked up by workers.
- **Docker Isolation**: The backend Node.js container does not map ports to the host machine. Traffic MUST pass securely through the NGINX container on Port 80.

---

## Setup Instructions

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (For local non-Docker development)
- MongoDB & Redis URIs

### Docker Deployment (Recommended)
```bash
# 1. Configure environment
cp .env.example .env

# 2. Boot the Enterprise Cluster
docker-compose up -d --build
```
*Note: Because of NGINX isolation, access the API at `http://localhost/api/v1/` instead of port 5000.*

---

## Advanced Search Capabilities

The Complaint search endpoint (`GET /api/v1/complaints?search=...`) is powered by a sophisticated Hybrid Search Engine:

1. **MongoDB `$text` Index**: Supports high-performance "stemming" and full-word matching across `title`, `description`, `address`, and `landmark`.
2. **N-Gram Tokenized Regex Fallback**: If a user misspells an address (e.g., `mumbie road`), the backend intelligently splits the string into tokens `["mumbie", "road"]` and dynamically generates an `$and` + `$or` Regex pipeline. This ensures partial matches (like "road") still successfully return highly relevant complaints despite the typo.

---

## Security & Authorization

### Role-Based Access Control
| Role | Permissions |
|------|-------------|
| **citizen** | Own profile, file complaints, upvote, track own complaints |
| **service_officer** | Ward-scoped complaints, update status, assign to self |
| **ward_councillor** | Ward-scoped all, reassign, escalation management |
| **mla** | Full access, constituency analytics, user management |

### NGINX Security Layer
- **HSTS** Enforced
- **X-Frame-Options** `SAMEORIGIN`
- **Content-Security-Policy** Active
- **Buffer Overflow Protection**: Strict `client_header_buffer_size` limits
- **Rate Limiting**: `limit_req_zone` protects auth and public endpoints.

---

## Deployment & Scaling

### Render / Managed Cloud
If deploying to a managed service like Render (which provides its own Cloudflare edge proxy), simply deploy the `Dockerfile`. Render will read `EXPOSE 5000` and automatically handle the edge proxying and SSL termination.

### Bare-Metal VPS (AWS EC2, DigitalOcean)
If deploying to a raw Linux server, utilize the provided `docker-compose.yml`. The NGINX container will act as the edge gateway, safely proxying traffic to the heavily optimized, PM2-clustered Node.js backend. 

### Horizontal Scaling
Because WebSocket states are stateless and Background Jobs use Redis (BullMQ), the Express API instances can be horizontally scaled endlessly behind the NGINX Load Balancer.

---

**Last Updated**: May 2026  
**Status**: Production Ready ✅
