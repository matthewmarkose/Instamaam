const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

app.get('/api/instagram-profile/:username', async (req, res) => {
    try {
        const { username } = req.params;
        const response = await fetch(
            `https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`,
            {
                headers: {
                    'x-ig-app-id': '936619743392459'
                }
            }
        );
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to fetch Instagram profile' });
    }
});

app.get('/api/instagram-media', async (req, res) => {
    try {
        const { variables } = req.query;
        const parsedVariables = JSON.parse(variables);
        
        const response = await fetch(
            `https://www.instagram.com/graphql/query/?doc_id=7950326061742207&variables=${encodeURIComponent(JSON.stringify(parsedVariables))}`
        );
        const data = await response.json();
        
        res.json(data);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to fetch Instagram media' });
    }
});

// Add image proxy endpoint
app.get('/api/proxy-image', async (req, res) => {
    try {
        const imageUrl = req.query.url;
        if (!imageUrl) {
            return res.status(400).json({ error: 'Image URL is required' });
        }

        const response = await fetch(imageUrl);
        const contentType = response.headers.get('content-type');
        
        // Set appropriate headers
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
        
        // Pipe the image data directly to the response
        response.body.pipe(res);
    } catch (error) {
        console.error('Error proxying image:', error);
        res.status(500).json({ error: 'Failed to proxy image' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 