<?php
require_once __DIR__ . '/config.php';
$conn = db_connect();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    session_destroy();
    send_json(['success' => true, 'message' => 'Logged out successfully.']);
} else {
    http_response_code(405);
    send_json(['success' => false, 'message' => 'Method not allowed.'], 405);
}
