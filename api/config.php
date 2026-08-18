<?php
// MPMPS MugshotCam - API Configuration
// Starts session, connects to MySQL, provides helper functions

session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Database configuration
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'mugshotcam_db');

// Upload directory
define('UPLOAD_DIR', __DIR__ . '/../uploads/photos/');
define('UPLOAD_URL', '../uploads/photos/');

// Connect to database
function db_connect() {
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
    if ($conn->connect_error) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Database connection failed: ' . $conn->connect_error]);
        exit;
    }
    $conn->set_charset('utf8mb4');
    return $conn;
}

// Ensure upload directory exists
function ensure_upload_dir() {
    if (!file_exists(UPLOAD_DIR)) {
        mkdir(UPLOAD_DIR, 0755, true);
    }
}

// Get current officer from session
function get_current_officer($conn) {
    if (!isset($_SESSION['officer_id'])) {
        return null;
    }
    $stmt = $conn->prepare('SELECT id, officer_name, rank, badge_id FROM officers WHERE id = ?');
    $stmt->bind_param('i', $_SESSION['officer_id']);
    $stmt->execute();
    $result = $stmt->get_result();
    $officer = $result->fetch_assoc();
    $stmt->close();
    return $officer;
}

// Require authentication
function require_auth($conn) {
    $officer = get_current_officer($conn);
    if (!$officer) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Unauthorized. Please log in.']);
        exit;
    }
    return $officer;
}

// Save base64 image to disk
function save_base64_image($base64_data, $filename) {
    ensure_upload_dir();
    
    // Remove data URL prefix if present
    if (preg_match('/^data:image\/(\w+);base64,/', $base64_data, $matches)) {
        $base64_data = substr($base64_data, strpos($base64_data, ',') + 1);
    }
    
    $decoded = base64_decode($base64_data);
    if ($decoded === false) {
        return null;
    }
    
    $filepath = UPLOAD_DIR . $filename;
    if (file_put_contents($filepath, $decoded) === false) {
        return null;
    }
    
    return UPLOAD_URL . $filename;
}

// Generate unique filename
function generate_filename($record_id, $photo_type, $is_original = false) {
    $suffix = $is_original ? 'orig' : 'crop';
    return sprintf('record_%d_%s_%s_%s.jpg', $record_id, $photo_type, $suffix, uniqid());
}

// Generate unique filename for supplementary photos
function generate_supplementary_filename($record_id) {
    return sprintf('record_%d_supp_%s.jpg', $record_id, uniqid());
}

// Send JSON response
function send_json($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data);
    exit;
}

// Get JSON input from request
function get_json_input() {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    return $data === null ? [] : $data;
}
