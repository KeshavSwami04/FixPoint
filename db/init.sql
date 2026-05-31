-- FixPoint DB Schema
-- Run automatically by Docker on first start.
-- If you already have instifix_db with data, this is SAFE — all statements use
-- CREATE TABLE IF NOT EXISTS so existing tables are untouched.

CREATE DATABASE IF NOT EXISTS instifix_db;
USE instifix_db;

-- Users (students, staff, housekeeping, caretakers)
CREATE TABLE IF NOT EXISTS users (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    full_name    VARCHAR(100) NOT NULL,
    email        VARCHAR(150) NOT NULL UNIQUE,
    password     VARCHAR(255) NOT NULL,
    role         ENUM('student','staff','housekeeping','caretaker') NOT NULL,
    -- student fields
    roll_number  VARCHAR(50),
    hostel_name  VARCHAR(20),
    room_number  VARCHAR(20),
    floor        VARCHAR(30),
    -- staff / housekeeping / caretaker fields
    staff_id     VARCHAR(50),
    department   VARCHAR(100),
    phone_number VARCHAR(20),
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Complaints
CREATE TABLE IF NOT EXISTS complaints (
    complaint_id  INT AUTO_INCREMENT PRIMARY KEY,
    student_email VARCHAR(150) NOT NULL,
    category      VARCHAR(100) NOT NULL,
    issue         VARCHAR(255) NOT NULL,
    details       TEXT,
    priority      ENUM('urgent','normal') NOT NULL DEFAULT 'normal',
    status        VARCHAR(50) NOT NULL DEFAULT 'Pending',
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX (student_email),
    INDEX (status),
    INDEX (category)
);

-- Resolution / audit log
CREATE TABLE IF NOT EXISTS resolution_logs (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    complaint_id INT NOT NULL,
    action       VARCHAR(50) NOT NULL,
    actor_role   VARCHAR(50),
    notes        TEXT,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX (complaint_id)
);

-- Escalation log (also created by app.py on startup)
CREATE TABLE IF NOT EXISTS escalation_logs (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    complaint_id INT NOT NULL,
    reason       VARCHAR(50) NOT NULL,
    escalated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX (complaint_id)
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    recipient_id INT NOT NULL,
    complaint_id INT,
    message      TEXT NOT NULL,
    is_read      TINYINT(1) DEFAULT 0,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX (recipient_id),
    INDEX (is_read)
);

-- Housekeeping requests
CREATE TABLE IF NOT EXISTS housekeeping_requests (
    request_id   INT AUTO_INCREMENT PRIMARY KEY,
    student_email VARCHAR(150) NOT NULL,
    hostel_name  VARCHAR(20),
    room_number  VARCHAR(20),
    floor        VARCHAR(30),
    task         VARCHAR(150) NOT NULL,
    notes        TEXT,
    status       ENUM('Pending','In Progress','Completed') NOT NULL DEFAULT 'Pending',
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX (student_email),
    INDEX (hostel_name)
);

-- Staff visit slots
CREATE TABLE IF NOT EXISTS slots (
    slot_id          INT AUTO_INCREMENT PRIMARY KEY,
    staff_id         INT NOT NULL,
    visit_date       DATE NOT NULL,
    slot_time        VARCHAR(30) NOT NULL,
    hostel_name      VARCHAR(20) NOT NULL,
    max_capacity     INT DEFAULT 8,
    current_bookings INT DEFAULT 0,
    status           ENUM('available','full') DEFAULT 'available',
    created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX (staff_id),
    INDEX (hostel_name, visit_date)
);

-- Slot bookings
CREATE TABLE IF NOT EXISTS bookings (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    complaint_id INT NOT NULL,
    slot_id      INT NOT NULL,
    booked_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);
