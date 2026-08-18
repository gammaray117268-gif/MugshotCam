<?php
require_once __DIR__ . '/config.php';
$conn = db_connect();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $officer = require_auth($conn);

    // Get all records for this officer
    $stmt = $conn->prepare('
        SELECT r.id, r.booking_id, r.detainee_name, r.offense, r.date_of_arrest, r.saved_at, r.officer_id,
               o.officer_name, o.rank, o.badge_id
        FROM records r
        JOIN officers o ON r.officer_id = o.id
        WHERE r.officer_id = ?
        ORDER BY r.saved_at DESC
    ');
    $stmt->bind_param('i', $officer['id']);
    $stmt->execute();
    $recordsResult = $stmt->get_result();
    $records = [];

    while ($row = $recordsResult->fetch_assoc()) {
        $records[] = $row;
    }
    $stmt->close();

    // Get photos for each record
    $photoStmt = $conn->prepare('SELECT id, record_id, photo_type, file_path, label, is_original FROM photos ORDER BY created_at ASC');
    $photoStmt->execute();
    $photoResult = $photoStmt->get_result();
    $photosByRecord = [];

    while ($photo = $photoResult->fetch_assoc()) {
        $rid = $photo['record_id'];
        if (!isset($photosByRecord[$rid])) {
            $photosByRecord[$rid] = [];
        }
        $photosByRecord[$rid][] = $photo;
    }
    $photoStmt->close();

    // Attach photos to records
    foreach ($records as &$rec) {
        $rec['photos'] = isset($photosByRecord[$rec['id']]) ? $photosByRecord[$rec['id']] : [];
    }

    send_json([
        'success' => true,
        'records' => $records
    ]);

} elseif ($method === 'POST') {
    $officer = require_auth($conn);
    $data = get_json_input();

    $bookingId = isset($data['bookingId']) ? trim($data['bookingId']) : '';
    $detaineeName = isset($data['detaineeName']) ? trim($data['detaineeName']) : '';
    $offense = isset($data['offense']) ? trim($data['offense']) : '';
    $dateOfArrest = isset($data['dateOfArrest']) ? trim($data['dateOfArrest']) : '';
    $photos = isset($data['photos']) && is_array($data['photos']) ? $data['photos'] : [];

    if (!$bookingId || !$detaineeName || !$offense || !$dateOfArrest) {
        send_json(['success' => false, 'message' => 'All detainee fields are required.'], 400);
    }

    // Check if booking_id already exists
    $checkStmt = $conn->prepare('SELECT id FROM records WHERE booking_id = ?');
    $checkStmt->bind_param('s', $bookingId);
    $checkStmt->execute();
    $checkResult = $checkStmt->get_result();
    if ($checkResult->fetch_assoc()) {
        $checkStmt->close();
        send_json(['success' => false, 'message' => 'Booking ID already exists.'], 409);
    }
    $checkStmt->close();

    // Insert record
    $stmt = $conn->prepare('INSERT INTO records (booking_id, detainee_name, offense, date_of_arrest, officer_id) VALUES (?, ?, ?, ?, ?)');
    $stmt->bind_param('ssssi', $bookingId, $detaineeName, $offense, $dateOfArrest, $officer['id']);
    if (!$stmt->execute()) {
        $stmt->close();
        send_json(['success' => false, 'message' => 'Failed to save record.'], 500);
    }
    $recordId = $stmt->insert_id;
    $stmt->close();

    // Save photos
    ensure_upload_dir();
    $photoStmt = $conn->prepare('INSERT INTO photos (record_id, photo_type, file_path, label, is_original) VALUES (?, ?, ?, ?, ?)');

    foreach ($photos as $photo) {
        $type = isset($photo['type']) ? $photo['type'] : 'additional';
        $base64 = isset($photo['base64']) ? $photo['base64'] : '';
        $label = isset($photo['label']) ? trim($photo['label']) : null;
        $isOriginal = isset($photo['isOriginal']) ? (int)$photo['isOriginal'] : 0;

        if (!$base64) continue;

        $filename = generate_filename($recordId, $type, $isOriginal);
        $filePath = save_base64_image($base64, $filename);

        if ($filePath) {
            $photoStmt->bind_param('isssi', $recordId, $type, $filePath, $label, $isOriginal);
            $photoStmt->execute();
        }
    }
    $photoStmt->close();

    send_json(['success' => true, 'message' => 'Record saved successfully.', 'recordId' => $recordId]);

} elseif ($method === 'PUT') {
    $officer = require_auth($conn);
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

    if (!$id) {
        send_json(['success' => false, 'message' => 'Record ID is required.'], 400);
    }

    $data = get_json_input();
    $detaineeName = isset($data['detaineeName']) ? trim($data['detaineeName']) : '';
    $offense = isset($data['offense']) ? trim($data['offense']) : '';
    $dateOfArrest = isset($data['dateOfArrest']) ? trim($data['dateOfArrest']) : '';

    if (!$detaineeName || !$offense || !$dateOfArrest) {
        send_json(['success' => false, 'message' => 'All fields are required.'], 400);
    }

    // Verify ownership
    $checkStmt = $conn->prepare('SELECT id FROM records WHERE id = ? AND officer_id = ?');
    $checkStmt->bind_param('ii', $id, $officer['id']);
    $checkStmt->execute();
    $checkResult = $checkStmt->get_result();
    if (!$checkResult->fetch_assoc()) {
        $checkStmt->close();
        send_json(['success' => false, 'message' => 'Record not found or access denied.'], 404);
    }
    $checkStmt->close();

    $stmt = $conn->prepare('UPDATE records SET detainee_name = ?, offense = ?, date_of_arrest = ? WHERE id = ?');
    $stmt->bind_param('sssi', $detaineeName, $offense, $dateOfArrest, $id);
    if ($stmt->execute()) {
        $stmt->close();
        send_json(['success' => true, 'message' => 'Record updated successfully.']);
    } else {
        $stmt->close();
        send_json(['success' => false, 'message' => 'Failed to update record.'], 500);
    }

} elseif ($method === 'DELETE') {
    $officer = require_auth($conn);
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

    if (!$id) {
        send_json(['success' => false, 'message' => 'Record ID is required.'], 400);
    }

    // Verify ownership
    $checkStmt = $conn->prepare('SELECT id FROM records WHERE id = ? AND officer_id = ?');
    $checkStmt->bind_param('ii', $id, $officer['id']);
    $checkStmt->execute();
    $checkResult = $checkStmt->get_result();
    if (!$checkResult->fetch_assoc()) {
        $checkStmt->close();
        send_json(['success' => false, 'message' => 'Record not found or access denied.'], 404);
    }
    $checkStmt->close();

    // Delete record (cascade deletes photos)
    $stmt = $conn->prepare('DELETE FROM records WHERE id = ?');
    $stmt->bind_param('i', $id);
    if ($stmt->execute()) {
        $stmt->close();
        send_json(['success' => true, 'message' => 'Record deleted successfully.']);
    } else {
        $stmt->close();
        send_json(['success' => false, 'message' => 'Failed to delete record.'], 500);
    }
} else {
    http_response_code(405);
    send_json(['success' => false, 'message' => 'Method not allowed.'], 405);
}
