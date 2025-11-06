import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import HomeScreen from '../screens/shared/HomeScreen';
import ProfileScreen from '../screens/shared/profile/ProfileScreen';
import AdminScreen from '../screens/shared/AdminScreen';
import { authService } from '../utils/supabaseService';
import { storageService } from '../utils/storageService';

const Tab = createBottomTabNavigator();

export default function MainNavigator() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
  const checkAdminStatus = async () => {
  try {
    // FIRST: Check local storage (fast, no API call)
    const localIsAdmin = await storageService.getAdminStatus();
    const localProfile = await storageService.getUserProfile();
    
    console.log('🔍 Local admin check:', { localIsAdmin, hasLocalProfile: !!localProfile });
    
    if (localProfile && localIsAdmin !== null) {
      console.log('✅ Using local admin status:', localIsAdmin);
      setIsAdmin(localIsAdmin);
      return; // NO API CALL NEEDED!
    }

    // ONLY if no local data: Check Supabase
    console.log('🔍 No local data, checking Supabase...');
    const user = await authService.getCurrentUser();
    setCurrentUser(user);
    
    if (user) {
      const { data: profile, error } = await authService.getProfile(user.id);
      
      if (error) throw error;

      if (profile) {
        // Store for next time
        await storageService.setUserProfile(profile);
        await storageService.setAdminStatus(profile.is_admin || false);
        
        setIsAdmin(profile.is_admin === true);
        console.log('✅ Supabase admin check:', profile.is_admin);
      }
    }
  } catch (error) {
    console.error('Error checking admin status:', error);
    setIsAdmin(false);
  }
};
  
  checkAdminStatus();
}, []);

  console.log('🔍 Current admin status:', isAdmin);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => {
          let emoji = '🏠';
          if (route.name === 'Profile') {
            emoji = '👤';
          } else if (route.name === 'Admin') {
            emoji = '⚙️';
          }
          return <Text style={{ fontSize: 20 }}>{emoji}</Text>;
        },
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#64748b',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      
      {isAdmin && (
        <Tab.Screen 
          name="Admin" 
          component={AdminScreen}
          options={{
            tabBarLabel: 'Admin',
          }}
        />
      )}
    </Tab.Navigator>
  );
}