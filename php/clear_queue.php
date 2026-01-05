<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/db.php';

// Limpa apenas pacientes com status 'waiting' (preserva histórico 'done')
$patients = read_patients();
$remaining = [];
foreach ($patients as $p) {
    if (isset($p['status']) && $p['status'] === 'waiting') {
        continue; // remove from queue
    }
    $remaining[] = $p;
}

if (!write_patients($remaining)) {
    echo json_encode(['error' => 'Falha ao salvar']);
    exit;
}

echo json_encode(['ok' => true]);
