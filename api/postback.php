<?php
header('Content-Type: application/json');

// Conectar a Supabase usando DATABASE_URL desde las variables de entorno
$dbUrl = getenv('DATABASE_URL');
if (!$dbUrl) {
    echo json_encode(['status' => 'error', 'message' => 'DATABASE_URL not set']);
    exit;
}

$db = pg_connect($dbUrl);
if (!$db) {
    echo json_encode(['status' => 'error', 'message' => 'Database connection failed']);
    exit;
}

// Obtener datos del postback
$userId = isset($_GET['userId']) ? $_GET['userId'] : null;
$amount = isset($_GET['amount']) ? (int)$_GET['amount'] : 0;

if (!$userId || $amount <= 0) {
    echo json_encode(['status' => 'error', 'message' => 'Invalid userId or amount']);
    pg_close($db);
    exit;
}

// Insertar puntos en la tabla user_points
$query = "INSERT INTO user_points (user_id, amount, timestamp) VALUES ($1, $2, $3)";
$result = pg_query_params($db, $query, [$userId, $amount, time()]);

if ($result) {
    echo json_encode(['status' => 'success', 'message' => 'Points added']);
} else {
    echo json_encode(['status' => 'error', 'message' => 'Failed to add points']);
}

pg_close($db);
?>
