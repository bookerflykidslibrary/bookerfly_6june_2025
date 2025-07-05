// proxy-server.js
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
//const PORT = 5000;
const PORT = process.env.PORT || 5000;


app.use(cors());

app.get('/proxy', async (req, res) => {
    let url = req.query.url;

    if (!url) {
        return res.status(400).send('Missing URL');
    }

    try {
        // Decode the URL in case it's encoded
        url = decodeURIComponent(url);

        // Validate it's a proper URL
        const parsedUrl = new URL(url); // This throws if the URL is invalid

        console.log('➡️ Proxying URL:', parsedUrl.toString());

        const response = await axios.get(parsedUrl.toString(), {
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0', // Helps avoid some blocking
            },
        });

        // Optional: Check if the content is an image
        const contentType = response.headers['content-type'] || '';
        if (!contentType.startsWith('image/')) {
            return res.status(400).send('URL does not point to an image');
        }

        res.set('Content-Type', contentType);
        res.send(response.data);
    } catch (err) {
        console.error('❌ Proxy error:', err.message);
        console.error('🪵 Full error:', err);
        res.status(500).send('Failed to fetch image');
    }
});

app.listen(PORT, () => {
    console.log(`✅ Proxy server running on http://localhost:${PORT}`);
});
