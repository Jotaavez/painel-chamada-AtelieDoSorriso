<?php
// Simple file-based storage helper with locking for patients
function patients_file_path() {
    return __DIR__ . '/../data/patients.json';
}

function read_patients() {
    $file = patients_file_path();
    if (!file_exists($file)) return [];
    $fp = fopen($file, 'r');
    if (!$fp) return [];
    // shared lock for reading
    flock($fp, LOCK_SH);
    $contents = stream_get_contents($fp);
    flock($fp, LOCK_UN);
    fclose($fp);
    $data = json_decode($contents, true);
    return is_array($data) ? $data : [];
}

function write_patients($patients) {
    $file = patients_file_path();
    $dir = dirname($file);
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    $fp = fopen($file, 'c+');
    if (!$fp) return false;
    // exclusive lock for writing
    flock($fp, LOCK_EX);
    ftruncate($fp, 0);
    rewind($fp);
    $written = fwrite($fp, json_encode($patients, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    fflush($fp);
    flock($fp, LOCK_UN);
    fclose($fp);
    return $written !== false;
}
