// src/screens/jobs/post/components/JobCategoryField.js - SAFE VERSION
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { COLORS, SIZES } from '../../../../styles/theme';
import { Button } from '../../../../components/common/Button';

const JOB_CATEGORIES = [
  'General Work', 'Gardening', 'Washing', 'Cleaning', 'Domestic',
  'Painting', 'Cabling', 'Construction', 'Tiling', 'Heavy Lifting', 'Other'
];

const CATEGORY_ICONS = {
  'General Work': '🔧',
  'Gardening': '🌿',
  'Washing': '🧼',
  'Cleaning': '✨',
  'Domestic': '🏠',
  'Painting': '🎨',
  'Cabling': '🔌',
  'Construction': '🏗️',
  'Tiling': '🧱',
  'Heavy Lifting': '💪',
  'Other': '❓'
};

export default function JobCategoryField({ value, onChange }) {
  const [showModal, setShowModal] = useState(false);
  
  // Safe default value
  const safeValue = value || '';

  const selectCategory = (category) => {
    onChange(category);
    setShowModal(false);
  };

  return (
    <View style={{ marginBottom: SIZES.margin }}>
      <Text style={styles.fieldLabel}>Job Category</Text>
      <TouchableOpacity style={styles.pickerButton} onPress={() => setShowModal(true)}>
        <Text style={styles.pickerText}>
          {safeValue ? `${CATEGORY_ICONS[safeValue] || '📁'} ${safeValue}` : 'Select a category'}
        </Text>
      </TouchableOpacity>

      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Job Category</Text>
            <ScrollView style={styles.categoriesList}>
              {JOB_CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryItem,
                    safeValue === category && styles.selectedCategory
                  ]}
                  onPress={() => selectCategory(category)}
                >
                  <Text style={styles.categoryIcon}>{CATEGORY_ICONS[category]}</Text>
                  <Text style={[
                    styles.categoryText,
                    safeValue === category && styles.selectedCategoryText
                  ]}>
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Button
              title="Close"
              onPress={() => setShowModal(false)}
              style={styles.closeButton}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = {
  fieldLabel: {
    fontSize: SIZES.small,
    fontWeight: '600',
    color: COLORS.gray700,
    marginBottom: 6,
  },
  pickerButton: {
    borderWidth: 1,
    borderColor: COLORS.gray300,
    borderRadius: SIZES.radius,
    padding: 12,
    backgroundColor: COLORS.white,
  },
  pickerText: {
    fontSize: SIZES.small,
    color: COLORS.gray800,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.padding,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius * 2,
    padding: SIZES.padding,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: SIZES.large,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: SIZES.margin,
    textAlign: 'center',
  },
  categoriesList: {
    maxHeight: 300,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  selectedCategory: {
    backgroundColor: COLORS.primary + '20',
  },
  categoryIcon: {
    fontSize: SIZES.medium,
    marginRight: 12,
  },
  categoryText: {
    fontSize: SIZES.small,
    color: COLORS.gray800,
  },
  selectedCategoryText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  closeButton: {
    marginTop: SIZES.margin,
  },
};