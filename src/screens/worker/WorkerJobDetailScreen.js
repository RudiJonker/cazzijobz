// src/screens/worker/WorkerJobDetailScreen.js - UPDATED WITH IMPROVEMENTS
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
import { COLORS, SIZES } from '../../styles/theme';
import { Button } from '../../components/common/Button';

export default function WorkerJobDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { jobId } = route.params;
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    fetchJobDetails();
  }, [jobId]);

  const fetchJobDetails = async () => {
    try {
      console.log('📥 TYPE A CALL - Fetching job details for worker');
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

  const handleApply = async () => {
    if (applying) return;
    
    setApplying(true);
    try {
      // TODO: Implement application logic
      console.log('📝 TYPE A CALL - Applying to job:', jobId);
      
      // For now, just show a message
      Alert.alert(
        'Application Feature',
        'Job application system will be implemented in the next phase. This will include:\n\n• Application submission\n• Schedule conflict checking\n• Application tracking',
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('❌ Error applying to job:', error);
      Alert.alert('Error', 'Failed to apply to job');
    } finally {
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
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* STICKY AdMob Banner - UPDATED: Added top margin */}
        <View style={styles.stickyAdBanner}>
          <Text style={styles.adText}>AdMob Banner Placeholder</Text>
          <Text style={styles.adSubtext}>This ad stays visible while scrolling</Text>
        </View>

        {/* Scrollable Content Area - Stops before footer */}
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
        >
          {/* Job Details Card */}
          <View style={styles.detailCard}>
            {/* Job Reference & Status - UPDATED LAYOUT */}
            <View style={styles.cardHeader}>
              <View style={styles.headerLeft}>
                <Text style={styles.jobReference}>{job.job_reference}</Text>
                {/* UPDATED: Show actual job status */}
                <Text style={[styles.statusText, { color: job.status === 'open' ? '#10b981' : '#6b7280' }]}>
                  Status: {getStatusDisplay(job.status)}
                </Text>
              </View>
              {/* UPDATED: Brighter wage color */}
              <Text style={styles.wageAmount}>{job.budget_currency} {job.budget}</Text>
            </View>

            {/* UPDATED: Category styled like other detail rows */}
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

            {/* UPDATED: Button Row with Apply and Back */}
            <View style={styles.buttonRow}>
              <Button
                title="Back"
                onPress={() => navigation.goBack()}
                variant="outline"
                style={styles.backButton}
              />
              <Button
                title={applying ? "Applying..." : "Apply"}
                onPress={handleApply}
                style={styles.applyButton}
                disabled={applying || job.status !== 'open'}
              />
            </View>
          </View>

          {/* Additional Info */}
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>About this Job</Text>
            <Text style={styles.infoText}>
              • This job is {job.status === 'open' ? 'open for applications' : getStatusDisplay(job.status).toLowerCase()}{'\n'}
              • You can apply if you're available on the scheduled date{'\n'}
              • The employer will review your profile{'\n'}
              • You'll be notified if you're hired{'\n'}
            </Text>
          </View>
        </ScrollView>

        {/* PERMANENT FOOTER SAFE ZONE - Always behind system buttons */}
        <View style={styles.footerSafeZone} />
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
  // STICKY Ad Banner - UPDATED: Added top margin
  stickyAdBanner: {
    position: 'absolute',
    top: 15, // CHANGED: Added 15px top margin
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
  // Scrollable content area (stops before footer safe zone)
  scrollView: {
    flex: 1,
    marginTop: 80, // UPDATED: Increased to accommodate banner with margin
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
  // Card Header with job reference and wage
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
  // UPDATED: Brighter wage color
  wageAmount: {
    fontSize: SIZES.large,
    fontWeight: 'bold',
    color: '#059669', // CHANGED: Brighter green
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
  // UPDATED: Button row layout
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