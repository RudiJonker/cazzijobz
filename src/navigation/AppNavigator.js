// navigation/AppNavigator.js - FIXED VERSION
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import JobDetailScreen from '../screens/employer/JobDetailScreen'; 
import EditJobScreen from '../screens/employer/EditJobScreen';
import WorkerJobDetailScreen from '../screens/worker/WorkerJobDetailScreen';
import ApplicantsListScreen from '../screens/employer/ApplicantsListScreen';

const Stack = createStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {/* All screens now have headerShown: false globally */}
        <Stack.Screen name="Auth" component={AuthNavigator} />
        <Stack.Screen name="Main" component={MainNavigator} />
        <Stack.Screen name="JobDetail" component={JobDetailScreen} />
        <Stack.Screen name="EditJob" component={EditJobScreen} />
        <Stack.Screen name="WorkerJobDetail" component={WorkerJobDetailScreen} />
        <Stack.Screen name="ApplicantsList" component={ApplicantsListScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}