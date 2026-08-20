# ResourceHub MySQL Database Documentation

This folder is designated for database scripts, seed files, and configuration instructions.

## Schema Architecture (Planned)

The database will consist of the following main tables to support verified student trading workflows:

### 1. `users`
Tracks student identification and trust parameters.
- `id` (INT, Primary Key, Auto Increment)
- `name` (VARCHAR)
- `email` (VARCHAR, Unique) - Must end with validated college email domain.
- `password_hash` (VARCHAR)
- `trust_score` (INT, Default 100)
- `created_at` (TIMESTAMP)

### 2. `resources`
Holds information about items available in the marketplace.
- `id` (INT, Primary Key, Auto Increment)
- `owner_id` (INT, Foreign Key referencing `users.id`)
- `title` (VARCHAR)
- `description` (TEXT)
- `category` (ENUM: 'Textbooks', 'Electronics', 'Laboratory', 'Stationery')
- `condition` (ENUM: 'New', 'Like New', 'Good', 'Fair', 'Poor')
- `exchange_type` (ENUM: 'Sell', 'Borrow', 'Swap', 'Donate')
- `terms_value` (VARCHAR) - Price or details.
- `meetup_location` (VARCHAR)
- `status` (ENUM: 'Active', 'Traded', 'Deleted')
- `created_at` (TIMESTAMP)

### 3. `requests`
Manages interaction between the owner and the requester.
- `id` (INT, Primary Key, Auto Increment)
- `resource_id` (INT, Foreign Key referencing `resources.id`)
- `requester_id` (INT, Foreign Key referencing `users.id`)
- `status` (ENUM: 'Pending', 'Approved', 'Rejected', 'Completed')
- `proposed_swap_item` (VARCHAR, Optional) - Details if exchange type is Swap.
- `duration_days` (INT, Optional) - Details if exchange type is Borrow.
- `created_at` (TIMESTAMP)

### 4. `reviews`
Tracks peer ratings to compute Trust Score.
- `id` (INT, Primary Key, Auto Increment)
- `exchange_id` (INT, Foreign Key referencing `requests.id`)
- `reviewer_id` (INT, Foreign Key referencing `users.id`)
- `reviewee_id` (INT, Foreign Key referencing `users.id`)
- `rating` (INT) - 1 to 5 stars.
- `comment` (TEXT)
- `created_at` (TIMESTAMP)

---

## Setting up MySQL (Future Phase)
Once database implementation begins, schema migration scripts will be placed here.
Connection details will load from the environment variables in `server/.env`.
