const fetch = require('node-fetch');
const FormData = require('form-data');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Método no permitido' });
    }

    const { token } = req.body;

    if (!token) {
        return res.status(400).json({ success: false, message: 'Token de verificación faltante' });
    }

    const formData = new FormData();
    formData.append('secret', '0x4AAAAAABYe1_P61KBpBfFzrsnu3Khl1UA');
    formData.append('response', token);

    try {
        const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            body: formData
        });
        const outcome = await response.json();
        console.log('Turnstile verification response:', outcome);

        if (outcome.success) {
            res.status(200).json({ success: true, message: 'Verificación exitosa' });
        } else {
            res.status(400).json({ success: false, message: 'CAPTCHA inválido', errors: outcome['error-codes'] });
        }
    } catch (error) {
        console.error('Turnstile verification error:', error);
        res.status(500).json({ success: false, message: 'Error al verificar el CAPTCHA' });
    }
};