// src/screens/employer/JobDetailScreen.js - FIXED API CALLS
import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  Alert
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { supabase } from '../../utils/supabaseClient';
import { storageService } from '../../utils/storageService';
import { COLORS, SIZES } from '../../styles/theme';
import { Button } from '../../components/common/Button';

export default function JobDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { jobId } = route.params;
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [needsRefresh, setNeedsRefresh] = useState(false);

  useEffect(() => {
    fetchJobDetails();
  }, [jobId]);

  const fetchJobDetails = async () => {
    try {
      // STEP 1: Always try local storage first (immediate)
      const localJobs = await storageService.getMyJobs();
      const localJob = localJobs.find(j => j.id === jobId);
      
      if (localJob) {
        console.log('💾 Loading job from local storage');
        setJob(localJob);
        setLoading(false);
        
        // Check if data might be stale (optional - can be removed)
        const now = new Date();
        const lastRefresh = await storageService.getLastJobsRefresh();
        if (lastRefresh) {
          const timeSinceLastRefresh = (now - new Date(lastRefresh)) / 1000 / 60; // minutes
          if (timeSinceLastRefresh > 5) {
            setNeedsRefresh(true);
            console.log('📱 Job data may be stale');
          }
        }
      }

      // STEP 2: Only make API call if we don't have local data OR data is stale
      if (!localJob || needsRefresh) {
        console.log('📥 TYPE A CALL - Fetching job details from Supabase');
        const { data, error } = await supabase
          .from('jobs')
          .select('*')
          .eq('id', jobId)
          .single();

        if (error) throw error;

        if (data) {
          setJob(data);
          // Update local storage
          const updatedJobs = localJobs.map(j => j.id === jobId ? data : j);
          await storageService.setMyJobs(updatedJobs);
          setNeedsRefresh(false);
        }
      }

    } catch (error) {
      console.error('❌ Error fetching job details:', error);
      // Don't show alert if we have local data
      if (!job) {
        Alert.alert('Error', 'Failed to load job details');
      }
    } finally {
      setLoading(false);
    }
  };

  // Manual refresh function (if needed)
  const handleManualRefresh = async () => {
    setLoading(true);
    await fetchJobDetails();
  };

  const handleEdit = () => {
    // Only allow editing if job is open
    if (job.status === 'open') {
      navigation.navigate('EditJob', { jobId: job.id });
    } else {
      Alert.alert('Cannot Edit', 'This job can no longer be edited as it has already been filled.');
    }
  };

  const handleViewApplicants = () => {
    // This will be implemented later
    Alert.alert('Coming Soon', 'Applicant management will be available in the next update.');
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
        {needsRefresh && (
          <Button
            title="Try Again"
            onPress={handleManualRefresh}
            style={{ marginTop: SIZES.margin }}
          />
        )}
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Clean Header - Just "Job Details" */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Job Details</Text>
        {needsRefresh && (
          <TouchableOpacity onPress={handleManualRefresh}>
            <Text style={styles.refreshText}>🔄 Refresh</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Job Details Card */}
      <View style={styles.detailCard}>
        {/* Job Reference, Status & Edit Button */}
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <Text style={styles.jobReference}>{job.job_reference}</Text>
            <Text style={[styles.statusText, { color: getStatusColor(job.status) }]}>
              {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
            </Text>
          </View>
          {job.status === 'open' && (
            <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
              <Text style={styles.editIcon}>✏️</Text>
              <Text style={styles.editText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.category}>{job.category}</Text>
        
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
            {formatTime(job.time_from)} - {formatTime(job.time_to)}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Duration:</Text>
          <Text style={styles.detailValue}>{job.duration_hours} hours</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Budget:</Text>
          <Text style={styles.detailValue}>R {job.budget}</Text>
        </View>

        {/* View Applicants Button */}
        <Button
          title={`View Applicants (${job.applicant_count || 0})`}
          onPress={handleViewApplicants}
          style={styles.applicantsButton}
        />
      </View>
    </ScrollView>
  );
}

// Helper function for status colors
const getStatusColor = (status) => {
  const colors = {
    open: '#10b981', // green
    hired: '#f59e0b', // amber
    active: '#3b82f6', // blue
    completed: '#6366f1', // indigo
    cancelled: '#ef4444', // red
    expired: '#6b7280' // gray
  };
  return colors[status] || '#6b7280';
};

const styles = {
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  // Clean Header - Just "Job Details"
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZES.padding,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  headerTitle: {
    fontSize: SIZES.xLarge,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  refreshText: {
    fontSize: SIZES.small,
    color: COLORS.primary,
    fontWeight: '500',
  },
  // Job Details Card
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
  // Card Header with job reference, status and edit button
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
    fontStyle: 'italic',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radius,
    marginLeft: 8,
  },
  editIcon: {
    fontSize: SIZES.medium,
    marginRight: 6,
  },
  editText: {
    fontSize: SIZES.small,
    color: COLORS.white,
    fontWeight: '500',
  },
  category: {
    fontSize: SIZES.large,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: SIZES.margin,
    textAlign: 'center',
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
  applicantsButton: {
    marginTop: SIZES.margin,
    backgroundColor: COLORS.primary,
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