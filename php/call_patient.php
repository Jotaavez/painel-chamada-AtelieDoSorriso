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

$by = trim($_POST['by'] ?? ''); // opcional: nome do dentista
$room = trim($_POST['room'] ?? '');

$patients = read_patients();
$found = false;
foreach ($patients as &$p) {
    if (isset($p['id']) && $p['id'] === $id) {
        $p['status'] = 'called';
        $p['calls'] = (isset($p['calls']) ? intval($p['calls']) : 0) + 1;
        $p['last_called'] = time();
        if ($by !== '') $p['called_by'] = $by;
        if ($room !== '') $p['room'] = $room;
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
