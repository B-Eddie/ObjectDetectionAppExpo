import React, { useState, useEffect, useRef } from 'react';
import { View, Button, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Notifications from 'expo-notifications';
import axios from 'axios';
import ImageResizer from 'react-native-image-resizer';

const CameraComp = ({ navigation }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
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

  const handleCameraStream = async () => {
    console.log('handleCameraStream');
    if (cameraRef.current && !isStreaming) {
      setIsStreaming(true);

      try {
        const options = { quality: '480p', maxDuration: 60 }; // Example options
        const data = await cameraRef.current.recordAsync(options);

        // Process the recorded data (e.g., resize and detect bobber)
        console.log('pre-process data');
        await processRecordedData(data);
      } catch (error) {
        console.error('Error recording video:', error);
        setIsStreaming(false); // Reset streaming state on error
      }
    }
  };

  const processRecordedData = async (data) => {
    console.log('Recorded video data:'); // Check the recorded video data

    // Example: Resize the first frame and detect bobber
    const frameData = data.frames[0]; // Access the first frame data
    const base64Image = await resizeAndBase64Encode(frameData);
    console.log('Resized image:', base64Image); 
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
    } catch (error) {
      console.error('Error detecting bobber:', error);
    } finally {
      setIsStreaming(false); // Reset streaming state after processing
    }
  };

  const resizeAndBase64Encode = async (frameData) => {
    try {
      // Resize the frame image and encode to base64
      const resizedImage = await ImageResizer.createResizedImage(
        `data:image/jpeg;base64,${frameData.base64}`, // Base64 image data
        frameData.width / 5, // New width (1/5th of original)
        frameData.height / 5, // New height (1/5th of original)
        'JPEG', // Image format
        100 // Image quality (100 is maximum quality)
      );

      return resizedImage.uri; // Return resized image URI
    } catch (error) {
      console.error('Error resizing image:', error);
      return null;
    }
  };

  const handleStopStreaming = () => {
    if (cameraRef.current && isStreaming) {
      setIsStreaming(false);
      cameraRef.current.stopRecording();
    }
  };

  if (!permission) {
    console.log('permission');
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
            <TouchableOpacity style={styles.button} onPress={handleCameraStream}>
              <Text style={styles.text}>Start Streaming</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.button} onPress={handleStopStreaming}>
              <Text style={styles.text}>Stop Streaming</Text>
            </TouchableOpacity>
          )}
        </View>
      </CameraView>
      <Button title="Go to Home" onPress={() => navigation.push('Home')} />
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
