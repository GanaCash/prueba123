<?php
header('Content-Type: application/json');

// Conectar a Supabase
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

// Obtener userId
$userId = isset($_GET['userId']) ? $_GET['userId'] : null;

if (!$userId) {
    echo json_encode(['status' => 'error', 'message' => 'Invalid userId']);
    pg_close($db);
    exit;
}

// Consultar puntos
$query = "SELECT amount FROM user_points WHERE user_id = $1";
$result = pg_query_params($db, $query, [$userId]);

$points = 0;
while ($row = pg_fetch_assoc($result)) {
    $points += (int)$row['amount'];
}

echo json_encode(['status' => 'success', 'userId' => $userId, 'points' => $points]);

pg_close($db);
?>
