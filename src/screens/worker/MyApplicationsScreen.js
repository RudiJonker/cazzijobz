// src/screens/worker/MyApplicationsScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../utils/supabaseClient';
import { storageService } from '../../utils/storageService';
import { COLORS, SIZES } from '../../styles/theme';
import { Button } from '../../components/common/Button';
import { applicationService } from '../../utils/applicationService';


export default function MyApplicationsScreen() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  const [applications, setApplications] = useState([]);
  const [filter, setFilter] = useState('all'); // all, applied, hired, declined, withdrawn
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [processingAction, setProcessingAction] = useState(null);

  // Load user on mount
  useEffect(() => {
    loadCurrentUser();
  }, []);

  // Simplified useEffect
  useEffect(() => {
    console.log('🔍 useEffect triggered - isFocused:', isFocused);
    
    if (isFocused) {
      console.log('🚀 Screen focused, fetching applications...');
      fetchApplications();
    }
  }, [isFocused]); // ONLY isFocused as dependency

  const loadCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser(user);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  // Updated fetchApplications to load job data
  const fetchApplications = async () => {
    console.log('🔄 fetchApplications STARTED');
    setLoading(true);
    
    try {
      // Get user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      
      // Fetch applications
      const { data: rawApplications, error } = await supabase
        .from('applications')
        .select('*')
        .eq('worker_id', user.id)
        .order('applied_at', { ascending: false });
      
      if (error) throw error;
      
      console.log('📋 Applications found:', rawApplications?.length || 0);
      
      if (!rawApplications || rawApplications.length === 0) {
        setApplications([]);
        setLoading(false);
        return;
      }
      
      // Load job data for each application
      const applicationsWithJobs = await loadJobDataForApplications(rawApplications);
      
      setApplications(applicationsWithJobs);
      
    } catch (error) {
      console.error('❌ Error:', error);
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  // Load job data for applications - FIXED: Updated query with correct relationship
  const loadJobDataForApplications = async (apps) => {
    console.log('🔄 Loading job data for', apps.length, 'applications');
    
    const result = [];
    
    for (const app of apps) {
      try {
        console.log(`🔍 Fetching job ${app.job_id}...`);
        
        // Updated query - corrected relationship
        const { data: job, error: jobError } = await supabase
  .from('worker_application_jobs')
  .select('*')
  .eq('id', app.job_id)
  .maybeSingle();
        
        if (jobError) {
          console.error(`❌ Job ${app.job_id} error:`, jobError);
          result.push({
            ...app,
            jobs: { 
              deleted: true,
              error: jobError.message 
            }
          });
        } else if (job) {
          console.log(`✅ Job ${app.job_id} found:`, {
            job_reference: job.job_reference,
            employer: job.employer_name || 'No employer data'
          });
          result.push({
            ...app,
            jobs: job
          });
        } else {
          console.log(`⚠️ Job ${app.job_id} not found in database`);
          result.push({
            ...app,
            jobs: { 
              deleted: true,
              error: 'Job no longer exists' 
            }
          });
        }
        
      } catch (error) {
        console.error(`💥 Exception loading job ${app.job_id}:`, error);
        result.push({
          ...app,
          jobs: { 
            deleted: true,
            error: error.message 
          }
        });
      }
    }
    
    console.log('✅ Job data loading complete');
    return result;
  };

  // Filter applications based on selected filter
  const filteredApplications = applications.filter(app => {
    if (filter === 'all') return true;
    return app.status === filter;
  });

  // Handle application actions
  const handleWithdraw = (application) => {
    if (application.status !== 'applied') {
      Alert.alert('Cannot Withdraw', 'You can only withdraw applications that are still pending.');
      return;
    }

    Alert.alert(
      'Withdraw Application',
      `Are you sure you want to withdraw your application for "${application.jobs?.job_reference}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Withdraw',
          style: 'destructive',
          onPress: () => withdrawApplication(application.id)
        }
      ]
    );
  };

  // Handle accept hire with schedule conflict checking
  const handleAcceptHire = async (application) => {
    if (application.status !== 'hired' || application.worker_confirmed) {
      Alert.alert('Not Available', 'This job is not available for confirmation.');
      return;
    }
    
    // First check for schedule conflicts
    const hasConflict = await checkScheduleConflict(application);
    
    if (hasConflict) {
      // Don't proceed - alert already shown in checkScheduleConflict
      return;
    }
    
    // Show confirmation modal
    setSelectedApplication(application);
    setShowConfirmModal(true);
  };

  const handleDeclineHire = (application) => {
    if (application.status !== 'hired') {
      Alert.alert('Not Hired', 'This job has not offered you a hire position.');
      return;
    }

    Alert.alert(
      'Decline Hire Offer',
      `Are you sure you want to decline the hire offer for "${application.jobs?.job_reference}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: () => declineHireOffer(application.id)
        }
      ]
    );
  };

  // Check for schedule conflicts before accepting hire
  const checkScheduleConflict = async (application) => {
  try {
    const job = application.jobs;
    if (!job) return false;
    
    console.log('🔍 Checking schedule conflicts for:', job.job_reference);
    
    // Get all CONFIRMED applications for this worker
    const { data: confirmedApps, error } = await supabase
      .from('applications')
      .select(`
        id,
        jobs:worker_application_jobs (
          id,
          scheduled_date,
          time_from,
          time_to,
          job_reference
        )
      `)
      .eq('worker_id', currentUser.id)
      .eq('worker_confirmed', true)
      .neq('id', application.id);
    
    if (error) {
      console.error('Error checking conflicts:', error);
      return false;
    }
    
    // Filter by same date in JavaScript
    const sameDateApps = confirmedApps?.filter(
      a => a.jobs?.scheduled_date === job.scheduled_date
    ) || [];

    if (sameDateApps.length === 0) {
      console.log('✅ No confirmed jobs on this date');
      return false;
    }
    
    // Check each confirmed job for time overlap
    for (const app of sameDateApps) {
      const existingJob = app.jobs;
      const conflict = checkTimeOverlap(
        existingJob.time_from,
        existingJob.time_to,
        job.time_from,
        job.time_to
      );
      
      if (conflict) {
        console.log('❌ Conflict with job:', existingJob.job_reference);
        
        Alert.alert(
          'Schedule Conflict ⚠️',
          `You already have a confirmed job at this time:\n\n` +
          `"${existingJob.job_reference}"\n` +
          `${formatTime(existingJob.time_from)} - ${formatTime(existingJob.time_to)}\n\n` +
          `Please decline one of the jobs before accepting another.`,
          [{ text: 'OK' }]
        );
        
        return true;
      }
    }
    
    console.log('✅ No schedule conflicts found');
    return false;
    
  } catch (error) {
    console.error('Error in schedule conflict check:', error);
    return false;
  }
};

  const checkTimeOverlap = (existingStart, existingEnd, newStart, newEnd) => {
    const toMinutes = (timeStr) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };
    
    const existingStartMin = toMinutes(existingStart);
    const existingEndMin = toMinutes(existingEnd);
    const newStartMin = toMinutes(newStart);
    const newEndMin = toMinutes(newEnd);
    
    // 30-minute grace period
    const gracePeriod = 30;
    const effectiveExistingStart = existingStartMin - gracePeriod;
    const effectiveExistingEnd = existingEndMin + gracePeriod;
    
    return newStartMin < effectiveExistingEnd && newEndMin > effectiveExistingStart;
  };

  const confirmHireAcceptance = async () => {
  if (!selectedApplication) return;

  setProcessingAction(selectedApplication.id);

  try {
    const job = selectedApplication.jobs;

    // Update application and job status in one RPC call
    const { error: updateError } = await supabase
      .rpc('confirm_job_hire', {
        p_application_id: selectedApplication.id,
        p_job_id: job.id,
        p_worker_id: currentUser.id
      });

    if (updateError) throw updateError;

    console.log('✅ Job confirmed and set to active');

    // AUTO-DECLINE conflicting hire offers
    await autoDeclineConflictingOffers(selectedApplication);

    Alert.alert(
      'Success! 🎉',
      `You have accepted the hire for "${job.job_reference}".\n\n` +
      `The employer has been notified and the job is now active.`,
      [{ text: 'OK' }]
    );

    fetchApplications();

  } catch (error) {
    console.error('Error confirming hire:', error);
    Alert.alert('Error', 'Failed to accept hire offer. Please try again.');
  } finally {
    setProcessingAction(null);
    setShowConfirmModal(false);
    setSelectedApplication(null);
  }
};

  const autoDeclineConflictingOffers = async (acceptedApplication) => {
    try {
      const acceptedJob = acceptedApplication.jobs;
      
      // Find all other hired (but not confirmed) applications for this worker
      const { data: otherOffers, error } = await supabase
        .from('applications')
        .select(`
          id,
          job_id,
          jobs!inner (
            scheduled_date,
            time_from,
            time_to,
            job_reference
          )
        `)
        .eq('worker_id', currentUser.id)
        .eq('status', 'hired')
        .eq('worker_confirmed', false)
        .neq('id', acceptedApplication.id);
      
      if (error) {
        console.error('Error finding other offers:', error);
        return;
      }
      
      if (!otherOffers || otherOffers.length === 0) {
        return;
      }
      
      // Check each offer for time conflict
      const conflictingOffers = [];
      for (const offer of otherOffers) {
        const otherJob = offer.jobs;
        const conflict = checkTimeOverlap(
          otherJob.time_from,
          otherJob.time_to,
          acceptedJob.time_from,
          acceptedJob.time_to
        );
        
        if (conflict) {
          conflictingOffers.push(offer);
        }
      }
      
      // Auto-decline all conflicting offers
      for (const offer of conflictingOffers) {
        await supabase
          .from('applications')
          .update({
            status: 'declined',
            auto_declined_reason: 'Worker accepted conflicting job offer'
          })
          .eq('id', offer.id);
        
        console.log(`✅ Auto-declined conflicting offer: ${offer.jobs.job_reference}`);
      }
      
    } catch (error) {
      console.error('Error in auto-decline:', error);
      // Don't throw - this shouldn't block the main acceptance
    }
  };

  const declineHireOffer = async (applicationId) => {
    setProcessingAction(applicationId);

    try {
      const { error } = await supabase
        .from('applications')
        .update({
          status: 'declined',
          worker_confirmed: false
        })
        .eq('id', applicationId);

      if (error) throw error;

      // Success
      Alert.alert('Declined', 'You have declined the hire offer.');
      fetchApplications();

    } catch (error) {
      console.error('Error declining hire:', error);
      Alert.alert('Error', 'Failed to decline hire offer. Please try again.');
    } finally {
      setProcessingAction(null);
    }
  };

  const withdrawApplication = async (applicationId) => {
    setProcessingAction(applicationId);

    try {
      const { error } = await supabase
        .from('applications')
        .update({
          status: 'withdrawn',
          worker_confirmed: false
        })
        .eq('id', applicationId);

      if (error) throw error;

      // Success
      Alert.alert('Withdrawn', 'Your application has been withdrawn.');
      fetchApplications();

    } catch (error) {
      console.error('Error withdrawing application:', error);
      Alert.alert('Error', 'Failed to withdraw application. Please try again.');
    } finally {
      setProcessingAction(null);
    }
  };

  const onRefresh = () => {
    console.log('🔄 Manual refresh triggered');
    fetchApplications();
  };

  const navigateToJobDetails = (application) => {
    navigation.navigate('WorkerJobDetail', {
      jobId: application.job_id,
      job: application.jobs
    });
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    try {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch (error) {
      return timeString;
    }
  };

  const getStatusColor = (status, workerConfirmed = false) => {
    const colors = {
      'applied': '#3b82f6',    // Blue
      'hired': workerConfirmed ? '#10b981' : '#f59e0b', // Green if confirmed, Amber if pending
      'declined': '#ef4444',   // Red
      'withdrawn': '#6b7280',  // Gray
      'active': '#10b981'      // Green
    };
    return colors[status] || '#6b7280';
  };

  const getStatusText = (status, workerConfirmed = false) => {
    const texts = {
      'applied': 'Applied',
      'hired': workerConfirmed ? 'Confirmed 🎉' : 'Hire Offered',
      'declined': 'Declined',
      'withdrawn': 'Withdrawn',
      'active': 'Active'
    };
    return texts[status] || status;
  };

  // Updated getActionButton to handle deleted jobs and add confirmation options
  const getActionButton = (application) => {
    const job = application.jobs;
    
    // Don't show actions for deleted jobs
    if (job?.deleted) {
      return (
        <View style={styles.deletedJobActions}>
          <Text style={styles.deletedJobActionText}>
            No actions available - job removed
          </Text>
        </View>
      );
    }
    
    // Applied status - can withdraw
    if (application.status === 'applied') {
      return (
        <Button
          title="Withdraw"
          onPress={() => handleWithdraw(application)}
          variant="outline"
          style={styles.withdrawButton}
          disabled={processingAction === application.id}
        />
      );
    }
    
    // Hired status - needs confirmation
    if (application.status === 'hired' && !application.worker_confirmed) {
      return (
        <View style={styles.hireActionRow}>
          <Button
            title="Decline"
            onPress={() => handleDeclineHire(application)}
            variant="outline"
            style={[styles.actionButton, styles.declineButton]}
            disabled={processingAction === application.id}
          />
          <Button
            title="Accept"
            onPress={() => handleAcceptHire(application)}
            style={[styles.actionButton, styles.acceptButton]}
            disabled={processingAction === application.id}
          />
        </View>
      );
    }
    
    // Already confirmed or other status
    if (application.worker_confirmed) {
      return (
        <View style={styles.confirmedStatus}>
          <Text style={styles.confirmedText}>
            ✅ Confirmed - Job is active
          </Text>
        </View>
      );
    }
    
    // Declined or withdrawn
    if (application.status === 'declined' || application.status === 'withdrawn') {
      return (
        <View style={styles.finalStatus}>
          <Text style={styles.finalStatusText}>
            {application.status === 'declined' ? '❌ Declined' : '↩️ Withdrawn'}
          </Text>
        </View>
      );
    }
    
    return null;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.loadingText}>Loading your applications...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>My Applications</Text>
          <Text style={styles.subtitle}>
            {applications.length} application{applications.length !== 1 ? 's' : ''}
          </Text>
          
          
        </View>

        {/* Filter Tabs - Fixed Container - UPDATED LAYOUT */}
        <View style={styles.filterOuterContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScrollContent}
          >
            {['all', 'applied', 'hired', 'declined', 'withdrawn'].map((filterType) => (
              <TouchableOpacity
                key={filterType}
                style={[
                  styles.filterTab,
                  filter === filterType && styles.filterTabActive
                ]}
                onPress={() => setFilter(filterType)}
              >
                <Text style={[
                  styles.filterText,
                  filter === filterType && styles.filterTextActive
                ]}>
                  {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Applications List */}
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
            />
          }
        >
          {filteredApplications.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>
                {filter === 'all' ? 'No applications yet' : `No ${filter} applications`}
              </Text>
              <Text style={styles.emptyText}>
                {filter === 'all'
                  ? 'Apply for jobs to see them here.'
                  : `You don't have any ${filter} applications.`
                }
              </Text>
              {filter !== 'all' && (
                <Button
                  title="View All Applications"
                  onPress={() => setFilter('all')}
                  style={{ marginTop: SIZES.margin }}
                />
              )}
            </View>
          ) : (
            // Updated UI to handle job data properly
            filteredApplications.map((application) => {
              const job = application.jobs;
              const isJobDeleted = job?.deleted;
             
              
              return (
                <View key={application.id} style={styles.applicationCard}>
                  {/* Application Header */}
                  <View style={styles.cardHeader}>
                    <View style={styles.jobInfo}>
                      <Text style={[
                        styles.jobReference,
                        isJobDeleted && styles.deletedJobText
                      ]}>
                        {isJobDeleted 
                          ? '[Job No Longer Available]' 
                          : job?.job_reference || 'Job Reference N/A'
                          }
                      </Text>
                      <Text style={[
                        styles.jobCategory,
                        isJobDeleted && styles.deletedJobText
                      ]}>
                        {isJobDeleted 
                          ? 'Job has been removed' 
                          : job?.category || 'Category N/A'
                          }
                      </Text>
                    </View>
                    
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(application.status, application.worker_confirmed) + '20' }
                    ]}>
                      <Text style={[
                        styles.statusText,
                        { color: getStatusColor(application.status, application.worker_confirmed) }
                      ]}>
                        {getStatusText(application.status, application.worker_confirmed)}
                      </Text>
                    </View>
                  </View>

                  {/* Job Details - Show different content based on job availability */}
                  {isJobDeleted ? (
                    <View style={styles.deletedJobInfo}>
                      <Text style={styles.deletedJobMessage}>
                        ⚠️ This job is no longer available. The employer may have removed it.
                      </Text>
                      <Text style={styles.appliedDateText}>
                        Applied: {new Date(application.applied_at).toLocaleDateString()}
                      </Text>
                    </View>
                  ) : (
                    <>
                      {/* Normal job details */}
                      <View style={styles.detailsRow}>
                        <Text style={styles.detailLabel}>Date:</Text>
                        <Text style={styles.detailValue}>
                          {job?.scheduled_date ? formatDate(job.scheduled_date) : 'Date not set'}
                        </Text>
                      </View>

                      <View style={styles.detailsRow}>
                        <Text style={styles.detailLabel}>Time:</Text>
                        <Text style={styles.detailValue}>
                          {job?.time_from && job?.time_to 
                            ? `${formatTime(job.time_from)} - ${formatTime(job.time_to)}`
                            : 'Time not set'
                          }
                        </Text>
                      </View>

                      <View style={styles.detailsRow}>
                        <Text style={styles.detailLabel}>Location:</Text>
                        <Text style={styles.detailValue}>
                          {job?.location_suburb && job?.location_city
                            ? `${job.location_suburb}, ${job.location_city}`
                            : 'Location not specified'
                          }
                        </Text>
                      </View>

                      <View style={styles.detailsRow}>
                        <Text style={styles.detailLabel}>Employer:</Text>
                        <Text style={styles.detailValue}>
                          {job?.employer_name || 'Unknown employer'}
                        </Text>
                      </View>

                      {/* Applied Date */}
                      <View style={styles.appliedDate}>
                        <Text style={styles.appliedDateText}>
                          Applied: {new Date(application.applied_at).toLocaleDateString()}
                        </Text>
                      </View>

                      {/* Action Button */}
                      {getActionButton(application)}
                    </>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      </View>

      {/* Hire Confirmation Modal */}
      <Modal visible={showConfirmModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Confirm Hire Acceptance</Text>
            
            {selectedApplication && (
              <View style={styles.modalContent}>
                <Text style={styles.modalJobTitle}>
                  {selectedApplication.jobs?.job_reference} - {selectedApplication.jobs?.category}
                </Text>
                
                <View style={styles.modalDetails}>
                  <Text style={styles.modalDetail}>
                    📅 {formatDate(selectedApplication.jobs?.scheduled_date)}
                  </Text>
                  <Text style={styles.modalDetail}>
                    ⏰ {formatTime(selectedApplication.jobs?.time_from)} - {formatTime(selectedApplication.jobs?.time_to)}
                  </Text>
                  <Text style={styles.modalDetail}>
                    📍 {selectedApplication.jobs?.location_suburb}, {selectedApplication.jobs?.location_city}
                  </Text>
                  <Text style={styles.modalDetail}>
                    💰 {selectedApplication.jobs?.budget_currency} {selectedApplication.jobs?.budget}
                  </Text>
                  <Text style={styles.modalDetail}>
                    👨‍💼 {selectedApplication.jobs?.employer_name || 'Employer'}
                  </Text>
                </View>

                <Text style={styles.modalWarning}>
                  ⚠️ By accepting this hire, you commit to being available at this time.
                  Conflicting hire offers will be automatically declined.
                </Text>
              </View>
            )}

            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                onPress={() => {
                  setShowConfirmModal(false);
                  setSelectedApplication(null);
                }}
                variant="outline"
                style={[styles.modalButton, { flex: 1, marginRight: 8 }]}
                disabled={!!processingAction}
              />
              <Button
                title={processingAction ? "Accepting..." : "Accept & Confirm"}
                onPress={confirmHireAcceptance}
                style={[styles.modalButton, { flex: 1, marginLeft: 8 }]}
                disabled={!!processingAction}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
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
  header: {
    padding: SIZES.padding,
    paddingBottom: SIZES.padding / 2,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  title: {
    fontSize: SIZES.xLarge,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: SIZES.small,
    color: COLORS.gray600,
  },
  
  // UPDATED: Filter tabs with fixed heights
  filterOuterContainer: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
    height: 44, // Fixed container height
    justifyContent: 'center', // Vertically center content
  },
  filterScrollContent: {
    paddingHorizontal: SIZES.padding,
    alignItems: 'center', // Vertically align tabs
    height: 44, // Match container height
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 6,
    backgroundColor: COLORS.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 70,
    height: 32, // Fixed tab height
    flexShrink: 0, // Prevent tabs from shrinking
  },
  filterTabActive: {
    backgroundColor: COLORS.primary,
  },
  filterText: {
    fontSize: SIZES.xSmall,
    color: COLORS.gray600,
    fontWeight: '500',
    textTransform: 'capitalize',
    textAlign: 'center',
  },
  filterTextActive: {
    color: COLORS.white,
  },
  scrollView: {
    flex: 1,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: SIZES.padding * 2,
    color: COLORS.gray500,
    fontSize: SIZES.medium,
  },
  emptyState: {
    alignItems: 'center',
    padding: SIZES.padding * 2,
    marginTop: SIZES.padding * 2,
  },
  emptyTitle: {
    fontSize: SIZES.large,
    fontWeight: 'bold',
    color: COLORS.gray700,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: SIZES.small,
    color: COLORS.gray500,
    textAlign: 'center',
    marginBottom: SIZES.margin,
    lineHeight: 20,
  },
  applicationCard: {
    backgroundColor: COLORS.white,
    margin: SIZES.margin,
    padding: SIZES.padding,
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
    marginBottom: 12,
  },
  jobInfo: {
    flex: 1,
  },
  jobReference: {
    fontSize: SIZES.medium,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 2,
  },
  jobCategory: {
    fontSize: SIZES.small,
    fontWeight: '600',
    color: COLORS.gray600,
  },
  // Styles for deleted jobs
  deletedJobText: {
    color: COLORS.gray500,
    fontStyle: 'italic',
  },
  deletedJobInfo: {
    padding: SIZES.padding,
    backgroundColor: COLORS.gray100,
    borderRadius: SIZES.radius,
    marginTop: 8,
  },
  deletedJobMessage: {
    fontSize: SIZES.small,
    color: COLORS.gray600,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  deletedJobActions: {
    marginTop: 12,
    padding: 12,
    backgroundColor: COLORS.gray100,
    borderRadius: SIZES.radius,
    alignItems: 'center',
  },
  deletedJobActionText: {
    fontSize: SIZES.small,
    color: COLORS.gray500,
    fontStyle: 'italic',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: SIZES.radius,
  },
  statusText: {
    fontSize: SIZES.xSmall,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  detailsRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: SIZES.small,
    fontWeight: '600',
    color: COLORS.gray700,
    width: 80,
  },
  detailValue: {
    fontSize: SIZES.small,
    color: COLORS.gray800,
    flex: 1,
  },
  appliedDate: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
  },
  appliedDateText: {
    fontSize: SIZES.xSmall,
    color: COLORS.gray500,
    fontStyle: 'italic',
  },
  withdrawButton: {
    marginTop: 12,
    borderColor: COLORS.error,
  },
  hireActionRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  actionButton: {
    flex: 1,
  },
  declineButton: {
    borderColor: COLORS.error,
  },
  acceptButton: {
    backgroundColor: COLORS.success,
  },
  confirmedStatus: {
    marginTop: 12,
    padding: 10,
    backgroundColor: COLORS.success + '20',
    borderRadius: SIZES.radius,
    alignItems: 'center',
  },
  confirmedText: {
    color: COLORS.success,
    fontWeight: '600',
    fontSize: SIZES.small,
  },
  finalStatus: {
    marginTop: 12,
    padding: 10,
    backgroundColor: COLORS.gray200,
    borderRadius: SIZES.radius,
    alignItems: 'center',
  },
  finalStatusText: {
    color: COLORS.gray600,
    fontWeight: '600',
    fontSize: SIZES.small,
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
  },
  modalTitle: {
    fontSize: SIZES.large,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: SIZES.margin,
    textAlign: 'center',
  },
  modalContent: {
    marginBottom: SIZES.margin,
  },
  modalJobTitle: {
    fontSize: SIZES.medium,
    fontWeight: 'bold',
    color: COLORS.gray800,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalDetails: {
    backgroundColor: COLORS.gray100,
    padding: SIZES.padding,
    borderRadius: SIZES.radius,
    marginBottom: 12,
  },
  modalDetail: {
    fontSize: SIZES.small,
    color: COLORS.gray700,
    marginBottom: 4,
  },
  modalWarning: {
    fontSize: SIZES.small,
    color: COLORS.warning,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 18,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    minHeight: 44,
  },
};