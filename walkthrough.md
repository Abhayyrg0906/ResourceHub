# Milestone M17: Enhanced Trust & Reputation System — Walkthrough

## Overview
**Milestone M17** delivers a transparent, multi-factor, anti-manipulation **Enhanced Trust & Reputation System** for ResourceHub. It introduces a comprehensive 4-factor scoring model ($0.00$–$100.00$), campus peer tiers, community achievement badges, and interactive audit breakdown modals across the user and administration portals, while strictly preserving backward compatibility with legacy review-based trust scores ($R \times 20$).

---

## 1. Mathematical Architecture & Formula Design

The enhanced reputation model incorporates 4 auditable factors with strict server-side validation:

$$\text{Reputation Score} = (F_{\text{Review}} \times 0.40) + (F_{\text{Exchanges}} \times 0.30) + (F_{\text{Reliability}} \times 0.20) + (F_{\text{Standing}} \times 0.10)$$

| Factor | Weight | Maximum Points | Calculation & Details |
| :--- | :---: | :---: | :--- |
| **Review Quality** | **40%** | **40.0 pts** | $(R_{\text{avg}} / 5.0) \times 100$. New members with 0 reviews start with a neutral 100% baseline ($5.0 / 5.0\bigstar$). |
| **Completed Exchanges** | **30%** | **30.0 pts** | Volume maturity: $\min(100, (\text{Completed} / 5) \times 100)$. Plus a QR verification bonus ratio ($0.80 + 0.20 \times (\text{QR} / \text{Completed})$). |
| **Reliability & Fulfillment** | **20%** | **20.0 pts** | $(\text{Completed} / (\text{Completed} + \text{Cancelled})) \times 100$. Zero cancellations = 100% fulfillment. Cancellations immediately penalize the score. |
| **Account Standing & Moderation** | **10%** | **10.0 pts** | Server-side check: Base 100 pts if `ACTIVE`, 0 pts if `SUSPENDED`. Penalties: -30 pts per resolved report, -15 pts per active pending report. |

- **Safe Range**: Strictly clamped between $[0.00, 100.00]$.
- **Tiers**:
  - **Elite Exchanger**: $90.00$–$100.00$
  - **Trusted Peer**: $75.00$–$89.99$
  - **Active Member**: $50.00$–$74.99$
  - **Needs Improvement**: $25.00$–$49.99$
  - **Restricted / Caution**: $< 25.00$ (or status `SUSPENDED`)
- **Earned Community Badges**:
  - `Verified Handover Champion`: $100\%$ of completed exchanges verified securely via QR code.
  - `Zero Cancellation Record`: Zero cancellations on accepted exchanges.
  - `Top Rated`: Consistently maintains $4.5+\bigstar$ rating across reviews.
  - `Established Trader`: $5+$ successful campus exchanges completed.

---

## 2. Key Code Changes

### Backend
- [`database/schema.sql`](file:///c:/Projects/ResourceHub/database/schema.sql):
  - Added `reputation_score DECIMAL(5,2) NOT NULL DEFAULT 100.00 AFTER trust_score` to `users` table.
- [`server/services/reputationService.js`](file:///c:/Projects/ResourceHub/server/services/reputationService.js) *(New)*:
  - `calculateReputation(userId, conn)`: Core 4-factor math, tier assignment, badge computation, and plain-English factor summaries.
  - `updateUserReputation(userId, conn)`: Transactional score recalculation and persistence into `users.reputation_score`.
  - `getReputationBreakdown(userId)`: Public and administrative audit endpoint helper.
- [`server/controllers/reviewController.js`](file:///c:/Projects/ResourceHub/server/controllers/reviewController.js):
  - In `createReview`: Transactionally updates legacy `trust_score` ($R \times 20$) AND `reputation_score` via `reputationService`.
  - In `getUserReviews`: Returns both legacy `trust_score` and enhanced `reputation_score`.
- [`server/controllers/exchangeController.js`](file:///c:/Projects/ResourceHub/server/controllers/exchangeController.js):
  - In `completeRequest`: Inside MySQL transaction, updates reputation for both owner and requester.
  - In `cancelRequest`: Triggers reliability and reputation recalculation for requester on cancellation.
- [`server/controllers/userController.js`](file:///c:/Projects/ResourceHub/server/controllers/userController.js):
  - `getMyProfile` & `getUserProfileById`: Include `reputation_score` and full `reputation_breakdown`.
  - Added `getUserReputation`: `GET /api/users/:id/reputation` for factor audit.
- [`server/controllers/adminController.js`](file:///c:/Projects/ResourceHub/server/controllers/adminController.js):
  - `getUsers`: Selects and formats `reputation_score`.
  - `updateUserStatus` & `updateReportStatus`: Automatically recalculates user reputation on moderation updates.
  - Added `getAdminUserReputation`: `GET /api/admin/users/:id/reputation`.
- [`server/routes/users.js`](file:///c:/Projects/ResourceHub/server/routes/users.js) & [`server/routes/admin.js`](file:///c:/Projects/ResourceHub/server/routes/admin.js):
  - Mounted `GET /api/users/:id/reputation` and `GET /api/admin/users/:id/reputation`.

### Frontend
- [`client/src/services/userService.js`](file:///c:/Projects/ResourceHub/client/src/services/userService.js):
  - Added `getUserReputation(userId)`.
- [`client/src/services/adminService.js`](file:///c:/Projects/ResourceHub/client/src/services/adminService.js):
  - Added `getAdminUserReputation(userId)`.
- [`client/src/components/TrustBreakdownModal.jsx`](file:///c:/Projects/ResourceHub/client/src/components/TrustBreakdownModal.jsx) *(New)*:
  - Comprehensive modal displaying reputation gauge, tier pill, legacy score reference, 4 factor cards with progress bars and weights, badges list, and expandable transparent formula disclosure.
- [`client/src/pages/Profile.jsx`](file:///c:/Projects/ResourceHub/client/src/pages/Profile.jsx):
  - Added tier badge beside user name in header and interactive "Reputation Score" card opening `TrustBreakdownModal`.
- [`client/src/pages/AdminDashboard.jsx`](file:///c:/Projects/ResourceHub/client/src/pages/AdminDashboard.jsx):
  - Added "Reputation & Trust" column, quick-inspect button, and "Audit" action button opening admin reputation inspection modal.
- [`client/src/pages/ResourceDetails.jsx`](file:///c:/Projects/ResourceHub/client/src/pages/ResourceDetails.jsx):
  - Made seller/owner reputation badge interactive, enabling buyers to inspect seller reputation before requesting an exchange.

---

## 3. Verification & Regression Results

### M17 Dedicated Test Suite
Created [`scratch/verify_trust_enhanced.js`](file:///c:/Projects/ResourceHub/scratch/verify_trust_enhanced.js) covering all requirements:
```
================================================================
 ALL M17 TESTS PASSED SUCCESSFULLY (38/38)
================================================================
  [PASS] Baseline reputation endpoint returns 200
  [PASS] 4-factor breakdown object exists with weights 40%, 30%, 20%, 10%
  [PASS] Baseline score for new member with 0 exchanges is exactly 70.00 (Active Member)
  [PASS] Owner & requester completed exchanges increase volume & score (70 -> 76)
  [PASS] Cancellation drops reliability factor score and total reputation (76 -> 66)
  [PASS] 5-star peer review updates legacy trust_score (100.00) and reputation_score
  [PASS] Anti-manipulation: Duplicate review rejected with 409 Conflict without altering score
  [PASS] Transaction rollback integrity: Failure leaves reputation and reviews untouched
  [PASS] User isolation: User A actions do not affect User C (remains 70.00 baseline)
  [PASS] Safe boundary limits: Score strictly clamped within [0.00, 100.00]
  [PASS] Admin inspection endpoint returns full breakdown and rejects non-admin (403)
  [PASS] Admin user list includes reputation_score and trust_score
```

### Full Regression Test Suites
All existing regression test suites passed with **100% success rate**:
- `node scratch/verify_reviews.js`: **ALL PASSED** (M8 legacy trust score preserved: $5\bigstar = 100.00, 4\bigstar = 80.00, 5/4/5 = 93.40, 5/4/5/1 = 75.00).
- `node scratch/verify_profiles.js`: **77/77 PASSED** (User profiles, privacy, whitelist sanitization, stats).
- `node scratch/verify_qr_history.js`: **ALL PASSED** (QR handover verification, history, replay protection).
- `node scratch/verify_full_system.js`: **69/69 PASSED** (Full system regression M1–M11).
- `npm run build` in `client/`: **SUCCESSFUL** (0 errors, clean Vite production build).
