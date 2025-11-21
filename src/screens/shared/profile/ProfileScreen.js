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
import LocationField from './components/LocationField';
import ProfileImageField from './components/ProfileImageField';
import { authService } from '../../../utils/supabaseService';
import { storageService } from '../../../utils/storageService';

// Simple debounce function
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export default function ProfileScreen() {
  const navigation = useNavigation();
  const [formData, setFormData] = useState({
    full_name: '',
    bio: '',
    location_city: '',
    profile_picture_url: null,
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
      
      const localProfile = await storageService.getUserProfile();
      
      if (localProfile) {
        setFormData({
          full_name: localProfile.full_name || '',
          bio: localProfile.bio || '',
          location_city: localProfile.location_city || '',
          profile_picture_url: localProfile.profile_picture_url || null,
        });
        setUser(localProfile);
        setLoading(false);
        return;
      }

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
            profile_picture_url: profile.profile_picture_url || null,
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

  try {
    setLoading(true);
    
    let finalImageUrl = formData.profile_picture_url;
    
    // If we have a local image, try to upload it (silently)
    if (finalImageUrl && finalImageUrl.startsWith('file://')) {
      console.log('🖼️ Uploading local image to Supabase...');
      
      const fileExt = finalImageUrl.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user.id}/profile_${Date.now()}.${fileExt}`;
      
      const { data, error } = await authService.uploadProfileImage(finalImageUrl, fileName, user.id);
      
      if (!error && data) {
        finalImageUrl = data.publicUrl;
        console.log('✅ Image uploaded successfully');
      } else {
        console.log('⚠️ Image upload failed, keeping local version');
        // Silently fail - keep local image for next try
      }
    }

    // Prepare changes for profile
    const changes = {
  full_name: formData.full_name,
  bio: formData.bio,
  location_city: formData.location_city,
  profile_picture_url: finalImageUrl, // ✅ ADD THIS BACK
};

    // Save to local storage
    const updatedProfile = { 
      ...user, 
      ...changes,
      profile_picture_url: finalImageUrl
    };
    await storageService.setUserProfile(updatedProfile);
    setUser(updatedProfile);

    // Handle API call based on timeout
    if (canMakeApiCall()) {
      console.log('🚀 Making Type B API call');
      
      const { error } = await authService.updateProfile({
        id: user.id,
        ...changes,
        updated_at: new Date().toISOString(),
      }, user.id);

      if (error) throw error;

      const now = new Date().toISOString();
      await storageService.setLastApiCall(now);
      setLastApiCall(new Date(now));
      
      setPendingChanges({});
      await storageService.clearPendingChanges();
      
      // ONE simple success message
      Alert.alert('Success', 'Profile saved successfully!');
      
    } else {
      const newPendingChanges = { ...pendingChanges, ...changes };
      setPendingChanges(newPendingChanges);
      await storageService.setPendingChanges(newPendingChanges);
      
      // ONE simple success message
      Alert.alert('Success', 'Profile saved successfully!');
    }

  } catch (error) {
    console.error('Error saving profile:', error);
    Alert.alert('Error', 'Failed to save profile. Please try again.');
  } finally {
    setLoading(false);
  }
};

  const handleImageChange = (imageUrl) => {
    setFormData(prev => ({
      ...prev,
      profile_picture_url: imageUrl
    }));
  };

  // Calculate profile completion
  const getProfileCompletion = () => {
  if (!user) return { completed: 0, total: 4, percentage: 0 };
  
  let completed = 0;
  const total = 4; // Name, Location, Bio, Profile Picture
  
  // Name completion (required, always complete after signup)
  if (formData.full_name && formData.full_name.trim().length > 0) completed++;
  
  // Location completion (required, always complete after signup)  
  if (formData.location_city && formData.location_city.trim().length > 0) completed++;
  
  // Bio completion (optional)
  if (formData.bio && formData.bio.trim().length > 0) completed++;
  
  // Profile picture completion (optional)
  if (formData.profile_picture_url) completed++;
  
  const percentage = Math.round((completed / total) * 100);
  
  return { 
    completed, 
    total,
    percentage
  };
};

  const completion = getProfileCompletion();

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
              await storageService.clearUserDataButKeepPendingChanges();
              navigation.reset({
                index: 0,
                routes: [{ name: 'Auth' }],
              });
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
      <Text style={[styles.title, { color: lightTheme.colors.primary }]}>
  My Profile
</Text>

      {/* Profile Completion Badge - Only show when NOT 100% */}
{completion.percentage < 100 && (
  <View style={styles.completionContainer}>
    <View style={styles.completionHeader}>
      <Text style={styles.completionTitle}>Profile Completion</Text>
      <Text style={styles.completionPercentage}>{completion.percentage}%</Text>
    </View>
    <View style={styles.completionBar}>
      <View 
        style={[
          styles.completionProgress, 
          { width: `${completion.percentage}%` }
        ]} 
      />
    </View>
    <Text style={styles.completionTip}>
      {!formData.profile_picture_url && !formData.bio 
        ? 'Add a photo and bio to complete your profile' 
        : !formData.profile_picture_url 
          ? 'Add a profile photo to build trust' 
          : !formData.bio 
            ? 'Add a bio to tell others about yourself' 
            : 'Almost there!'}
    </Text>
  </View>
)}

      {/* Profile Picture */}
      <ProfileImageField
        imageUrl={formData.profile_picture_url}
        onImageChange={handleImageChange}
        userId={user?.id}
      />

      <View style={styles.form}>
        {/* Full Name */}
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

        {/* Location Field */}
        <LocationField
          value={formData.location_city}
          onChange={(location) => updateFormData('location_city', location)}
          label="Location"
        />

        {/* Bio Field */}
        <View style={styles.bioSection}>
          <Text style={[styles.label, { color: lightTheme.colors.text }]}>
            About Me {user?.role === 'worker' && '(Helps get more jobs)'}
          </Text>
          <TextInput
            style={[styles.input, styles.textArea, { 
              backgroundColor: lightTheme.colors.card,
              borderColor: lightTheme.colors.border,
              color: lightTheme.colors.text 
            }]}
            placeholder={
              user?.role === 'worker' 
                ? 'Tell employers about your skills, experience, and what work you can do...'
                : 'Tell workers about your business or what kind of work you need...'
            }
            placeholderTextColor={lightTheme.colors.placeholder}
            value={formData.bio}
            onChangeText={(text) => updateFormData('bio', text)}
            multiline
            numberOfLines={4}
            maxLength={250}
            textAlignVertical="top"
          />
          <Text style={[styles.charCount, { color: lightTheme.colors.placeholder }]}>
            {formData.bio.length}/250 characters
          </Text>
        </View>

        {/* Save Button */}
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
            {loading ? 'Saving...' : 'Save Profile'}
          </Text>
        </TouchableOpacity>

        {/* Sign Out Button */}
        <TouchableOpacity 
          style={[
            styles.signOutButton, 
            { 
              backgroundColor: lightTheme.colors.card,
              borderColor: lightTheme.colors.border,
            }
          ]}
          onPress={handleSignOut}
        >
          <Text style={[styles.signOutButtonText, { color: lightTheme.colors.error }]}>
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
    marginBottom: 20,
    textAlign: 'center',
    marginTop: 15,
  },
  completionContainer: {
    backgroundColor: lightTheme.colors.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: lightTheme.colors.primary,
  },
  completionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  completionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: lightTheme.colors.text,
  },
  completionPercentage: {
    fontSize: 14,
    fontWeight: 'bold',
    color: lightTheme.colors.primary,
  },
  completionBar: {
    height: 6,
    backgroundColor: lightTheme.colors.background,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  completionProgress: {
    height: '100%',
    backgroundColor: lightTheme.colors.primary,
    borderRadius: 3,
  },
  completionTip: {
    fontSize: 12,
    color: lightTheme.colors.placeholder,
    fontStyle: 'italic',
  },
  form: {
    width: '100%',
  },
  bioSection: {
    marginBottom: 20,
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
    marginBottom: 8,
    fontSize: 14,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  saveButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 12,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  signOutButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  signOutButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});