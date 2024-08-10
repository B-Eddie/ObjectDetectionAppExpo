import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Button,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
  Alert,
  Vibration,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Notifications from "expo-notifications";
import axios from "axios";
import * as ImageManipulator from "expo-image-manipulator";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { MaterialIcons } from "@expo/vector-icons";
import { Audio } from "expo-av";

const Stack = createNativeStackNavigator();

const Camera = ({ navigation }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [frameInterval, setFrameInterval] = useState(null);
  const [selectedFps, setSelectedFps] = useState(1);
  const [notifications, setNotifications] = useState([]);
  const [notificationSound] = useState(new Audio.Sound());
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [startTime, setStartTime] = useState(null);

  useEffect(() => {
    configurePushNotifications();
    loadNotificationSound();

    return () => {
      clearInterval(frameInterval);
      notificationSound.unloadAsync();
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

  const loadNotificationSound = async () => {
    try {
      await notificationSound.loadAsync(require("./fish.wav"));
    } catch (error) {
      console.error("Error loading notification sound:", error);
    }
  };

  const playNotificationSound = async () => {
    try {
      await notificationSound.playAsync();
    } catch (error) {
      console.error("Error playing notification sound:", error);
    }
  };

  const sendNotification = async (message) => {
    try {
      await Notifications.requestPermissionsAsync();
    } catch (error) {
      console.log(error);
    }
    try {
      const response = await Notifications.scheduleNotificationAsync({
        content: {
          title: "Fishing Alert",
          body: message,
        },
        trigger: null,
      });

      const notificationTime = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }); // current time without seconds
      playNotificationSound();
      Vibration.vibrate([500, 500, 500]);
      if (!notifications.includes(notificationTime)) {
        setNotifications([...notifications, notificationTime]);
      }
    } catch (error) {
      console.error("Error scheduling notification:", error);
    }
  };

  const handleStartStreaming = async () => {
    if (cameraRef.current && !isStreaming) {
      setIsStreaming(true);
      setStartTime(new Date());
      const interval = setInterval(async () => {
        try {
          const frame = await captureFrame();
          await processFrame(frame);
        } catch (error) {
          console.error("Error processing frame:", error);
        }
      }, 1000 * parseInt(selectedFps));
      setFrameInterval(interval);
    }
  };

  const handleStopStreaming = async () => {
    setIsStreaming(false);
    const endTime = new Date();
    const sessionDuration = (endTime - startTime) / 1000; // Duration in seconds

    try {
      const storedDurations = await AsyncStorage.getItem("streamingDurations");
      const durations = storedDurations ? JSON.parse(storedDurations) : [];
      durations.push(sessionDuration);
      await AsyncStorage.setItem(
        "streamingDurations",
        JSON.stringify(durations)
      );
    } catch (error) {
      console.error("Error saving streaming duration:", error);
    }
    clearInterval(frameInterval);
  };

  const captureFrame = async () => {
    if (cameraRef.current) {
      const frame = await cameraRef.current.takePictureAsync({
        quality: 1,
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
        method: "POST",
        url: "https://detect.roboflow.com/bobber-detection/3",
        params: {
          api_key: "zuxqZZaKZVPbzrB23QRP",
        },
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        data: `${base64Image}`,
      });
      const bobberDetected = response.data.predictions.some(
        (prediction) => prediction.class === "bobbers"
      );

      if (!bobberDetected) {
        incrementLifetimeBobbersNotDetected();
        sendNotification("No bobber detected! Check your line.");
      }
    } catch (error) {
      console.error("Error detecting bobber:", error);
    }
  };

  const incrementLifetimeBobbersNotDetected = async () => {
    try {
      let currentLifetimeCount = await AsyncStorage.getItem(
        "lifetimeBobbersNotDetected"
      );
      currentLifetimeCount = currentLifetimeCount
        ? parseInt(currentLifetimeCount)
        : 0;
      const newLifetimeCount = currentLifetimeCount + 1;
      await AsyncStorage.setItem(
        "lifetimeBobbersNotDetected",
        newLifetimeCount.toString()
      );
    } catch (error) {
      console.error("Error incrementing lifetime bobbers not detected:", error);
    }
  };

  const resizeAndBase64Encode = async (frameData) => {
    try {
      const resizedImage = await ImageManipulator.manipulateAsync(
        frameData.uri,
        [
          {
            resize: {
              height: frameData.height / 5,
              width: frameData.width / 5,
            },
          },
        ],
        { format: "jpeg", base64: true }
      );

      return resizedImage.base64;
    } catch (error) {
      console.error("Error resizing image:", error);
      throw error; // Throw the error instead of returning null
    }
  };

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: "center" }}>
          We need your permission to show the camera
        </Text>
        <Button onPress={requestPermission} title="Grant Permission" />
      </View>
    );
  }
  const animateButton = () => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start();
    });
  };
  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} ref={cameraRef}>
        <View style={styles.buttonContainer}>
          {!isStreaming ? (
            <TouchableOpacity
              style={styles.button}
              onPress={handleStartStreaming}
            >
              <Text style={styles.text}>Start Streaming</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.button}
              onPress={handleStopStreaming}
            >
              <Text style={styles.text}>Stop Streaming</Text>
            </TouchableOpacity>
          )}
          <Animated.View
            style={[
              styles.animationCircle,
              {
                opacity: fadeAnim,
              },
            ]}
          />
        </View>
      </CameraView>

      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() =>
            navigation.navigate("Settings", { selectedFps, setSelectedFps })
          }
        >
          <MaterialIcons name="settings" size={24} color="white" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.notificationsButton}
          onPress={() =>
            navigation.navigate("Notifications", { notifications })
          }
        >
          <MaterialIcons name="notifications" size={24} color="white" />
        </TouchableOpacity>

        <Text
          style={styles.howtouse}
          onPress={() => navigation.navigate("HowToUse")}
        >
          How To Use
        </Text>

        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => navigation.navigate("Profile")}
        >
          <MaterialIcons name="person" size={24} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  camera: {
    flex: 1,
    width: "100%",
  },
  buttonContainer: {
    position: "absolute",
    bottom: 20,
    alignSelf: "center",
  },
  button: {
    backgroundColor: "#007bff",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
  },
  text: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
  },
  animationCircle: {
    position: "absolute",
    top: -30,
    alignSelf: "center",
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#007bff",
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 50,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    alignItems: "center",
  },
  settingsButton: {
    padding: 10,
  },
  notificationsButton: {
    padding: 10,
  },
  howtouseButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  howtouse: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    flex: 1,
    lineHeight: 50,
  },
  howtouseText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
  profileButton: {
    padding: 10,
  },
});

const SettingsScreen = ({ navigation, route }) => {
  const { selectedFps: initialSelectedFps, setSelectedFps } = route.params;
  const [selectedFps, setSelectedFpsState] = useState(initialSelectedFps);

  const saveSettings = async () => {
    // Check if selectedFps is lower than 1
    if (parseInt(selectedFps) < 1) {
      Alert.alert("Error", "Capture Interval must be 1 or higher.");
      return;
    }

    try {
      await AsyncStorage.setItem("selectedFps", selectedFps);
      navigation.goBack();
    } catch (error) {
      console.error("Error saving settings:", error);
    }
  };
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={settingStyles.container}
    >
      <View style={settingStyles.container}>
        <Text style={settingStyles.title}>Settings</Text>

        {/* FPS Input */}
        <View style={settingStyles.settingItem}>
          <Text style={settingStyles.settingLabel}>
            Capture Interval (Second)
          </Text>
          <TextInput
            style={settingStyles.input}
            value={selectedFps}
            onChangeText={(value) => setSelectedFpsState(value)}
            keyboardType="numeric"
            placeholder="Enter Interval"
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={settingStyles.saveButton}
          onPress={saveSettings}
        >
          <Text style={settingStyles.saveButtonText}>Save Settings</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const settingStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    backgroundColor: "#0B72B9",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#FFFFFF",
  },
  settingItem: {
    marginBottom: 20,
    width: "100%",
    alignItems: "center",
  },
  settingLabel: {
    fontSize: 20,
    marginBottom: 10,
    color: "#FFFFFF",
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 10,
    width: "500%",
    backgroundColor: "#FFFFFF",
    textAlign: "center",
  },
  saveButton: {
    backgroundColor: "#27AE60",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 20,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
  },
});

const NotificationScreen = ({ route, navigation }) => {
  const { notifications } = route.params;

  return (
    <View style={NotificationStyles.container}>
      <Text style={NotificationStyles.title}>Notification Times</Text>
      <Text style={NotificationStyles.subtitle}>
        When the bobber is not detected
      </Text>
      {notifications.length === 0 ? (
        <Text style={NotificationStyles.no}>No notifications</Text>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item, index) => index.toString()}
          renderItem={({ item }) => (
            <View style={NotificationStyles.notificationItem}>
              <Text style={NotificationStyles.notificationText}>{item}</Text>
            </View>
          )}
        />
      )}
      <TouchableOpacity
        style={NotificationStyles.backButton}
        onPress={() => navigation.navigate("Camera")}
      >
        <Text style={NotificationStyles.backButtonText}>Back</Text>
      </TouchableOpacity>
    </View>
  );
};

const NotificationStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#0B72B9",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#FFFFFF",
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 10,
    color: "#FFFFFF",
  },
  notificationItem: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 10,
    marginVertical: 5,
    width: "100%",
    backgroundColor: "#FFFFFF",
  },
  no: {
    paddingTop: 250,
    paddingBottom: 250,
    marginVertical: 5,
    color: "lightgreen",
    fontSize: 30,
    fontWeight: "bold",
  },
  notificationText: {
    fontSize: 18,
  },
  backButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "#27AE60",
    borderRadius: 5,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
});

const HowToUseScreen = () => {
  return (
    <View style={howToUseStyles.container}>
      <Text style={howToUseStyles.title}>How to Use</Text>
      <Text style={howToUseStyles.description}>
        1. Place your phone securely, facing towards your fishing bobber.
        {"\n\n"}
        2. Open the app and grant camera permissions if prompted.
        {"\n\n"}
        3. Tap "Start Streaming" to begin monitoring for bobber movements.
        {"\n\n"}
        4. Adjust the capture interval setting if needed in the settings.
        {"\n\n"}
        5. If a bobber is detected, you'll receive a notification.
        {"\n\n"}
        6. Tap "Stop Streaming" when finished or as needed.
        {"\n\n"}
        7. Review notification times in the Notifications section.
      </Text>
    </View>
  );
};

const howToUseStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  description: {
    fontSize: 18,
    textAlign: "left",
  },
});

const ProfileScreen = () => {
  const [lifetimeBobbersNotDetected, setLifetimeBobbersNotDetected] =
    useState(0);
  const [totalFishingSessions, setTotalFishingSessions] = useState(0);
  const [totalStreamingTime, setTotalStreamingTime] = useState(0);

  useEffect(() => {
    // Fetch lifetime statistics from AsyncStorage
    const fetchLifetimeStats = async () => {
      try {
        const bobbersNotDetected = await AsyncStorage.getItem(
          "lifetimeBobbersNotDetected"
        );
        if (bobbersNotDetected !== null) {
          setLifetimeBobbersNotDetected(parseInt(bobbersNotDetected));
        }

        const storedDurations = await AsyncStorage.getItem(
          "streamingDurations"
        );
        if (storedDurations !== null) {
          const durations = JSON.parse(storedDurations);
          const totalTime = durations.reduce((acc, curr) => acc + curr, 0);
          setTotalStreamingTime(totalTime);
          setTotalFishingSessions(durations.length);
        }
      } catch (error) {
        console.error("Error fetching lifetime statistics:", error);
      }
    };

    fetchLifetimeStats();
  }, []);

  return (
    <View style={profileStyles.container}>
      <Text style={profileStyles.title}>Profile</Text>
      <View style={profileStyles.statistic}>
        <Text style={profileStyles.statisticLabel}>
          Lifetime Bobbers Not Detected:
        </Text>
        <Text style={profileStyles.statisticValue}>
          {lifetimeBobbersNotDetected}
        </Text>
      </View>
      <View style={profileStyles.statistic}>
        <Text style={profileStyles.statisticLabel}>
          Total Fishing Sessions:
        </Text>
        <Text style={profileStyles.statisticValue}>{totalFishingSessions}</Text>
      </View>
      <View style={profileStyles.statistic}>
        <Text style={profileStyles.statisticLabel}>
          Total Streaming Time (seconds):
        </Text>
        <Text style={profileStyles.statisticValue}>
          {totalStreamingTime.toFixed(2)}
        </Text>
      </View>
    </View>
  );
};

const profileStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    backgroundColor: "#0B72B9",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#FFFFFF",
  },
  statistic: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    width: "100%",
  },
  statisticLabel: {
    fontSize: 20,
    marginRight: 10,
    color: "#FFFFFF",
  },
  statisticValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
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
        <Stack.Screen name="Profile" component={ProfileScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;
