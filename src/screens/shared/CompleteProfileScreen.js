import React, { useState } from 'react';
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

export default function CompleteProfileScreen({ navigation, route }) {
  const { userId, email, role } = route.params;
  
  const [formData, setFormData] = useState({
    full_name: '',
    bio: '', // Bio for workers, Information for employers
    location_city: '',
    location_suburb: '',
  });
  const [loading, setLoading] = useState(false);

  const handleCompleteProfile = async () => {
    // Basic validation
    if (!formData.full_name || !formData.location_city) {
      Alert.alert('Error', 'Name and city are required');
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
        location_suburb: formData.location_suburb,
        is_profile_complete: true, // Mark profile as complete
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;

      Alert.alert(
        'Success',
        'Profile completed!',
        [{ text: 'OK', onPress: () => navigation.navigate('Home') }]
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
      <Text style={[styles.title, { color: lightTheme.colors.text }]}>
        Complete Your Profile
      </Text>
      
      <Text style={[styles.subtitle, { color: lightTheme.colors.text }]}>
        {role === 'worker' ? 'Worker' : 'Employer'} Profile
      </Text>

      <View style={styles.form}>
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

        <Text style={[styles.label, { color: lightTheme.colors.text }]}>
          {role === 'worker' ? 'Bio' : 'Information'}
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
          numberOfLines={4}
        />

        <Text style={[styles.label, { color: lightTheme.colors.text }]}>
          City *
        </Text>
        <TextInput
          style={[styles.input, { 
            backgroundColor: lightTheme.colors.card,
            borderColor: lightTheme.colors.border,
            color: lightTheme.colors.text 
          }]}
          placeholder="Enter your city"
          placeholderTextColor={lightTheme.colors.placeholder}
          value={formData.location_city}
          onChangeText={(text) => updateFormData('location_city', text)}
        />

        <Text style={[styles.label, { color: lightTheme.colors.text }]}>
          Suburb
        </Text>
        <TextInput
          style={[styles.input, { 
            backgroundColor: lightTheme.colors.card,
            borderColor: lightTheme.colors.border,
            color: lightTheme.colors.text 
          }]}
          placeholder="Enter your suburb"
          placeholderTextColor={lightTheme.colors.placeholder}
          value={formData.location_suburb}
          onChangeText={(text) => updateFormData('location_suburb', text)}
        />

        <TouchableOpacity 
          style={[
            styles.saveButton, 
            { 
              backgroundColor: loading ? lightTheme.colors.border : lightTheme.colors.primary,
              opacity: loading ? 0.7 : 1
            }
          ]}
          onPress={handleCompleteProfile}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>
            {loading ? 'Saving...' : 'Complete Profile'}
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
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  saveButton: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});