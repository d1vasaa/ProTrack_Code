import { getDistance } from 'geolib';
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Text, Image, Button } from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import * as Location from 'expo-location';

const CurrentLocationImage = require('C:/Users/ryann/Desktop/PROTRACKAPPNEWFETTEST/images/human.png');
const TrolleyLocationImage = require('C:/Users/ryann/Desktop/PROTRACKAPPNEWFETTEST/images/trolley.png');

export default function App() {
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [region, setRegion] = useState(null); // Map region
  const [simulationActive, setSimulationActive] = useState(false);

  const initialFakeLocation = { latitude: 5.950802, longitude: 116.072277 };
  const targetLocation = { latitude: 5.950780, longitude: 116.071865 };
  const [fakeLocation, setFakeLocation] = useState(initialFakeLocation);
  const [destination, setDestination] = useState({ latitude: 5.9507671, longitude: 116.0724862 });
  const [distance, setDistance] = useState(null);
  const [rangeStatus, setRangeStatus] = useState('');
  const [lastPostedStatus, setLastPostedStatus] = useState(''); // To track the last posted status
  const [animationInterval, setAnimationInterval] = useState(null);

  const step = 0.000005;

  useEffect(() => {
    const requestLocationPermission = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          console.log('Location permission granted.');
          const location = await Location.getCurrentPositionAsync({});
          setLatitude(location.coords.latitude);
          setLongitude(location.coords.longitude);
          setRegion({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.005, // More zoomed-in view
            longitudeDelta: 0.005, // More zoomed-in view
          });
        } else {
          console.log('Location permission denied.');
        }
      } catch (error) {
        console.log('Error requesting location permission:', error);
      }
    };

    requestLocationPermission();
  }, []);

  // Watch for changes in human location and update region
  useEffect(() => {
    if (latitude && longitude) {
      setRegion({
        latitude,
        longitude,
        latitudeDelta: 0.005, // More zoomed-in view
        longitudeDelta: 0.005, // More zoomed-in view
      });
    }
  }, [latitude, longitude]);

  const updateHumanLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({});
      setLatitude(location.coords.latitude);
      setLongitude(location.coords.longitude);
    } catch (error) {
      console.log('Error updating human location:', error);
    }
  };

  useEffect(() => {
    if (simulationActive) {
      startAnimation();
    } else {
      stopAnimation();
    }
    return () => stopAnimation();
  }, [simulationActive]);

  useEffect(() => {
    if (simulationActive) {
      const calculatedDistance = getDistance(fakeLocation, destination);
      setDistance(calculatedDistance);

      if (calculatedDistance <= 60) {
        if (lastPostedStatus !== 'In Range') {
          setRangeStatus('In Range');
          postStatus('In Range');
          setLastPostedStatus('In Range');
        }
      } else {
        if (lastPostedStatus !== 'Out of Range') {
          setRangeStatus('Out of Range');
          postStatus('Out of Range');
          setLastPostedStatus('Out of Range');
        }
      }
    }
  }, [fakeLocation, destination, simulationActive, lastPostedStatus]);

  const postStatus = (status) => {
    console.log(`Posting status: ${status}`);
    fetch('https://0fd0-2001-e68-540e-8e69-6539-1f17-e8a1-bd44.ngrok-free.app/whereee', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to post status: ${response.status} ${response.statusText}`);
        }
        console.log(`Status posted successfully: ${status}`);
      })
      .catch((error) => {
        console.error('Error posting status:', error);
      });
  };

  const startAnimation = () => {
    stopAnimation();
    const interval = setInterval(() => {
      setFakeLocation((prev) => {
        const nextLat =
          Math.abs(prev.latitude - targetLocation.latitude) < step
            ? targetLocation.latitude
            : prev.latitude + (prev.latitude < targetLocation.latitude ? step : -step);
        const nextLon =
          Math.abs(prev.longitude - targetLocation.longitude) < step
            ? targetLocation.longitude
            : prev.longitude + (prev.longitude < targetLocation.longitude ? step : -step);

        if (nextLat === targetLocation.latitude && nextLon === targetLocation.longitude) {
          stopAnimation();
        }

        return { latitude: nextLat, longitude: nextLon };
      });
    }, 100);
    setAnimationInterval(interval);
  };

  const stopAnimation = () => {
    if (animationInterval) {
      clearInterval(animationInterval);
      setAnimationInterval(null);
    }
  };

  const resetSimulation = () => {
    stopAnimation();

    // Post "In Range" before resetting
    postStatus('In Range');
    setFakeLocation(initialFakeLocation);
    setSimulationActive(false);

    // Reset the map's region to the human's location
    if (latitude && longitude) {
      setRegion({
        latitude,
        longitude,
        latitudeDelta: 0.005, // More zoomed-in view
        longitudeDelta: 0.005, // More zoomed-in view
      });
    }
    setLastPostedStatus(''); // Reset the last posted status
  };

  if (!simulationActive) {
    // Display Current Location Only
    return (
      <View style={styles.container}>
        {region ? (
          <MapView
            style={styles.map}
            region={region} // Center on human
          >
            <Marker coordinate={{ latitude: region.latitude, longitude: region.longitude }}>
              <Image source={CurrentLocationImage} style={{ height: 40, width: 40, resizeMode: 'contain' }} />
            </Marker>
          </MapView>
        ) : (
          <Text style={styles.loadingText}>Fetching location...</Text>
        )}
        <View style={styles.buttonContainer}>
          <Button title="Start Simulation" onPress={() => setSimulationActive(true)} />
        </View>
      </View>
    );
  }

  // Display Simulation View
  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        region={region} // Center on the trolley (fakeLocation) during the simulation
        onMapReady={updateHumanLocation} // Update location on map ready
      >
        <Marker coordinate={fakeLocation}>
          <Image source={TrolleyLocationImage} style={{ height: 40, width: 40, resizeMode: 'contain' }} />
        </Marker>
        <Marker coordinate={destination}>
          <Image source={CurrentLocationImage} style={{ height: 30, width: 30, resizeMode: 'contain' }} />
        </Marker>
        <Circle
          center={destination}
          radius={60}
          strokeWidth={1}
          strokeColor="rgba(0,15,255,1)"
          fillColor="rgba(0,100,255,0.1)"
        />
      </MapView>
      {rangeStatus && (
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>{rangeStatus}</Text>
        </View>
      )}
      <View style={styles.buttonContainer}>
        <Button title="End Simulation" onPress={resetSimulation} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  map: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  statusContainer: {
    position: 'absolute',
    top: 50,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 5,
  },
  statusText: {
    color: '#fff',
    fontSize: 16,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    width: '60%',
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.8)',
    padding: 10,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
  },
});
