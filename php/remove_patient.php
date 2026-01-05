<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['error' => 'Use POST']);
    exit;
}

$id = trim($_POST['id'] ?? '');
if ($id === '') {
    echo json_encode(['error' => 'id obrigatório']);
    exit;
}

$patients = read_patients();
$new = [];
$found = false;
foreach ($patients as $p) {
    if (isset($p['id']) && $p['id'] === $id) {
        $found = true;
        continue; // remove
    }
    $new[] = $p;
}

if (!$found) {
    echo json_encode(['error' => 'Paciente não encontrado']);
    exit;
}

if (!write_patients($new)) {
    echo json_encode(['error' => 'Falha ao salvar']);
    exit;
}

echo json_encode(['ok' => true]);
