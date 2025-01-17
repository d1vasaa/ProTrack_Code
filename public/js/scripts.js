const path = require("path"); // Import path library
const fs = require("fs"); // Import fs library
const WebSocket = require('ws'); // Import WebSocket library for WebSocket communication

// Maintain a persistent WebSocket connection
let ws = null; // Declare 'ws' globally
let isWebSocketReady = false; // Track WebSocket readiness

// Function to establish and handle WebSocket connection
const connectWebSocket = () => {
  ws = new WebSocket('ws://192.168.0.100:3000'); // Replace with your ESP32's WebSocket server IP

  ws.on('open', () => {
    isWebSocketReady = true;
    console.log("Connected to ESP32 WebSocket Server");
  });

  ws.on('close', () => {
    isWebSocketReady = false;
    console.log("WebSocket connection closed. Reconnecting...");
    setTimeout(connectWebSocket, 5000); // Retry connection after 5 seconds
  });

  ws.on('error', (error) => {
    isWebSocketReady = false;
    console.error("WebSocket error:", error);
    ws.close(); // Close WebSocket connection on error
  });
};

// Navigation functions
function redirectToHome() {
  window.location.href = '/index.html';
}

function redirectToAbout() {
  window.location.href = '/pages/about.html';
}

function redirectToPayment() {
  window.location.href = '/pages/payment.html';
}

function redirectToAccount() {
  window.location.href = '/pages/account.html';
}

// Function to handle QR Code data updates
function QRCodeUpdateData(result) {
  const RD = JSON.parse(result);
  
  // Validate SECURITY_KEY
  if (!("SECURITY_KEY" in RD)) {
    console.error("Invalid data: SECURITY_KEY missing");
    return;
  }
  if (RD.SECURITY_KEY !== "a1B^2c!3D@4e(5F*6g7H&8i") {
    console.error("Invalid data: SECURITY_KEY mismatch");
    return;
  }

  // Send the data to the server via POST
  fetch('/data', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(RD),
  })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log('Success:', data);
    });

  fetch('/whereee', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status: "ON" }),
  })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Server Response Error: ${response.status}`);
      }
      return response.text();
    })
    .then(data => {
      console.log('Success: ', data);
    })
    .catch(error => {
      console.error('Error: ', error);
    })
}

// Initialize the WebSocket connection on page load
connectWebSocket();
