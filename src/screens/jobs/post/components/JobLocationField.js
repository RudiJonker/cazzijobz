// src/screens/jobs/post/components/JobLocationField.js
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput,
  TouchableOpacity, 
  Alert, 
  ActivityIndicator 
} from 'react-native';
import { COLORS, SIZES } from '../../../../styles/theme';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

export default function JobLocationField({ city, suburb, onChange, errors }) {
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  const getCurrentLocation = async () => {
    try {
      setIsLoadingLocation(true);
      
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'Please enable location permissions to use your current location. You can enable it in your device settings.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Get current position
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      console.log('📍 GPS Coordinates:', location.coords);

      // Reverse geocode to get address
      const [address] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      console.log('📍 Reverse Geocode Result:', address);

      if (address) {
        // Auto-fill city and suburb
        const detectedCity = address.city || address.region || 'Unknown City';
        const detectedSuburb = address.district || address.subregion || address.city || 'Unknown Area';
        
        onChange('location_city', detectedCity);
        onChange('location_suburb', detectedSuburb);
        
        Alert.alert(
          'Location Detected',
          `We've set your location to: ${detectedSuburb}, ${detectedCity}`,
          [{ text: 'Great!' }]
        );
      } else {
        Alert.alert(
          'Location Error',
          'Could not determine your address from GPS coordinates. Please enter your location manually.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('📍 Location error:', error);
      Alert.alert(
        'Location Error',
        'Failed to get your current location. Please check your GPS and try again, or enter your location manually.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoadingLocation(false);
    }
  };

  return (
    <View style={{ marginBottom: SIZES.margin }}>
      <Text style={styles.fieldLabel}>Where is the job? *</Text>

      {/* Location Detection Button */}
      <View style={{ marginBottom: SIZES.margin }}>
        <TouchableOpacity 
          onPress={getCurrentLocation}
          disabled={isLoadingLocation}
          style={[
            styles.locationButton,
            isLoadingLocation && styles.locationButtonDisabled
          ]}
        >
          {isLoadingLocation ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Ionicons name="location" size={20} color={COLORS.primary} />
          )}
          <Text style={styles.locationButtonText}>
            {isLoadingLocation ? 'Detecting Location...' : 'Use My Current Location'}
          </Text>
        </TouchableOpacity>
        
        <Text style={styles.locationHelpText}>
          Tap to automatically insert your location
        </Text>
      </View>

      {/* City Input */}
      <View style={{ marginBottom: SIZES.margin }}>
        <Text style={styles.subLabel}>City *</Text>
        <View style={styles.inputContainer}>
          <Ionicons name="business" size={20} color={COLORS.gray500} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            value={city}
            onChangeText={(value) => onChange('location_city', value)}
            placeholder="e.g., Johannesburg, Cape Town, Durban"
            placeholderTextColor={COLORS.gray500}
          />
        </View>
        {errors.location_city ? (
          <Text style={styles.errorText}>{errors.location_city}</Text>
        ) : null}
        <Text style={styles.charCount}>
          {city?.length || 0}/50
        </Text>
      </View>

      {/* Suburb Input */}
      <View>
        <Text style={styles.subLabel}>Suburb/Area *</Text>
        <View style={styles.inputContainer}>
          <Ionicons name="location" size={20} color={COLORS.gray500} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            value={suburb}
            onChangeText={(value) => onChange('location_suburb', value)}
            placeholder="e.g., Sandton, Rondebosch, Umhlanga"
            placeholderTextColor={COLORS.gray500}
          />
        </View>
        {errors.location_suburb ? (
          <Text style={styles.errorText}>{errors.location_suburb}</Text>
        ) : null}
        <Text style={styles.charCount}>
          {suburb?.length || 0}/50
        </Text>
      </View>
    </View>
  );
}

const styles = {
  fieldLabel: {
    fontSize: SIZES.small,
    fontWeight: '600',
    color: COLORS.gray700,
    marginBottom: 12,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '10',
    padding: SIZES.padding,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
    marginBottom: 8,
  },
  locationButtonDisabled: {
    opacity: 0.6,
  },
  locationButtonText: {
    color: COLORS.primary,
    fontSize: SIZES.small,
    marginLeft: 8,
    fontWeight: '500',
  },
  locationHelpText: {
    color: COLORS.gray500,
    fontSize: SIZES.small,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  subLabel: {
    fontSize: SIZES.small,
    fontWeight: '500',
    color: COLORS.gray700,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.gray300,
    borderRadius: SIZES.radius,
    backgroundColor: COLORS.white,
  },
  inputIcon: {
    marginLeft: SIZES.padding,
  },
  input: {
    flex: 1,
    padding: SIZES.padding,
    fontSize: SIZES.small,
    color: COLORS.gray800,
  },
  errorText: {
    color: COLORS.error,
    fontSize: SIZES.small,
    marginTop: 4,
  },
  charCount: {
    color: COLORS.gray500,
    fontSize: SIZES.small,
    marginTop: 4,
    textAlign: 'right',
  },
};