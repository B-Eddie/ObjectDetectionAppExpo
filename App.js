import React, { useState, useEffect, useRef } from 'react';
import { View, Button, Text, TouchableOpacity, StyleSheet, FlatList, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { Slider } from '@react-native-community/slider';
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

const Stack = createNativeStackNavigator();

const Camera = ({ navigation }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [frameInterval, setFrameInterval] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [selectedFps, setSelectedFps] = useState('30'); // Default FPS

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
    
      try {
        const frameInterval = setInterval(async () => {
          try {
            const frame = await captureFrame();
            if (frame) {
              await processFrame(frame);
            }
          } catch (error) {
            console.error('Error processing frame:', error);
          }
        }, 1000 * parseInt(selectedFps));
    
        setFrameInterval(frameInterval);
      } catch (error) {
        console.error('Error starting streaming:', error);
        setIsStreaming(false);
      }
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
       
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => navigation.navigate('Settings', { selectedFps, setSelectedFps })}
        >
          <MaterialIcons name="settings" size={24} color="white" />
        </TouchableOpacity>

        <Text style={styles.howtouse} onPress={() => navigation.navigate('HowToUse')}>HowToUse</Text>

        <TouchableOpacity
          style={styles.notificationsButton}
          onPress={() => navigation.navigate('Notifications', { notifications })}
        >
          <MaterialIcons name="notifications" size={24} color="white" />
        </TouchableOpacity>
      </View>
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
  settingsButton: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 20,
    justifyContent: 'center', // Center vertically
    padding: 10,
  },
  notificationsButton: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 20,
    justifyContent: 'center', // Center vertically
    padding: 10,
  },
  howtouse: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 50,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center', // Center vertically
  },
});


const SettingsScreen = ({ navigation, route }) => {
  const { selectedFps, setSelectedFps } = route.params;
  // Function to handle saving settings
  const saveSettings = async () => {
    try {
      await AsyncStorage.setItem('selectedFps', selectedFps);
      console.log('Settings saved successfully:', selectedFps);
      navigation.goBack()
      // Optionally, you can add a confirmation or navigate back
    } catch (error) {
      console.error('Error saving settings:', error);
      // Handle error saving settings
    }
  };

  return (
    <View style={settingStyles.container}>
      <Text style={settingStyles.title}>Settings</Text>

      {/* FPS Input */}
      <View style={settingStyles.settingItem}>
        <Text style={settingStyles.settingLabel}>Caputre Interval (Second)</Text>
        <TextInput
          style={settingStyles.input}
          // value={selectedFps}
          onChangeText={setSelectedFps}
          keyboardType="numeric"
          placeholder="Enter Interval"
        />
      </View>

      {/* Save Button */}
      <TouchableOpacity style={settingStyles.saveButton} onPress={saveSettings}>
        <Text style={settingStyles.saveButtonText}>Save Settings</Text>
      </TouchableOpacity>
    </View>
  );
};

const settingStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 50,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  settingItem: {
    marginBottom: 20,
    width: '100%',
  },
  settingLabel: {
    fontSize: 18,
    marginBottom: 10,
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 10,
    width: '100%',
  },
  saveButton: {
    backgroundColor: '#007bff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});


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

const HowToUseScreen = () => {
  return (
    <View style={howToUseStyles.container}>
      <Text style={howToUseStyles.title}>How to Use</Text>
      <Text style={howToUseStyles.description}>
      1. Place your phone securely, facing towards your fishing bobber.
      {'\n'}
      {'\n'}
      2. Open the app and grant camera permissions if prompted.
      {'\n'}
      {'\n'}
      3. Tap "Start Streaming" to begin monitoring for bobber movements.
      {'\n'}
      {'\n'}
      4. Adjust the Frames Per Second (FPS) setting if needed in the settings.
      {'\n'}
      {'\n'}
      5. If a bobber is detected, you'll receive a notification.
      {'\n'}
      {'\n'}
      6. Tap "Stop Streaming" when finished or as needed.
      {'\n'}
      {'\n'}
      7. Review notification times in the Notifications section.
      {'\n'}
      {'\n'}
      8. For more details or help, visit the Help/FAQ section in the app.
    </Text>
    </View>
  );
};

const howToUseStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  description: {
    fontSize: 18,
    textAlign: 'left',
  },
});

function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Camera" component={Camera} />
        <Stack.Screen name="Notifications" component={NotificationScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="HowToUse" component={HowToUseScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;