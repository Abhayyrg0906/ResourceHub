# ResourceHub Authentication and Authorization Spec

This document details the security and authentication protocols implemented for **ResourceHub** (Phase M4). The architecture uses token-based authentication (JWT) and double-entropy password protection (bcryptjs) to secure student endpoints.

---

## 1. User Registration Flow

- **Endpoint**: `POST /api/auth/register`
- **Controller Action**: `authController.register`
- **Default Parameters**:
  - `role`: Hardcoded to `STUDENT` on DB insertion. (Admin privileges cannot be self-assigned).
  - `status`: Default is `PENDING_VERIFICATION`.
- **Validation Rules**:
  - **Inputs Required**: `name` (min 2 chars), `email`, `password`, `department`, `year_of_study` (1-6).
  - **Password Strength**: Minimum 8 characters, containing at least 1 uppercase letter, 1 lowercase letter, and 1 number.
  - **Normalization**: Email addresses are trimmed and normalized to lowercase.
  - **College Domain Lock**: If `COLLEGE_EMAIL_DOMAIN` is configured (e.g. `university.edu`), emails must end with `@university.edu` or `.university.edu` (covering subdomains). If empty, domain locks are bypassed.
- **SQL Parameterization**:
  - Insert query: `INSERT INTO users (name, email, password_hash, department, year_of_study, phone_number, bio, role, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'STUDENT', 'PENDING_VERIFICATION')`

---

## 2. Password Hashing (bcryptjs)

- Plaintext passwords are **never** stored or written to logs.
- On registration, the backend hashes the password using `bcryptjs` with **10 salt rounds**:
  ```javascript
  const saltRounds = 10;
  const password_hash = await bcrypt.hash(password, saltRounds);
  ```
- The hash string is stored in `users.password_hash` (`VARCHAR(255)`).
- On login, the backend verifies credentials via:
  ```javascript
  const isMatch = await bcrypt.compare(password, user.password_hash);
  ```

---

## 3. User Login & Token Generation

- **Endpoint**: `POST /api/auth/login`
- **Controller Action**: `authController.login`
- **Validation Rules**:
  - Generic message `"Invalid email or password."` is returned for non-existent users, incorrect passwords, or mismatched values. (Protects against account enumeration attacks).
  - Checks if user status is `SUSPENDED` and rejects access.
- **JWT Generation**:
  - Signed with `process.env.JWT_SECRET`.
  - Expiry set by `process.env.JWT_EXPIRE_TIME` (defaults to `7d`).
  - **Payload**: Contains only minimal references to protect student privacy:
    ```json
    {
      "userId": 1,
      "role": "STUDENT"
    }
    ```
  - Secrets are kept strictly in `.env` and are never hardcoded.

---

## 4. JWT Verification Middleware

- **File**: `server/middleware/authMiddleware.js`
- **Function**: `protect`
- Expects header `Authorization: Bearer <token>`.
- **Validation**:
  - Decrypts token using `process.env.JWT_SECRET`.
  - Captures and flags `TokenExpiredError` (returns `"Session expired"`).
  - Fetches user state from database using parameterized query `SELECT id, name, email, role, status FROM users WHERE id = ?`.
  - If user is suspended in the database, rejects the request.
  - Attaches the verified user metadata object to `req.user`.

---

## 5. Protected User Endpoint

- **Endpoint**: `GET /api/auth/me`
- **Controller Action**: `authController.me`
- **Protection**: Requires `protect` middleware.
- Returns only safe user data:
  ```json
  {
    "success": true,
    "message": "User details retrieved successfully.",
    "data": {
      "user": {
        "id": 1,
        "name": "Alex Rivera",
        "email": "alex@university.edu",
        "role": "STUDENT",
        "status": "ACTIVE",
        "department": "Computer Science",
        "year_of_study": 2
      }
    }
  }
  ```

---

## 6. Role-Based Authorization

- **Helper Function**: `requireRole(...allowedRoles)` in `authMiddleware.js`.
- Restricts route execution to specific roles:
  ```javascript
  router.get('/admin-only-path', protect, requireRole('ADMIN'), handler);
  ```
- Denied requests return `403 Forbidden` status code.
