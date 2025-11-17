// src/screens/employer/MyJobsScreen.js - FIXED TIMEOUT PERSISTENCE
import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  Alert,
  RefreshControl
} from 'react-native';
import { supabase } from '../../utils/supabaseClient';
import { useSupabase } from '../../hooks/useSupabase';
import { storageService } from '../../utils/storageService';
import { COLORS, SIZES } from '../../styles/theme';
import { Button } from '../../components/common/Button';

export default function MyJobsScreen({ navigation }) {
  const { user } = useSupabase();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState(null);
  const [dataStale, setDataStale] = useState(false);

  // Check if API call is allowed (spam prevention) - UPDATED TO PERSIST
  const isRefreshAllowed = async () => {
    // Get from AsyncStorage instead of component state (survives logout/login)
    const storedRefreshTime = await storageService.getLastJobsRefresh();
    
    if (!storedRefreshTime) {
      console.log('⏱️ First refresh allowed - no previous refresh time');
      return true; // First refresh is always allowed
    }
    
    const now = new Date();
    const lastCall = new Date(storedRefreshTime);
    const timeSinceLastCall = (now - lastCall) / 1000; // Convert to seconds
    const timeout = 60; // 1 minute timeout for development
    
    const allowed = timeSinceLastCall >= timeout;
    
    console.log('⏱️ Refresh Check:', {
      allowed,
      lastCall: storedRefreshTime,
      timeSinceLastCall: `${timeSinceLastCall}s`,
      timeout: `${timeout}s`
    });
    
    return allowed;
  };

  // Fetch jobs - ONLY called manually via pull-to-refresh
  const fetchMyJobs = async (forceRefresh = false) => {
    console.log('🔄 fetchMyJobs called, forceRefresh:', forceRefresh);
    
    // Check if refresh is allowed (spam prevention) - NOW ASYNC
    if (forceRefresh) {
      const refreshAllowed = await isRefreshAllowed();
      if (!refreshAllowed) {
        console.log('🚫 Refresh blocked - within timeout period');
        setRefreshing(false);
        return; // No alert - just quietly prevent the refresh
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
      // STEP 1: Always load from local storage first (immediate)
      const localJobs = await storageService.getMyJobs();
      console.log('💾 Local jobs found:', localJobs.length);
      
      if (localJobs.length > 0) {
        setJobs(localJobs);
        setLoading(false);
        setDataStale(false); // Data is fresh when loaded from storage
      }

      // STEP 2: Only make API call if explicitly requested (pull-to-refresh)
      if (forceRefresh) {
        console.log('📥 TYPE A CALL - Manual refresh from Supabase');
        
        const { data, error } = await supabase
          .from('jobs')
          .select('*')
          .eq('employer_id', currentUser.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        console.log('✅ Supabase jobs fetched:', data?.length || 0);
        
        // STEP 3: Update local storage and state
        if (data && data.length > 0) {
          await storageService.setMyJobs(data);
          setJobs(data);
          setDataStale(false); // Data is now fresh
          
          // Save to AsyncStorage instead of component state (survives logout/login)
          const refreshTime = new Date().toISOString();
          await storageService.setLastJobsRefresh(refreshTime);
          setLastRefreshTime(refreshTime); // Keep in state for UI
          console.log('✅ Manual refresh completed - time saved to storage');
        } else if (data && data.length === 0) {
          // Clear local storage if no jobs on server
          await storageService.setMyJobs([]);
          setJobs([]);
          setDataStale(false);
        }
      }

    } catch (error) {
      console.error('💥 Fetch jobs error:', error);
      
      // If Supabase fails but we have local data, use it
      const localJobs = await storageService.getMyJobs();
      if (localJobs.length > 0) {
        console.log('🔄 Using local data due to Supabase error');
        setJobs(localJobs);
        if (forceRefresh) {
          Alert.alert('Offline Mode', 'Showing locally saved jobs');
        }
      } else {
        Alert.alert('Error', 'Failed to load jobs');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial load - ONLY from local storage, NO API call
  useEffect(() => {
    const initializeJobs = async () => {
      console.log('🚀 MyJobsScreen mounted - loading from local storage only');
      
      // Load last refresh time from AsyncStorage (survives logout/login)
      const storedRefreshTime = await storageService.getLastJobsRefresh();
      if (storedRefreshTime) {
        setLastRefreshTime(storedRefreshTime);
        console.log('⏱️ Loaded previous refresh time:', storedRefreshTime);
      }
      
      // Load from local storage ONLY (no API call)
      const localJobs = await storageService.getMyJobs();
      if (localJobs.length > 0) {
        console.log('⚡ Immediate local load:', localJobs.length, 'jobs');
        setJobs(localJobs);
        
        // Check if data might be stale (no recent refresh)
        const now = new Date();
        if (storedRefreshTime) {
          const timeSinceLastRefresh = (now - new Date(storedRefreshTime)) / 1000 / 60; // minutes
          if (timeSinceLastRefresh > 5) { // 5 minutes threshold
            setDataStale(true);
            console.log('📱 Data may be stale - last refresh was', timeSinceLastRefresh.toFixed(0), 'minutes ago');
          }
        }
      } else {
        console.log('💾 No local jobs found - user needs to post first job');
      }
      
      setLoading(false);
    };

    initializeJobs();
  }, []);

  // Navigation focus - ONLY set stale indicator, NO API calls
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('🎯 MyJobsScreen focused - NO API calls');
      
      // Check if data might be stale, but DO NOT make API calls
      const now = new Date();
      const isStale = !lastRefreshTime || (now - new Date(lastRefreshTime)) > 300000; // 5 minutes
      
      if (isStale) {
        setDataStale(true); // Just set a flag - NO API CALL
        console.log('📱 Data may be stale - showing refresh indicator');
      }
    });
    return unsubscribe;
  }, [navigation, lastRefreshTime]);

  // Pull to refresh - ONLY manual API calls allowed
  const onRefresh = () => {
    console.log('⬇️ Pull to refresh triggered - manual API call');
    setRefreshing(true);
    fetchMyJobs(true); // Force refresh from Supabase (ONLY manual trigger)
  };

  // Format date to "Saturday, 12 March"
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  // Get status color
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

  // Get status display text
  const getStatusText = (status) => {
    const statusMap = {
      open: 'Open',
      hired: 'Hired',
      active: 'Active',
      completed: 'Completed',
      cancelled: 'Cancelled',
      expired: 'Expired'
    };
    return statusMap[status] || status;
  };

  // Show loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading your jobs...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with stale indicator */}
      <View style={styles.header}>
        <Text style={styles.title}>My Jobs</Text>
        <Text style={styles.subtitle}>
          {jobs.length} job{jobs.length !== 1 ? 's' : ''} • 
          {dataStale ? ' 🔄 Refresh available' : 
           lastRefreshTime ? ` Updated ${new Date(lastRefreshTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : 
           'Pull to refresh'}
        </Text>
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
        {jobs.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No jobs posted yet</Text>
            <Text style={styles.emptyText}>
              Post your first job to find workers
            </Text>
            <Button
              title="Post a Job"
              onPress={() => navigation.navigate('Post Job')}
              style={{ marginTop: SIZES.margin }}
            />
          </View>
        ) : (
          jobs.map((job) => (
            <TouchableOpacity
              key={job.id}
              style={styles.jobCard}
              onPress={() => navigation.navigate('JobDetail', { jobId: job.id })}
            >
              {/* Job Reference & Status */}
              <View style={styles.cardHeader}>
                <View style={styles.headerLeft}>
                  <Text style={styles.jobReference}>{job.job_reference || 'N/A'}</Text>
                  <Text style={[styles.statusText, { color: getStatusColor(job.status) }]}>
                    {getStatusText(job.status)}
                  </Text>
                </View>
                <View style={styles.actions}>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => navigation.navigate('JobDetail', { jobId: job.id })}
                  >
                    <Text style={styles.actionIcon}>🔍</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Job Details */}
              <Text style={styles.jobCategory}>{job.category}</Text>
              <Text style={styles.jobDate}>
                {formatDate(job.scheduled_date)}
              </Text>

              {/* Footer */}
              <View style={styles.cardFooter}>
                <Button
                  title={`View Applicants (${job.applicant_count || 0})`}
                  onPress={() => navigation.navigate('JobDetail', { jobId: job.id })}
                  style={styles.applicantButton}
                  textStyle={styles.applicantButtonText}
                />
              </View>
            </TouchableOpacity>
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
    padding: SIZES.padding,
    paddingBottom: SIZES.padding / 2,
    backgroundColor: COLORS.primary,
  },
  title: {
    fontSize: SIZES.xLarge,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: SIZES.small,
    color: COLORS.white,
    opacity: 0.8,
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
  statusText: {
    fontSize: SIZES.xxSmall,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    marginLeft: 8,
  },
  actionButton: {
    padding: 4,
    marginLeft: 8,
  },
  actionIcon: {
    fontSize: SIZES.medium,
  },
  jobCategory: {
    fontSize: SIZES.medium,
    fontWeight: '600',
    color: COLORS.gray800,
    marginBottom: 4,
  },
  jobDate: {
    fontSize: SIZES.small,
    color: COLORS.gray600,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  applicantButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: SIZES.radius,
    minWidth: 120,
  },
  applicantButtonText: {
    fontSize: SIZES.xSmall,
    color: COLORS.white,
    fontWeight: '500',
  },
};