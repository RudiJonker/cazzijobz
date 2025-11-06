import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { lightTheme } from '../../../../styles/theme';

export default function ProfileImageField({ imageUrl, onImageChange }) {

  const pickImage = async () => {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;

    let result = await ImagePicker.launchImageLibraryAsync({
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  allowsEditing: false, // No cropping
  aspect: [1, 1],
  quality: 0.7,
});

    if (!result.canceled && result.assets && result.assets.length > 0) {
      onImageChange(result.assets[0].uri);
    }
  } catch (error) {
    console.error('Image picker error:', error);
  }
};

  return (
    <View style={{ alignItems: 'center', marginBottom: 20 }}>
      <TouchableOpacity onPress={pickImage} activeOpacity={0.7}>
        <View style={{
          width: 120,
          height: 120,
          borderRadius: 60,
          backgroundColor: lightTheme.colors.card,
          justifyContent: 'center',
          alignItems: 'center',
          borderWidth: 3,
          borderColor: imageUrl ? lightTheme.colors.primary : lightTheme.colors.border,
          overflow: 'hidden',
        }}>
          {imageUrl ? (
            <Image 
              source={{ uri: imageUrl }} 
              style={{ width: '100%', height: '100%', borderRadius: 58 }}
              resizeMode="cover"
            />
          ) : (
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: lightTheme.colors.primary, fontSize: 32 }}>
                👤
              </Text>
              <Text style={{ color: lightTheme.colors.placeholder, fontSize: 12 }}>
                Add Photo
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
      
      <TouchableOpacity onPress={pickImage} style={{ marginTop: 8 }}>
        <Text style={{ color: lightTheme.colors.primary, fontSize: 14, fontWeight: '600' }}>
          {imageUrl ? 'Change Photo' : 'Add Photo'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}