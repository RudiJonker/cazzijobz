import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { lightTheme } from '../../styles/theme';

export default function HomeScreen() {
  return (
    <View style={[styles.container, { backgroundColor: lightTheme.colors.background }]}>
      <Text style={[styles.title, { color: lightTheme.colors.text }]}>
        Welcome to cazzijobz!
      </Text>
      <Text style={[styles.subtitle, { color: lightTheme.colors.text }]}>
        Home Screen - Coming Soon
      </Text>
    </View>
  );
}

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
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});