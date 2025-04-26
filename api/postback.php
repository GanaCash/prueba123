<?php
header('Content-Type: text/plain');

// Incluir Composer autoload
require __DIR__ . '/../../vendor/autoload.php';

// Configuración
$secret = "461e007d2c"; // Reemplaza con tu SECRET de Wannads
$db_url = getenv('DATABASE_URL'); // Obtener de variables de entorno

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

// Validar el signature
$expected_signature = md5($user_id . $transaction_id . $reward . $secret);
if ($expected_signature !== $signature) {
    echo "ERROR: Signature doesn't match";
    return;
}

// Conectar a la base de datos
try {
    $db = pg_connect($db_url);
    if (!$db) {
        echo "ERROR: Database connection failed";
        return;
    }

    // Escapar valores para prevenir inyección SQL
    $user_id_escaped = pg_escape_string($db, $user_id);
    $reward = (int)$reward;
    $timestamp = time();

    // Verificar si el usuario existe
    $query = "SELECT amount FROM user_points WHERE user_id = '$user_id_escaped'";
    $result = pg_query($db, $query);

    if (pg_num_rows($result) > 0) {
        // Actualizar puntos existentes
        $row = pg_fetch_assoc($result);
        $new_amount = $row['amount'] + $reward;
        $update_query = "UPDATE user_points SET amount = $new_amount, timestamp = $timestamp WHERE user_id = '$user_id_escaped'";
        pg_query($db, $update_query);
    } else {
        // Insertar nuevo usuario
        $insert_query = "INSERT INTO user_points (user_id, amount, timestamp) VALUES ('$user_id_escaped', $reward, $timestamp)";
        pg_query($db, $insert_query);
    }

    // Cerrar conexión
    pg_close($db);

    // Responder con "OK"
    echo "OK";
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage();
}
?>