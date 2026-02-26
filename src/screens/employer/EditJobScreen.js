import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Button } from '../../components/common/Button';
import { COLORS, SIZES } from '../../styles/theme';
import JobCategoryField from '../jobs/post/components/JobCategoryField';
import JobLocationField from '../jobs/post/components/JobLocationField';
import JobDateTimeField from '../jobs/post/components/JobDateTimeField';
import JobBudgetField from '../jobs/post/components/JobBudgetField';
import { supabase } from '../../utils/supabaseClient';
import { storageService } from '../../utils/storageService';
import { formatLocalTime } from '../../utils/timeUtils';

export default function EditJobScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { jobId, repost = false } = route.params;

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
  const [loading, setLoading] = useState(true);

  // Load job data for editing or reposting
  useEffect(() => {
    const loadJobData = async () => {
      try {
        const localJobs = await storageService.getMyJobs();
        const jobToEdit = localJobs?.find(job => job.id === jobId);

        if (jobToEdit) {
          populateForm(jobToEdit);
          setLoading(false);
        }

        const { data, error } = await supabase
          .from('jobs')
          .select('*')
          .eq('id', jobId)
          .single();

        if (error) throw error;

        if (data) {
          populateForm(data);
        }

      } catch (error) {
        console.error('❌ Error loading job:', error);
        Alert.alert('Error', 'Failed to load job details');
      } finally {
        setLoading(false);
      }
    };

    loadJobData();
  }, [jobId]);

  const populateForm = (job) => {
    setFormData({
      category: job.category || '',
      description: job.description || '',
      location_city: job.location_city || '',
      location_suburb: job.location_suburb || '',
      // Clear date and time when reposting - employer must pick new schedule
      scheduled_date: repost ? '' : (job.scheduled_date || ''),
      start_time: repost ? '' : (job.time_from || ''),
      end_time: repost ? '' : (job.time_to || ''),
      duration_hours: repost ? '' : (job.duration_hours?.toString() || ''),
      budget: job.budget?.toString() || '',
    });
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateTimeField = (field, value) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };

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
      Alert.alert('Missing Date', 'Please select a date for the new schedule');
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

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      if (repost) {
        await handleRepostJob();
      } else {
        await handleUpdateJob();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Create a brand new job from the expired job's details
  const handleRepostJob = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Generate new job reference
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const nums = '0123456789';
      const prefix = Array.from({ length: 2 }, () =>
        chars[Math.floor(Math.random() * chars.length)]
      ).join('');
      const suffix = Array.from({ length: 5 }, () =>
        nums[Math.floor(Math.random() * nums.length)]
      ).join('');
      const jobReference = `${prefix}${suffix}`;

      const jobData = {
        job_reference: jobReference,
        employer_id: user.id,
        category: formData.category,
        description: formData.description,
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

      console.log('📤 Reposting job as new listing:', jobData);

      const { data, error } = await supabase
        .from('jobs')
        .insert([jobData])
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Job reposted successfully:', data.job_reference);

      // Add new job to local storage
      const localJobs = await storageService.getMyJobs() || [];
      await storageService.setMyJobs([data, ...localJobs]);

      setShowConfirmation(false);
      Alert.alert(
        'Job Reposted! ✅',
        `Your job has been reposted as ${data.job_reference} and is now open for applications.`,
        [{ text: 'OK', onPress: () => navigation.navigate('Main', { screen: 'My Jobs' }) }]
      );

    } catch (error) {
      console.error('💥 Repost error:', error);
      Alert.alert('Repost Failed', error.message || 'Could not repost your job. Please try again.');
    }
  };

  const handleUpdateJob = async () => {
    try {
      const jobData = {
        category: formData.category,
        description: formData.description,
        location_city: formData.location_city,
        location_suburb: formData.location_suburb,
        address_text: `${formData.location_suburb}, ${formData.location_city}`,
        scheduled_date: formData.scheduled_date,
        time_from: formData.start_time,
        time_to: formData.end_time,
        duration_hours: parseFloat(formData.duration_hours) || 0,
        budget: parseFloat(formData.budget) || 0,
        budget_currency: 'ZAR',
        updated_at: new Date().toISOString(),
      };

      console.log('📤 Updating job in Supabase:', jobData);

      const { data, error } = await supabase
        .from('jobs')
        .update(jobData)
        .eq('id', jobId)
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Job updated successfully:', data.id);

      const localJobs = await storageService.getMyJobs();
      const updatedJobs = localJobs.map(job =>
        job.id === jobId ? { ...job, ...jobData } : job
      );
      await storageService.setMyJobs(updatedJobs);

      setShowConfirmation(false);
      Alert.alert('Success', 'Job updated successfully!');
      navigation.goBack();

    } catch (error) {
      console.error('💥 Job update error:', error);
      Alert.alert('Update Failed', error.message || 'Could not update your job. Please try again.');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>
          {repost ? 'Loading job for reposting...' : 'Loading job for editing...'}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.white }}>
      <View style={{ padding: SIZES.padding, paddingBottom: 80 }}>
        {/* Header */}
        <Text style={styles.screenTitle}>
          {repost ? 'Repost Job' : 'Edit Job'}
        </Text>
        <Text style={styles.requiredNote}>
          {repost
            ? 'All details have been carried over. Please select a new date and time.'
            : 'Update the job details below'
          }
        </Text>

        {/* Repost notice banner */}
        {repost && (
          <View style={styles.repostBanner}>
            <Text style={styles.repostBannerText}>
              📅 A new date and time is required to repost this job.
            </Text>
          </View>
        )}

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
        />

        <Button
          title={repost ? "Preview & Repost Job" : "Preview & Update Job"}
          onPress={handlePreview}
          style={{ marginTop: SIZES.margin }}
          loading={isSubmitting}
        />

        {/* Confirmation Modal */}
        <Modal visible={showConfirmation} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>
                {repost ? 'Confirm Repost' : 'Confirm Job Updates'}
              </Text>

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
  {formatLocalTime(formData.start_time, formData.scheduled_date, formData.utc_offset)} - {formatLocalTime(formData.end_time, formData.scheduled_date, formData.utc_offset)}
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

              {repost && (
                <Text style={styles.repostNote}>
                  This will create a new job listing. The expired job will remain in your history.
                </Text>
              )}

              <View style={styles.buttonRow}>
                <Button
                  title="Back"
                  onPress={() => setShowConfirmation(false)}
                  style={[styles.button, { backgroundColor: COLORS.gray500 }]}
                />
                <Button
                  title={isSubmitting ? 'Posting...' : repost ? 'Repost' : 'Update'}
                  onPress={handleSubmit}
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
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  repostBanner: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#3b82f6',
    borderRadius: SIZES.radius,
    padding: 12,
    marginBottom: SIZES.margin,
  },
  repostBannerText: {
    fontSize: SIZES.small,
    color: '#1e40af',
    textAlign: 'center',
  },
  repostNote: {
    fontSize: SIZES.xSmall,
    color: COLORS.gray500,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: SIZES.margin,
    lineHeight: 18,
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
  loadingText: {
    textAlign: 'center',
    color: COLORS.gray500,
    fontSize: SIZES.medium,
  },
};