import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { lightTheme } from '../../styles/theme';

export default function WelcomeScreen({ navigation }) {
  return (
    <View style={[styles.container, { backgroundColor: lightTheme.colors.background }]}>
      <View style={styles.headerSpacer} />
      
      <View style={styles.logoContainer}>
        <Image 
          source={require('../../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
      
      <Text style={[styles.title, { color: lightTheme.colors.primary }]}>
        Welcome to cazzijobz
      </Text>
      <Text style={[styles.subtitle, { color: lightTheme.colors.text }]}>
        Short term, community driven casual jobs at your fingertips!
      </Text>
      
      <Text style={[styles.chooseText, { color: lightTheme.colors.primary }]}>
        Choose how you'll use the app
      </Text>
      
      <View style={styles.roleContainer}>
        <TouchableOpacity 
          style={[styles.roleCard, { 
            backgroundColor: lightTheme.colors.card,
            borderColor: lightTheme.colors.cardBorder 
          }]}
          onPress={() => navigation.navigate('Terms', { role: 'worker' })}
        >
          <Text style={styles.roleIcon}>👷</Text>
          <Text style={[styles.roleTitle, { color: lightTheme.colors.text }]}>
            Worker
          </Text>
          <Text style={[styles.roleDescription, { color: lightTheme.colors.text }]}>
            Find casual jobs
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.roleCard, { 
            backgroundColor: lightTheme.colors.card,
            borderColor: lightTheme.colors.cardBorder 
          }]}
          onPress={() => navigation.navigate('Terms', { role: 'employer' })}
        >
          <Text style={styles.roleIcon}>💼</Text>
          <Text style={[styles.roleTitle, { color: lightTheme.colors.text }]}>
            Employer
          </Text>
          <Text style={[styles.roleDescription, { color: lightTheme.colors.text }]}>
            Post jobs
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
  },
  headerSpacer: {
    height: 40,
  },
  logoContainer: {
    marginBottom: 20,
  },
  logo: {
    width: 120,
    height: 120,
  },
  title: {
    fontSize: 24, // Will use SIZES.xLarge later
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14, // Will use SIZES.small later
    marginBottom: 30,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  chooseText: {
    fontSize: 14, // Your requested change
    marginBottom: 40, // Your requested change
    fontWeight: '600',
  },
  roleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 15,
  },
  roleCard: {
    flex: 1,
    padding: 15,
    borderRadius: 10, // Will use SIZES.radius later
    alignItems: 'center',
    borderWidth: 1,
    minHeight: 120,
    justifyContent: 'center',
  },
  roleIcon: {
    fontSize: 24, // Will use SIZES.icon later
    marginBottom: 8,
  },
  roleTitle: {
    fontSize: 14, // Will use SIZES.small later
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  roleDescription: {
    fontSize: 11, // Will use SIZES.xSmall later
    textAlign: 'center',
    lineHeight: 14,
  },
});