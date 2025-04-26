<?php
header('Content-Type: text/plain');

// Configuración
$secret = "461e007d2c"; // Reemplaza con tu SECRET de Wannads

// Obtener parámetros del postback
$user_id = isset($_GET['user_id']) ? $_GET['user_id'] : null;
$transaction_id = isset($_GET['transaction_id']) ? $_GET['transaction_id'] : null;
$reward = isset($_GET['reward']) ? $_GET['reward'] : null;
$signature = isset($_GET['signature']) ? $_GET['signature'] : null;

// Validar que todos los parámetros estén presentes
if (!$user_id || !$transaction_id || !$reward || !$signature) {
    echo "ERROR: Missing parameters";
    return;
}

// Validar el signature (según la documentación de Wannads)
$expected_signature = md5($user_id . $transaction_id . $reward . $secret);
if ($expected_signature !== $signature) {
    echo "ERROR: Signature doesn't match";
    return;
}

// Conectar a Supabase
$dbUrl = getenv('DATABASE_URL');
if (!$dbUrl) {
    echo "ERROR: DATABASE_URL not set";
    return;
}

$db = pg_connect($dbUrl);
if (!$db) {
    echo "ERROR: Database connection failed";
    return;
}

// Verificar si el usuario ya existe en la tabla user_points
$query = "SELECT amount FROM user_points WHERE user_id = $1";
$result = pg_query_params($db, $query, [$user_id]);

if (pg_num_rows($result) > 0) {
    // El usuario ya existe, actualizar los puntos
    $row = pg_fetch_assoc($result);
    $current_points = (int)$row['amount'];
    $new_points = $current_points + (int)$reward;

    $update_query = "UPDATE user_points SET amount = $1, timestamp = $2 WHERE user_id = $3";
    $update_result = pg_query_params($db, $update_query, [$new_points, time(), $user_id]);
    if (!$update_result) {
        echo "ERROR: Failed to update points";
        pg_close($db);
        return;
    }
} else {
    // El usuario no existe, insertar un nuevo registro
    $insert_query = "INSERT INTO user_points (user_id, amount, timestamp) VALUES ($1, $2, $3)";
    $insert_result = pg_query_params($db, $insert_query, [$user_id, (int)$reward, time()]);
    if (!$insert_result) {
        echo "ERROR: Failed to insert points";
        pg_close($db);
        return;
    }
}

// Cerrar la conexión
pg_close($db);

// Responder con "OK" para que Wannads registre el postback como exitoso
echo "OK";
?>
