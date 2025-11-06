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

export default function LoginScreen({ navigation }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);

  // ✅ Fixed: Properly define updateFormData inside the component
  const updateFormData = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleLogin = async () => {
    // ✅ Debug: Check what's in formData
    console.log('🔍 Login attempt with:', formData);
    
    if (!formData.email || !formData.password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await authService.signIn(formData.email, formData.password);
      
      if (error) throw error;

      if (data.user) {
        // Check for pending changes FIRST (even if no user profile exists)
        const pendingChanges = await storageService.getPendingChanges();
        const existingProfile = await storageService.getUserProfile();
        
        console.log('🔍 Login check:', {
          hasExistingProfile: !!existingProfile,
          hasPendingChanges: !!pendingChanges,
          existingUserId: existingProfile?.id,
          newUserId: data.user.id
        });

        // If we have pending changes, we need to handle them carefully
        if (pendingChanges) {
          console.log('🔄 Found pending changes during login');
          
          // Get fresh profile from Supabase
          const { data: profile, error: profileError } = await authService.getProfile(data.user.id);
          
          if (profileError) throw profileError;

          if (profile) {
            // Merge pending changes with fresh Supabase data
            const profileWithPendingChanges = { ...profile, ...pendingChanges };
            
            await storageService.setUserProfile(profileWithPendingChanges);
            await storageService.setAdminStatus(profileWithPendingChanges.is_admin || false);
            
            console.log('✅ Merged pending changes with Supabase data');
          }
        } else {
          // No pending changes - normal flow
          const { data: profile, error: profileError } = await authService.getProfile(data.user.id);
          
          if (profileError) throw profileError;

          if (profile) {
            await storageService.setUserProfile(profile);
            await storageService.setAdminStatus(profile.is_admin || false);
          }
        }

        // Navigate to main app
        navigation.navigate('Main');
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      
      if (error.message.includes('Invalid login credentials')) {
        Alert.alert('Error', 'Invalid email or password.');
      } else if (error.message.includes('Email not confirmed')) {
        Alert.alert('Error', 'Please confirm your email address before logging in.');
      } else {
        Alert.alert('Error', 'Failed to log in. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: lightTheme.colors.background }]}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.topSpacer} />
      
      <Text style={[styles.title, { color: lightTheme.colors.primary }]}>
        Log In
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
          autoComplete="email"
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
          placeholder="Enter your password"
          placeholderTextColor={lightTheme.colors.placeholder}
          value={formData.password}
          onChangeText={(text) => updateFormData('password', text)}
          secureTextEntry
          autoComplete="password"
        />

        <TouchableOpacity 
          style={[
            styles.loginButton, 
            { 
              backgroundColor: loading ? lightTheme.colors.border : lightTheme.colors.primary,
              opacity: loading ? 0.7 : 1
            }
          ]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.loginButtonText}>
            {loading ? 'Logging In...' : 'Log In'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.signupLink}
          onPress={() => navigation.navigate('Welcome')}
        >
          <Text style={[styles.signupText, { color: lightTheme.colors.primary }]}>
            Don't have an account? Sign Up
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
    height: 20,
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
  loginButton: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  signupLink: {
    alignItems: 'center',
  },
  signupText: {
    fontSize: 14,
    fontWeight: '600',
  },
});