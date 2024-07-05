import React, { useState, useEffect, useRef } from 'react';
import { View, Button, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Camera } from 'expo-camera';
import { Video } from 'expo-av';
import * as Notifications from 'expo-notifications';
import axios from 'axios';

const CameraScreen = ({ navigation }) => {
  const [cameraPermission, setCameraPermission] = useState(null);
  const [videoRef, setVideoRef] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [frameInterval, setFrameInterval] = useState(null);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const requestCameraPermission = async () => {
      try {
        const { status } = await Camera.requestCameraPermissionsAsync();
        setCameraPermission(status === 'granted');
      } catch (error) {
        console.error('Error requesting camera permission:', error);
      }
    };

    requestCameraPermission();
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

  const sendNotification = async (message) => {
    try {
      const response = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Fishing Alert',
          body: message,
        },
        trigger: null,
      });

      console.log('Notification scheduled:', response);
      const notificationTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (!notifications.includes(notificationTime)) {
        setNotifications([...notifications, notificationTime]);
      }
    } catch (error) {
      console.error('Error scheduling notification:', error);
    }
  };

  const startStreaming = async () => {
    setIsStreaming(true);
    const interval = setInterval(async () => {
      try {
        const frame = await captureFrame();
        await processFrame(frame);
      } catch (error) {
        console.error('Error processing frame:', error);
      }
    }, 1000); // Adjust interval as needed for desired FPS

    setFrameInterval(interval);
  };

  const stopStreaming = () => {
    setIsStreaming(false);
    clearInterval(frameInterval);
  };

  const captureFrame = async () => {
    if (videoRef) {
      const frame = await videoRef.recordAsync(); // Capture video frame
      return frame;
    }
    return null;
  };

  const processFrame = async (frame) => {
    try {
      const base64Image = await resizeAndBase64Encode(frame);
      const response = await axios.post('https://detect.roboflow.com/bobber-detection/3', {
        api_key: 'zuxqZZaKZVPbzrB23QRP',
        data: base64Image,
      });

      console.log('Response Data:', response.data);
      const bobberDetected = response.data.predictions.some((prediction) => prediction.class === 'bobbers');

      if (!bobberDetected) {
        sendNotification('No bobber detected! Check your line.');
        console.log('No bobber detected! Check your line.');
      }
    } catch (error) {
      console.error('Error detecting bobber:', error);
    }
  };

  const resizeAndBase64Encode = async (frame) => {
    try {
      const resizedImage = await Camera.manipulateAsync(
        frame.uri,
        [{ resize: { height: frame.height / 5, width: frame.width / 5 } }],
        { format: 'jpeg', base64: true }
      );

      return resizedImage.base64;
    } catch (error) {
      console.error('Error resizing image:', error);
      throw error;
    }
  };

  if (cameraPermission === null) {
    // Camera permissions are still loading.
    return <View />;
  }

  if (!cameraPermission) {
    // Camera permissions are not granted yet.
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: 'center' }}>We need your permission to access the camera</Text>
        <Button title="Grant Permission" onPress={() => {}} /> {/* Handle permission request */}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={(ref) => setVideoRef(ref)}
        style={styles.camera}
        type={'back'} // or front for selfie camera
      >
        <View style={styles.buttonContainer}>
          {!isStreaming ? (
            <TouchableOpacity style={styles.button} onPress={startStreaming}>
              <Text style={styles.text}>Start Streaming</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.button} onPress={stopStreaming}>
              <Text style={styles.text}>Stop Streaming</Text>
            </TouchableOpacity>
          )}
        </View>
      </Camera>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 20,
    width: '100%',
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  text: {
    fontSize: 20,
    color: '#fff',
  },
});

export default CameraScreen;
