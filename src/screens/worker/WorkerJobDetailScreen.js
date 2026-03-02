// src/screens/worker/WorkerJobDetailScreen.js - OPTIMIZED NO UNNECESSARY API CALLS
import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Text,
  Alert
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../utils/supabaseClient';
import { storageService } from '../../utils/storageService';
import { useSupabase } from '../../hooks/useSupabase';
import { COLORS, SIZES } from '../../styles/theme';
import { Button } from '../../components/common/Button';
import { formatLocalTime } from '../../utils/timeUtils';

export default function WorkerJobDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = useSupabase();
  const { jobId, job: passedJob } = route.params;
  const [job, setJob] = useState(passedJob || null);
  const [loading, setLoading] = useState(!passedJob);
  const [applying, setApplying] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState(null);

  useEffect(() => {
    fetchJobDetails();
    checkIfApplied();
  }, [jobId, user]);

  const fetchJobDetails = async () => {
    if (passedJob) {
      console.log('💾 Using job data passed from list - NO API CALL');
      setJob(passedJob);
      setLoading(false);
      return;
    }

    try {
      console.log('📥 TYPE A CALL - Fetching job details (no local data)');
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error) throw error;
      setJob(data);

    } catch (error) {
      console.error('❌ Error fetching job details:', error);
      Alert.alert('Error', 'Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  const checkIfApplied = async () => {
    if (!user) {
      console.log('🔍 No user available, skipping application check');
      return;
    }

    try {
      console.log('🔍 Checking if user has already applied to job:', jobId);

      const { data, error } = await supabase
        .from('applications')
        .select('status, applied_at')
        .eq('job_id', jobId)
        .eq('worker_id', user.id)
        .single();

      if (error && error.code === 'PGRST116') {
        console.log('✅ No existing application found - job is available');
        setHasApplied(false);
        setApplicationStatus(null);
        return;
      }

      if (error) {
        console.log('⚠️ Non-critical error checking application:', error.message);
        setHasApplied(false);
        setApplicationStatus(null);
        return;
      }

      if (data) {
        console.log('✅ User has already applied - status:', data.status);
        setHasApplied(true);
        setApplicationStatus(data.status);
      } else {
        setHasApplied(false);
        setApplicationStatus(null);
      }

    } catch (error) {
      console.log('⚠️ Exception in checkIfApplied (non-critical):', error.message);
      setHasApplied(false);
      setApplicationStatus(null);
    }
  };

  const handleApply = async () => {
    console.log('🎯 APPLY BUTTON PRESSED - Starting application process');

    if (applying) return;

    Alert.alert(
      'Apply for Job',
      `Are you sure you want to apply for "${job.job_reference} - ${job.category}"?\n\nDate: ${formatDate(job.scheduled_date)}\nTime: ${formatLocalTime(job.time_from, job.scheduled_date, job.utc_offset)} - ${formatLocalTime(job.time_to, job.scheduled_date, job.utc_offset)}\nLocation: ${job.location_suburb}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Yes, Apply', onPress: async () => { await submitApplication(); } }
      ]
    );
  };

  // Check for schedule conflicts with 30-minute grace period
  // Uses local minutes comparison since both jobs are stored in UTC
  const checkScheduleConflict = async (workerId, newJob) => {
    try {
      console.log('🔍 Checking schedule conflicts for worker:', workerId, 'on date:', newJob.scheduled_date);

      const { data: applications, error } = await supabase
        .from('applications')
        .select(`
          job_id,
          status,
          jobs (
            id,
            job_reference,
            scheduled_date,
            time_from,
            time_to,
            utc_offset
          )
        `)
        .eq('worker_id', workerId)
        .in('status', ['applied', 'hired'])
        .eq('jobs.scheduled_date', newJob.scheduled_date);

      if (error) {
        console.error('❌ Error checking conflicts:', error);
        Alert.alert('Error', 'Failed to check schedule conflicts. Please try again.');
        return true;
      }

      if (!applications || applications.length === 0) {
        console.log('✅ No active applications on this date');
        return false;
      }

      console.log('📅 Found', applications.length, 'active applications on this date');

      for (const application of applications) {
        const existingJob = application.jobs;
        if (!existingJob) continue;

        console.log('🔍 Checking conflict with job:', existingJob.job_reference);

        // Compare in UTC since both are stored as UTC
        const conflict = checkTimeOverlap(
          existingJob.time_from,
          existingJob.time_to,
          newJob.time_from,
          newJob.time_to
        );

        if (conflict) {
          console.log('❌ Schedule conflict detected!');
          Alert.alert(
            'Schedule Conflict',
            `You have another job scheduled at the same time:\n\n"${existingJob.job_reference}"\n${formatLocalTime(existingJob.time_from, existingJob.scheduled_date, existingJob.utc_offset)} - ${formatLocalTime(existingJob.time_to, existingJob.scheduled_date, existingJob.utc_offset)}\n\nPlease choose a different time or contact the employer.`,
            [{ text: 'OK' }]
          );
          return true;
        }
      }

      console.log('✅ No schedule conflicts found');
      return false;

    } catch (error) {
      console.error('❌ Exception in checkScheduleConflict:', error);
      Alert.alert('Error', 'Failed to check schedule. Please try again.');
      return true;
    }
  };

  // Check time overlap with 30-minute grace period
  // Both times are UTC so direct comparison is correct
  const checkTimeOverlap = (existingStart, existingEnd, newStart, newEnd) => {
    try {
      const toMinutes = (timeStr) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
      };

      const existingStartMin = toMinutes(existingStart);
      const existingEndMin = toMinutes(existingEnd);
      const newStartMin = toMinutes(newStart);
      const newEndMin = toMinutes(newEnd);

      const gracePeriod = 30;
      const effectiveExistingStart = existingStartMin - gracePeriod;
      const effectiveExistingEnd = existingEndMin + gracePeriod;

      console.log('⏰ Time check (UTC):', {
        existing: `${existingStart}-${existingEnd}`,
        effective: `${effectiveExistingStart}-${effectiveExistingEnd}`,
        new: `${newStart}-${newEnd}`
      });

      const overlaps = newStartMin < effectiveExistingEnd && newEndMin > effectiveExistingStart;
      console.log('⏰ Overlap result:', overlaps);
      return overlaps;

    } catch (error) {
      console.error('❌ Error in time overlap check:', error);
      return true;
    }
  };

  const submitApplication = async () => {
    setApplying(true);

    try {
      console.log('🔍 Step 1: Getting current user');

      let currentUser = user;
      console.log('👤 User from useSupabase hook:', currentUser);

      if (!currentUser) {
        console.log('🔄 No user from hook, trying direct auth...');
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

        if (authError) {
          console.error('❌ Auth error:', authError);
          Alert.alert('Auth Error', 'Please log in again.');
          return;
        }

        currentUser = authUser;
        console.log('👤 User from direct auth:', currentUser);
      }

      if (!currentUser) {
        console.log('❌ No user found at all');
        Alert.alert('Login Required', 'Please log in to apply for jobs.');
        return;
      }

      console.log('✅ User confirmed:', currentUser.id);

      if (!job) {
        Alert.alert('Error', 'Job information not loaded. Please try again.');
        return;
      }

      console.log('📋 Job confirmed:', job.id, job.job_reference);

      if (hasApplied) {
        Alert.alert('Already Applied', `You have already applied to this job. Status: ${applicationStatus}`);
        return;
      }

      if (job.status !== 'open') {
        Alert.alert('Job Not Available', 'This job is no longer accepting applications.');
        return;
      }

      const hasConflict = await checkScheduleConflict(currentUser.id, job);
      if (hasConflict) {
        console.log('❌ Schedule conflict detected - blocking application');
        return;
      }

      console.log('🚀 All checks passed, submitting application...');

      const applicationData = {
        job_id: jobId,
        worker_id: currentUser.id,
        status: 'applied',
        worker_notes: '',
        applied_at: new Date().toISOString()
      };

      console.log('📤 Application data:', applicationData);

      const { data, error } = await supabase
        .from('applications')
        .insert([applicationData])
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          console.log('✅ Duplicate application prevented');
          Alert.alert('Already Applied', 'You have already applied to this job.');
          setHasApplied(true);
          return;
        }

        console.log('⚠️ Application error:', error.message);
        Alert.alert('Application Failed', 'Failed to submit your application. Please try again.');
        return;
      }

      console.log('✅ Application submitted successfully! ID:', data.id);

      setHasApplied(true);
      setApplicationStatus('applied');

      console.log('🎉 Application process completed successfully');

      Alert.alert(
        'Application Submitted! 🎉',
        `You have successfully applied for "${job.job_reference} - ${job.category}".\n\nThe employer will review your profile and contact you if interested.`,
        [{
          text: 'OK',
          onPress: () => {
            console.log('📱 Navigating back to previous screen');
            navigation.goBack();
          }
        }]
      );

    } catch (error) {
      console.log('⚠️ Unexpected error in application process (non-critical):', error.message);
    } finally {
      console.log('🏁 Application process finished, setting applying to false');
      setApplying(false);
    }
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const getStatusDisplay = (status) => {
    const statusMap = {
      'open': 'Open',
      'hired': 'Filled',
      'active': 'In Progress',
      'completed': 'Completed',
      'cancelled': 'Cancelled',
      'expired': 'Expired'
    };
    return statusMap[status] || status;
  };

  const getApplicationStatusDisplay = (status) => {
    const statusMap = {
      'applied': 'Applied',
      'hired': 'Hired 🎉',
      'declined': 'Not Selected',
      'withdrawn': 'Withdrawn'
    };
    return statusMap[status] || status;
  };

  const getApplicationStatusColor = (status) => {
    const colors = {
      'applied': '#3b82f6',
      'hired': '#10b981',
      'declined': '#ef4444',
      'withdrawn': '#6b7280'
    };
    return colors[status] || '#6b7280';
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading job details...</Text>
      </View>
    );
  }

  if (!job) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Job not found</Text>
        <Button
          title="Go Back"
          onPress={() => navigation.goBack()}
          style={{ marginTop: SIZES.margin }}
        />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* STICKY AdMob Banner */}
        <View style={styles.stickyAdBanner}>
          <Text style={styles.adText}>AdMob Banner Placeholder</Text>
          <Text style={styles.adSubtext}>This ad stays visible while scrolling</Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
        >
          {/* Job Details Card */}
          <View style={styles.detailCard}>
            <View style={styles.cardHeader}>
              <View style={styles.headerLeft}>
                <Text style={styles.jobReference}>{job.job_reference}</Text>
                <Text style={[styles.statusText, { color: job.status === 'open' ? '#10b981' : '#6b7280' }]}>
                  Status: {getStatusDisplay(job.status)}
                </Text>
              </View>
              <Text style={styles.wageAmount}>{job.budget_currency} {job.budget}</Text>
            </View>

            {/* Application Status Banner */}
            {hasApplied && (
              <View style={[
                styles.applicationBanner,
                { backgroundColor: getApplicationStatusColor(applicationStatus) + '20' }
              ]}>
                <Text style={[
                  styles.applicationStatusText,
                  { color: getApplicationStatusColor(applicationStatus) }
                ]}>
                  Your Status: {getApplicationStatusDisplay(applicationStatus)}
                </Text>
              </View>
            )}

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Category:</Text>
              <Text style={styles.categoryValue}>{job.category}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Description:</Text>
              <Text style={styles.detailValue}>{job.description}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Location:</Text>
              <Text style={styles.detailValue}>{job.location_suburb}, {job.location_city}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Date:</Text>
              <Text style={styles.detailValue}>{formatDate(job.scheduled_date)}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Time:</Text>
              <Text style={styles.detailValue}>
                {formatLocalTime(job.time_from, job.scheduled_date, job.utc_offset)} - {formatLocalTime(job.time_to, job.scheduled_date, job.utc_offset)}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Duration:</Text>
              <Text style={styles.detailValue}>{job.duration_hours} hours</Text>
            </View>

            <View style={styles.buttonRow}>
              <Button
                title="Back"
                onPress={() => navigation.goBack()}
                variant="outline"
                style={styles.backButton}
              />
              <Button
                title={getApplyButtonText()}
                onPress={handleApply}
                style={styles.applyButton}
                disabled={getApplyButtonDisabled()}
              />
            </View>
          </View>

          {/* Additional Info */}
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>About this Job</Text>
            <Text style={styles.infoText}>
              • This job is {job.status === 'open' ? 'open for applications' : getStatusDisplay(job.status).toLowerCase()}{'\n'}
              {hasApplied
                ? `• Your application status: ${getApplicationStatusDisplay(applicationStatus)}\n`
                : '• You can apply if you\'re available on the scheduled date\n'
              }
              • The employer will review your profile{'\n'}
              • You\'ll be notified if you\'re hired{'\n'}
              {job.applicant_count > 0 && `• ${job.applicant_count} applicant${job.applicant_count !== 1 ? 's' : ''} so far\n`}
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footerSafeZone} />
      </View>
    </SafeAreaView>
  );

  function getApplyButtonText() {
    if (applying) return "Applying...";
    if (hasApplied) return getApplicationStatusDisplay(applicationStatus);
    if (job.status !== 'open') return "Job Filled";
    return "Apply";
  }

  function getApplyButtonDisabled() {
    return applying || hasApplied || job.status !== 'open';
  }
}

const styles = {
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  stickyAdBanner: {
    position: 'absolute',
    top: 15,
    left: 0,
    right: 0,
    backgroundColor: COLORS.gray200,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray300,
    zIndex: 1000,
  },
  adText: {
    color: COLORS.gray600,
    fontSize: SIZES.small,
    fontWeight: '600',
    marginBottom: 2,
  },
  adSubtext: {
    color: COLORS.gray500,
    fontSize: SIZES.xSmall,
    fontStyle: 'italic',
  },
  scrollView: {
    flex: 1,
    marginTop: 80,
  },
  scrollContent: {
    paddingBottom: 10,
  },
  footerSafeZone: {
    height: 50,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
  },
  detailCard: {
    margin: SIZES.margin,
    padding: SIZES.padding,
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: COLORS.gray300,
    shadowColor: COLORS.gray800,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  headerLeft: {
    flex: 1,
  },
  jobReference: {
    fontSize: SIZES.large,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  statusText: {
    fontSize: SIZES.small,
    fontWeight: '600',
  },
  applicationBanner: {
    padding: 12,
    borderRadius: SIZES.radius,
    marginBottom: 16,
    alignItems: 'center',
  },
  applicationStatusText: {
    fontSize: SIZES.small,
    fontWeight: '600',
  },
  wageAmount: {
    fontSize: SIZES.large,
    fontWeight: 'bold',
    color: '#059669',
    marginLeft: 8,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: SIZES.small,
    fontWeight: '600',
    color: COLORS.gray700,
    width: 100,
  },
  detailValue: {
    fontSize: SIZES.small,
    color: COLORS.gray800,
    flex: 1,
  },
  categoryValue: {
    fontSize: SIZES.small,
    color: COLORS.primary,
    fontWeight: 'bold',
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SIZES.margin,
    gap: 12,
  },
  backButton: {
    flex: 1,
  },
  applyButton: {
    flex: 1,
    backgroundColor: COLORS.success,
  },
  infoCard: {
    margin: SIZES.margin,
    padding: SIZES.padding,
    backgroundColor: COLORS.gray100,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: COLORS.gray300,
  },
  infoTitle: {
    fontSize: SIZES.medium,
    fontWeight: 'bold',
    color: COLORS.gray800,
    marginBottom: 8,
  },
  infoText: {
    fontSize: SIZES.small,
    color: COLORS.gray600,
    lineHeight: 20,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: SIZES.padding * 2,
    color: COLORS.gray500,
    fontSize: SIZES.medium,
  },
  errorText: {
    textAlign: 'center',
    marginTop: SIZES.padding * 2,
    color: COLORS.error,
    fontSize: SIZES.medium,
  },
};