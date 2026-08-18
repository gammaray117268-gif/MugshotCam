<?php
require_once __DIR__ . '/config.php';
$conn = db_connect();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    $data = get_json_input();
    $officerName = isset($data['officerName']) ? trim($data['officerName']) : '';
    $rank = isset($data['rank']) ? trim($data['rank']) : '';
    $badgeId = isset($data['badgeId']) ? trim($data['badgeId']) : '';

    if (!$officerName || !$rank || !$badgeId) {
        send_json(['success' => false, 'message' => 'All fields are required.'], 400);
    }

    // Check if badge ID already exists
    $stmt = $conn->prepare('SELECT id FROM officers WHERE badge_id = ?');
    $stmt->bind_param('s', $badgeId);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($result->fetch_assoc()) {
        $stmt->close();
        send_json(['success' => false, 'message' => 'Badge ID already registered.'], 409);
    }
    $stmt->close();

    // Insert new officer
    $stmt = $conn->prepare('INSERT INTO officers (officer_name, rank, badge_id) VALUES (?, ?, ?)');
    $stmt->bind_param('sss', $officerName, $rank, $badgeId);
    if ($stmt->execute()) {
        $officerId = $stmt->insert_id;
        $_SESSION['officer_id'] = $officerId;
        $stmt->close();

        send_json([
            'success' => true,
            'message' => 'Registration successful.',
            'officer' => [
                'id' => $officerId,
                'officerName' => $officerName,
                'rank' => $rank,
                'badgeId' => $badgeId
            ]
        ]);
    } else {
        $stmt->close();
        send_json(['success' => false, 'message' => 'Registration failed. Please try again.'], 500);
    }
} else {
    http_response_code(405);
    send_json(['success' => false, 'message' => 'Method not allowed.'], 405);
}
