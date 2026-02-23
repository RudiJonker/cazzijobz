// src/screens/employer/MyJobsScreen.js - UPDATED WITH REFRESH ICON
import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  RefreshControl,
  Alert
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../utils/supabaseClient';
import { useSupabase } from '../../hooks/useSupabase';
import { storageService } from '../../utils/storageService';
import { COLORS, SIZES } from '../../styles/theme';
import { Button } from '../../components/common/Button';

export default function MyJobsScreen() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const { user } = useSupabase();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState(null);
  const [dataStale, setDataStale] = useState(false);

  // Check if API call is allowed (spam prevention)
  const isRefreshAllowed = async () => {
    const storedRefreshTime = await storageService.getLastJobsRefresh();
    
    if (!storedRefreshTime) {
      console.log('⏱️ First refresh allowed - no previous refresh time');
      return true;
    }
    
    const now = new Date();
    const lastCall = new Date(storedRefreshTime);
    const timeSinceLastCall = (now - lastCall) / 1000;
    const timeout = 60;
    
    const allowed = timeSinceLastCall >= timeout;
    
    console.log('⏱️ Refresh Check:', {
      allowed,
      lastCall: storedRefreshTime,
      timeSinceLastCall: `${timeSinceLastCall}s`,
      timeout: `${timeout}s`
    });
    
    return allowed;
  };

  // Fetch employer jobs
  const fetchMyJobs = async (forceRefresh = false) => {
    console.log('🔄 fetchMyJobs called, forceRefresh:', forceRefresh);
    
    if (forceRefresh) {
      const refreshAllowed = await isRefreshAllowed();
      if (!refreshAllowed) {
        console.log('🚫 Refresh blocked - within timeout period');
        setRefreshing(false);
        return;
      }
    }
    
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

    try {
      // STEP 1: Load from local storage first
      const localJobs = await storageService.getMyJobs();
      console.log('💾 Local jobs found:', localJobs?.length || 0);
      
      if (localJobs && localJobs.length > 0) {
        setJobs(localJobs);
        setLoading(false);
        setDataStale(false);
      }

      // STEP 2: Only make API call if explicitly requested
      if (forceRefresh) {
        console.log('📥 TYPE A CALL - Manual refresh from Supabase');
        
        const { data, error } = await supabase
          .from('jobs')
          .select('*')
          .eq('employer_id', currentUser.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        console.log('✅ Supabase jobs fetched:', data?.length || 0);
        
        if (data) {
          await storageService.setMyJobs(data);
          setJobs(data);
          setDataStale(false);
          
          const refreshTime = new Date().toISOString();
          await storageService.setLastJobsRefresh(refreshTime);
          setLastRefreshTime(refreshTime);
        }
      }

    } catch (error) {
      console.error('💥 Error fetching jobs:', error);
      
      const localJobs = await storageService.getMyJobs();
      if (localJobs && localJobs.length > 0) {
        console.log('🔄 Using local data due to Supabase error');
        setJobs(localJobs);
        if (forceRefresh) {
          Alert.alert('Offline Mode', 'Showing locally saved jobs');
        }
      } else {
        Alert.alert('Error', 'Failed to load your jobs');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

 // Initial load - ALWAYS show local data first
useEffect(() => {
  const initializeJobs = async () => {
    console.log('🚀 MyJobsScreen mounted - loading from local storage');

    let currentUser = user;
    if (!currentUser) {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      currentUser = authUser;
    }

    const storedRefreshTime = await storageService.getLastJobsRefresh();
    if (storedRefreshTime) {
      setLastRefreshTime(storedRefreshTime);
    }

    const localJobs = await storageService.getMyJobs();
    
    // Filter cached jobs to only show current employer's jobs
    const myJobs = localJobs?.filter(j => j.employer_id === currentUser?.id) || [];
    
    if (myJobs.length > 0) {
      console.log('💾 Showing cached employer jobs:', myJobs.length);
      setJobs(myJobs);

      const now = new Date();
      if (storedRefreshTime) {
        const timeSinceLastRefresh = (now - new Date(storedRefreshTime)) / 1000 / 60;
        if (timeSinceLastRefresh > 5) {
          setDataStale(true);
        }
      }
    } else {
      setJobs([]);
      setDataStale(true);
    }

    setLoading(false);
  };

  initializeJobs();
}, []);

// Navigation focus - ONLY set stale indicator, NO API calls
useEffect(() => {
  if (isFocused) {
    console.log('🎯 MyJobsScreen focused - NO API calls');
    
    const now = new Date();
    const isStale = !lastRefreshTime || (now - new Date(lastRefreshTime)) > 300000;
    
    if (isStale) {
      setDataStale(true);
      console.log('📱 Data may be stale - showing refresh indicator');
    }
  }
}, [isFocused, lastRefreshTime]);

  // Pull to refresh - ONLY manual API calls allowed
  const onRefresh = () => {
    console.log('⬇️ Pull to refresh triggered - manual API call');
    setRefreshing(true);
    fetchMyJobs(true);
  };

  // Navigate to job details (via magnifying glass)
  const handleViewJobDetails = (job) => {
    navigation.navigate('JobDetail', { jobId: job.id });
  };

  // Navigate to applicants list (via View Applicants button)
  const handleViewApplicants = (job) => {
    navigation.navigate('ApplicantsList', { jobId: job.id });
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

  const getStatusColor = (status) => {
    const statusColors = {
      'open': '#10b981',      // Green
      'hired': '#3b82f6',     // Blue
      'active': '#f59e0b',    // Amber
      'completed': '#6b7280', // Gray
      'cancelled': '#ef4444', // Red
      'expired': '#6b7280'    // Gray
    };
    return statusColors[status] || '#6b7280';
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading your jobs...</Text>
      </View>
    );
  }

  console.log('🎯 MyJobsScreen render - dataStale:', dataStale, 'jobs count:', jobs.length);
  

  return (
    <View style={styles.container}>
      {/* Clean Header with Refresh Icon */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>My Jobs</Text>
          <Text style={styles.subtitle}>
            {jobs.length} job{jobs.length !== 1 ? 's' : ''} posted
            {lastRefreshTime && ` • Updated ${new Date(lastRefreshTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`}
          </Text>
        </View>
        
        {/* NEW: Refresh Icon (only show when refresh is available) */}
        {dataStale && (
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={onRefresh}
          >
            <Ionicons name="refresh-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Jobs List */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {jobs.length === 0 && !loading ? (
  <View style={styles.emptyState}>
    <Text style={styles.emptyTitle}>
      {jobs === null || jobs === undefined ? 'Loading...' : 'No jobs posted yet'}
    </Text>
    <Text style={styles.emptyText}>
      {jobs === null || jobs === undefined 
        ? 'Loading your jobs...'
        : 'Post your first job to find workers for your tasks.'
      }
    </Text>
    
    {/* Only show the button when we're sure there are no jobs */}
    {(jobs !== null && jobs !== undefined && jobs.length === 0) && (
      <Button
        title="Post Your First Job"
        onPress={() => navigation.navigate('Post Job')}
        style={{ marginTop: SIZES.margin }}
      />
    )}
  </View>
        ) : (
          jobs.map((job) => (
            <View
              key={job.id}
              style={styles.jobCard}
            >
              {/* Job Header */}
              <View style={styles.cardHeader}>
                <View style={styles.headerLeft}>
                  <Text style={styles.jobReference}>{job.job_reference}</Text>
                  <Text style={[styles.jobCategory, { color: getStatusColor(job.status) }]}>
                    {job.category} • {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                  </Text>
                </View>
                
                {/* Magnifying Glass Icon for Job Details */}
                <TouchableOpacity 
                  style={styles.detailsButton}
                  onPress={() => handleViewJobDetails(job)}
                >
                  <Ionicons name="search-outline" size={20} color={COLORS.primary} />
                </TouchableOpacity>
              </View>

              {/* Job Details */}
              <Text style={styles.jobDescription} numberOfLines={2}>
                {job.description}
              </Text>

              <View style={styles.locationRow}>
                <Text style={styles.location}>📍 {job.location_suburb}, {job.location_city}</Text>
              </View>

              <View style={styles.timeRow}>
                <Text style={styles.date}>{formatDate(job.scheduled_date)}</Text>
                <Text style={styles.time}>
                  {formatTime(job.time_from)} - {formatTime(job.time_to)}
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.buttonRow}>
                <Button
                  title="View Applicants"
                  onPress={() => handleViewApplicants(job)}
                  variant="outline"
                  style={styles.applicantsButton}
                  disabled={job.status !== 'open'}
                />
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZES.padding,
    paddingBottom: SIZES.padding / 2,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
    marginTop: 10,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: SIZES.xLarge,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 4,
    marginTop: 15,
  },
  subtitle: {
    fontSize: SIZES.small,
    color: COLORS.gray600,
  },
  refreshButton: {
    padding: 8,
    marginLeft: 8,
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
  jobCard: {
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
    marginBottom: 8,
  },
  headerLeft: {
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
  },
  detailsButton: {
    padding: 8,
    marginLeft: 8,
  },
  jobDescription: {
    fontSize: SIZES.small,
    color: COLORS.gray800,
    marginBottom: 8,
    lineHeight: 18,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  location: {
    fontSize: SIZES.xSmall,
    color: COLORS.gray600,
    fontWeight: '500',
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  date: {
    fontSize: SIZES.xSmall,
    color: COLORS.gray600,
    fontWeight: '500',
  },
  time: {
    fontSize: SIZES.xSmall,
    color: COLORS.gray600,
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
  },
  applicantsButton: {
    flex: 1,
  },
};