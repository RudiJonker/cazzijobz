// navigation/AppNavigator.js - UPDATED WITH WORKERJOBETAIL
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import JobDetailScreen from '../screens/employer/JobDetailScreen'; 
import EditJobScreen from '../screens/employer/EditJobScreen';
import WorkerJobDetailScreen from '../screens/worker/WorkerJobDetailScreen'; // ADD THIS IMPORT

const Stack = createStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Auth" component={AuthNavigator} />
        <Stack.Screen name="Main" component={MainNavigator} />
        
        {/* Employer Job Detail Screen */}
        <Stack.Screen 
          name="JobDetail" 
          component={JobDetailScreen}
          options={{ 
            headerShown: true,
            title: 'Job Details',
            headerStyle: {
              backgroundColor: '#2563eb',
            },
            headerTintColor: '#fff',
          }} 
        />
        
        {/* Edit Job Screen */}
        <Stack.Screen 
          name="EditJob" 
          component={EditJobScreen}
          options={{ 
            headerShown: true,
            title: 'Edit Job',
            headerStyle: {
              backgroundColor: '#2563eb',
            },
            headerTintColor: '#fff',
          }} 
        />
        
        {/* Worker Job Detail Screen - ADD THIS */}
        <Stack.Screen 
          name="WorkerJobDetail" 
          component={WorkerJobDetailScreen}
          options={{ 
            headerShown: true,
            title: 'Job Details',
            headerStyle: {
              backgroundColor: '#2563eb',
            },
            headerTintColor: '#fff',
          }} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}