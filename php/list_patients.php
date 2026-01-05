<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/db.php';

$patients = read_patients();

// Sort: urgencies first, then by timestamp asc
usort($patients, function($a, $b) {
    if (!empty($a['urgency']) && empty($b['urgency'])) return -1;
    if (empty($a['urgency']) && !empty($b['urgency'])) return 1;
    return ($a['timestamp'] <=> $b['timestamp']);
});

echo json_encode(['ok' => true, 'patients' => $patients]);
