// src/screens/jobs/post/PostJobScreen.js
import React, { useState, useContext } from 'react';
import { 
  View, 
  ScrollView, 
  Text, 
  TextInput,
  TouchableOpacity, 
  Alert,
  Modal 
} from 'react-native';
import { Button } from '../../../components/common/Button';
import { COLORS, SIZES } from '../../../styles/theme';
import JobCategoryField from './components/JobCategoryField';
import JobLocationField from './components/JobLocationField';
import JobDateTimeField from './components/JobDateTimeField';
import JobBudgetField from './components/JobBudgetField';
import { supabase } from '../../../utils/supabaseClient';
import { useSupabase } from '../../../hooks/useSupabase'; // Use existing hook

export default function PostJobScreen() {
  const { user } = useSupabase(); // Get user from useSupabase hook
  const [formData, setFormData] = useState({
    category: '',
    description: '',
    location_city: '',
    location_suburb: '',
    scheduled_date: '',
    start_time: '',
    end_time: '',
    duration_hours: '',
    budget: '',
  });

  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Basic field update function
  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Time field update with auto-calculation
  const updateTimeField = (field, value) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Auto-calculate hours if both times are set
      if (newData.start_time && newData.end_time) {
        const start = new Date(`2000-01-01 ${newData.start_time}`);
        const end = new Date(`2000-01-01 ${newData.end_time}`);
        const diffMs = end - start;
        const hours = (diffMs / (1000 * 60 * 60)).toFixed(1);
        newData.duration_hours = hours > 0 ? hours : '';
      }
      
      return newData;
    });
  };

  // Simple validation
  const validateForm = () => {
    if (!formData.category) {
      Alert.alert('Missing Category', 'Please select a job category');
      return false;
    }
    if (!formData.description) {
      Alert.alert('Missing Description', 'Please describe the work needed');
      return false;
    }
    if (!formData.location_city || !formData.location_suburb) {
      Alert.alert('Missing Location', 'Please enter city and suburb');
      return false;
    }
    if (!formData.scheduled_date) {
      Alert.alert('Missing Date', 'Please select a date');
      return false;
    }
    if (!formData.start_time || !formData.end_time) {
      Alert.alert('Missing Time', 'Please select start and end times');
      return false;
    }
    if (!formData.budget) {
      Alert.alert('Missing Budget', 'Please enter a budget');
      return false;
    }
    return true;
  };

  const handlePreview = () => {
    if (validateForm()) {
      setShowConfirmation(true);
    }
  };

  // ✅ REAL SUPABASE INTEGRATION - NO MORE SIMULATION
  const handleFinalSubmit = async () => {
  if (isSubmitting) return;
  
  setIsSubmitting(true);
  
  try {
    // Get current user directly from Supabase auth
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('❌ User auth error:', userError);
      Alert.alert('Error', 'You must be logged in to post jobs');
      return;
    }

    console.log('👤 User ID:', user.id);

    const jobData = {
      employer_id: user.id,
      description: formData.description,
      category: formData.category,
      location_city: formData.location_city,
      location_suburb: formData.location_suburb,
      address_text: `${formData.location_suburb}, ${formData.location_city}`,
      scheduled_date: formData.scheduled_date,
      time_from: formData.start_time,
      time_to: formData.end_time,
      duration_hours: parseFloat(formData.duration_hours) || 0,
      budget: parseFloat(formData.budget) || 0,
      budget_currency: 'ZAR',
      status: 'open',
      applicant_count: 0,
    };

    console.log('📤 REAL API CALL - Posting to Supabase:', jobData);

    const { data, error } = await supabase
      .from('jobs')
      .insert([jobData])
      .select()
      .single();

    if (error) {
      console.error('❌ Supabase error:', error);
      throw error;
    }

    console.log('✅ REAL SUCCESS - Job saved to database. ID:', data.id, 'Reference:', data.job_reference);
    
    // Reset form
    setFormData({
      category: '',
      description: '',
      location_city: '',
      location_suburb: '',
      scheduled_date: '',
      start_time: '',
      end_time: '',
      duration_hours: '',
      budget: '',
    });
    
    setShowConfirmation(false);
    
    Alert.alert(
      'Success!', 
      `Job posted successfully!${data.job_reference ? `\nReference: ${data.job_reference}` : ''}`
    );
    
  } catch (error) {
    console.error('💥 REAL ERROR:', error);
    Alert.alert(
      'Posting Failed', 
      error.message || 'Could not post your job. Please check your connection and try again.'
    );
  } finally {
    setIsSubmitting(false);
  }
};

  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.white }}>
      <View style={{ padding: SIZES.padding, paddingBottom: 80 }}>
        {/* Compact Header */}
        <Text style={styles.screenTitle}>Post a Job</Text>
        <Text style={styles.requiredNote}>
          All fields marked with * are required
        </Text>

        {/* Category Field */}
        <JobCategoryField
          value={formData.category}
          onChange={(value) => updateField('category', value)}
          error={!formData.category ? 'Please select a category' : ''}
        />

        {/* Description */}
        <View style={{ marginBottom: SIZES.margin }}>
          <Text style={styles.fieldLabel}>Job Description *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.description}
            onChangeText={(value) => updateField('description', value)}
            placeholder="Describe the work needed, requirements, tools, etc."
            placeholderTextColor={COLORS.gray500}
            multiline
            numberOfLines={3}
            maxLength={500}
          />
          <Text style={styles.charCount}>
            {formData.description.length}/500
          </Text>
        </View>

        {/* Location Field */}
        <JobLocationField
          city={formData.location_city}
          suburb={formData.location_suburb}
          onChange={updateField}
          errors={{
            location_city: !formData.location_city ? 'Please enter city' : '',
            location_suburb: !formData.location_suburb ? 'Please enter suburb' : ''
          }}
        />

        {/* Date & Time Field */}
        <JobDateTimeField
          date={formData.scheduled_date}
          startTime={formData.start_time}
          endTime={formData.end_time}
          hours={formData.duration_hours}
          onChange={updateField}
          onTimeChange={updateTimeField}
          errors={{
            scheduled_date: !formData.scheduled_date ? 'Please select a date' : '',
            start_time: !formData.start_time ? 'Please select start time' : '',
            end_time: !formData.end_time ? 'Please select end time' : ''
          }}
        />

        {/* Budget Field */}
        <JobBudgetField
          value={formData.budget}
          onChange={(value) => updateField('budget', value)}
          error={!formData.budget ? 'Please enter a budget' : ''}
        />

        {/* Submit Button */}
        <Button
          title="Preview & Post Job"
          onPress={handlePreview}
          style={{ marginTop: SIZES.margin }}
          loading={isSubmitting}
        />

        {/* Simple Confirmation Modal */}
        <Modal visible={showConfirmation} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Confirm Job Details</Text>
              
              <View style={styles.previewSection}>
                <Text style={styles.previewText}>
                  <Text style={styles.previewLabel}>Category: </Text>
                  {formData.category}
                </Text>
                <Text style={styles.previewText}>
                  <Text style={styles.previewLabel}>Location: </Text>
                  {formData.location_suburb}, {formData.location_city}
                </Text>
                <Text style={styles.previewText}>
                  <Text style={styles.previewLabel}>Date: </Text>
                  {formData.scheduled_date}
                </Text>
                <Text style={styles.previewText}>
                  <Text style={styles.previewLabel}>Time: </Text>
                  {formData.start_time} - {formData.end_time}
                </Text>
                <Text style={styles.previewText}>
                  <Text style={styles.previewLabel}>Duration: </Text>
                  {formData.duration_hours ? `${formData.duration_hours} hours` : '-- hours'}
                </Text>
                <Text style={styles.previewText}>
                  <Text style={styles.previewLabel}>Budget: </Text>
                  R {formData.budget}
                </Text>
              </View>

              <View style={styles.buttonRow}>
                <Button
                  title="Go Back"
                  onPress={() => setShowConfirmation(false)}
                  style={[styles.button, { backgroundColor: COLORS.gray500 }]}
                />
                <Button
                  title={isSubmitting ? "Posting..." : "Post Job"}
                  onPress={handleFinalSubmit}
                  style={styles.button}
                  loading={isSubmitting}
                />
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </ScrollView>
  );
}

const styles = {
  screenTitle: {
    fontSize: SIZES.xLarge,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 8,
    textAlign: 'center',
    marginTop: 12,
  },
  requiredNote: {
    color: COLORS.gray500,
    fontSize: SIZES.xSmall,
    textAlign: 'center',
    marginBottom: SIZES.margin,
    fontStyle: 'italic',
  },
  fieldLabel: {
    fontSize: SIZES.small,
    fontWeight: '600',
    color: COLORS.gray700,
    marginBottom: 6,
  },
  subLabel: {
    fontSize: SIZES.xSmall,
    fontWeight: '500',
    color: COLORS.gray600,
    marginBottom: 4,
    marginTop: 8,
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
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  charCount: {
    color: COLORS.gray500,
    fontSize: SIZES.xSmall,
    marginTop: 4,
    textAlign: 'right',
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  timeColumn: {
    width: '48%',
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
    padding: SIZES.padding * 1.2,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: SIZES.large,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: SIZES.margin,
    textAlign: 'center',
  },
  previewSection: {
    backgroundColor: COLORS.gray100,
    padding: SIZES.padding,
    borderRadius: SIZES.radius,
    marginBottom: SIZES.margin,
  },
  previewText: {
    fontSize: SIZES.small,
    marginBottom: 6,
  },
  previewLabel: {
    fontWeight: '600',
    color: COLORS.gray700,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 0.48,
  },
};