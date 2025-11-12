// src/screens/jobs/post/components/JobBudgetField.js
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { TextInput } from 'react-native';
import { COLORS, SIZES } from '../../../../styles/theme';
import { Ionicons } from '@expo/vector-icons';
import * as Localization from 'expo-localization';

export default function JobBudgetField({ value, onChange, error }) {
  const [currency, setCurrency] = useState({ symbol: 'R', code: 'ZAR' });

  useEffect(() => {
    const detectCurrency = () => {
      // Get currency from device locale settings (simpler approach)
      const locales = Localization.getLocales();
      
      if (locales.length > 0) {
        const primaryLocale = locales[0];
        if (primaryLocale.currencyCode) {
          return {
            symbol: primaryLocale.currencySymbol || primaryLocale.currencyCode,
            code: primaryLocale.currencyCode
          };
        }
      }

      // Default fallback
      return { symbol: 'R', code: 'ZAR' };
    };

    setCurrency(detectCurrency());
  }, []);

  const showCurrencyInfo = () => {
    Alert.alert(
      'Currency Information',
      'The currency displayed is based on your device Language and Region settings. To change it, update your phone\'s regional settings.',
      [
        { text: 'OK', style: 'default' }
      ]
    );
  };

  const formatBudget = (input) => {
    const cleaned = input.replace(/[^\d.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      return parts[0] + '.' + parts.slice(1).join('');
    }
    return cleaned;
  };

  const handleBudgetChange = (input) => {
    const formatted = formatBudget(input);
    onChange(formatted);
  };

  return (
    <View style={{ marginBottom: SIZES.margin }}>
      {/* Header with Info Icon */}
      <View style={styles.headerRow}>
        <Text style={styles.fieldLabel}>
          Budget *
        </Text>
        <TouchableOpacity onPress={showCurrencyInfo} style={styles.infoButton}>
          <Ionicons name="information-circle-outline" size={18} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Budget Input */}
      <View style={[
        styles.inputContainer,
        error ? styles.inputError : null
      ]}>
        <Text style={styles.currencySymbol}>
          {currency.symbol}
        </Text>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={handleBudgetChange}
          placeholder={`0.00`}
          placeholderTextColor={COLORS.gray500}
          keyboardType="decimal-pad"
        />
      </View>

      {/* Currency Info */}
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <Text style={styles.helpText}>
          Auto-detected: {currency.code} ({currency.symbol})
        </Text>
      )}
    </View>
  );
}

const styles = {
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: SIZES.small,
    fontWeight: '600',
    color: COLORS.gray700,
    flex: 1,
  },
  infoButton: {
    padding: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.gray300,
    borderRadius: SIZES.radius,
    backgroundColor: COLORS.white,
    paddingLeft: 12,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  currencySymbol: {
    fontSize: SIZES.small,
    fontWeight: '600',
    color: COLORS.primary,
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: SIZES.small,
    color: COLORS.gray800,
    paddingHorizontal: 12,
  },
  errorText: {
    color: COLORS.error,
    fontSize: SIZES.xSmall,
    marginTop: 4,
  },
  helpText: {
    color: COLORS.gray500,
    fontSize: SIZES.xSmall,
    marginTop: 4,
    fontStyle: 'italic',
  },
};