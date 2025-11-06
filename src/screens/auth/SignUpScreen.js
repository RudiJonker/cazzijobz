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
import { storageService } from '../../utils/storageService';

export default function SignUpScreen({ navigation, route }) {
  const { role } = route.params;
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });

  const handleSignUp = async () => {
  // Basic validation
  if (!formData.email || !formData.password || !formData.confirmPassword) {
    Alert.alert('Error', 'Please fill in all fields');
    return;
  }

  if (formData.password !== formData.confirmPassword) {
    Alert.alert('Error', 'Passwords do not match');
    return;
  }

  if (formData.password.length < 6) {
    Alert.alert('Error', 'Password must be at least 6 characters');
    return;
  }

  setLoading(true);
  try {
    console.log('🔍 Calling authService.signUp...');
    const { data: authData, error: authError } = await authService.signUp(
      formData.email, 
      formData.password
    );

    console.log('🔍 Auth response:', { authData, authError });

    if (authError) throw authError;

    if (authData.user) {
      console.log('🔍 User created, creating profile...');
      // Create profile
      const { error: profileError } = await authService.createProfile({
        id: authData.user.id,
        email: formData.email,
        role: role,
        is_profile_complete: false,
        created_at: new Date().toISOString(),
      });

      console.log('🔍 Profile creation response:', { profileError });

      if (profileError) throw profileError;

      // STORE LOCALLY
      console.log('🔍 Storing data locally...');
      await storageService.setUserProfile({
        id: authData.user.id,
        email: formData.email,
        role: role,
        is_profile_complete: false
      });
      await storageService.setAdminStatus(false);

      console.log('🔍 Navigating to CompleteProfile...');
      // Navigate to profile completion
      navigation.navigate('CompleteProfile', { 
        userId: authData.user.id,
        email: formData.email,
        role: role 
      });
    }
  } catch (error) {
    console.error('❌ Sign up error:', error);
    
    // Handle specific Supabase errors
    if (error.message.includes('already registered')) {
      Alert.alert('Error', 'This email is already registered. Please log in instead.');
    } else if (error.message.includes('profiles')) {
      Alert.alert('Error', 'Failed to create user profile. Please try again.');
    } else {
      Alert.alert('Error', 'Failed to create account. Please try again.');
    }
  } finally {
    console.log('🔍 Setting loading to false');
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
        Create Your Account
      </Text>
      
      <Text style={[styles.roleIndicator, { color: lightTheme.colors.primary }]}>
        Signing up as: {role === 'worker' ? 'Worker' : 'Employer'}
      </Text>

      <View style={styles.form}>
        <Text style={[styles.label, { color: lightTheme.colors.text }]}>
          Email Address
        </Text>
        <TextInput
          style={[styles.input, { 
            backgroundColor: lightTheme.colors.card,
            borderColor: lightTheme.colors.border,
            color: lightTheme.colors.text 
          }]}
          placeholder="Enter your email"
          placeholderTextColor={lightTheme.colors.placeholder}
          value={formData.email}
          onChangeText={(text) => updateFormData('email', text)}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={[styles.label, { color: lightTheme.colors.text }]}>
          Password
        </Text>
        <TextInput
          style={[styles.input, { 
            backgroundColor: lightTheme.colors.card,
            borderColor: lightTheme.colors.border,
            color: lightTheme.colors.text 
          }]}
          placeholder="Minimum 6 characters"
          placeholderTextColor={lightTheme.colors.placeholder}
          value={formData.password}
          onChangeText={(text) => updateFormData('password', text)}
          secureTextEntry
        />

        <Text style={[styles.label, { color: lightTheme.colors.text }]}>
          Confirm Password
        </Text>
        <TextInput
          style={[styles.input, { 
            backgroundColor: lightTheme.colors.card,
            borderColor: lightTheme.colors.border,
            color: lightTheme.colors.text 
          }]}
          placeholder="Confirm password"
          placeholderTextColor={lightTheme.colors.placeholder}
          value={formData.confirmPassword}
          onChangeText={(text) => updateFormData('confirmPassword', text)}
          secureTextEntry
        />

        <TouchableOpacity 
          style={[
            styles.signUpButton, 
            { 
              backgroundColor: loading ? lightTheme.colors.border : lightTheme.colors.primary,
              opacity: loading ? 0.7 : 1
            }
          ]}
          onPress={handleSignUp}
          disabled={loading}
        >
          <Text style={styles.signUpButtonText}>
            {loading ? 'Creating Account...' : 'Sign Up'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.loginLink}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={[styles.loginText, { color: lightTheme.colors.primary }]}>
            Already have an account? Log In
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
  topSpacer: {
    height: 20, // Added space at top
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  roleIndicator: {
    fontSize: 16,
    marginBottom: 30,
    textAlign: 'center',
    fontWeight: '600',
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 14, // Reduced font size
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    fontSize: 14, // Reduced font size
  },
  signUpButton: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  signUpButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginLink: {
    alignItems: 'center',
  },
  loginText: {
    fontSize: 14, // Reduced font size
    fontWeight: '600',
  },
});