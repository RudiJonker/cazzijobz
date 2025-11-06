import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { lightTheme } from '../../../styles/theme';
import LocationField from '../profile/components/LocationField';
import { authService } from '../../../utils/supabaseService';
import { storageService } from '../../../utils/storageService';

export default function ProfileScreen() {
  const navigation = useNavigation();
  const [formData, setFormData] = useState({
    full_name: '',
    bio: '',
    location_city: '',
  });
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [pendingChanges, setPendingChanges] = useState({});
  const [lastApiCall, setLastApiCall] = useState(null);

  // Development: 1 minute, Production: 10 minutes
  const TYPE_B_TIMEOUT = __DEV__ ? 60000 : 600000;

  // Load user data and last API call time
  useEffect(() => {
    loadUserProfile();
    loadPendingChanges();
    loadLastApiCall();
  }, []);

  const loadUserProfile = async () => {
  try {
    setLoading(true);
    
    // ✅ FIRST: Check for pending local changes
    const pendingChanges = await storageService.getPendingChanges();
    const localProfile = await storageService.getUserProfile();
    
    console.log('🔍 Load check:', { 
      hasLocalProfile: !!localProfile, 
      hasPendingChanges: !!pendingChanges 
    });
    
    // ✅ If we have pending changes, use local data (don't overwrite with Supabase)
    if (pendingChanges && localProfile) {
      console.log('✅ Using local profile with pending changes');
      
      // Apply pending changes to the local profile for display
      const profileWithPendingChanges = { ...localProfile, ...pendingChanges };
      setFormData({
        full_name: profileWithPendingChanges.full_name || '',
        bio: profileWithPendingChanges.bio || '',
        location_city: profileWithPendingChanges.location_city || '',
      });
      setUser(profileWithPendingChanges);
      setLoading(false);
      return;
    }
    
    // ✅ If we have local profile but no pending changes, use it
    if (localProfile) {
      console.log('✅ Using existing local profile');
      setFormData({
        full_name: localProfile.full_name || '',
        bio: localProfile.bio || '',
        location_city: localProfile.location_city || '',
      });
      setUser(localProfile);
      setLoading(false);
      return;
    }

    // ✅ ONLY if no local data: Fetch from Supabase
    console.log('🔍 No local profile, fetching from Supabase...');
    const currentUser = await authService.getCurrentUser();
    setUser(currentUser);

    if (currentUser) {
      const { data: profile, error } = await authService.getProfile(currentUser.id);
      
      if (error) throw error;

      if (profile) {
        setFormData({
          full_name: profile.full_name || '',
          bio: profile.bio || '',
          location_city: profile.location_city || '',
        });
        
        await storageService.setUserProfile(profile);
      }
    }
  } catch (error) {
    console.error('❌ Error loading profile:', error);
    Alert.alert('Error', 'Failed to load profile data.');
  } finally {
    setLoading(false);
  }
};

  const loadPendingChanges = async () => {
    try {
      const changes = await storageService.getPendingChanges();
      if (changes) {
        setPendingChanges(changes);
      }
    } catch (error) {
      console.error('Error loading pending changes:', error);
    }
  };

  const loadLastApiCall = async () => {
    try {
      const lastCall = await storageService.getLastApiCall();
      if (lastCall) {
        setLastApiCall(new Date(lastCall));
      }
    } catch (error) {
      console.error('Error loading last API call:', error);
    }
  };

  // Check if we can make an API call (outside timeout period)
  const canMakeApiCall = () => {
    if (!lastApiCall) {
      return true; // No previous calls, allow API call
    }

    const now = new Date();
    const timeSinceLastCall = now - lastApiCall;
    const outsideTimeout = timeSinceLastCall >= TYPE_B_TIMEOUT;
    
    console.log('⏱️ API Call Check:', {
      lastCall: lastApiCall,
      timeSinceLastCall: Math.round(timeSinceLastCall / 1000) + 's',
      timeout: TYPE_B_TIMEOUT / 1000 + 's',
      allowed: outsideTimeout
    });
    
    return outsideTimeout;
  };

  const handleSaveProfile = async () => {
    if (!user) {
      Alert.alert('Error', 'No user logged in.');
      return;
    }

    const changes = {
      full_name: formData.full_name,
      bio: formData.bio,
      location_city: formData.location_city,
    };

    try {
      // ✅ ALWAYS save to local storage immediately
      const updatedProfile = { ...user, ...changes };
      await storageService.setUserProfile(updatedProfile);
      setUser(updatedProfile);

      // ✅ Check if we can make API call (outside timeout)
      if (canMakeApiCall()) {
        // ✅ Outside timeout - MAKE API CALL IMMEDIATELY
        setLoading(true);
        
        console.log('🚀 Making Type B API call (outside timeout)');
        
        const { error } = await authService.updateProfile({
          id: user.id,
          ...changes,
          updated_at: new Date().toISOString(),
        });

        if (error) throw error;

        // Update last API call time
        const now = new Date().toISOString();
        await storageService.setLastApiCall(now);
        setLastApiCall(new Date(now));
        
        // Clear any pending changes since we just synced
        setPendingChanges({});
        await storageService.clearPendingChanges();
        
        Alert.alert('Success', 'Profile saved and synced to server!');
        console.log('✅ Type B API call completed');
        
      } else {
        // ✅ Still in timeout - SAVE LOCALLY ONLY (batch for later)
        const newPendingChanges = { ...pendingChanges, ...changes };
        setPendingChanges(newPendingChanges);
        await storageService.setPendingChanges(newPendingChanges);
        
        Alert.alert('Success', 'Profile saved locally! Changes will sync when ready.');
        console.log('📝 Changes batched locally (in timeout period)');
      }

    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save profile.');
    } finally {
      setLoading(false);
    }
  };

  // Manual sync for batched changes (optional - can be removed)
  const handleManualSync = async () => {
    if (!user || Object.keys(pendingChanges).length === 0) {
      Alert.alert('Info', 'No pending changes to sync.');
      return;
    }

    if (!canMakeApiCall()) {
      Alert.alert('Please Wait', 'Please wait before syncing again.');
      return;
    }

    setLoading(true);
    try {
      console.log('🚀 Manual sync of batched changes');
      
      const { error } = await authService.updateProfile({
        id: user.id,
        ...pendingChanges,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;

      // Update last API call time
      const now = new Date().toISOString();
      await storageService.setLastApiCall(now);
      setLastApiCall(new Date(now));

      setPendingChanges({});
      await storageService.clearPendingChanges();
      Alert.alert('Success', 'Batched changes synced to server!');

    } catch (error) {
      console.error('Manual sync error:', error);
      Alert.alert('Error', 'Failed to sync changes.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
  Alert.alert(
    'Sign Out',
    'Are you sure you want to sign out?',
    [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Sign Out', 
        style: 'destructive',
        onPress: async () => {
          try {
            // ✅ Clear user data BUT preserve pending changes
            await storageService.clearUserDataButKeepPendingChanges();
            
            navigation.reset({
              index: 0,
              routes: [{ name: 'Auth' }],
            });
            console.log('✅ Signed out, pending changes preserved');
          } catch (error) {
            console.error('Sign out error:', error);
            Alert.alert('Error', 'Failed to sign out.');
          }
        }
      }
    ]
  );
};

  const updateFormData = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading && !formData.full_name) {
    return (
      <View style={[styles.container, { backgroundColor: lightTheme.colors.background }]}>
        <Text style={[styles.title, { color: lightTheme.colors.text }]}>
          Loading Profile...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: lightTheme.colors.background }]}
      contentContainerStyle={styles.scrollContent}
    >
      <Text style={[styles.title, { color: lightTheme.colors.text }]}>
        My Profile
      </Text>

      <View style={styles.form}>
        <Text style={[styles.label, { color: lightTheme.colors.text }]}>
          Full Name
        </Text>
        <TextInput
          style={[styles.input, { 
            backgroundColor: lightTheme.colors.card,
            borderColor: lightTheme.colors.border,
            color: lightTheme.colors.text 
          }]}
          placeholder="Enter your full name"
          placeholderTextColor={lightTheme.colors.placeholder}
          value={formData.full_name}
          onChangeText={(text) => updateFormData('full_name', text)}
        />

        <LocationField
          value={formData.location_city}
          onChange={(location) => updateFormData('location_city', location)}
          label="Location"
        />

        <Text style={[styles.label, { color: lightTheme.colors.text }]}>
          Bio
        </Text>
        <TextInput
          style={[styles.input, styles.textArea, { 
            backgroundColor: lightTheme.colors.card,
            borderColor: lightTheme.colors.border,
            color: lightTheme.colors.text 
          }]}
          placeholder="Tell others about yourself..."
          placeholderTextColor={lightTheme.colors.placeholder}
          value={formData.bio}
          onChangeText={(text) => updateFormData('bio', text)}
          multiline
          numberOfLines={3}
          maxLength={250}
        />
        <Text style={[styles.charCount, { color: lightTheme.colors.placeholder }]}>
          {formData.bio.length}/250 characters
        </Text>

        <TouchableOpacity 
          style={[
            styles.saveButton, 
            { 
              backgroundColor: lightTheme.colors.primary,
            }
          ]}
          onPress={handleSaveProfile}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>
            {loading ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.signOutButton, 
            { 
              backgroundColor: lightTheme.colors.error,
            }
          ]}
          onPress={handleSignOut}
        >
          <Text style={styles.signOutButtonText}>
            Sign Out
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    fontSize: 14,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: -15,
    marginBottom: 20,
  },
  saveButton: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  signOutButton: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  signOutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});