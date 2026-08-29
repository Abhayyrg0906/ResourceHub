# QR-Based Exchange Verification Specification

This document details the architecture, security rules, and user workflows implemented for **ResourceHub** physical exchange verification (Phase M7).

---

## 1. Security Architecture
To prevent student identity fraud and secure transaction status integrity:
1. **Low-Exposure Token Payload**: The generated QR code encodes only a safe token indicator format: `RESOURCEHUB_VERIFY:<secure_token>`.
2. **Cryptographic Entropy**: Tokens are generated using the cryptographically secure `crypto.randomBytes(32).toString('hex')` on the backend Node process, providing 256 bits of entropy.
3. **Identity Verification Policies**:
   - The **resource owner** (handing over the item) generates the QR code and displays it on their screen.
   - The **requester** (receiving the item) scans the QR code or inputs the token manually.
   - The backend validates the scanner is the authorized transaction requester (`requester_id === req.user.id`). The owner is explicitly blocked from scanning their own QR code.
4. **Single-Use Enforcements**: Tokens are single-use. Verification status updates to `VERIFIED` in `qr_verifications` and blocks subsequent scans.
5. **Strict Expiry Constraints**: Tokens automatically expire after a configurable duration (default: `10` minutes) specified by the `QR_EXPIRY_MINUTES` environment variable.

---

## 2. API Endpoint Specification

### POST `/api/exchange-requests/:id/qr`
- **Access**: Protected (Resource Owner only)
- Generates a secure token. If a token already exists, updates it (expiring the old one).
- Returns the verification token and expiry time.

### POST `/api/exchange-requests/:id/qr/verify`
- **Access**: Protected (Requester only)
- **Body**: `{ "verification_token": "..." }`
- **Database Transaction (Atomicity Guard)**:
  - Uses row-level locking (`FOR UPDATE`) to verify the token is `GENERATED` and not expired.
  - Updates the QR status to `VERIFIED` and logs scanning student ID.

### GET `/api/exchange-requests/:id/qr`
- **Access**: Protected (Participants only)
- Returns status (`GENERATED`, `VERIFIED`, `EXPIRED`), expiry times, and handover details.
- Exposes `verification_token` to the **owner only** to prevent the requester from fetching it via the API.

---

## 3. Transaction Completion Integration
The M6 transaction completion flow is modified to enforce physical handover checks:
- Any call to `PUT /api/exchange-requests/:id/complete` checks `qr_verifications` status.
- If not `VERIFIED`, the completion request is rejected with `400 Bad Request` and message: `"QR verification is required before completing this exchange."`
- The state progression flows as follows:
  `ACCEPTED` $\rightarrow$ `Generate QR` $\rightarrow$ `Requester Scans` $\rightarrow$ `VERIFIED` $\rightarrow$ `Complete Transaction` $\rightarrow$ `COMPLETED` $\rightarrow$ `Resource EXCHANGED`.

---

## 4. UI Component Workflow

### Owner UI (`MyRequests.jsx`)
- Shows a `[Generate QR]` button on accepted listings.
- Displays the generated QR Canvas alongside a live countdown timer.
- Polls `GET /api/exchange-requests/:id/qr` every 3 seconds. Once scanned, updates the view to `"Physical handover verified!"` and enables the **Complete Transaction** action.

### Requester UI (`MyRequests.jsx`)
- Shows a `[Scan QR]` button.
- Displays a modal popup letting them capture the code using the camera (`html5-qrcode`) or paste/type the secure token manually (safe fallback).
- After scanning, verified messages are shown, and the **Complete Transaction** action is enabled.
