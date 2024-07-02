import React from 'react';
import { SafeAreaView, StyleSheet, Text, View, Button } from 'react-native';

const FishNotificationScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Fish Notifications</Text>
        <Button title="Back" onPress={() => navigation.goBack()} />
      </View>
      <View style={styles.content}>
        <Text>No notifications yet.</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#6200ee',
  },
  headerText: {
    fontSize: 20,
    color: 'white',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default FishNotificationScreen;
