const express = require('express');
const app = express();
const axios = require('axios')
const port = 8000;
const cors = require('cors');
const bodyParser = require('body-parser');
const config = require('./config.json')
const path = require('path')

app.use(function (req, res, next) {
    res.set("Access-Control-Allow-Origin", '*');
    res.set("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.set("Access-Control-Allow-Credentials", true);
    res.set("X-Frame-Options", "DENY");
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
    next();
});

// app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.raw({ type: 'application/octet-stream', limit: '100mb' }));
app.use(cors({ origin: ["http://localhost:3000", "https://interiorapp.onrender.com", "https://interioraiapi.onrender.com"] }));
app.use(bodyParser.json());

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
    res.status(500).send({ statusCode: 500, message: 'Internal Error' })
})

app.post('/api/data/getGeneratedImageBase64', async (req, res) => {
    try {
        const response = await axios.get(req.body.url, {
            responseType: 'arraybuffer',
        });
        if (response.status === 200) {
            const data = Buffer.from(response.data, 'binary').toString('base64');
            res.send(`data:image/png;base64,${data}`);
        } else {
            throw new Error('Failed to fetch image');
        }
    } catch (error) {
        console.error('Error fetching image:', error);
        throw error;
    }
});


app.post('/api/data/imageToText', async (req, res) => {
    try {
        console.log(req.body, "api hit imgae----------------");
        const response = await axios.post("https://api.replicate.com/v1/predictions", {
            version: "50adaf2d3ad20a6f911a8a9e3ccf777b263b8596fbd2c8fc26e8888f8a0edbb5",
            input: { image: req.body.image },
        }, {
            headers: {
                Authorization: `Token ${config.replicatedApiKey}`,
                "Content-Type": "application/json",
            },
        });
        console.log(response, "imgae to text-------------");
        if (response.data.id.length > 0 && response.data.error === null) {
            res.json(response.data);
        } else {
            res.statusCode = response.status;
            res.send("Non-JSON response received");
        }
    } catch (error) {
        console.error('Error in imageToText:', error);
        res.status(500).send('Error in imageToText');
    }
});



app.post('/api/data/imageToText/id', async (req, res) => {
    try {
        const response = await axios.get("https://api.replicate.com/v1/predictions/" + req.body.id, {
            headers: {
                Authorization: `Token ${config.replicatedApiKey}`,
                "Content-Type": "application/json",
            },
        });

        if (response.status !== 200) {
            let error = await response.data;
            res.status(500).json({ detail: error.detail });
        } else {
            // Check if the response contains JSON data
            console.log(response, "res");
            if (response.headers['content-type'] && response.headers['content-type'].includes('application/json')) {
                const prediction = await response.data;
                res.json(prediction);
            } else {
                // Handle the case where the response is not JSON
                res.status(500).json({ error: "Non-JSON response received" });
            }
        }
    } catch (error) {
        console.error('Error in imageToText/id:', error);
        res.status(500).json({ error: "Error in imageToText/id" });
    }
});



app.post('/api/image/objectRemove', async (req, res) => {
    try {
        const response = await axios.post("https://api.replicate.com/v1/predictions", {
            version: "0e3a841c913f597c1e4c321560aa69e2bc1f15c65f8c366caafc379240efd8ba",
            input: req.body.input,
        }, {
            headers: {
                Authorization: `Token ${config.replicatedApiKey}`,
                "Content-Type": "application/json",
            },
        });
        if (response.data.id.length > 0 && response.data.error === null) {
            res.json(response.data);
        } else {
            res.statusCode = response.status;
            res.end("Non-JSON response received");
        }
    } catch (error) {
        console.error('Error in imageToText:', error);
        res.status(500).send('Error in imageToText');
    }
});




// app.get('/proxy-image', async (req, res) => {
//     try {
//       const imageUrl = req.body.url; // Get the image URL from the query parameters
//       const response = await axios.get(imageUrl, { responseType: 'stream' });

//       // Set appropriate headers for the response
//       res.setHeader('Content-Type', response.headers['content-type']);
//       res.setHeader('Content-Disposition', `attachment; filename="image.png"`); // Adjust the filename as needed

//       // Pipe the image data from the remote server to the response stream
//       response.data.pipe(res);
//     } catch (error) {
//       console.error('Error fetching image:', error);
//       res.status(500).send('Error fetching image');
//     }
//   });
app.use(express.static("./server/images"));
if (process.env.NODE_ENV === 'prod') {
    app.use(express.static("./build"));
    app.get('/*', function (req, res) {
        res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
        res.sendFile(path.resolve(__dirname, "../build/index.html"));
    });
}
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
