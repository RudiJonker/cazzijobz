// src/components/common/Button.js
import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { COLORS, SIZES } from '../../styles/theme';

export const Button = ({ 
  title, 
  onPress, 
  style, 
  loading = false,
  disabled = false 
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        {
          backgroundColor: disabled ? COLORS.gray400 : COLORS.primary,
          borderRadius: SIZES.radius,
          padding: SIZES.padding,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
        },
        style,
      ]}
    >
      {loading && (
        <ActivityIndicator 
          size="small" 
          color={COLORS.white} 
          style={{ marginRight: 8 }} 
        />
      )}
      <Text
        style={{
          color: COLORS.white,
          fontSize: SIZES.medium,
          fontWeight: '600',
        }}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
};