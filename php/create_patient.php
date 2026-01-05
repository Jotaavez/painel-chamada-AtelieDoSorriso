<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['error' => 'Use POST']);
    exit;
}

$name = trim($_POST['name'] ?? '');
$doctor = trim($_POST['doctor'] ?? '');
$service = trim($_POST['service'] ?? '');
$other = trim($_POST['other'] ?? '');
$urgency = isset($_POST['urgency']) && ($_POST['urgency'] === '1' || $_POST['urgency'] === 'true');

if ($name === '' || $doctor === '' || $service === '') {
    echo json_encode(['error' => 'name, doctor e service são obrigatórios']);
    exit;
}

$patients = read_patients();

$id = uniqid();
$timestamp = time();
$patient = [
    'id' => $id,
    'name' => $name,
    'doctor' => $doctor,
    'service' => $service === 'Outro' && $other ? $other : $service,
    'status' => 'waiting', // waiting, called, done
    'timestamp' => $timestamp,
    'urgency' => $urgency ? true : false,
    'calls' => 0
];

$patients[] = $patient;
if (!write_patients($patients)) {
    echo json_encode(['error' => 'Não foi possível salvar']);
    exit;
}

echo json_encode(['ok' => true, 'patient' => $patient]);
