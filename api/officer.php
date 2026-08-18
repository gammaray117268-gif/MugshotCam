<?php
require_once __DIR__ . '/config.php';
$conn = db_connect();

$officer = require_auth($conn);

send_json([
    'success' => true,
    'officer' => [
        'id' => $officer['id'],
        'officerName' => $officer['officer_name'],
        'rank' => $officer['rank'],
        'badgeId' => $officer['badge_id']
    ]
]);
