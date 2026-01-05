<?php
// Simple SSE stream that notifies when patients.json changes
set_time_limit(0);
header('Content-Type: text/event-stream');
header('Cache-Control: no-cache');
header('Connection: keep-alive');
// suggest client retry after 5s if connection lost
echo "retry: 5000\n";

$file = __DIR__ . '/../data/patients.json';
$lastMTime = 0;

function send_event($data, $id = null) {
    if ($id !== null) echo "id: " . $id . "\n";
    echo "event: patients\n";
    echo "data: " . json_encode($data, JSON_UNESCAPED_UNICODE) . "\n\n";
    @ob_flush();
    @flush();
}

// Send initial
if (file_exists($file)) {
    $lastMTime = filemtime($file);
    $contents = file_get_contents($file);
    $data = json_decode($contents, true);
    send_event(['ok' => true, 'patients' => $data]);
}

// loop and watch for changes
while (true) {
    clearstatcache(false, $file);
    $mtime = file_exists($file) ? filemtime($file) : 0;
    if ($mtime > $lastMTime) {
        $lastMTime = $mtime;
        $contents = file_get_contents($file);
        $data = json_decode($contents, true);
        send_event(['ok' => true, 'patients' => $data], $lastMTime);
    }
    // heartbeat comment to keep proxies/clients alive
    static $tick = 0;
    $tick++;
    if ($tick % 15 === 0) {
        // send a lightweight ping event occasionally
        echo "event: ping\n";
        echo "data: {}\n\n";
        $tick = 0;
    } else {
        echo ":\n"; // comment ping
    }
    @ob_flush(); @flush();
    sleep(1);
}
