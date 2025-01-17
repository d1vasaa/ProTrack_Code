const express = require('express');         // Import Express framework
const bodyParser = require('body-parser');  // Import body-parser middleware
const path = require("path");               // Import path library
const fs = require("fs");                   // Import fs library
const app = express();                      // Create an Express application
const port = 3000;                          // Define the port the server will listen on

app.use(bodyParser.json());                 // Use body-parser middleware to parse JSON request bodies
app.use(express.static('public'));   

/* Check if the code should respond by updating a certain part in the database,
add a new data or if the input doesn't fit the requirement */
function check_if_GPS_or_status_or_skip(i) {
    // Check if input is valid or not 
    if ("id" in i && "lat" in i && "long" in i && "status" in i != true) {
        return "GPS";
    }
    else if ("id" in i && "lat" in i != true && "long" in i != true && "status" in i) {
        return "status";
    }
    else {
        return "skip";
    }
}

// Function to check if latitude and longitude are valid coordinates
function check_if_GPS_data_is_valid(lat, long) {
    const isLatValid = typeof lat === 'number' && lat >= -90 && lat <= 90;
    const isLongValid = typeof long === 'number' && long >= -180 && long <= 180;
    return isLatValid && isLongValid;
}

// Function to sort the GPS data by ID
function sortGPSDataById(data) {
    data.GPSData.sort((a, b) => a.id - b.id);
  }  


function sendToESP(data) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(data);  // Send message to WebSocket server
    console.log(`Successfully Sent!: ${toSendMessage}`);
    res.status(200).send({ message: 'Status received and sent to ESP32' });
  } else {
    console.error("WebSocket is not connected");
    res.status(500).send({ error: 'WebSocket connection not available' });
  }
}


module.exports = {
    check_if_GPS_or_status_or_skip,
    check_if_GPS_data_is_valid,
    sortGPSDataById
};