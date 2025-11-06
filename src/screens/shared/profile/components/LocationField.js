import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, TextInput } from 'react-native';
import * as Location from 'expo-location';
import { lightTheme } from '../../../../styles/theme';

export default function LocationField({ value, onChange, label = "Location" }) {
  const [loading, setLoading] = useState(false);

  const getCurrentLocation = async () => {
    setLoading(true);
    
    try {
      // Request permissions
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Location access helps us find jobs in your area. You can still enter your city manually.');
        return;
      }

      // Get current location
      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      // Reverse geocode to get city
      let geocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (geocode.length > 0) {
        const { city, region } = geocode[0];
        if (city) {
          const locationText = city;
          onChange(locationText);
          Alert.alert('Location Found!', `We've set your location to ${city}`);
        } else {
          Alert.alert('Location Found', `We've set your location to ${region}. You can edit this if needed.`);
          onChange(region);
        }
      } else {
        Alert.alert('Location Not Found', 'Could not determine your city. Please enter it manually.');
      }
    } catch (error) {
      console.error('Location error:', error);
      Alert.alert('Location Error', 'Could not get your location. Please enter your city manually.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View>
      <View style={styles.header}>
        <Text style={[styles.label, { color: lightTheme.colors.text }]}>
          {label}
        </Text>
        <TouchableOpacity onPress={getCurrentLocation} disabled={loading}>
          <Text style={[styles.locationLink, { color: lightTheme.colors.primary }]}>
            {loading ? 'Detecting...' : '📍 Use My Location'}
          </Text>
        </TouchableOpacity>
      </View>
      
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={lightTheme.colors.primary} />
          <Text style={[styles.loadingText, { color: lightTheme.colors.text }]}>
            Detecting your location...
          </Text>
        </View>
      )}
      
      <TextInput
        style={[styles.input, { 
          backgroundColor: lightTheme.colors.card,
          borderColor: lightTheme.colors.border,
          color: lightTheme.colors.text 
        }]}
        value={value}
        onChangeText={onChange}
        placeholder="Enter your city"
        placeholderTextColor={lightTheme.colors.placeholder}
      />
      
      <Text style={[styles.helpText, { color: lightTheme.colors.placeholder }]}>
        This helps us show you relevant jobs in your area
      </Text>
    </View>
  );
}

const styles = {
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  locationLink: {
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 5,
  },
  helpText: {
    fontSize: 12,
    marginBottom: 20,
    fontStyle: 'italic',
  },
};