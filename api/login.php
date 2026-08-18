<?php
require_once __DIR__ . '/config.php';
$conn = db_connect();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    $data = get_json_input();
    $badgeId = isset($data['badgeId']) ? trim($data['badgeId']) : '';
    $officerName = isset($data['officerName']) ? trim($data['officerName']) : '';
    $rank = isset($data['rank']) ? trim($data['rank']) : '';

    if (!$officerName || !$rank || !$badgeId) {
        send_json(['success' => false, 'message' => 'All fields are required.'], 400);
    }

    // Check if officer exists
    $stmt = $conn->prepare('SELECT id, officer_name, rank, badge_id FROM officers WHERE badge_id = ?');
    $stmt->bind_param('s', $badgeId);
    $stmt->execute();
    $result = $stmt->get_result();
    $officer = $result->fetch_assoc();
    $stmt->close();

    if (!$officer) {
        send_json(['success' => false, 'message' => 'Officer not found. Please register first.'], 404);
    }

    // Validate name and rank match
    if ($officer['officer_name'] !== $officerName || $officer['rank'] !== $rank) {
        send_json(['success' => false, 'message' => 'Invalid credentials. Name or rank does not match.'], 401);
    }

    $_SESSION['officer_id'] = $officer['id'];

    send_json([
        'success' => true,
        'message' => 'Login successful.',
        'officer' => [
            'id' => $officer['id'],
            'officerName' => $officer['officer_name'],
            'rank' => $officer['rank'],
            'badgeId' => $officer['badge_id']
        ]
    ]);
} else {
    http_response_code(405);
    send_json(['success' => false, 'message' => 'Method not allowed.'], 405);
}
