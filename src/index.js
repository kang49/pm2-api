const express = require('express');
const app = express();
const PM2IO = require('@pm2/js-api');
require('dotenv').config();

app.use(express.json());

// Initialize PM2IO client
let client = new PM2IO().use('standalone', {
    refresh_token: process.env.PM2_REFRESH_TOKEN
});

app.get(/\/pm2api$/, (req, res) => {
    //check apikey
    let apikey;
    if (req.headers.apikey) {
        apikey = req.headers.apikey;
    } else {
        apikey = req.body.apikey || req.query.apikey || '';
    }
    try {
        if (apikey !== process.env.APIKEY) {
            console.log('Invalid API Key');
            return res.json({ message: 'Invalid API Key' });
        }
    } catch {
        console.log('Invalid API Key');
        return res.json({ message: 'Invalid API Key' });
    }
    //check processname
    let processname;
    try {
        if (req.headers.processname) {
            processname = req.headers.processname;
        } else {
            processname = req.body.processname || req.query.processname || '';
        }

        if (!processname) {
            console.log('Invalid process name');
            return res.json({ message: 'Invalid process name' });
        }
    } catch {
        console.log('Invalid process name');
        return res.json({ message: 'Invalid process name' });
    }

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
                        for (let i = 0; i < data.data.process.length; i++) {
                            console.log(data.data.process[i].name);
                            let findprocessname = data.data.process[i].name;
                            if (findprocessname === processname) {
                                res.json(data.data.process[i]);
                                break
                            }
                            else if (i === data.data.process[i].length) {
                                res.json({ message: 'Invalid process name' });
                            }
                        }
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
