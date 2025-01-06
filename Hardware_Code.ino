#include <WiFi.h>
#include <ArduinoWebsockets.h>

#define SOLENOID_PIN 13
#define BUZZER_PIN 15

using namespace websockets;

const char* ssid = "pocopoco2@unifi";
const char* password = "24681012";

WebsocketsServer server;

void setup() {
  Serial.begin(115200);

  pinMode(18, OUTPUT);

  // Connect to WiFi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.println("Connecting to WiFi...");
  }
  Serial.println("Connected to WiFi");

  // Start WebSocket server
  server.listen(3000);
  Serial.println("WebSocket server is running...");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  // Accept incoming clients
  WebsocketsClient client = server.accept();
  if (client.available()) {
    Serial.println("Client connected!");

    // Loop to handle client messages
    while (client.available()) {
      WebsocketsMessage message = client.readBlocking();
      Serial.print("Received: ");
      Serial.println(message.data());

      if (message.data() == "In Range") {
        digitalWrite(BUZZER_PIN, LOW);
      }
      else if (message.data() == "Out of Range") {
      digitalWrite(BUZZER_PIN, HIGH);
      }
      else if (message.data() == "ON") {
        digitalWrite(SOLENOID_PIN, HIGH);
      }
      else if (message.data() == "OFF") {
        digitalWrite(SOLENOID_PIN, LOW);
      }
    }

    client.close();
    Serial.println("Client disconnected.");
    digitalWrite(18, LOW);
  }
}
