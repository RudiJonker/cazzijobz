// src/screens/employer/ApplicantsListScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  Alert,
  RefreshControl
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../utils/supabaseClient';
import { useSupabase } from '../../hooks/useSupabase';
import { storageService } from '../../utils/storageService';
import { COLORS, SIZES } from '../../styles/theme';
import { Button } from '../../components/common/Button';

export default function ApplicantsListScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { user, typeACall } = useSupabase();
  const { jobId } = route.params;

  const [job, setJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingAction, setProcessingAction] = useState(null);

  useEffect(() => {
    fetchApplicants();
  }, [jobId]);

  const fetchApplicants = async (forceRefresh = false) => {
    if (forceRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      let currentUser = user;
      if (!currentUser) {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        currentUser = authUser;
      }

      if (!currentUser) {
        console.log('❌ No user found');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Fetch job details and applications in one query - TYPE A (critical for employers)
      const { data, error } = await typeACall('FETCH_JOB_APPLICATIONS', async () => {
        return await supabase
          .from('applications')
          .select(`
            id,
            worker_id,
            status,
            worker_confirmed,
            applied_at,
            worker_notes,
            employer_notes,
            jobs (
              id,
              job_reference,
              description,
              category,
              scheduled_date,
              time_from,
              time_to,
              budget,
              budget_currency,
              status
            )
          `)
          .eq('job_id', jobId)
          .order('applied_at', { ascending: false });
      });

      if (error) throw error;

      console.log('✅ Fetched applications:', data?.length || 0);

      if (data && data.length > 0) {
        // Set job from first application (all should be the same job)
        setJob(data[0].jobs);
        
        // Fetch worker profiles separately to avoid join issues - TYPE A (critical for employers)
        const workerIds = data.map(app => app.worker_id).filter(id => id); // Filter out undefined/null values
        const { data: profiles, error: profilesError } = await typeACall('FETCH_WORKER_PROFILES', async () => {
          return await supabase
            .from('profiles')
            .select('id, full_name, bio, location_city, location_suburb, profile_picture_url')
            .in('id', workerIds);
        });

        if (profilesError) {
          console.error('⚠️ Error fetching profiles:', profilesError);
          // Continue without profiles
        }

        // Combine applications with profiles
        const applicationsWithProfiles = data.map(app => ({
          ...app,
          profiles: profiles?.find(p => p.id === app.worker_id) || null
        }));
        
        setApplications(applicationsWithProfiles);
      } else {
        // No applications, but we still need job details - TYPE A (critical)
        const { data: jobData, error: jobError } = await typeACall('FETCH_JOB_DETAILS', async () => {
          return await supabase
            .from('jobs')
            .select('*')
            .eq('id', jobId)
            .single();
        });

        if (jobError) throw jobError;
        setJob(jobData);
        setApplications([]);
      }

    } catch (error) {
      console.error('❌ Error fetching applicants:', error);
      Alert.alert('Error', 'Failed to load applicants');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleHireApplicant = async (application) => {
    Alert.alert(
      'Hire Applicant',
      `Are you sure you want to hire ${application.profiles?.full_name || 'this applicant'} for "${job?.job_reference}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Hire',
          onPress: () => processHireDecline(application.id, 'hired')
        }
      ]
    );
  };

  const handleDeclineApplicant = async (application) => {
    Alert.alert(
      'Decline Applicant',
      `Are you sure you want to decline ${application.profiles?.full_name || 'this applicant'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          onPress: () => processHireDecline(application.id, 'declined')
        }
      ]
    );
  };

  const processHireDecline = async (applicationId, newStatus) => {
    setProcessingAction(applicationId);

    try {
      console.log(`🔄 Updating application ${applicationId} to ${newStatus}`);

      // Update application status - TYPE A (critical)
      await typeACall('UPDATE_APPLICATION_STATUS', async () => {
        const { error } = await supabase
          .from('applications')
          .update({
            status: newStatus,
            employer_notes: newStatus === 'hired' ? 'Hired for this position' : 'Application declined'
          })
          .eq('id', applicationId);

        if (error) throw error;
      });

      // If hiring, update job status and decline other applications
      if (newStatus === 'hired') {
        // Update job status to hired - TYPE A (critical)
        await typeACall('UPDATE_JOB_STATUS_HIRED', async () => {
          const { error } = await supabase
            .from('jobs')
            .update({ status: 'hired' })
            .eq('id', jobId);

          if (error) throw error;
        });

        // Decline all other applications for this job - TYPE A (critical)
        await typeACall('DECLINE_OTHER_APPLICATIONS', async () => {
          const { error } = await supabase
            .from('applications')
            .update({
              status: 'declined',
              employer_notes: 'Another applicant was hired'
            })
            .eq('job_id', jobId)
            .neq('id', applicationId);

          if (error) {
            console.error('⚠️ Error declining other applications:', error);
            // Don't throw - job is still hired
          }
        });
      }

      console.log(`✅ Application ${applicationId} updated to ${newStatus}`);

      // Show success message
      Alert.alert(
        'Success',
        newStatus === 'hired'
          ? 'Applicant hired successfully! Other applications have been declined.'
          : 'Application declined.',
        [{ text: 'OK' }]
      );

      // Refresh the list
      fetchApplicants(true);

    } catch (error) {
      console.error('❌ Error updating application:', error);
      Alert.alert('Error', `Failed to ${newStatus === 'hired' ? 'hire' : 'decline'} applicant`);
    } finally {
      setProcessingAction(null);
    }
  };

  const onRefresh = () => {
    fetchApplicants(true);
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

  // UPDATED: Added worker_confirmed parameter
  const getApplicationStatusColor = (status, workerConfirmed = false) => {
    const colors = {
      'applied': '#3b82f6',    // Blue
      'hired': workerConfirmed ? '#10b981' : '#f59e0b', // Green if confirmed, Amber if pending
      'declined': '#ef4444',   // Red
      'withdrawn': '#6b7280'   // Gray
    };
    return colors[status] || '#6b7280';
  };

  // NEW: Added helper function for status display
  const getApplicationStatusDisplay = (status, workerConfirmed = false) => {
    const statusMap = {
      'applied': 'Applied',
      'hired': workerConfirmed ? 'Confirmed 🎉' : 'Pending Confirmation',
      'declined': 'Declined',
      'withdrawn': 'Withdrawn'
    };
    return statusMap[status] || status;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.loadingText}>Loading applicants...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Applicants</Text>
            <Text style={styles.subtitle}>
              {job?.job_reference} • {applications.length} applicant{applications.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={onRefresh}
          >
            <Ionicons name="refresh-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Job Summary */}
        {job && (
          <View style={styles.jobSummary}>
            <Text style={styles.jobTitle}>{job.category}</Text>
            <Text style={styles.jobDetails}>
              {formatDate(job.scheduled_date)} • {formatTime(job.time_from)} - {formatTime(job.time_to)}
            </Text>
            <Text style={styles.jobBudget}>
              {job.budget_currency} {job.budget}
            </Text>
          </View>
        )}

        {/* Applicants List */}
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
          {applications.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No applicants yet</Text>
              <Text style={styles.emptyText}>
                When workers apply to your job, they'll appear here.
              </Text>
            </View>
          ) : (
            applications.map((application) => (
              <View key={application.id} style={styles.applicantCard}>
                {/* Applicant Header */}
                <View style={styles.applicantHeader}>
                  <View style={styles.applicantInfo}>
                    <Text style={styles.applicantName}>
                      {application.profiles?.full_name || 'Unknown Worker'}
                    </Text>
                    <Text style={styles.applicantLocation}>
                      {application.profiles?.location_suburb && application.profiles?.location_city 
                        ? `${application.profiles.location_suburb}, ${application.profiles.location_city}`
                        : application.profiles?.location_city || 'Location not specified'}
                    </Text>
                  </View>
                  {/* UPDATED: Status badge with worker_confirmed parameter */}
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: getApplicationStatusColor(application.status, application.worker_confirmed) + '20' }
                  ]}>
                    <Text style={[
                      styles.statusText,
                      { color: getApplicationStatusColor(application.status, application.worker_confirmed) }
                    ]}>
                      {getApplicationStatusDisplay(application.status, application.worker_confirmed)}
                    </Text>
                  </View>
                </View>

                {/* Application Details */}
                <View style={styles.applicationDetails}>
                  <Text style={styles.appliedDate}>
                    Applied: {new Date(application.applied_at).toLocaleDateString()}
                  </Text>
                  {application.worker_notes && (
                    <Text style={styles.notes}>
                      Notes: {application.worker_notes}
                    </Text>
                  )}
                  {application.profiles?.bio && (
                    <Text style={styles.bio}>
                      Bio: {application.profiles.bio}
                    </Text>
                  )}
                </View>

                {/* Action Buttons */}
                {application.status === 'applied' && (
                  <View style={styles.actionButtons}>
                    <Button
                      title="Decline"
                      onPress={() => handleDeclineApplicant(application)}
                      variant="outline"
                      style={styles.declineButton}
                      disabled={processingAction === application.id}
                    />
                    <Button
                      title="Hire"
                      onPress={() => handleHireApplicant(application)}
                      style={styles.hireButton}
                      disabled={processingAction === application.id}
                    />
                  </View>
                )}

                {/* UPDATED: Conditional rendering for hired applications */}
                {application.status === 'hired' && !application.worker_confirmed && (
                  <View style={styles.statusMessage}>
                    <Text style={styles.statusMessageText}>
                      ⏳ Waiting for worker confirmation...
                    </Text>
                  </View>
                )}

                {application.status === 'hired' && application.worker_confirmed && (
                  <View style={styles.statusMessage}>
                    <Text style={styles.statusMessageText}>
                      ✅ Worker confirmed! Job is active.
                    </Text>
                  </View>
                )}

                {application.status === 'declined' && (
                  <View style={styles.statusMessage}>
                    <Text style={styles.statusMessageText}>
                      ❌ Application declined
                    </Text>
                  </View>
                )}

                {application.status === 'withdrawn' && (
                  <View style={styles.statusMessage}>
                    <Text style={styles.statusMessageText}>
                      ↩️ Application withdrawn
                    </Text>
                  </View>
                )}
              </View>
            ))
          )}
        </ScrollView>
      </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: SIZES.padding,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
    backgroundColor: COLORS.white,
  },
  backButton: {
    padding: 8,
  },
  headerContent: {
    flex: 1,
    marginLeft: 8,
  },
  title: {
    fontSize: SIZES.xLarge,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  subtitle: {
    fontSize: SIZES.small,
    color: COLORS.gray600,
  },
  refreshButton: {
    padding: 8,
  },
  jobSummary: {
    padding: SIZES.padding,
    backgroundColor: COLORS.gray100,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  jobTitle: {
    fontSize: SIZES.large,
    fontWeight: 'bold',
    color: COLORS.gray900,
  },
  jobDetails: {
    fontSize: SIZES.small,
    color: COLORS.gray600,
    marginTop: 4,
  },
  jobBudget: {
    fontSize: SIZES.medium,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.padding * 2,
  },
  emptyTitle: {
    fontSize: SIZES.large,
    fontWeight: 'bold',
    color: COLORS.gray700,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: SIZES.medium,
    color: COLORS.gray500,
    textAlign: 'center',
  },
  applicantCard: {
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
  applicantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  applicantInfo: {
    flex: 1,
  },
  applicantName: {
    fontSize: SIZES.large,
    fontWeight: 'bold',
    color: COLORS.gray900,
  },
  applicantLocation: {
    fontSize: SIZES.small,
    color: COLORS.gray600,
    marginTop: 2,
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
  applicationDetails: {
    marginBottom: 16,
  },
  appliedDate: {
    fontSize: SIZES.small,
    color: COLORS.gray600,
    marginBottom: 8,
  },
  notes: {
    fontSize: SIZES.small,
    color: COLORS.gray700,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  bio: {
    fontSize: SIZES.small,
    color: COLORS.gray700,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  declineButton: {
    flex: 1,
    borderColor: COLORS.error,
  },
  hireButton: {
    flex: 1,
    backgroundColor: COLORS.success,
  },
  statusMessage: {
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.gray100,
    borderRadius: SIZES.radius,
  },
  statusMessageText: {
    fontSize: SIZES.medium,
    fontWeight: 'bold',
    color: COLORS.gray700,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: SIZES.padding * 2,
    color: COLORS.gray500,
    fontSize: SIZES.medium,
  },
};