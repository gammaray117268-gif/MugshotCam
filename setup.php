<?php
// MPMPS MugshotCam - Database Setup Script
// Access this file in your browser to automatically create the database and tables
// Remove or protect this file after setup for security

header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html>
<head><title>MugshotCam Setup</title><style>body{font-family:Arial,sans-serif;max-width:800px;margin:40px auto;padding:20px}.success{color:green}.error{color:red}pre{background:#f5f5f5;padding:15px;border-radius:5px;overflow-x:auto}</style></head>
<body>
<h1>MPMPS MugshotCam - Database Setup</h1>
<?php
$host = 'localhost';
$user = 'root';
$pass = '';
$dbname = 'mugshotcam_db';

echo "<h2>Step 1: Creating Database</h2>";
$conn = new mysqli($host, $user, $pass);
if ($conn->connect_error) {
    echo "<p class='error'>Failed to connect to MySQL: {$conn->connect_error}</p>";
    echo "<p>Please check your MySQL credentials in <code>api/config.php</code></p>";
    exit;
}
echo "<p class='success'>Connected to MySQL successfully.</p>";

if ($conn->query("CREATE DATABASE IF NOT EXISTS `$dbname` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")) {
    echo "<p class='success'>Database '$dbname' created or already exists.</p>";
} else {
    echo "<p class='error'>Failed to create database: " . $conn->error . "</p>";
    exit;
}

$conn->select_db($dbname);

echo "<h2>Step 2: Creating Tables</h2>";

$tables = [];
$tables[] = [
    'officers',
    "CREATE TABLE IF NOT EXISTS `officers` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `officer_name` VARCHAR(100) NOT NULL,
        `rank` VARCHAR(50) NOT NULL,
        `badge_id` VARCHAR(50) UNIQUE NOT NULL,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_badge_id (badge_id)
    ) ENGINE=InnoDB"
];

$tables[] = [
    'records',
    "CREATE TABLE IF NOT EXISTS `records` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `booking_id` VARCHAR(50) UNIQUE NOT NULL,
        `detainee_name` VARCHAR(100) NOT NULL,
        `offense` VARCHAR(200) NOT NULL,
        `date_of_arrest` DATE NOT NULL,
        `officer_id` INT NOT NULL,
        `saved_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (officer_id) REFERENCES officers(id) ON DELETE CASCADE,
        INDEX idx_booking_id (booking_id),
        INDEX idx_officer_id (officer_id),
        INDEX idx_saved_at (saved_at)
    ) ENGINE=InnoDB"
];

$tables[] = [
    'photos',
    "CREATE TABLE IF NOT EXISTS `photos` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `record_id` INT NOT NULL,
        `photo_type` ENUM('frontHalf','leftSide','rightSide','fullBody','additional') NOT NULL,
        `file_path` VARCHAR(255) NOT NULL,
        `label` VARCHAR(200) DEFAULT NULL,
        `is_original` TINYINT(1) DEFAULT 0,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (record_id) REFERENCES records(id) ON DELETE CASCADE,
        INDEX idx_record_id (record_id),
        INDEX idx_photo_type (photo_type)
    ) ENGINE=InnoDB"
];

$allSuccess = true;
foreach ($tables as [$name, $sql]) {
    if ($conn->query($sql)) {
        echo "<p class='success'>Table '$name' created or already exists.</p>";
    } else {
        echo "<p class='error'>Failed to create table '$name': " . $conn->error . "</p>";
        $allSuccess = false;
    }
}

echo "<h2>Step 3: Creating Uploads Directory</h2>";
$uploadDir = __DIR__ . '/uploads/photos/';
if (!file_exists($uploadDir)) {
    if (mkdir($uploadDir, 0755, true)) {
        echo "<p class='success'>Upload directory created at: $uploadDir</p>";
    } else {
        echo "<p class='error'>Failed to create upload directory. Please create it manually.</p>";
        $allSuccess = false;
    }
} else {
    echo "<p class='success'>Upload directory already exists.</p>";
}

$conn->close();

if ($allSuccess) {
    echo "<h2 class='success'>Setup Complete!</h2>";
    echo "<p>Your MugshotCam system is ready to use.</p>";
    echo "<p><a href='login.html'>Go to Login Page</a></p>";
} else {
    echo "<h2 class='error'>Setup Completed with Errors</h2>";
    echo "<p>Please review the errors above and fix them before using the system.</p>";
}
?>
</body>
</html>
