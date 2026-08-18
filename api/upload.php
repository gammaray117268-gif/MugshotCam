<?php
require_once __DIR__ . '/config.php';
$conn = db_connect();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    $officer = require_auth($conn);

    $recordId = isset($_POST['record_id']) ? (int)$_POST['record_id'] : 0;
    $label = isset($_POST['label']) ? trim($_POST['label']) : 'Supplementary Photo';

    if (!$recordId) {
        send_json(['success' => false, 'message' => 'Record ID is required.'], 400);
    }

    // Verify record ownership
    $checkStmt = $conn->prepare('SELECT id FROM records WHERE id = ? AND officer_id = ?');
    $checkStmt->bind_param('ii', $recordId, $officer['id']);
    $checkStmt->execute();
    $checkResult = $checkStmt->get_result();
    if (!$checkResult->fetch_assoc()) {
        $checkStmt->close();
        send_json(['success' => false, 'message' => 'Record not found or access denied.'], 404);
    }
    $checkStmt->close();

    // Handle base64 data
    $base64 = isset($_POST['base64']) ? $_POST['base64'] : '';
    $filename = '';

    if ($base64) {
        ensure_upload_dir();
        $filename = generate_supplementary_filename($recordId);
        $filePath = save_base64_image($base64, $filename);
        if (!$filePath) {
            send_json(['success' => false, 'message' => 'Failed to save image.'], 500);
        }
    } elseif (isset($_FILES['photo']) && $_FILES['photo']['error'] === UPLOAD_ERR_OK) {
        ensure_upload_dir();
        $filename = generate_supplementary_filename($recordId);
        $filePath = UPLOAD_URL . $filename;

        $tmpPath = $_FILES['photo']['tmp_name'];
        if (!move_uploaded_file($tmpPath, UPLOAD_DIR . $filename)) {
            send_json(['success' => false, 'message' => 'Failed to move uploaded file.'], 500);
        }
    } else {
        send_json(['success' => false, 'message' => 'No image data provided.'], 400);
    }

    // Save to database
    $stmt = $conn->prepare('INSERT INTO photos (record_id, photo_type, file_path, label, is_original) VALUES (?, ?, ?, ?, 0)');
    $photoType = 'additional';
    $stmt->bind_param('isss', $recordId, $photoType, $filePath, $label);
    if ($stmt->execute()) {
        $photoId = $stmt->insert_id;
        $stmt->close();
        send_json([
            'success' => true,
            'message' => 'Photo uploaded successfully.',
            'photo' => [
                'id' => $photoId,
                'record_id' => $recordId,
                'photo_type' => $photoType,
                'file_path' => $filePath,
                'label' => $label,
                'is_original' => 0
            ]
        ]);
    } else {
        $stmt->close();
        send_json(['success' => false, 'message' => 'Failed to save photo record.'], 500);
    }
} else {
    http_response_code(405);
    send_json(['success' => false, 'message' => 'Method not allowed.'], 405);
}
