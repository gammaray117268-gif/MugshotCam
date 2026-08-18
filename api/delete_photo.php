<?php
require_once __DIR__ . '/config.php';
$conn = db_connect();

if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $officer = require_auth($conn);

    $photoId = isset($_GET['id']) ? (int)$_GET['id'] : 0;

    if (!$photoId) {
        send_json(['success' => false, 'message' => 'Photo ID is required.'], 400);
    }

    // Get photo info and verify ownership via record
    $stmt = $conn->prepare('
        SELECT p.id, p.file_path, r.officer_id
        FROM photos p
        JOIN records r ON p.record_id = r.id
        WHERE p.id = ?
    ');
    $stmt->bind_param('i', $photoId);
    $stmt->execute();
    $result = $stmt->get_result();
    $photo = $result->fetch_assoc();
    $stmt->close();

    if (!$photo) {
        send_json(['success' => false, 'message' => 'Photo not found.'], 404);
    }

    if ($photo['officer_id'] != $officer['id']) {
        send_json(['success' => false, 'message' => 'Access denied.'], 403);
    }

    // Delete file from disk
    $filePath = __DIR__ . '/../' . $photo['file_path'];
    if (file_exists($filePath)) {
        unlink($filePath);
    }

    // Delete from database
    $delStmt = $conn->prepare('DELETE FROM photos WHERE id = ?');
    $delStmt->bind_param('i', $photoId);
    if ($delStmt->execute()) {
        $delStmt->close();
        send_json(['success' => true, 'message' => 'Photo deleted successfully.']);
    } else {
        $delStmt->close();
        send_json(['success' => false, 'message' => 'Failed to delete photo.'], 500);
    }
} else {
    http_response_code(405);
    send_json(['success' => false, 'message' => 'Method not allowed.'], 405);
}
