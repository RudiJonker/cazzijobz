// src/screens/employer/JobDetailScreen.js - WITH BACK BUTTON
import React, { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  Alert
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

  // Helper function to format status display
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
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* STICKY AdMob Banner - UPDATED: More top margin */}
        <View style={styles.stickyAdBanner}>
          <Text style={styles.adText}>AdMob Banner Placeholder</Text>
          <Text style={styles.adSubtext}>This ad stays visible while scrolling</Text>
        </View>

        {/* NEW: Header with Back Button and Title */}
        <View style={styles.header}>
  <TouchableOpacity 
    style={styles.backButton}
    onPress={() => navigation.goBack()}
  >
    <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
    <Text style={styles.backText}>Back</Text>
  </TouchableOpacity>
  
  <Text style={styles.headerTitle}>Job Details</Text>
  
  <View style={styles.headerRight}>
    {needsRefresh && (
      <TouchableOpacity 
        style={styles.refreshButton}
        onPress={handleManualRefresh}
      >
        <Ionicons name="refresh-outline" size={20} color={COLORS.primary} />
      </TouchableOpacity>
    )}
  </View>
</View>

        {/* Scrollable Content Area - UPDATED: Increased marginTop */}
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
        >
          {/* Job Details Card */}
          <View style={styles.detailCard}>
            {/* Job Header with Edit Pencil Icon */}
            <View style={styles.cardHeader}>
              <View style={styles.headerLeft}>
                <Text style={styles.jobReference}>{job.job_reference}</Text>
                <Text style={[styles.statusText, { color: getStatusColor(job.status) }]}>
                  Status: {getStatusDisplay(job.status)}
                </Text>
              </View>
              
              {/* UPDATED: Edit button as pencil icon (only for open jobs) */}
              {job.status === 'open' && (
                <TouchableOpacity 
                  style={styles.editButton}
                  onPress={handleEdit}
                >
                  <Ionicons name="pencil-outline" size={20} color={COLORS.primary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Category as detail row */}
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
                {formatTime(job.time_from)} - {formatTime(job.time_to)}
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

            {/* REMOVED: View Applicants button from this screen */}
          </View>

          {/* Additional Info Card - UPDATED: Remove applicants info */}
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>About this Job</Text>
            <Text style={styles.infoText}>
              • This job is {job.status === 'open' ? 'open for applications' : getStatusDisplay(job.status).toLowerCase()}{'\n'}
              • You can edit this job while it's still open{'\n'}
              • Applicants will be shown in the main jobs list{'\n'}
              • Close this job when you've found a worker{'\n'}
            </Text>
          </View>
        </ScrollView>

        {/* PERMANENT FOOTER SAFE ZONE */}
        <View style={styles.footerSafeZone} />
      </View>
    </SafeAreaView>
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
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  // UPDATED: More top margin for the banner
  stickyAdBanner: {
    position: 'absolute',
    top: 10, // CHANGED: Increased from 15 to 35
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
  // NEW: Header with Back Button
  header: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: SIZES.padding,
  paddingTop: 50, // Reduced padding since we don't have system header
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
    width: 80, // Balance the back button space
    alignItems: 'flex-end',
  },
  refreshText: {
    fontSize: SIZES.xSmall,
    color: COLORS.primary,
    fontWeight: '500',
  },
  // UPDATED: Adjusted marginTop since we have a proper header now
  scrollView: {
    flex: 1,
    marginTop: 0, // CHANGED: Header now handles the spacing
  },
  scrollContent: {
    paddingBottom: 10,
  },
  // PERMANENT FOOTER SAFE ZONE
  footerSafeZone: {
    height: 50,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
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
  // Card Header with job reference and edit button
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
  // NEW: Edit button style matching magnifying glass
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
  // NEW: Category value with blue bold styling
  categoryValue: {
    fontSize: SIZES.small,
    color: COLORS.primary, // Blue color
    fontWeight: 'bold', // Bold font
    flex: 1,
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