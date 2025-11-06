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
import { lightTheme } from '../../styles/theme';
import { authService } from '../../utils/supabaseService';
import { storageService } from '../../utils/storageService'; // ✅ ADD THIS IMPORT
import LocationField from './profile/components/LocationField';

export default function CompleteProfileScreen({ navigation, route }) {
  const { userId, email, role } = route.params;
  
  const [formData, setFormData] = useState({
    full_name: '',
    bio: '',
    location_city: '',
  });
  const [loading, setLoading] = useState(false);

  // Auto-fill email from signup
  useEffect(() => {
    console.log('Auto-filled email from signup:', email);
  }, [email]);

  const handleCompleteProfile = async () => {
    // Basic validation
    if (!formData.full_name || !formData.location_city) {
      Alert.alert('Complete Required Fields', 'Please provide your name and location to continue.');
      return;
    }

    setLoading(true);
    try {
      // TYPE A API Call - Update profile with complete information
      const { error } = await authService.updateProfile({
        id: userId,
        full_name: formData.full_name,
        bio: formData.bio,
        location_city: formData.location_city,
        is_profile_complete: true, // Mark profile as complete
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;

      // ✅ CRITICAL: Save completed profile to LOCAL STORAGE
      const completedProfile = {
        id: userId,
        email: email,
        role: role,
        full_name: formData.full_name,
        bio: formData.bio,
        location_city: formData.location_city,
        is_profile_complete: true,
        updated_at: new Date().toISOString(),
      };
      
      await storageService.setUserProfile(completedProfile);
      console.log('✅ Completed profile saved to local storage:', completedProfile);

      Alert.alert(
        'Welcome to cazzijobz!',
        '',
        [{ text: 'Get Started', onPress: () => navigation.navigate('Main') }]
      );
    } catch (error) {
      console.error('Profile completion error:', error);
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: lightTheme.colors.background }]}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Added top spacing */}
      <View style={styles.topSpacer} />
      
      <Text style={[styles.title, { color: lightTheme.colors.primary }]}>
        Almost There!
      </Text>
      
      <Text style={[styles.subtitle, { color: lightTheme.colors.text }]}>
        Complete your profile to get started
      </Text>

      <View style={styles.form}>
        {/* Email (display only) */}
        <Text style={[styles.label, { color: lightTheme.colors.text }]}>
          Email
        </Text>
        <View style={[styles.emailDisplay, { backgroundColor: lightTheme.colors.card }]}>
          <Text style={[styles.emailText, { color: lightTheme.colors.text }]}>
            {email}
          </Text>
        </View>

        {/* Full Name */}
        <Text style={[styles.label, { color: lightTheme.colors.text }]}>
          Full Name *
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
          label="Location *"
        />

        {/* Bio/Information */}
        <Text style={[styles.label, { color: lightTheme.colors.text }]}>
          {role === 'worker' ? 'Bio (Optional)' : 'Information (Optional)'}
        </Text>
        <TextInput
          style={[styles.input, styles.textArea, { 
            backgroundColor: lightTheme.colors.card,
            borderColor: lightTheme.colors.border,
            color: lightTheme.colors.text 
          }]}
          placeholder={role === 'worker' 
            ? 'Tell employers about your skills and experience...' 
            : 'Tell workers about your business or needs...'
          }
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

        {/* Complete Button */}
        <TouchableOpacity 
          style={[
            styles.completeButton, 
            { 
              backgroundColor: loading ? lightTheme.colors.border : lightTheme.colors.primary,
              opacity: (loading || !formData.full_name || !formData.location_city) ? 0.7 : 1
            }
          ]}
          onPress={handleCompleteProfile}
          disabled={loading || !formData.full_name || !formData.location_city}
        >
          <Text style={styles.completeButtonText}>
            {loading ? 'Saving...' : 'Get Started'}
          </Text>
        </TouchableOpacity>
        
        {/* Added bottom margin to prevent overlap */}
        <View style={styles.bottomSpacer} />
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
  topSpacer: {
    height: 20, // Added space at top
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 30,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 14, // Reduced font size
    marginBottom: 8,
    fontWeight: '600',
  },
  emailDisplay: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderColor: '#ddd',
  },
  emailText: {
    fontSize: 14, // Reduced font size
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    fontSize: 14, // Reduced font size
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
  completeButton: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30, // Added bottom margin
  },
  completeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bottomSpacer: {
    height: 20, // Extra space at bottom
  },
});