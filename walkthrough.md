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

---

# Milestone M18: Advanced Resource Image Management — Walkthrough

## Overview
**Milestone M18** delivers a robust, secure, and performant multi-image management system for ResourceHub. Students can upload, preview, reorder/set primary cover images, and delete up to 5 images per listing. The backend optimizes large images using `sharp` to WebP format, enforces strict MIME and size limits, prevents directory traversal, and restricts image operations strictly to listing owners, all while preserving backward compatibility with legacy single `image_url` listings.

---

## 1. Key Features & Implementation Architecture

### 1. Database & Schema Re-use
- Leverages the existing `resource_images` table (`id`, `resource_id`, `image_url`, `is_primary`, `created_at`).
- In `resourceController.js:getResources`, queries primary image via:
  ```sql
  (SELECT image_url FROM resource_images WHERE resource_id = r.id ORDER BY is_primary DESC, id ASC LIMIT 1) AS image_url
  ```
  This eliminates duplicate row joins and ensures marketplace cards always display the primary cover image (or earliest image if none flagged).
- In `resourceController.js:getResourceById`, queries all images ordered by `is_primary DESC, id ASC` and returns structured array of `{ id, image_url, is_primary }`.

### 2. Validation & Image Optimization Service
- [`server/middleware/imageUploadMiddleware.js`](file:///c:/Projects/ResourceHub/server/middleware/imageUploadMiddleware.js):
  - Memory storage for in-memory buffer processing.
  - Whitelist filter: `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `image/svg+xml` (checks both MIME and file extension). Rejects `.txt`, `.exe`, etc. with 400.
  - File size cap: 5MB per file.
  - Max count: 5 files per upload.
- [`server/services/imageService.js`](file:///c:/Projects/ResourceHub/server/services/imageService.js):
  - Resizes large raster images to maximum $1600 \times 1600\text{px}$ preserving aspect ratio (`withoutEnlargement: true`).
  - Converts to WebP format at 80% quality for optimal bandwidth on campus networks.
  - Vector SVG images are saved directly without raster degradation.
  - Random hash and timestamp filenames (`server/uploads/resources/res-<timestamp>-<hash>.webp`).
  - Safe file deletion (`deleteImageFile`): Checks that resolved target path strictly resides within `server/uploads` to block directory traversal attacks.

### 3. RESTful Image Endpoints & Ownership Security
- [`server/routes/resources.js`](file:///c:/Projects/ResourceHub/server/routes/resources.js):
  - `POST /api/resources/upload`: Standalone upload endpoint returning optimized image paths.
  - `POST /api/resources/:id/images`: Add image to an existing listing. Enforces owner verification (403 for non-owners) and 5-image ceiling (400 if limit reached).
  - `PATCH /api/resources/:id/images/:imageId/primary`: Switches primary cover image. Enforces owner verification (403 for non-owners).
  - `DELETE /api/resources/:id/images/:imageId`: Deletes image from DB and unlinks local file from disk. Enforces owner verification (403 for non-owners). Auto-promotes the oldest remaining image to primary if the deleted image was primary.

### 4. Dual-Payload Backward Compatibility
- In `POST /api/resources` and `PUT /api/resources/:id`:
  - Accepts modern `images` array (URLs or objects `{ image_url, is_primary }`).
  - Accepts legacy `image_url` string, automatically setting `is_primary = TRUE` in `resource_images`.
  - All existing automated tests (M2, M5, M11) continue to pass without any breaking changes.

### 5. Interactive Frontend UI
- [`client/src/components/ImageUploader.jsx`](file:///c:/Projects/ResourceHub/client/src/components/ImageUploader.jsx):
  - Drag-and-drop zone with animated feedback.
  - File browser supporting multiple selection.
  - Optional web URL input for linking external images.
  - Live preview grid with "PRIMARY" gold star badge.
  - One-click "Make Primary" cover action.
  - Remove ($X$) button on thumbnails.
  - Counter badge: e.g. "3 / 5 images".
- [`client/src/pages/AddResource.jsx`](file:///c:/Projects/ResourceHub/client/src/pages/AddResource.jsx) & [`client/src/pages/EditResource.jsx`](file:///c:/Projects/ResourceHub/client/src/pages/EditResource.jsx):
  - Replaced single text URL input with `ImageUploader`.
- [`client/src/pages/ResourceDetails.jsx`](file:///c:/Projects/ResourceHub/client/src/pages/ResourceDetails.jsx):
  - Interactive multi-image gallery with large hero stage.
  - Previous and Next navigation arrows.
  - "X of Y" counter badge and "PRIMARY COVER" badge.
  - Thumbnail strip navigation with active selection ring.
  - Graceful placeholder state when no image exists.

---

## 2. Verification & Regression Results

### M18 Dedicated Test Suite
Created [`scratch/verify_resource_images.js`](file:///c:/Projects/ResourceHub/scratch/verify_resource_images.js) covering all requirements:
```
================================================================
  RESOURCEHUB M18 — ADVANCED RESOURCE IMAGE MANAGEMENT TESTS   
================================================================

--- 1. User Setup ---
 [PASS] Owner registered and logged in successfully.
 [PASS] Buyer registered and logged in successfully.

--- 2. Image Upload & Validation Tests ---
 [PASS] Rejected invalid file format (.txt) with status 400
 [PASS] Rejected oversized file (>5MB) with status 400
 [PASS] Rejected upload exceeding 5 images with status 400
 [PASS] Uploaded 3 valid images successfully (status 200).
 [PASS] Received 3 processed image records from upload.
 [PASS] Uploaded file exists on disk (WebP optimized)
 [PASS] Uploaded SVG file exists on disk

--- 3. Listing Creation with Multiple Images ---
 [PASS] Created resource listing with multiple images (status 201).

--- 4. Verify Resource Details & Primary Image ---
 [PASS] Fetched resource details successfully.
 [PASS] Resource has exactly 3 images attached.
 [PASS] Primary image correctly matches explicit primary
 [PASS] Queried marketplace for newly listed resource.
 [PASS] Marketplace card displays primary image URL in image_url field.

--- 5. Backward Compatibility Test (Single image_url) ---
 [PASS] Successfully created legacy listing with single image_url string.
 [PASS] Legacy image_url automatically stored as primary image in resource_images.

--- 6. Image Management Endpoints & Ownership Security ---
 [PASS] Non-owner rejected with 403 Forbidden on POST /:id/images.
 [PASS] Owner successfully added 4th image (status 201).
 [PASS] Owner successfully added 5th image (status 201).
 [PASS] Rejected 6th image with status 400 (exceeds 5-image cap).
 [PASS] Non-owner rejected with 403 Forbidden on primary image patch.
 [PASS] Owner updated primary image (status 200).
 [PASS] Verified 4th image is now the primary image in resource details.
 [PASS] Non-owner rejected with 403 Forbidden on image DELETE.
 [PASS] Owner deleted primary image successfully (status 200).
 [PASS] Resource now has 4 remaining images.
 [PASS] Oldest remaining image was automatically promoted to primary.
 [PASS] Deleted local file image.
 [PASS] Local disk file was safely unlinked on delete.

================================================================
  M18 TEST SUMMARY: 33 PASSED, 0 FAILED
================================================================
```

### Full System Regression Results
All regression suites passed with **100% success rate**:
- `node scratch/verify_resource_images.js`: **33/33 PASSED** (Uploads, sharp optimization, validation, caps, ownership, gallery, backward compatibility).
- `node scratch/verify_trust_enhanced.js`: **38/38 PASSED** (M17 4-factor reputation system, badges, audit breakdown).
- `node scratch/verify_search_filters.js`: **65/65 PASSED** (M12 search & multi-filter criteria).
- `node scratch/verify_wishlist.js`: **49/49 PASSED** (M14 wishlist alerts & smart matching).
- `node scratch/verify_profiles.js`: **77/77 PASSED** (M15 user profiles, public reviews, active listings).
- `node scratch/verify_full_system.js`: **69/69 PASSED** (M11 complete platform regression).
- `npm run build` in `client/`: **SUCCESSFUL** (Built in 1.21s, 0 errors).

