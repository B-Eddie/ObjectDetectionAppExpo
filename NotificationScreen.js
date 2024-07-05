import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useRoute } from "@react-navigation/native"

const NotificationScreen = ({ route, navigation }) => {
  let notifs = ['10:00 AM', '2:00 PM', '6:00 PM', '10:00 PM'];
  console.log(route.params);
  const { jefff, param } = route.params;
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notification Times</Text>
      <Text style={styles.notificationText}>{JSON.stringify(jefff)}</Text>
      <Text style={styles.notificationText}>{JSON.stringify(param)}</Text>
      <FlatList
        data={notifs}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <View style={styles.notificationItem}>
            <Text style={styles.notificationText}>{item}</Text>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
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
});

export default NotificationScreen;
