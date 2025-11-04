// src/navigation/AppNavigator.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { lightTheme } from '../styles/theme';
import AuthNavigator from './AuthNavigator';

export default function AppNavigator() {
  return (
    <NavigationContainer theme={{ colors: { background: lightTheme.colors.background } }}>
      <AuthNavigator />
    </NavigationContainer>
  );
}