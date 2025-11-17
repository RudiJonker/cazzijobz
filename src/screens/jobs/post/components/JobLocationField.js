// src/screens/jobs/post/components/JobLocationField.js - VERTICAL LAYOUT
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import * as Location from 'expo-location';
import { COLORS, SIZES } from '../../../../styles/theme';
import { Button } from '../../../../components/common/Button';

export default function JobLocationField({ city, suburb, onChange, showSuccessPopup = false }) {
  const [loadingLocation, setLoadingLocation] = useState(false);

  const getCurrentLocation = async () => {
    setLoadingLocation(true);
    
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to use this feature.');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      console.log('📍 GPS Coordinates:', location.coords);
      
      const reverseGeocode = await Location.reverseGeocodeAsync(location.coords);
      console.log('📍 Reverse Geocode Result:', reverseGeocode[0]);
      
      if (reverseGeocode[0]) {
        const { city: locationCity, district, subregion } = reverseGeocode[0];
        
        onChange('location_city', locationCity || subregion || '');
        onChange('location_suburb', district || '');
        
        // Only show popup if explicitly enabled
        if (showSuccessPopup) {
          Alert.alert('Success', 'Great! We\'ve set your location based on your current position.');
        }
      }
    } catch (error) {
      console.error('Location error:', error);
      Alert.alert('Error', 'Could not get your location. Please try again or enter manually.');
    } finally {
      setLoadingLocation(false);
    }
  };

  return (
    <View style={{ marginBottom: SIZES.margin }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text style={styles.fieldLabel}>Location</Text>
        <Button
          title={loadingLocation ? "Getting Location..." : "Use My Location"}
          onPress={getCurrentLocation}
          style={styles.locationButton}
          textStyle={styles.locationButtonText}
          loading={loadingLocation}
        />
      </View>

      {/* VERTICAL LAYOUT - City above Suburb */}
      <View style={styles.verticalLayout}>
        {/* City Field - Full Width */}
        <View style={styles.fullWidthField}>
          <Text style={styles.subLabel}>City</Text>
          <TextInput
            style={styles.input}
            value={city}
            onChangeText={(value) => onChange('location_city', value)}
            placeholder="e.g., Johannesburg, Cape Town, Durban"
            placeholderTextColor={COLORS.gray500}
          />
        </View>

        {/* Suburb Field - Full Width */}
        <View style={styles.fullWidthField}>
          <Text style={styles.subLabel}>Suburb</Text>
          <TextInput
            style={styles.input}
            value={suburb}
            onChangeText={(value) => onChange('location_suburb', value)}
            placeholder="e.g., Sandton, Sea Point, Umhlanga"
            placeholderTextColor={COLORS.gray500}
          />
        </View>
      </View>
    </View>
  );
}

const styles = {
  fieldLabel: {
    fontSize: SIZES.small,
    fontWeight: '600',
    color: COLORS.gray700,
  },
  subLabel: {
    fontSize: SIZES.xSmall,
    fontWeight: '500',
    color: COLORS.gray600,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.gray300,
    borderRadius: SIZES.radius,
    padding: 12,
    fontSize: SIZES.small,
    backgroundColor: COLORS.white,
    color: COLORS.gray800,
  },
  // VERTICAL LAYOUT STYLES
  verticalLayout: {
    flexDirection: 'column',
  },
  fullWidthField: {
    width: '100%',
    marginBottom: 12, // Space between fields
  },
  locationButton: {
  backgroundColor: COLORS.primary, // Changed from COLORS.gray100
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: SIZES.radius,  
},
locationButtonText: {
  fontSize: SIZES.xSmall,
  color: COLORS.white, // Changed from COLORS.gray700
  fontWeight: '500',
},
};