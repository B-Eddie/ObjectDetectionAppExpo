import React, { useState, useEffect, useRef } from 'react';
import { View, Button, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Notifications from 'expo-notifications';
import axios from 'axios';
import * as ImageManipulator from 'expo-image-manipulator';
// import NotificationScreen from './NotificationScreen';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import {useNavigation } from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';

const Camera = ({ navigation }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [frameInterval, setFrameInterval] = useState(null);
  const [notifications, setNotifications] = useState([]);

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


  const sendNotification = async (message) => {
    try {
      const response = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Fishing Alert',
          body: message,
        },
        trigger: null,
      });

      const notificationTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); // Use current time without seconds
      console.log('Notification scheduled:', notificationTime);
      if (!notifications.includes(notificationTime)) {
        setNotifications([...notifications, notificationTime]);
      }
    } catch (error) {
      console.error('Error scheduling notification:', error);
    }
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
        url: 'https://detect.roboflow.com/bobber-detection/3',
        params: {
          api_key: 'zuxqZZaKZVPbzrB23QRP'
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        data: `${base64Image}`
      });

      console.log("Response Data:", response.data);
      const bobberDetected = response.data.predictions.some(
        (prediction) => prediction.class === 'bobbers'
      );

      if (!bobberDetected) {
        sendNotification('No bobber detected! Check your line.');
        console.log('No bobber detected! Check your line.');
      } else {
        console.log("Bobber detected");
        sendNotification('Bobber detected! Get ready to reel in!', 'hey');
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
        onPress={() => navigation.navigate('Notifications', { notifications })}
      />
      <TouchableOpacity
        style={styles.settingsButton}
        onPress={() => navigation.navigate('Notifications', { notifications })}
      >
        <MaterialIcons name="settings" size={24} color="black" />
      </TouchableOpacity>
    </View>
  );
};


const Stack = createNativeStackNavigator();

function NotificationScreen({ route, navigation }) {
  const { notifications } = route.params;

  return (
    <View style={NotificationStyles.container}>
      <Text style={NotificationStyles.title}>Notification Times</Text>
      <Text>When the bobber is not detected</Text>
      <FlatList
        data={notifications}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <View style={NotificationStyles.notificationItem}>
            <Text style={NotificationStyles.notificationText}>{item}</Text>
          </View>
        )}
      />
      <TouchableOpacity
        style={NotificationStyles.backButton}
        onPress={() => navigation.navigate('Camera')}
      >
        <Text style={NotificationStyles.backButtonText}>Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const NotificationStyles = {
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  notificationItem: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginVertical: 5,
    width: '100%',
  },
  notificationText: {
    fontSize: 18,
  },
  backButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#ccc',
    borderRadius: 5,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'black',
  },
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
  settingsButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    padding: 10,
  },
});

function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Camera" component={Camera} />
        <Stack.Screen name="Notifications" component={NotificationScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;
