// src/screens/jobs/post/PostJobScreen.js
import React, { useState } from 'react';
import {
  View,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Button } from '../../../components/common/Button';
import { COLORS, SIZES } from '../../../styles/theme';
import JobCategoryField from './components/JobCategoryField';
import JobLocationField from './components/JobLocationField';
import JobDateTimeField from './components/JobDateTimeField';
import JobBudgetField from './components/JobBudgetField';
import { supabase } from '../../../utils/supabaseClient';
import { storageService } from '../../../utils/storageService';

export default function PostJobScreen() {
  const navigation = useNavigation();
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
    utc_offset: -new Date().getTimezoneOffset(), // Device UTC offset in minutes
  });

  const [currency, setCurrency] = useState({ symbol: 'R', code: 'ZAR' });
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateTimeField = (field, value) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };

      // Auto-calculate duration from UTC times
      if (newData.start_time && newData.end_time) {
        const start = new Date(`2000-01-01T${newData.start_time}:00Z`);
        const end = new Date(`2000-01-01T${newData.end_time}:00Z`);
        const diffMs = end - start;
        const hours = (diffMs / (1000 * 60 * 60)).toFixed(1);
        newData.duration_hours = hours > 0 ? hours : '';
      }

      return newData;
    });
  };

  const handleCurrencyChange = (detectedCurrency) => {
    console.log('💰 Currency detected:', detectedCurrency);
    setCurrency(detectedCurrency);
  };

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

  // Convert stored UTC time to local display time for preview
  const utcToLocalDisplay = (utcTimeStr) => {
    if (!utcTimeStr || !formData.scheduled_date) return utcTimeStr;
    try {
      const [hours, minutes] = utcTimeStr.split(':').map(Number);
      const utcDate = new Date(formData.scheduled_date);
      utcDate.setUTCHours(hours, minutes, 0, 0);
      const localHours = utcDate.getHours().toString().padStart(2, '0');
      const localMinutes = utcDate.getMinutes().toString().padStart(2, '0');
      const hour = parseInt(localHours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${localMinutes} ${ampm}`;
    } catch {
      return utcTimeStr;
    }
  };

  const handleFinalSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        Alert.alert('Error', 'You must be logged in to post jobs');
        return;
      }

      console.log('👤 User ID:', user.id);
      console.log('💰 Using currency:', currency);

      const jobData = {
        employer_id: user.id,
        description: formData.description,
        category: formData.category,
        location_city: formData.location_city,
        location_suburb: formData.location_suburb,
        address_text: `${formData.location_suburb}, ${formData.location_city}`,
        scheduled_date: formData.scheduled_date,
        time_from: formData.start_time,   // Stored as UTC
        time_to: formData.end_time,       // Stored as UTC
        utc_offset: formData.utc_offset,  // Device offset in minutes
        duration_hours: parseFloat(formData.duration_hours) || 0,
        budget: parseFloat(formData.budget) || 0,
        budget_currency: currency.code,
        status: 'open',
        applicant_count: 0,
      };

      console.log('📤 REAL API CALL - Posting to Supabase:', jobData);

      const { data, error } = await supabase
        .from('jobs')
        .insert([jobData])
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Job saved. ID:', data.id, 'Reference:', data.job_reference);
      console.log('💰 Currency saved:', data.budget_currency);

      // Save to local storage
      try {
        const existingJobs = await storageService.getMyJobs() || [];
        const updatedJobs = [data, ...existingJobs];
        await storageService.setMyJobs(updatedJobs);
        console.log('💾 Job saved to employer local storage - total jobs:', updatedJobs.length);
      } catch (storageError) {
        console.log('💾 Storage error (non-critical):', storageError.message);
      }

      // Refresh available jobs cache for workers
      try {
        console.log('🔄 Refreshing available jobs cache for workers...');
        const { data: availableJobs, error: availableError } = await supabase
          .from('jobs')
          .select('*')
          .eq('status', 'open')
          .order('created_at', { ascending: false });

        if (availableError) {
          console.log('⚠️ Could not refresh available jobs cache:', availableError.message);
        } else if (availableJobs) {
          await storageService.setAvailableJobs(availableJobs);
          console.log('💾 Available jobs saved to local storage:', availableJobs.length);
          console.log('💾 Available jobs cache updated:', availableJobs.length, 'jobs');
        }
      } catch (cacheError) {
        console.log('⚠️ Available jobs cache refresh failed (non-critical):', cacheError.message);
      }

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
        utc_offset: -new Date().getTimezoneOffset(),
      });

      setCurrency({ symbol: 'R', code: 'ZAR' });
      setShowConfirmation(false);

      navigation.navigate('My Jobs', {
        refresh: true,
        newJobReference: data.job_reference
      });

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
        <Text style={styles.screenTitle}>Post a Job</Text>
        <Text style={styles.requiredNote}>All fields are required</Text>

        <JobCategoryField
          value={formData.category}
          onChange={(value) => updateField('category', value)}
        />

        <View style={{ marginBottom: SIZES.margin }}>
          <Text style={styles.fieldLabel}>Job Description</Text>
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

        <JobLocationField
          city={formData.location_city}
          suburb={formData.location_suburb}
          onChange={updateField}
          showSuccessPopup={false}
        />

        <JobDateTimeField
          date={formData.scheduled_date}
          startTime={formData.start_time}
          endTime={formData.end_time}
          hours={formData.duration_hours}
          onChange={updateField}
          onTimeChange={updateTimeField}
        />

        <JobBudgetField
          value={formData.budget}
          onChange={(value) => updateField('budget', value)}
          onCurrencyChange={handleCurrencyChange}
        />

        <Button
          title="Preview & Post Job"
          onPress={handlePreview}
          style={{ marginTop: SIZES.margin }}
          loading={isSubmitting}
        />

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
                  {utcToLocalDisplay(formData.start_time)} - {utcToLocalDisplay(formData.end_time)}
                </Text>
                <Text style={styles.previewText}>
                  <Text style={styles.previewLabel}>Duration: </Text>
                  {formData.duration_hours ? `${formData.duration_hours} hours` : '-- hours'}
                </Text>
                <Text style={styles.previewText}>
                  <Text style={styles.previewLabel}>Budget: </Text>
                  {currency.symbol} {formData.budget} ({currency.code})
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