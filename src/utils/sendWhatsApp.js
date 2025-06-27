export async function sendWhatsAppMessage(phoneNumber, message) {
  try {
    const response = await fetch('https://api.gupshup.io/sm/api/v1/msg', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'apikey': 'cj9wh7yetgl1knwmtmqxusznrj9y4rih',
      },
      body: new URLSearchParams({
        channel: 'whatsapp',
        source: '15557383134',
        destination: phoneNumber,
        message: message,
        'src.name': 'Bookerfly',
      }),
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Failed to send message');
    return result;
  } catch (err) {
    console.error('WhatsApp send error:', err.message);
  }
}
