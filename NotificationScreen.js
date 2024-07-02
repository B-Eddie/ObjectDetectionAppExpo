import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const NotificationScreen = () => {
  // Dummy data for notifications (replace with actual data)
  const notifications = [
    { id: 1, message: 'No bobber detected at 10:00 AM' },
    { id: 2, message: 'No bobber detected at 12:30 PM' },
    { id: 3, message: 'No bobber detected at 3:45 PM' },
  ];

  return (
    <View style={styles.container}>
      {notifications.map((notification) => (
        <View key={notification.id} style={styles.notification}>
          <Text>{notification.message}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  notification: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginVertical: 5,
    width: '100%',
  },
});

export default NotificationScreen;
