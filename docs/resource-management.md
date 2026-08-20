# Resource Management System Specification

This document details the design, API endpoints, schema fields, and React workflows implemented for **ResourceHub** resource listing management (Phase M5).

---

## 1. Database Table Roles
We utilize three pre-existing, normalized MySQL tables:
1. **`resources`**: Stores core listings details (`id`, `owner_id`, `title`, `description`, `category_id`, `exchange_type`, `price`, `item_condition`, `meetup_location`, `status`, `created_at`, `updated_at`).
2. **`resource_images`**: Connects image URLs to listings (`id`, `resource_id`, `image_url`, `is_primary`).
3. **`categories`**: seeded academic categories table.

---

## 2. API Endpoint Specification

### GET `/api/categories`
- **Access**: Public
- Returns all categories sorted alphabetically.

### GET `/api/resources`
- **Access**: Public
- **Query Parameters**:
  - `category_id`: Filters by database category ID.
  - `exchange_type`: Matches resource exchange mode (`SELL`, `BORROW`, `SWAP`, `DONATE`).
  - `item_condition`: Matches item wear (`NEW`, `LIKE_NEW`, `GOOD`, `FAIR`, `POOR`).
  - `status`: Default is `AVAILABLE`. Set to `ALL` to query all statuses except `ARCHIVED` (useful for personal dashboards).
  - `owner_id`: Restricts results to resources listed by a specific student.
  - `search`: Performs a wildcard SQL search (`LIKE %term%`) on `title` and `description`.
  - `sort`: Orders results using strict whitelists:
    - `latest` (Default, descending created timestamp)
    - `price_low` (Ascending price)
    - `price_high` (Descending price)
    - `title` (A-Z listing titles)
  - `page`: Offset page number (Default: `1`).
  - `limit`: Results count per offset page (Default: `10`, capped at `50`).
- **Response pagination payload**: Includes `page`, `limit`, `total` matched rows, and calculated `totalPages`.

### GET `/api/resources/:id`
- **Access**: Public
- Returns the complete listing information, category name, safe owner details (excluding password hash), and a list of all associated `resource_images`.

### POST `/api/resources`
- **Access**: Protected (Requires JWT Bearer token)
- **Constraint**: `owner_id` is automatically set to the authenticated user's ID (`req.user.id`). User inputs cannot override listing ownership.
- **Validations**:
  - `title`, `description`, `category_id`, `exchange_type`, `item_condition`, and `meetup_location` are required.
  - `exchange_type` must be in `['SELL', 'BORROW', 'DONATE', 'SWAP']`.
  - `item_condition` must be in `['NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'POOR']`.
  - `price`: If type is `SELL`, `price` must be a positive number. If not `SELL`, price is set to `null` to align with database consistency.
- Inserts primary image record to `resource_images` table if `image_url` is supplied.

### PUT `/api/resources/:id`
- **Access**: Protected (Requires JWT Bearer token)
- **Constraint**: Only the listing's original owner (`owner_id === req.user.id`) can update details. Access is rejected with `403 Forbidden` if ownership fails validation checks.
- Allows updates to all fields including listing `status` (`AVAILABLE`, `RESERVED`, `EXCHANGED`, `ARCHIVED`).
- Disallows altering `id` or `owner_id`.

### DELETE `/api/resources/:id`
- **Access**: Protected (Requires JWT Bearer token)
- **Constraint**: Only the owner can delete the resource.
- **Soft Deletion**: Does not drop rows. Updates the listing `status` to `ARCHIVED` to maintain transaction integrity.

---

## 3. Client UI Components Integration

1. **Academic Marketplace (`Marketplace.jsx`)**:
   - Performs paginated checks, links search inputs, and exposes select options for condition and sorting.
   - Dynamic category tab list loaded from backend on boot.
   - Automatically handles image rendering fallbacks (renders custom placeholders if no image exists or if link loads fail).
2. **Resource Details (`ResourceDetails.jsx`)**:
   - Queries individual listing values dynamically.
   - Evaluates active user ID against listing owner. If match is true, renders "Edit Listing" and "Archive Listing" actions; otherwise, displays exchange options.
3. **List/Edit forms (`AddResource.jsx`, `EditResource.jsx`)**:
   - Maps category options dynamically.
   - Conditionally exposes price fields ONLY for SELL options.
4. **My Listings Dashboard (`MyListings.jsx`)**:
   - Fetches resources by active owner (`GET /api/resources?owner_id=${user.id}&status=ALL`).
   - Toggles exchange listing state from AVAILABLE to EXCHANGED.
