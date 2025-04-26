<?php
header('Content-Type: application/json');

// Obtener el user_id
$user_id = isset($_GET['userId']) ? $_GET['userId'] : null;

if (!$user_id) {
    echo json_encode(['error' => 'Missing userId']);
    http_response_code(400);
    return;
}

// Conectar a Supabase
$dbUrl = getenv('DATABASE_URL');
if (!$dbUrl) {
    echo json_encode(['error' => 'DATABASE_URL not set']);
    http_response_code(500);
    return;
}

$db = pg_connect($dbUrl);
if (!$db) {
    echo json_encode(['error' => 'Database connection failed']);
    http_response_code(500);
    return;
}

// Consultar los puntos del usuario
$query = "SELECT amount, timestamp FROM user_points WHERE user_id = $1";
$result = pg_query_params($db, $query, [$user_id]);

if (pg_num_rows($result) > 0) {
    $row = pg_fetch_assoc($result);
    $amount = (int)$row['amount'];
    $timestamp = (int)$row['timestamp'];
} else {
    $amount = 0;
    $timestamp = 0;
}

echo json_encode(['amount' => $amount, 'timestamp' => $timestamp]);

// Cerrar la conexión
pg_close($db);
?>
