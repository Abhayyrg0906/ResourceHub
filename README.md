# ResourceHub – A Smart Campus Resource Exchange Platform

ResourceHub is a campus-focused web platform where verified college students can buy, sell, borrow, donate, and swap academic resources such as textbooks, calculators, laboratory equipment, electronics, project components, and stationery.

## Technology Stack

### Frontend
- **React** (v18+)
- **Vite** (Build Tool)
- **Tailwind CSS** (v4 - styling)
- **React Router** (Navigation)
- **Axios** (API requests)
- **Lucide React** (Icons)

### Backend
- **Node.js**
- **Express.js** (Server framework)

### Database
- **MySQL** (Relational data storage)
- **mysql2** (Promise-based connection pool driver)

---

## Project Structure

```text
ResourceHub/
├── client/                 # Frontend React-Vite application
│   ├── src/
│   │   ├── assets/         # Images, fonts, and global assets
│   │   ├── components/     # Reusable UI components
│   │   ├── layouts/        # Shared page layouts (Navbar, Footer, etc.)
│   │   ├── pages/          # Individual placeholder pages
│   │   ├── services/       # API call handlers (Axios service instances)
│   │   ├── hooks/          # Custom React hooks
│   │   ├── context/        # React context (Auth context, etc.)
│   │   ├── utils/          # Helper utilities
│   │   ├── App.jsx         # App router and layouts configuration
│   │   └── main.jsx        # App mounting point
│   ├── package.json        # Frontend dependencies & scripts
│   └── vite.config.js      # Vite build configuration
│
├── server/                 # Backend Express application
│   ├── config/             # Configuration files (database.js, etc.)
│   ├── controllers/        # Express route controllers
│   ├── middleware/         # Custom middleware (error handling, auth)
│   ├── models/             # Database queries / schemas
│   ├── routes/             # Express routes (Health routes)
│   ├── services/           # Business logic helpers
│   ├── utils/              # Helper files and utilities
│   ├── server.js           # Express app entry point
│   └── package.json        # Backend dependencies & scripts
│
├── database/               # Database schemas and setup scripts
│   ├── schema.sql          # MySQL database schema setup and seeds
│   └── README.md           # Documentation for MySQL database setup
│
├── docs/                   # Project documentation
│   ├── database-design.md  # Detailed schema definitions and lifecycles
│   ├── erd.md              # Mermaid Entity Relationship Diagram
│   └── README.md           # General documentation index
│
├── .gitignore              # Git ignore configuration
└── README.md               # Main project documentation (this file)
```

---

## Database Architecture

ResourceHub uses a normalized relational database schema running on **MySQL 8.0+**.
- **Normalization**: Structured up to 3NF to avoid data duplication.
- **Relational Integrity**: Foreign key constraints with appropriate cascade/restrict behaviors ensure consistent handovers, history records, and feedback loops.
- **Performance**: High-frequency fields (user emails, resource status, notification read-state) are indexed for speed.
- **Security**: Designed for cryptographically secure passwords (bcrypt) and secure random verification tokens (QR code verification).

---

## Installation & Setup

### Prerequisites
Make sure you have:
1. [Node.js](https://nodejs.org/) installed (v18 or higher recommended).
2. [MySQL Server](https://dev.mysql.com/downloads/installer/) installed and running locally.

### 1. Database Setup
1. Log into your MySQL CLI or GUI tool (e.g. MySQL Workbench):
   ```bash
   mysql -u root -p
   ```
2. Run the schema creation script [`database/schema.sql`](file:///c:/Projects/ResourceHub/database/schema.sql):
   ```sql
   SOURCE database/schema.sql;
   ```
   > [!WARNING]
   > The `schema.sql` script contains `DROP TABLE IF EXISTS` statements. Do **NOT** run this script in production or staging environments with live data, as it will permanently delete existing tables and data. Use only for local development, testing, or reset environments.
   
   *(Or copy the script contents and run them directly in your SQL editor).* This will create the `resourcehub` database, establish all 10 tables, configure constraints/indexes, and seed category options.

### 2. Backend Setup
1. Open a terminal and navigate to the `server` directory:
   ```bash
   cd server
   ```
2. Install backend dependencies:
   ```bash
   npm install
   ```
3. Copy the environment template and set up your MySQL credentials:
   ```bash
   cp .env.example .env
   ```
4. Open `.env` and fill out your local MySQL settings:
   ```ini
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_actual_mysql_password
   DB_NAME=resourcehub
   ```
5. Start the backend in development (watch) mode:
   ```bash
   npm run dev
   ```
   *The server runs on [http://localhost:5000](http://localhost:5000).* On startup, it will run a connection pool test query (`SELECT 1`) to verify database communication.

### 3. Frontend Setup
1. Open a new terminal and navigate to the `client` directory:
   ```bash
   cd client
   ```
2. Install frontend dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *The client dev server runs on [http://localhost:5173](http://localhost:5173).*

---

## Verification & API Endpoints

### System Diagnostics
- **Backend Health Check**: `GET http://localhost:5000/api/health`
- **Database Connection Check**: `GET http://localhost:5000/api/health/db`

### Authentication Endpoints
All authentication endpoints are mapped under `/api/auth`.

#### 1. User Registration
- **URL**: `POST /api/auth/register`
- **Payload**:
  ```json
  {
    "name": "Student Name",
    "email": "student@university.edu",
    "password": "SecurePassword123",
    "department": "Computer Science",
    "year_of_study": 2
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "Registration successful. Account pending email verification.",
    "data": {
      "user": {
        "id": 1,
        "name": "Student Name",
        "email": "student@university.edu",
        "role": "STUDENT",
        "status": "PENDING_VERIFICATION"
      }
    }
  }
  ```

#### 2. User Login
- **URL**: `POST /api/auth/login`
- **Payload**:
  ```json
  {
    "email": "student@university.edu",
    "password": "SecurePassword123"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "Login successful.",
    "data": {
      "token": "eyJhbGciOi...",
      "user": {
        "id": 1,
        "name": "Student Name",
        "email": "student@university.edu",
        "role": "STUDENT",
        "status": "PENDING_VERIFICATION",
        "department": "Computer Science",
        "year_of_study": 2
      }
    }
  }
  ```

#### 3. Protected Profile Check
- **URL**: `GET /api/auth/me`
- **Headers**: `Authorization: Bearer <JWT_TOKEN>`
- **Response**:
  ```json
  {
    "success": true,
    "message": "User details retrieved successfully.",
    "data": {
      "user": {
        "id": 1,
        "name": "Student Name",
        "email": "student@university.edu",
        "role": "STUDENT",
        "status": "PENDING_VERIFICATION",
        "department": "Computer Science",
        "year_of_study": 2
      }
    }
  }
  ```

### Exchange Request & Handover Endpoints
All exchange request endpoints are mapped under `/api/exchange-requests` and require a valid JWT Session Token (`Authorization: Bearer <token>`).

#### 1. Create Request
- **URL**: `POST /api/exchange-requests`
- **Payload (SELL)**: `{ "resource_id": 1 }`
- **Payload (BORROW)**: `{ "resource_id": 2, "borrow_duration_days": 14 }`
- **Payload (SWAP)**: `{ "resource_id": 3, "offered_resource_id": 7 }`

#### 2. Get User Exchange Requests
- **URL**: `GET /api/exchange-requests?status=PENDING&role=owner`
- **Response**: List of incoming or sent requests matching active student ID.

#### 3. Request Lifecycle Actions
- **Accept**: `PUT /api/exchange-requests/:id/accept` (Resource transitions to `RESERVED`)
- **Reject**: `PUT /api/exchange-requests/:id/reject`
- **Cancel**: `PUT /api/exchange-requests/:id/cancel`
- **Complete**: `PUT /api/exchange-requests/:id/complete` (Requires verified QR; resource transitions to `EXCHANGED`)

### QR-Based Verification Endpoints
- **Generate QR Token**: `POST /api/exchange-requests/:id/qr` (Owner only)
- **Get QR Status**: `GET /api/exchange-requests/:id/qr` (Owner receives token; requester receives masked status)
- **Verify Handover**: `POST /api/exchange-requests/:id/qr/verify` (Requester scans token; atomic verification)

### Reviews & Trust Score Endpoints
Mapped under `/api/reviews`.
- **Submit Review**: `POST /api/reviews` (1–5 rating; atomic trust score calculation `Avg Rating * 20`)
- **Get User Review Stats**: `GET /api/reviews/user/:userId`

### Notifications Endpoints
Mapped under `/api/notifications`. All scoped strictly to authenticated user.
- **Get Notifications**: `GET /api/notifications?page=1&limit=20`
- **Get Unread Count**: `GET /api/notifications/unread-count`
- **Mark Single Read**: `PATCH /api/notifications/:id/read`
- **Mark All Read**: `PATCH /api/notifications/read-all`

### Administration & Moderation Endpoints
Mapped under `/api/admin` (Requires `ADMIN` role).
- **Platform Statistics**: `GET /api/admin/stats`
- **User Management**: `GET /api/admin/users`, `PATCH /api/admin/users/:id/status`
- **Resource Moderation**: `GET /api/admin/resources`, `PATCH /api/admin/resources/:id/status`
- **Report Management**: `GET /api/admin/reports`, `PATCH /api/admin/reports/:id/status`

---

## Test Suites & Regression Verification

Automated regression test suites verify complete system health and milestone correctness:

```bash
# Full System Regression Suite (M1–M11)
# Full System Regression Suite (M1–M11)
node scratch/verify_full_system.js

# Advanced Search & Filtering Suite (M12)
node scratch/verify_search_filters.js # M12 Search & Filtering (65/65 tests)

# Individual Milestone Regression Suites
node scratch/verify_admin.js          # M10 Admin & Moderation (16/16 tests)
node scratch/verify_notifications.js  # M9 Notifications & Isolation (14/14 tests)
node scratch/verify_qr.js             # M7 QR Verification (11/11 tests)
node scratch/verify_reviews.js        # M8 Reviews & Trust Score (8/8 tests)

# Frontend Build Validation
cd client && npm run build
```

---

## Milestone Implementation Status

- [x] **M1 – Project Setup**: Full-stack scaffolding, dependencies, environment management, and routing.
- [x] **M2 – Database Design**: 10 normalized MySQL tables, indexes, cascading rules, and relational integrity.
- [x] **M3 – MySQL Integration**: Express server connected to MySQL via connection pool with health probes (`/api/health` & `/api/health/db`).
- [x] **M4 – Authentication & Security**: Password hashing with bcrypt, JWT authorization tokens, role guards (`STUDENT` vs `ADMIN`), and sensitive data masking.
- [x] **M5 – Resource Management**: Multi-category marketplace, condition grading, search & filters, exchange modes (`SELL`, `BORROW`, `DONATE`, `SWAP`), and soft deletion.
- [x] **M6 – Exchange Requests & Transactions**: End-to-end request management, duplicate prevention, and atomic resource state transitions (`AVAILABLE` -> `RESERVED` -> `EXCHANGED`).
- [x] **M7 – QR-Based Exchange Verification**: Secure physical handover token generation, scanner verification, anti-replay guards, and timeout controls.
- [x] **M8 – Reviews, Ratings & Trust Score**: Post-completion peer reviews (1–5 stars), duplicate review blocks, and transparent trust score computation (`Avg Rating * 20`).
- [x] **M9 – Notifications & User Engagement**: Real-time event notifications, live unread badge, read tracking, and strict tenant isolation.
- [x] **M10 – Admin & Moderation System**: Executive dashboard metrics, user status controls (`ACTIVE`, `SUSPENDED`), self-deactivation safeguards, and listing/report moderation.
- [x] **M11 – Final System Integration & QA**: Complete cross-milestone test execution (69/69 passed), authorization audit, production readiness validation, and static build verification.
- [x] **M12 – Advanced Search & Filtering**: Multi-criteria query engine (`search`, `category_id`, `exchange_type`, `min_price`, `max_price`, `condition`, `location`), 6 sorting modes including relevance & owner trust score, composite performance indexes, active filter chips, and responsive marketplace UI (65/65 tests passed).




