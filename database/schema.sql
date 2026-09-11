-- ====================================================================
-- ResourceHub Database Schema (MySQL)
-- Part of Module M2 - Database Design
--
-- WARNING: This schema contains "DROP TABLE IF EXISTS" statements.
-- Do NOT execute this script against a production database, as it
-- will permanently delete existing data and structures.
-- Use ONLY for development, testing, or reset environments.
-- ====================================================================

CREATE DATABASE IF NOT EXISTS resourcehub;
USE resourcehub;

-- Disable foreign key checks temporarily during setup to ensure clean migration
SET FOREIGN_KEY_CHECKS = 0;

-- Drop tables if they already exist
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS conversations;
DROP TABLE IF EXISTS reports;
DROP TABLE IF EXISTS wishlist;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS qr_verifications;
DROP TABLE IF EXISTS exchange_requests;
DROP TABLE IF EXISTS resource_images;
DROP TABLE IF EXISTS resources;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

-- ====================================================================
-- 1. USERS TABLE
-- Stores both student profiles and admin accounts.
-- ====================================================================
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL, -- Designed for bcrypt hash (60 chars)
    profile_photo_url VARCHAR(255) NULL,
    department VARCHAR(100) NULL,
    year_of_study TINYINT NULL,
    phone_number VARCHAR(20) NULL,
    bio TEXT NULL,
    trust_score DECIMAL(5,2) NOT NULL DEFAULT 100.00,
    reputation_score DECIMAL(5,2) NOT NULL DEFAULT 100.00, -- M17: Enhanced multi-factor reputation score
    role ENUM('STUDENT', 'ADMIN') NOT NULL DEFAULT 'STUDENT',
    status ENUM('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'PENDING_VERIFICATION',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Verify email format basic sanity check
    CONSTRAINT check_user_email_format CHECK (email LIKE '%@%.%')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Indexing for authentication and email querying
CREATE INDEX idx_users_email ON users(email);


-- ====================================================================
-- 2. CATEGORIES TABLE
-- Standalone classifications of resource listings.
-- ====================================================================
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    slug VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ====================================================================
-- 3. RESOURCES TABLE
-- Academic items listed for exchange.
-- ====================================================================
CREATE TABLE resources (
    id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    category_id INT NOT NULL,
    exchange_type ENUM('SELL', 'BORROW', 'DONATE', 'SWAP') NOT NULL,
    price DECIMAL(10,2) NULL, -- Required only if exchange_type is SELL
    item_condition ENUM('NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'POOR') NOT NULL,
    meetup_location VARCHAR(255) NOT NULL,
    status ENUM('AVAILABLE', 'RESERVED', 'EXCHANGED', 'ARCHIVED') NOT NULL DEFAULT 'AVAILABLE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    
    -- Price validation constraints
    CONSTRAINT check_resource_price_positive CHECK (price >= 0.00),
    CONSTRAINT check_resource_price_required_for_sell CHECK (exchange_type != 'SELL' OR price IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Indexing for marketplace display filtering & search
CREATE INDEX idx_resources_status_category ON resources(status, category_id);
CREATE INDEX idx_resources_status_type ON resources(status, exchange_type);
CREATE INDEX idx_resources_status_price ON resources(status, price);
CREATE INDEX idx_resources_status_created ON resources(status, created_at);
CREATE INDEX idx_resources_owner ON resources(owner_id);


-- ====================================================================
-- 4. RESOURCE IMAGES TABLE
-- Support for multiple image URLs per resource listing.
-- ====================================================================
CREATE TABLE resource_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    resource_id INT NOT NULL,
    image_url VARCHAR(255) NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ====================================================================
-- 5. EXCHANGE REQUESTS (TRANSACTIONS) TABLE
-- Tracks the complete lifecycle of resource transactions.
-- ====================================================================
CREATE TABLE exchange_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    resource_id INT NOT NULL,
    requester_id INT NOT NULL,
    status ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'COMPLETED') NOT NULL DEFAULT 'PENDING',
    offered_resource_id INT NULL, -- FK for SWAP items owned by requester
    borrow_duration_days INT NULL, -- Applicable for BORROW requests
    price_agreed DECIMAL(10,2) NULL, -- Snapshots agreed price for historical sustainability auditing
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (offered_resource_id) REFERENCES resources(id) ON DELETE SET NULL ON UPDATE CASCADE,
    
    CONSTRAINT check_request_borrow_duration CHECK (borrow_duration_days > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Indexes for looking up transaction states on dashboards
CREATE INDEX idx_exchange_requests_requester ON exchange_requests(requester_id);
CREATE INDEX idx_exchange_requests_resource ON exchange_requests(resource_id);


-- ====================================================================
-- 6. QR VERIFICATIONS TABLE
-- Validates face-to-face handovers on campus securely.
-- ====================================================================
CREATE TABLE qr_verifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_id INT NOT NULL UNIQUE, -- One QR code verification record per transaction
    verification_token VARCHAR(64) NOT NULL UNIQUE, -- Secure high-entropy random token
    status ENUM('GENERATED', 'VERIFIED', 'EXPIRED') NOT NULL DEFAULT 'GENERATED',
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verified_at TIMESTAMP NULL,
    verified_by_id INT NULL, -- Student ID who verified (scanned) the token
    expires_at TIMESTAMP NOT NULL,
    
    FOREIGN KEY (transaction_id) REFERENCES exchange_requests(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (verified_by_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ====================================================================
-- 7. RATINGS AND REVIEWS TABLE
-- Stores peer feedback for completed exchanges. Updates User Trust Scores.
-- ====================================================================
CREATE TABLE reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_id INT NOT NULL,
    reviewer_id INT NOT NULL,
    reviewed_id INT NOT NULL,
    rating TINYINT NOT NULL,
    review_text TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (transaction_id) REFERENCES exchange_requests(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (reviewed_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    
    -- Rating range verification
    CONSTRAINT check_review_rating_range CHECK (rating BETWEEN 1 AND 5),
    
    -- Prevent duplicate rating reviews by the same user for the same transaction
    UNIQUE KEY unique_transaction_reviewer (transaction_id, reviewer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ====================================================================
-- 8. NOTIFICATIONS TABLE
-- Stores alerts dispatched to students and admins.
-- ====================================================================
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recipient_id INT NOT NULL,
    notification_type VARCHAR(50) NOT NULL, -- REQUEST_RECEIVED, VERIFICATION_SUCCESS, REVIEW_RECEIVED, etc.
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    related_entity_type VARCHAR(50) NULL, -- 'exchange_requests', 'resources'
    related_entity_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Indexing for quick retrieval of unread notifications
CREATE INDEX idx_notifications_recipient_read ON notifications(recipient_id, is_read);


-- ====================================================================
-- 9. WISHLIST TABLE
-- Stores saved bookmark listings.
-- ====================================================================
CREATE TABLE wishlist (
    user_id INT NOT NULL,
    resource_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (user_id, resource_id), -- Composite PK prevents duplicate wishlist entries natively
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ====================================================================
-- 10. REPORTS TABLE
-- Administrative moderation flags on users, resources, or transactions.
-- ====================================================================
CREATE TABLE reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reporter_id INT NOT NULL,
    reported_entity_type ENUM('USER', 'RESOURCE', 'TRANSACTION') NOT NULL,
    reported_entity_id INT NOT NULL,
    reason VARCHAR(100) NOT NULL,
    description TEXT NULL,
    status ENUM('PENDING', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED') NOT NULL DEFAULT 'PENDING',
    admin_resolution TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_reports_status ON reports(status);


-- ====================================================================
-- 11. CATEGORIES SEED DATA
-- Pre-populates the classifications of resources.
-- ====================================================================
INSERT INTO categories (name, slug) VALUES 
('Books', 'books'),
('Electronics', 'electronics'),
('Laboratory Equipment', 'laboratory-equipment'),
('Project Components', 'project-components'),
('Stationery', 'stationery'),
('Other', 'other');


-- ====================================================================
-- 12. CONVERSATIONS TABLE
-- Tracks direct communication between resource owners and requesters.
-- ====================================================================
CREATE TABLE conversations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    resource_id INT NOT NULL,
    transaction_id INT NULL,
    participant1_id INT NOT NULL,
    participant2_id INT NOT NULL,
    last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (transaction_id) REFERENCES exchange_requests(id) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (participant1_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (participant2_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,

    UNIQUE KEY uq_conv_res_participants (resource_id, participant1_id, participant2_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_conversations_p1_last_msg ON conversations(participant1_id, last_message_at);
CREATE INDEX idx_conversations_p2_last_msg ON conversations(participant2_id, last_message_at);
CREATE INDEX idx_conversations_transaction ON conversations(transaction_id);


-- ====================================================================
-- 13. MESSAGES TABLE
-- Stores individual chat messages in conversations.
-- ====================================================================
CREATE TABLE messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conversation_id INT NOT NULL,
    sender_id INT NOT NULL,
    message_text TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_messages_conv_created ON messages(conversation_id, created_at);
CREATE INDEX idx_messages_conv_read ON messages(conversation_id, is_read);

