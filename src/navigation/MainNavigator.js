import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import HomeScreen from '../screens/shared/HomeScreen'; // Dashboard
import WorkerJobsScreen from '../screens/worker/WorkerJobsScreen'; // Job browser - CORRECT NAME
import ProfileScreen from '../screens/shared/profile/ProfileScreen';
import AdminScreen from '../screens/shared/AdminScreen';
import PostJobScreen from '../screens/jobs/post/PostJobScreen';
import MyJobsScreen from '../screens/employer/MyJobsScreen';
import { storageService } from '../utils/storageService';

const Tab = createBottomTabNavigator();

export default function MainNavigator() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState('worker');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const localProfile = await storageService.getUserProfile();
        
        if (localProfile) {
          setUserRole(localProfile.role || 'worker');
          setIsAdmin(localProfile.is_admin === true);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadUserData();
  }, []);

  if (loading) {
    return <Text style={{ textAlign: 'center', marginTop: 50 }}>Loading...</Text>;
  }

  console.log('🔍 Navigation setup:', { userRole, isAdmin });

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => {
          const icons = {
            'Dashboard': '🏠',
            'Find Jobs': '🔍',
            'My Jobs': '📋',
            'Post Job': '📝',
            'Profile': '👤',
            'Admin': '⚙️'
          };
          return <Text style={{ fontSize: 20 }}>{icons[route.name]}</Text>;
        },
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#64748b',
        headerShown: false,
      })}
    >
      {/* COMMON: Dashboard for both roles */}
      <Tab.Screen 
        name="Dashboard" 
        component={HomeScreen}
      />

      {/* WORKER: Job browsing */}
      {userRole === 'worker' && (
        <Tab.Screen 
          name="Find Jobs" 
          component={WorkerJobsScreen} 
        />
      )}

      {/* EMPLOYER: Job management */}
      {userRole === 'employer' && (
        <>
          <Tab.Screen name="Post Job" component={PostJobScreen} />
          <Tab.Screen name="My Jobs" component={MyJobsScreen} />
        </>
      )}

      {/* COMMON: Profile */}
      <Tab.Screen name="Profile" component={ProfileScreen} />

      {/* ADMIN: Admin panel */}
      {isAdmin && (
        <Tab.Screen name="Admin" component={AdminScreen} />
      )}
    </Tab.Navigator>
  );
}