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

### Exchange Request Endpoints
All exchange request endpoints are mapped under `/api/exchange-requests` and require a valid JWT Session Token.

#### 1. Create Request
- **URL**: `POST /api/exchange-requests`
- **Payload (SELL)**:
  ```json
  { "resource_id": 1 }
  ```
- **Payload (BORROW)**:
  ```json
  { "resource_id": 2, "borrow_duration_days": 14 }
  ```
- **Payload (SWAP)**:
  ```json
  { "resource_id": 3, "offered_resource_id": 7 }
  ```

#### 2. Get User Exchange Requests
- **URL**: `GET /api/exchange-requests?status=PENDING&role=owner`
- **Response**: List of incoming or sent requests matching active student ID.

---

## Current Status

- **Project Foundation (Completed)**: Scaffolding complete, Routing established, Layout and premium styling implemented.
- **Database Design (Completed)**: 10 tables normalized and mapped in a Mermaid ERD.
- **Database Connection Pool (Completed)**: Express server connected to MySQL via connection pool.
- **Authentication & Security (Completed)**: Hashed logins, JWT token verification, route guards.
- **Resource Management (Completed)**: Marketplace search, dynamic categories filters, sorting whitelists, detail views, creation, editing, and soft archiving.
- **Exchange Requests & Transactions (Completed)**: Transactional requests management (SELL, BORROW, DONATE, SWAP) using MySQL transactions to manage atomic state handovers (`AVAILABLE` -> `RESERVED` -> `EXCHANGED`).


