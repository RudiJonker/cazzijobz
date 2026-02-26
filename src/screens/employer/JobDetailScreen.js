// src/screens/employer/JobDetailScreen.js
import React, { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  Alert,
  Modal
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../utils/supabaseClient';
import { storageService } from '../../utils/storageService';
import { COLORS, SIZES } from '../../styles/theme';
import { Button } from '../../components/common/Button';
import { formatLocalTime, formatDisplayDate } from '../../utils/timeUtils';

export default function JobDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { jobId } = route.params;
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [finalizing, setFinalizing] = useState(false);
  const [isJobReadyToFinalize, setIsJobReadyToFinalize] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    fetchJobDetails();
  }, [jobId]);

  useEffect(() => {
    if (job) {
      setIsJobReadyToFinalize(checkIfReadyToFinalize(job));
    }
  }, [job]);

  const checkIfReadyToFinalize = (jobData) => {
    if (jobData.status !== 'active') return false;
    const now = new Date();
    const jobDate = jobData.scheduled_date;
    const jobTimeTo = jobData.time_to;
    if (!jobDate || !jobTimeTo) return false;
    const [hours, minutes] = jobTimeTo.split(':').map(Number);
    const jobEndDateTime = new Date(jobDate);
    jobEndDateTime.setHours(hours, minutes, 0, 0);
    return now >= jobEndDateTime;
  };

  const fetchJobDetails = async () => {
    try {
      const localJobs = await storageService.getMyJobs();
      const localJob = localJobs?.find(j => j.id === jobId);

      if (localJob) {
        console.log('💾 Loading job from local storage');
        setJob(localJob);
        setLoading(false);

        const now = new Date();
        const lastRefresh = await storageService.getLastJobsRefresh();
        if (lastRefresh) {
          const timeSinceLastRefresh = (now - new Date(lastRefresh)) / 1000 / 60;
          if (timeSinceLastRefresh > 5) {
            setNeedsRefresh(true);
          }
        }
      }

      if (!localJob || needsRefresh) {
        console.log('📥 Fetching job details from Supabase');
        const { data, error } = await supabase
          .from('jobs')
          .select('*')
          .eq('id', jobId)
          .single();

        if (error) throw error;

        if (data) {
          setJob(data);
          const updatedJobs = localJobs?.map(j => j.id === jobId ? data : j) || [data];
          await storageService.setMyJobs(updatedJobs);
          setNeedsRefresh(false);
        }
      }

    } catch (error) {
      console.error('❌ Error fetching job details:', error);
      if (!job) {
        Alert.alert('Error', 'Failed to load job details');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleManualRefresh = async () => {
    setLoading(true);
    await fetchJobDetails();
  };

  const handleEdit = () => {
    if (job.status === 'open') {
      navigation.navigate('EditJob', { jobId: job.id });
    } else {
      Alert.alert('Cannot Edit', 'This job can no longer be edited as it has already been filled.');
    }
  };

  const canCancelJob = () => {
    return job.status === 'open' ||
      (job.status === 'hired' && !job.worker_confirmed);
  };

  const handleCancelJob = () => {
    if (!canCancelJob()) {
      Alert.alert(
        'Cannot Cancel',
        'This job cannot be cancelled once a worker has confirmed their hire.'
      );
      return;
    }

    const message = job.status === 'open'
      ? 'Are you sure you want to cancel this job? Any pending applications will be declined.'
      : 'Are you sure you want to cancel this job? The hired worker will be notified.';

    Alert.alert(
      'Cancel Job',
      message,
      [
        { text: 'Keep Job', style: 'cancel' },
        {
          text: 'Cancel Job',
          style: 'destructive',
          onPress: () => processCancelJob()
        }
      ]
    );
  };

  const processCancelJob = async () => {
    setCancelling(true);

    try {
      const { error: jobError } = await supabase
        .from('jobs')
        .update({ status: 'cancelled' })
        .eq('id', job.id);

      if (jobError) throw jobError;

      // Decline all open/hired applications for this job
      const { error: appsError } = await supabase
        .from('applications')
        .update({
          status: 'declined',
          auto_declined_reason: 'Job was cancelled by employer'
        })
        .eq('job_id', job.id)
        .in('status', ['applied', 'hired']);

      if (appsError) {
        console.error('⚠️ Error declining applications:', appsError);
      }

      // Update local storage
      const localJobs = await storageService.getMyJobs();
      if (localJobs) {
        const updatedJobs = localJobs.map(j =>
          j.id === job.id ? { ...j, status: 'cancelled' } : j
        );
        await storageService.setMyJobs(updatedJobs);
      }

      setJob(prev => ({ ...prev, status: 'cancelled' }));

      Alert.alert(
        'Job Cancelled',
        'This job has been cancelled and all applications have been declined.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );

    } catch (error) {
      console.error('Error cancelling job:', error);
      Alert.alert('Error', 'Failed to cancel job. Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  const handleFinalizePress = () => {
    setSelectedRating(0);
    setShowRatingModal(true);
  };

  const handleConfirmFinalize = async () => {
    if (selectedRating === 0) {
      Alert.alert('Rating Required', 'Please select a star rating before finalizing.');
      return;
    }

    setFinalizing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error: ratingError } = await supabase
        .from('ratings')
        .insert([{
          job_id: job.id,
          employer_id: user.id,
          worker_id: job.worker_id,
          rating: selectedRating
        }]);

      if (ratingError) throw ratingError;

      const { error: jobError } = await supabase
        .from('jobs')
        .update({ status: 'completed' })
        .eq('id', job.id);

      if (jobError) throw jobError;

      const localJobs = await storageService.getMyJobs();
      const updatedJobs = localJobs?.map(j =>
        j.id === job.id ? { ...j, status: 'completed' } : j
      ) || [];
      await storageService.setMyJobs(updatedJobs);

      setJob(prev => ({ ...prev, status: 'completed' }));

      Alert.alert(
        'Job Finalized! ✅',
        `Thank you for rating this worker ${selectedRating} star${selectedRating !== 1 ? 's' : ''}.\n\nThis job has been marked as completed.`,
        [{ text: 'OK' }]
      );

    } catch (error) {
      console.error('Error finalizing job:', error);
      Alert.alert('Error', 'Failed to finalize job. Please try again.');
    } finally {
      setFinalizing(false);
      setShowRatingModal(false);
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

  const StarRating = ({ rating, onSelect }) => (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => onSelect(star)}
          style={styles.starButton}
        >
          <Ionicons
            name={star <= rating ? 'star' : 'star-outline'}
            size={40}
            color={star <= rating ? '#f59e0b' : COLORS.gray400}
          />
        </TouchableOpacity>
      ))}
    </View>
  );

  const getRatingLabel = (rating) => {
    const labels = {
      1: 'Poor',
      2: 'Below Average',
      3: 'Average',
      4: 'Good',
      5: 'Excellent'
    };
    return labels[rating] || '';
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
        <Button title="Go Back" onPress={() => navigation.goBack()} style={{ marginTop: SIZES.margin }} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* AdMob Banner Placeholder */}
        <View style={styles.stickyAdBanner}>
          <Text style={styles.adText}>AdMob Banner Placeholder</Text>
          <Text style={styles.adSubtext}>This ad stays visible while scrolling</Text>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Job Details</Text>

          <View style={styles.headerRight}>
            {needsRefresh && (
              <TouchableOpacity style={styles.refreshButton} onPress={handleManualRefresh}>
                <Ionicons name="refresh-outline" size={20} color={COLORS.primary} />
              </TouchableOpacity>
            )}
          </View>
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
                <Text style={[styles.statusText, { color: getStatusColor(job.status) }]}>
                  Status: {getStatusDisplay(job.status)}
                </Text>
              </View>

              {(job.status === 'open' && !job.worker_id) && (
                <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
                  <Ionicons name="pencil-outline" size={20} color={COLORS.primary} />
                </TouchableOpacity>
              )}
            </View>

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

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Budget:</Text>
              <Text style={styles.detailValue}>{job.budget_currency} {job.budget}</Text>
            </View>
          </View>

          {/* Cancel Job Card - shown for open or hired but unconfirmed jobs */}
          {canCancelJob() && (
            <View style={styles.cancelCard}>
              <Text style={styles.cancelTitle}>⚠️ Cancel this Job?</Text>
              <Text style={styles.cancelText}>
                {job.status === 'open'
                  ? 'If circumstances have changed, you can cancel this job. All pending applications will be declined.'
                  : 'The worker has not yet confirmed. You may still cancel this job if needed.'
                }
              </Text>
              <Button
                title={cancelling ? "Cancelling..." : "Cancel Job"}
                onPress={handleCancelJob}
                style={styles.cancelButton}
                disabled={cancelling}
              />
            </View>
          )}

          {/* Finalize Job Card - only shown when ready */}
          {isJobReadyToFinalize && (
            <View style={styles.finalizeCard}>
              <Text style={styles.finalizeTitle}>🎉 Job Complete!</Text>
              <Text style={styles.finalizeText}>
                The scheduled time for this job has passed. Please rate the worker to finalize this job.
              </Text>
              <Button
                title="Rate Worker & Finalize"
                onPress={handleFinalizePress}
                style={styles.finalizeButton}
              />
            </View>
          )}

          {/* Completed status card */}
          {job.status === 'completed' && (
            <View style={styles.completedCard}>
              <Text style={styles.completedTitle}>✅ Job Finalized</Text>
              <Text style={styles.completedText}>
                This job has been completed and the worker has been rated.
              </Text>
            </View>
          )}

          {/* Cancelled status card */}
          {job.status === 'cancelled' && (
            <View style={styles.cancelledCard}>
              <Text style={styles.cancelledTitle}>❌ Job Cancelled</Text>
              <Text style={styles.cancelledText}>
                This job has been cancelled and all applications have been declined.
              </Text>
            </View>
          )}

          {/* Expired Job Card - no applications received */}
{job.status === 'expired' && (
  <View style={styles.expiredCard}>
    <Text style={styles.expiredTitle}>⏰ Job Expired</Text>
    <Text style={styles.expiredText}>
      This job expired without receiving any confirmed applications.
      Would you like to repost it with a new date and time?
    </Text>
    <Button
      title="Repost Job"
      onPress={() => navigation.navigate('EditJob', {
        jobId: job.id,
        repost: true
      })}
      style={styles.repostButton}
    />
  </View>
)}

          {/* Info Card */}
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>About this Job</Text>
            <Text style={styles.infoText}>
              • This job is {job.status === 'open' ? 'open for applications' : getStatusDisplay(job.status).toLowerCase()}{'\n'}
              • You can edit this job while it's still open{'\n'}
              • Applicants will be shown in the main jobs list{'\n'}
              • Rate the worker once the job is complete{'\n'}
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footerSafeZone} />
      </View>

      {/* Rating Modal */}
      <Modal visible={showRatingModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Rate the Worker</Text>
            <Text style={styles.modalSubtitle}>
              How did the worker perform for job {job.job_reference}?
            </Text>

            <StarRating rating={selectedRating} onSelect={setSelectedRating} />

            {selectedRating > 0 && (
              <Text style={styles.ratingLabel}>
                {getRatingLabel(selectedRating)}
              </Text>
            )}

            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                onPress={() => setShowRatingModal(false)}
                variant="outline"
                style={[styles.modalButton, { flex: 1, marginRight: 8 }]}
                disabled={finalizing}
              />
              <Button
                title={finalizing ? "Finalizing..." : "Confirm & Finalize"}
                onPress={handleConfirmFinalize}
                style={[styles.modalButton, { flex: 1, marginLeft: 8 }]}
                disabled={finalizing || selectedRating === 0}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const getStatusColor = (status) => {
  const colors = {
    open: '#10b981',
    hired: '#f59e0b',
    active: '#3b82f6',
    completed: '#6366f1',
    cancelled: '#ef4444',
    expired: '#6b7280'
  };
  return colors[status] || '#6b7280';
};

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
    top: 10,
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZES.padding,
    paddingTop: 50,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
    marginTop: 35,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  backText: {
    fontSize: SIZES.small,
    color: COLORS.primary,
    fontWeight: '500',
    marginLeft: 4,
  },
  headerTitle: {
    fontSize: SIZES.large,
    fontWeight: 'bold',
    color: COLORS.primary,
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    zIndex: -1,
  },
  headerRight: {
    width: 80,
    alignItems: 'flex-end',
  },
  refreshButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 10,
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
  editButton: {
    padding: 8,
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
  cancelCard: {
    margin: SIZES.margin,
    padding: SIZES.padding,
    backgroundColor: '#fff1f2',
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  cancelTitle: {
    fontSize: SIZES.medium,
    fontWeight: 'bold',
    color: '#991b1b',
    marginBottom: 8,
  },
  cancelText: {
    fontSize: SIZES.small,
    color: '#7f1d1d',
    marginBottom: 12,
    lineHeight: 20,
  },
  cancelButton: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  cancelledCard: {
    margin: SIZES.margin,
    padding: SIZES.padding,
    backgroundColor: '#fee2e2',
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  cancelledTitle: {
    fontSize: SIZES.medium,
    fontWeight: 'bold',
    color: '#991b1b',
    marginBottom: 8,
  },
  cancelledText: {
    fontSize: SIZES.small,
    color: '#7f1d1d',
    lineHeight: 20,
  },
  finalizeCard: {
    margin: SIZES.margin,
    padding: SIZES.padding,
    backgroundColor: '#fef3c7',
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  finalizeTitle: {
    fontSize: SIZES.medium,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 8,
  },
  finalizeText: {
    fontSize: SIZES.small,
    color: '#78350f',
    marginBottom: 12,
    lineHeight: 20,
  },
  finalizeButton: {
    backgroundColor: '#f59e0b',
  },
  completedCard: {
    margin: SIZES.margin,
    padding: SIZES.padding,
    backgroundColor: '#d1fae5',
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  completedTitle: {
    fontSize: SIZES.medium,
    fontWeight: 'bold',
    color: '#065f46',
    marginBottom: 8,
  },
  completedText: {
    fontSize: SIZES.small,
    color: '#047857',
    lineHeight: 20,
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
  footerSafeZone: {
    height: 50,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
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
    padding: SIZES.padding * 1.5,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: SIZES.large,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: SIZES.small,
    color: COLORS.gray600,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  starButton: {
    padding: 8,
  },
  ratingLabel: {
    fontSize: SIZES.medium,
    fontWeight: 'bold',
    color: '#f59e0b',
    marginBottom: 24,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    width: '100%',
  },
  modalButton: {
    minHeight: 44,
  },

  expiredCard: {
  margin: SIZES.margin,
  padding: SIZES.padding,
  backgroundColor: '#f0f9ff',
  borderRadius: SIZES.radius,
  borderWidth: 1,
  borderColor: '#3b82f6',
},
expiredTitle: {
  fontSize: SIZES.medium,
  fontWeight: 'bold',
  color: '#1e40af',
  marginBottom: 8,
},
expiredText: {
  fontSize: SIZES.small,
  color: '#1e3a8a',
  marginBottom: 12,
  lineHeight: 20,
},
repostButton: {
  backgroundColor: '#3b82f6',
  borderColor: '#3b82f6',
},
};