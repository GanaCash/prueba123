<?php
header('Content-Type: application/json');

// Incluir Composer autoload
require __DIR__ . '/../../vendor/autoload.php';

// Obtener el user_id
$user_id = isset($_GET['userId']) ? $_GET['userId'] : null;

if (!$user_id) {
    echo json_encode(['error' => 'Missing userId']);
    http_response_code(400);
    return;
}

// Conectar a la base de datos
$db_url = getenv('DATABASE_URL');
try {
    $db = pg_connect($db_url);
    if (!$db) {
        echo json_encode(['error' => 'Database connection failed']);
        http_response_code(500);
        return;
    }

    // Escapar user_id
    $user_id_escaped = pg_escape_string($db, $user_id);

    // Consultar puntos del usuario
    $query = "SELECT amount, timestamp FROM user_points WHERE user_id = '$user_id_escaped'";
    $result = pg_query($db, $query);

    if (pg_num_rows($result) > 0) {
        $row = pg_fetch_assoc($result);
        echo json_encode([
            'amount' => (int)$row['amount'],
            'timestamp' => (int)$row['timestamp']
        ]);
    } else {
        echo json_encode(['amount' => 0, 'timestamp' => 0]);
    }

    // Cerrar conexión
    pg_close($db);
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
    http_response_code(500);
}
?>