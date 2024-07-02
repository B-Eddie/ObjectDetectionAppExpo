import React, { useState, useEffect, useRef } from 'react';
import { SafeAreaView, StyleSheet, Text, View, Button } from 'react-native';
import { Camera } from 'expo-camera';
import * as Notifications from 'expo-notifications';
import axios from 'axios';

const HomeScreen = ({ navigation }) => {
  const [hasPermission, setHasPermission] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const cameraRef = useRef(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();

    configurePushNotifications();
  }, []);

  const configurePushNotifications = () => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  };

  const sendNotification = (message) => {
    Notifications.scheduleNotificationAsync({
      content: {
        title: 'Fishing Alert',
        body: message,
      },
      trigger: null,
    });
  };

  const handleCameraCapture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync({ base64: true });
      const base64Image = photo.base64;

      try {
        const response = await axios({
          method: 'POST',
          url: 'https://detect.roboflow.com/fishing-float/1',
          params: {
            api_key: 'zuxqZZaKZVPbzrB23QRP',
          },
          data: base64Image,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        });

        const bobberDetected = response.data.predictions.some(
          (prediction) => prediction.class === 'bobber'
        );

        if (!bobberDetected) {
          sendNotification('No bobber detected! Check your line.');
        }

        setPredictions(response.data.predictions);
      } catch (error) {
        console.error('Error:', error.message);
      }
    }
  };

  if (hasPermission === null) {
    return <Text>Requesting camera permission...</Text>;
  }
  if (hasPermission === false) {
    return <Text>No access to camera</Text>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <Camera style={styles.camera} type={Camera.Constants.Type.back} ref={cameraRef} />
      <View style={styles.predictionsContainer}>
        {predictions.map((prediction, index) => (
          <Text key={index} style={styles.predictionText}>
            {`${prediction.class}: ${prediction.confidence.toFixed(2)}`}
          </Text>
        ))}
      </View>
      <Button title="Start Recording" onPress={handleCameraCapture} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  predictionsContainer: {
    position: 'absolute',
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: '100%',
    padding: 10,
  },
  predictionText: {
    color: 'white',
    fontSize: 16,
    marginBottom: 10,
  },
});

export default HomeScreen;
