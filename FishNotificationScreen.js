import React, { useState } from 'react';
import { SafeAreaView, StyleSheet, Text, FlatList, View, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const FishNotificationScreen = ({ navigation }) => {
  const [notifications, setNotifications] = useState([
    { id: '1', time: '10:00 AM', description: 'Bobber detected underwater' },
    { id: '2', time: '11:30 AM', description: 'Another bobber detection' },
  ]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Fish Notifications</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.notificationItem}>
            <Text style={styles.notificationTime}>{item.time}</Text>
            <Text style={styles.notificationDescription}>{item.description}</Text>
          </View>
        )}
        contentContainerStyle={styles.listContainer}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#3498db',
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginBottom: 20,
    elevation: 3,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  backButton: {
    padding: 10,
  },
  listContainer: {
    paddingBottom: 20,
  },
  notificationItem: {
    backgroundColor: '#fff',
    paddingVertical: 15,
    paddingHorizontal: 20,
    marginBottom: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  notificationTime: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  notificationDescription: {
    fontSize: 14,
    color: '#666',
  },
});

export default FishNotificationScreen;