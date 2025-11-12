// src/screens/jobs/post/components/JobCategoryField.js
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Modal, 
  FlatList
} from 'react-native';
import { COLORS, SIZES } from '../../../../styles/theme';
import { Ionicons } from '@expo/vector-icons';

const CATEGORIES = [
  { id: 'general', name: 'General Work', icon: 'build' },
  { id: 'gardening', name: 'Gardening', icon: 'leaf' },
  { id: 'washing', name: 'Washing', icon: 'water' },
  { id: 'cleaning', name: 'Cleaning', icon: 'sparkles' },
  { id: 'domestic', name: 'Domestic', icon: 'home' },
  { id: 'painting', name: 'Painting', icon: 'brush' },
  { id: 'cabling', name: 'Cabling', icon: 'flash' },
  { id: 'construction', name: 'Construction', icon: 'hammer' },
  { id: 'tiling', name: 'Tiling', icon: 'square' },
  { id: 'heavy-lifting', name: 'Heavy Lifting', icon: 'barbell' },
  { id: 'other', name: 'Other', icon: 'ellipsis-horizontal' },
];

export default function JobCategoryField({ value, onChange, error }) {
  const [modalVisible, setModalVisible] = useState(false);

  const handleSelect = (category) => {
    onChange(category.name);
    setModalVisible(false);
  };

  const selectedCategory = CATEGORIES.find(cat => cat.name === value);

  return (
    <View style={{ marginBottom: SIZES.margin }}>
      <Text style={styles.fieldLabel}>What type of work do you need? *</Text>
      
      {/* Category Display */}
      <TouchableOpacity 
        onPress={() => setModalVisible(true)}
        style={styles.categoryButton}
      >
        {selectedCategory ? (
          <View style={styles.selectedCategory}>
            <Ionicons 
              name={selectedCategory.icon} 
              size={20} 
              color={COLORS.primary} 
            />
            <Text style={styles.selectedCategoryText}>
              {selectedCategory.name}
            </Text>
          </View>
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>
              Select a category
            </Text>
          </View>
        )}
        <Ionicons name="chevron-down" size={20} color={COLORS.gray500} />
      </TouchableOpacity>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : null}

      {/* Category Modal - No Search Bar */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Category</Text>
              <TouchableOpacity 
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={COLORS.gray500} />
              </TouchableOpacity>
            </View>

            {/* Categories List - No Search, Just the List */}
            <FlatList
              data={CATEGORIES}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.categoryItem,
                    value === item.name && styles.selectedItem
                  ]}
                  onPress={() => handleSelect(item)}
                >
                  <View style={styles.categoryIcon}>
                    <Ionicons 
                      name={item.icon} 
                      size={20} 
                      color={value === item.name ? COLORS.primary : COLORS.gray600} 
                    />
                  </View>
                  <Text style={[
                    styles.categoryName,
                    value === item.name && styles.selectedCategoryName
                  ]}>
                    {item.name}
                  </Text>
                  {value === item.name && (
                    <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              )}
              style={styles.categoryList}
              showsVerticalScrollIndicator={false}
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
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.gray300,
    borderRadius: SIZES.radius,
    padding: 12,
    backgroundColor: COLORS.white,
  },
  selectedCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectedCategoryText: {
    fontSize: SIZES.small,
    color: COLORS.gray800,
    marginLeft: 8,
    fontWeight: '500',
  },
  placeholder: {
    flex: 1,
  },
  placeholderText: {
    fontSize: SIZES.small,
    color: COLORS.gray500,
  },
  errorText: {
    color: COLORS.error,
    fontSize: SIZES.small,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.padding,
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius * 2,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZES.padding * 1.2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  modalTitle: {
    fontSize: SIZES.large,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  closeButton: {
    padding: 4,
  },
  categoryList: {
    maxHeight: 400,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SIZES.padding * 1.2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  selectedItem: {
    backgroundColor: COLORS.primary + '10',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  categoryIcon: {
    width: 24,
    alignItems: 'center',
  },
  categoryName: {
    flex: 1,
    fontSize: SIZES.medium,
    color: COLORS.gray700,
    marginLeft: 12,
  },
  selectedCategoryName: {
    color: COLORS.primary,
    fontWeight: '600',
  },
};