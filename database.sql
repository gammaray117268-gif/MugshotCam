-- MPMPS MugshotCam Database Schema
-- Run this in phpMyAdmin or MySQL CLI to create the database and tables

CREATE DATABASE IF NOT EXISTS mugshotcam_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE mugshotcam_db;

-- Officers table: stores registered duty officers
CREATE TABLE IF NOT EXISTS officers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    officer_name VARCHAR(100) NOT NULL,
    rank VARCHAR(50) NOT NULL,
    badge_id VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_badge_id (badge_id)
) ENGINE=InnoDB;

-- Records table: main booking session
CREATE TABLE IF NOT EXISTS records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id VARCHAR(50) UNIQUE NOT NULL,
    detainee_name VARCHAR(100) NOT NULL,
    offense VARCHAR(200) NOT NULL,
    date_of_arrest DATE NOT NULL,
    officer_id INT NOT NULL,
    saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (officer_id) REFERENCES officers(id) ON DELETE CASCADE,
    INDEX idx_booking_id (booking_id),
    INDEX idx_officer_id (officer_id),
    INDEX idx_saved_at (saved_at)
) ENGINE=InnoDB;

-- Photos table: stores all mugshot and supplementary images
CREATE TABLE IF NOT EXISTS photos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    record_id INT NOT NULL,
    photo_type ENUM('frontHalf','leftSide','rightSide','fullBody','additional') NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    label VARCHAR(200) DEFAULT NULL,
    is_original TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (record_id) REFERENCES records(id) ON DELETE CASCADE,
    INDEX idx_record_id (record_id),
    INDEX idx_photo_type (photo_type)
) ENGINE=InnoDB;
