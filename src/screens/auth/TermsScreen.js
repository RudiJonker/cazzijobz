import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { lightTheme } from '../../styles/theme';

export default function TermsScreen({ navigation, route }) {
  const { role } = route.params;
  const [accepted, setAccepted] = useState(false);

  return (
    <View style={[styles.container, { backgroundColor: lightTheme.colors.background }]}>
      <Text style={[styles.title, { color: lightTheme.colors.text }]}>
        Terms & Conditions
      </Text>
      
      <ScrollView style={styles.termsContainer}>
        <Text style={[styles.termsText, { color: lightTheme.colors.text }]}>
          By using cazzijobz, you agree to our terms and conditions:
          {"\n\n"}
          <Text style={styles.sectionTitle}>Acceptance of Terms</Text>
          {"\n"}
          • Provide accurate and truthful information in your profile
          {"\n"}
          • Maintain the confidentiality of your account credentials
          {"\n"}
          • Report any suspicious activity or security breaches
          {"\n"}
          • Treat all users with respect and professionalism
          {"\n\n"}
          <Text style={styles.sectionTitle}>Job Postings & Applications</Text>
          {"\n"}
          • Employers must provide accurate job descriptions and fair compensation
          {"\n"}
          • Workers must represent their skills and availability truthfully
          {"\n"}
          • Both parties are responsible for fulfilling agreed-upon commitments
          {"\n\n"}
          <Text style={styles.sectionTitle}>Platform Role & Responsibilities</Text>
          {"\n"}
          • Cazzijobs acts as a platform connector, not an employer
          {"\n"}
          • Payment terms are agreed upon between employer and worker
          {"\n"}
          • Cazzijobs is not responsible for payment disputes
          {"\n"}
          • Users should resolve conflicts directly whenever possible
          {"\n"}
          • Platform may mediate in cases of serious misconduct
        </Text>
      </ScrollView>

      <View style={styles.acceptContainer}>
        <TouchableOpacity 
          style={styles.checkbox}
          onPress={() => setAccepted(!accepted)}
        >
          <Text style={[styles.checkboxText, { color: lightTheme.colors.text }]}>
            {accepted ? '✓' : ''}
          </Text>
        </TouchableOpacity>
        <Text style={[styles.acceptText, { color: lightTheme.colors.text }]}>
          I accept the terms and conditions
        </Text>
      </View>

      <TouchableOpacity 
        style={[
          styles.continueButton, 
          { backgroundColor: accepted ? lightTheme.colors.primary : '#cccccc' }
        ]}
        disabled={!accepted}
        onPress={() => navigation.navigate('SignUp', { role })}
      >
        <Text style={styles.continueButtonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  termsContainer: {
    flex: 1,
    marginBottom: 20,
  },
  termsText: {
    fontSize: 14,
    lineHeight: 20,
  },
  sectionTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginTop: 10,
  },
  acceptContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#2196F3',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
  },
  checkboxText: {
    fontSize: 14,
    fontWeight: 'bold',
    lineHeight: 16,
  },
  acceptText: {
    fontSize: 16,
  },
  continueButton: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15, // Added margin to prevent overlap
  },
  continueButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});