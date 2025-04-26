<?php
session_start();

// Generar o cargar el user_id (similar a FingerprintJS, pero usaremos una sesión para simplificar)
if (!isset($_SESSION['user_id'])) {
    $_SESSION['user_id'] = md5(uniqid(rand(), true)); // Genera un user_id único
}
$user_id = $_SESSION['user_id'];

// Inicializar los puntos desde localStorage (simulado con una cookie para PHP)
$points = isset($_COOKIE['points_' . $user_id]) ? (int)$_COOKIE['points_' . $user_id] : 0;
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Survey Wall</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; margin: 20px; }
        #points-display { font-size: 24px; margin-bottom: 20px; }
        iframe { width: 100%; height: 800px; border: 0; padding: 0; margin: 0; }
        #notification { 
            display: none; 
            position: fixed; 
            top: 20px; 
            left: 50%; 
            transform: translateX(-50%); 
            background-color: #4CAF50; 
            color: white; 
            padding: 15px; 
            border-radius: 5px; 
            z-index: 1000; 
        }
    </style>
</head>
<body>
    <h1>Survey Wall</h1>
    <div id="points-display">Points: <span id="points"><?php echo $points; ?></span></div>
    <button onclick="redirectToSurvey()">Go to Survey Wall</button>
    <div id="survey-container" style="display: none;">
        <iframe id="survey-iframe" scrolling="yes" frameborder="0"></iframe>
    </div>
    <div id="notification"></div>

    <script>
        const userId = "<?php echo $user_id; ?>";
        let lastTimestamp = 0;
        let points = <?php echo $points; ?>;

        function updatePoints(newPoints) {
            points += parseInt(newPoints);
            console.log('Updating points to:', points);

            // Guardar los puntos en una cookie (simulando localStorage en PHP)
            document.cookie = `points_${userId}=${points}; path=/; max-age=${60*60*24*30}`; // Expira en 30 días
            document.getElementById('points').textContent = points;

            // Mostrar notificación
            const notification = document.getElementById('notification');
            notification.textContent = `¡Ganaste ${newPoints} puntos!`;
            notification.style.display = 'block';
            setTimeout(() => {
                notification.style.display = 'none';
            }, 3000);
        }

        function redirectToSurvey() {
            const apiKey = '67e470e4062c6323316149';
            const surveyUrl = `https://earn.wannads.com/wall?apiKey=${apiKey}&userId=${userId}`;
            console.log('Loading survey URL:', surveyUrl);
            document.getElementById('survey-iframe').src = surveyUrl;
            document.getElementById('survey-container').style.display = 'block';
            document.querySelector('button').style.display = 'none';
        }

        async function checkForPoints() {
            try {
                console.log('Checking for points with userId:', userId);
                const response = await fetch(`/api/get-points.php?userId=${userId}`, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json'
                    }
                });
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                console.log('Response from get-points:', data);

                if (data.amount > 0 && data.timestamp > lastTimestamp) {
                    const newPoints = data.amount - points;
                    if (newPoints > 0) {
                        updatePoints(newPoints);
                    }
                    lastTimestamp = data.timestamp;
                } else {
                    console.log('No new points found');
                }
            } catch (error) {
                console.error('Error checking for points:', error);
            }
        }

        // Iniciar el polling
        setInterval(checkForPoints, 5000);
        console.log('Interval started for checkForPoints');
    </script>
</body>
</html>