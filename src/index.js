const express = require('express');
const app = express();
const PM2IO = require('@pm2/js-api');
require('dotenv').config();

// Initialize PM2IO client
let client = new PM2IO().use('standalone', {
  refresh_token: process.env.PM2_REFRESH_TOKEN
});

app.get('/pm2api', (req, res) => {
    // Retrieve buckets
    client.bucket.retrieveAll()
    .then(response => {
        // Find the specific bucket
        let bucket = response.data.find(bkt => bkt.name === process.env.PM2_BKT_NAME);
        if (!bucket) {
            throw new Error('Bucket not found');
        }
        // Subscribe to real-time data of the bucket
        client.realtime.subscribe(bucket._id)
        .then(() => {
            client.realtime.on(`${bucket.public_id}:*:status`, (data) => {
                // Send data when available
                res.json(data.data);
                // Unsubscribe after sending data
                client.realtime.unsubscribe(bucket._id).catch(console.error);
            });
        })
        .catch(error => {
            throw new Error(error);
        });
    })
    .catch(error => {
        console.error(error);
        res.status(500).send('Error retrieving bucket information');
    });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
