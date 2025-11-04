import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import WelcomeScreen from './src/screens/auth/WelcomeScreen';
import TermsScreen from './src/screens/auth/TermsScreen';
import { lightTheme } from './src/styles/theme';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer theme={{ colors: { background: lightTheme.colors.background } }}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Terms" component={TermsScreen} />
        {/* We'll add SignUp next */}
      </Stack.Navigator>
    </NavigationContainer>
  );
}