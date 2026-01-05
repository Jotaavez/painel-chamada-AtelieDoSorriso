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
$found = false;
foreach ($patients as &$p) {
    if (isset($p['id']) && $p['id'] === $id) {
        $p['status'] = 'done';
        $p['finished_at'] = time();
        $found = true;
        break;
    }
}
unset($p);

if (!$found) {
    echo json_encode(['error' => 'Paciente não encontrado']);
    exit;
}

if (!write_patients($patients)) {
    echo json_encode(['error' => 'Falha ao salvar']);
    exit;
}

echo json_encode(['ok' => true]);
