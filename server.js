const express = require('express');         // Import Express framework
const bodyParser = require('body-parser');  // Import body-parser middleware
const path = require("path");               // Import path library
const fs = require("fs");                   // Import fs library
const app = express();                      // Create an Express application
const port = 3000;                          // Define the port the server will listen on
const WebSocket = require('ws');            // Import WebSocket library for WebSocket communication

app.use(bodyParser.json());                 // Use body-parser middleware to parse JSON request bodies
app.use(express.static('public'));          // Serve static files from the 'public' directory

const assist = require('./functions/assist'); // Import helper functions from assist.js

// Define the path to the database.json file
const dbPath = path.join(__dirname, 'data/database.json');

// Maintain a persistent WebSocket connection
let ws;

// Function to establish and handle WebSocket connection
const connectWebSocket = () => {
    ws = new WebSocket('ws://192.168.0.100:3000'); // Replace with your ESP32's WebSocket server IP

    ws.on('open', () => {
        console.log("Connected to ESP32 WebSocket Server");
    });

    ws.on('close', () => {
        console.log("WebSocket connection closed. Reconnecting...");
        setTimeout(connectWebSocket, 5000); // Retry connection after 5 seconds
    });

    ws.on('error', (error) => {
        console.error("WebSocket error:", error);
        ws.close(); // Close WebSocket connection on error
    });
};

// Establish WebSocket connection at startup
connectWebSocket();

// Route to retrieve GPS data
app.get('/data', (req, res) => {
    fs.readFile(dbPath, 'utf8', (err, data) => {
        if (err) {
            // Handle file read error
            res.status(500).send('Error Reading Data; server.js, line 20');
            return;
        }
        // Parse and send GPS data as JSON
        const parsedData = JSON.parse(data);
        res.json(parsedData.GPSData);
    });
});

// Route to handle GPS and status updates
app.post('/data', (req, res) => {
    let RD = req.body;  // Extract request body
    const GoSoS = assist.check_if_GPS_or_status_or_skip(RD);  // Determine the type of data (GPS, status, or invalid)
    const isCord = assist.check_if_GPS_data_is_valid(RD.lat, RD.long);  // Validate GPS coordinates

    if (GoSoS === "GPS") {
        if (!isCord) {
            // Invalid GPS coordinates
            res.json("Send Proper Coordinates; server.js, line 38");
            return;
        }

        // Read the database.json file
        fs.readFile(dbPath, 'utf8', (err, data) => {
            if (err) {
                // Handle file read error
                res.status(500).send("Error Reading Data; server.js, line 45");
                return;
            }

            let originalData = JSON.parse(data);  // Parse existing data
            let findOD = originalData.GPSData.find(item => item.id === RD.id);  // Find entry by ID

            if (findOD) {
                // Update existing GPS data
                findOD.lat = RD.lat;
                findOD.long = RD.long;

                // Write updated data back to the file
                fs.writeFile(dbPath, JSON.stringify(originalData, null, 2), (writeErr) => {
                    if (writeErr) {
                        res.status(500).send("Error Updating Data; server.js, line 60");
                        return;
                    }
                    console.log("GPS Data Successfully Updated; server.js, line 63");
                    res.json(originalData);  // Send updated data
                });
            } else {
                // Add new GPS entry
                RD["status"] = "OFF";
                originalData.GPSData.push(RD);  // Append new data
                assist.sortGPSDataById(originalData);  // Sort data by ID

                // Write updated data back to the file
                fs.writeFile(dbPath, JSON.stringify(originalData, null, 2), (writeErr) => {
                    if (writeErr) {
                        res.status(500).send("Error Updating Data; server.js, line 79");
                        return;
                    }
                    console.log("Data Successfully Added :)");
                    res.json(originalData);
                });
            }
        });
    } else if (GoSoS === "status") {
        // Process status updates
        fs.readFile(dbPath, 'utf8', (err, data) => {
            if (err) {
                res.status(500).send("Error Reading Data; server.js, line 95");
                return;
            }

            let originalData = JSON.parse(data);  // Parse existing data
            let findOD = originalData.GPSData.find(item => item.id === RD.id);  // Find entry by ID

            if (findOD) {
                // Validate status value
                if (RD["status"] !== "ON" && RD["status"] !== "OFF") {
                    res.json("Upload Data With The Proper Format Please; server.js, line 105");
                    return;
                }

                findOD.status = RD.status;  // Update status

                // Write updated status back to the file
                fs.writeFile(dbPath, JSON.stringify(originalData, null, 2), (writeErr) => {
                    if (writeErr) {
                        res.status(500).send("Error Updating Data; server.js, line 115");
                    } else {
                        console.log("Status Updated Successfully :)");
                        res.json(originalData);
                    }
                });
            }
        });
    } else {
        // Invalid data format
        res.json("Upload Data With The Proper Format Please; server.js, line 126");
        return;
    }
});

// Route to serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route to get specific GPS data by ID
app.get('/data/:id', (req, res) => {
    const id = req.params.id;  // Extract ID from URL
    fs.readFile(dbPath, 'utf8', (err, data) => {
        if (err) {
            console.error("Error Getting Data; server.js, line 143");
            return;
        }
        try {
            const originalData = JSON.parse(data);
            res.json(originalData.GPSData[id - 1]);  // Get data by ID (adjust for 0-based index)
        } catch (error) {
            console.error("ID Doesn't Exist; server.js, line 150");
        }
    });
});

// Route to get the status of a specific GPS entry by ID
app.get('/data/:id/status', (req, res) => {
    const id = req.params.id;
    fs.readFile(dbPath, 'utf8', (err, data) => {
        if (err) {
            console.error("Error Getting Data; server.js, line 164");
            return;
        }
        try {
            const originalData = JSON.parse(data);
            res.json(originalData.GPSData[id - 1].status);  // Get status by ID
        } catch (error) {
            console.error("ID Doesn't Exist; server.js, line 173");
        }
    });
});

// Route to send status messages to the WebSocket
app.post('/whereee', (req, res) => {
    const toSendMessage = req.body.status;  // Extract status from request

    console.log(`Received: ${toSendMessage}`);

    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(toSendMessage);  // Send message to WebSocket server
        console.log(`Successfully Sent!: ${toSendMessage}`);
        res.status(200).send({ message: 'Status received and sent to ESP32' });
    } else {
        console.error("WebSocket is not connected");
        res.status(500).send({ error: 'WebSocket connection not available' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);  // Log the server URL
});
