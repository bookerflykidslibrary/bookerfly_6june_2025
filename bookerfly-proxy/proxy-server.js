const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());

app.get('/proxy', async (req, res) => {
    let url = req.query.url;
    if (!url) return res.status(400).send('Missing URL');

    try {
        url = decodeURIComponent(url);
        const parsedUrl = new URL(url);

        console.log('Proxying:', parsedUrl.toString());

        const response = await axios.get(parsedUrl.toString(), {
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Referer': 'https://books.google.com/',
                'Accept': 'image/*,*/*',
            },
            timeout: 8000,
        });

        res.set('Content-Type', response.headers['content-type']);
        response.data.pipe(res); // 🚰 Pipe stream directly to response
    } catch (err) {
        console.error('Proxy error:', err.message);
        res.status(500).send('Failed to fetch image');
    }
});

app.listen(PORT, () => {
    console.log(`✅ Proxy server running on port ${PORT}`);
});
