
import React, { useState, useEffect, useRef } from 'react';
import { View, Button, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Notifications from 'expo-notifications';
import axios from 'axios';
import * as ImageManipulator from 'expo-image-manipulator';

const CameraComp = ({ navigation }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [frameInterval, setFrameInterval] = useState(null);
  const [notificationTimes, setNotificationTimes] = useState([]);

  useEffect(() => {
    configurePushNotifications();
    return () => {
      clearInterval(frameInterval);
    };
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
    const currentTime = new Date().toLocaleString();
    setNotificationTimes((prevTimes) => [...prevTimes, currentTime]);
  };

  const handleStartStreaming = async () => {
    if (cameraRef.current && !isStreaming) {
      setIsStreaming(true);
      const interval = setInterval(async () => {
        try {
          const frame = await captureFrame();
          await processFrame(frame);
        } catch (error) {
          console.error('Error processing frame:', error);
        }
      }, 1000); // Adjust interval as needed
      setFrameInterval(interval);
    }
  };

  const handleStopStreaming = () => {
    setIsStreaming(false);
    clearInterval(frameInterval);
  };

  const captureFrame = async () => {
    if (cameraRef.current) {
      const frame = await cameraRef.current.takePictureAsync({
        quality: 1, // Adjust quality as needed
        base64: true, // Capture frame as base64
      });
      return frame;
    }
    return null;
  };

  const processFrame = async (frame) => {
    const base64Image = await resizeAndBase64Encode(frame);
    try {
      const response = await axios({
        method: 'POST',
        url: 'https://detect.roboflow.com/geese-sheet/8',
        params: {
          api_key: 'zuxqZZaKZVPbzrB23QRP'
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        data: `${base64Image}`
      });

      const bobberDetected = response.data.predictions.some(
        (prediction) => prediction.class === 'droppings'
      );

      if (!bobberDetected) {
        sendNotification('No bobber detected! Check your line.');
      }
    } catch (error) {
      console.error('Error detecting bobber:', error);
    }
  };

  const resizeAndBase64Encode = async (frameData) => {
    try {
      const resizedImage = await ImageManipulator.manipulateAsync(
        frameData.uri,
        [{ resize: { height: frameData.height / 5, width: frameData.width / 5 } }],
        { format: 'jpeg', base64: true }
      );

      return resizedImage.base64;
    } catch (error) {
      console.error('Error resizing image:', error);
      throw error; // Throw the error instead of returning null
    }
  };

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: 'center' }}>We need your permission to show the camera</Text>
        <Button onPress={requestPermission} title="Grant Permission" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} ref={cameraRef}>
        <View style={styles.buttonContainer}>
          {!isStreaming ? (
            <TouchableOpacity style={styles.button} onPress={handleStartStreaming}>
              <Text style={styles.text}>Start Streaming</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.button} onPress={handleStopStreaming}>
              <Text style={styles.text}>Stop Streaming</Text>
            </TouchableOpacity>
          )}
        </View>
      </CameraView>
      <Button
        title="Go to Notifications"
        onPress={() => navigation.navigate('Notifications', { notifications: notificationTimes })}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
  },
  button: {
    backgroundColor: 'blue',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
  },
  text: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
});

export default CameraComp;
