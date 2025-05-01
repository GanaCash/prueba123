const fetch = require('node-fetch');
const FormData = require('form-data');

module.exports = async (req, res) => {
    console.log('Solicitud recibida en /api/verify:', req.body);

    if (req.method !== 'POST') {
        console.log('Método no permitido:', req.method);
        return res.status(405).json({ success: false, message: 'Método no permitido' });
    }

    const { token } = req.body;

    if (!token) {
        console.log('Falta token en la solicitud');
        return res.status(400).json({ success: false, message: 'Token de verificación faltante' });
    }

    const formData = new FormData();
    formData.append('secret', process.env.TURNSTILE_SECRET || '0x4AAAAAABYe1_P61KBpBfFzrsnu3Khl1UA');
    formData.append('response', token);

    try {
        const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            body: formData
        });
        const outcome = await response.json();
        console.log('Respuesta de Turnstile:', outcome);

        if (outcome.success) {
            res.status(200).json({ success: true, message: 'Verificación exitosa' });
        } else {
            console.log('Errores de Turnstile:', outcome['error-codes']);
            res.status(400).json({ success: false, message: 'CAPTCHA inválido', errors: outcome['error-codes'] });
        }
    } catch (error) {
        console.error('Error al verificar Turnstile:', error);
        res.status(500).json({ success: false, message: 'Error al verificar el CAPTCHA' });
    }
};
