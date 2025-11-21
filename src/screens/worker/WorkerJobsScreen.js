// src/screens/worker/WorkerJobsScreen.js - SIMPLIFIED NO FILTERING
import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  RefreshControl,
  Alert
} from 'react-native';
import { supabase } from '../../utils/supabaseClient';
import { useSupabase } from '../../hooks/useSupabase';
import { storageService } from '../../utils/storageService';
import { COLORS, SIZES } from '../../styles/theme';

export default function WorkerJobsScreen({ navigation }) {
  const { user } = useSupabase();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userCity, setUserCity] = useState('');
  const [lastRefreshTime, setLastRefreshTime] = useState(null);
  const [dataStale, setDataStale] = useState(false);

  // Check if API call is allowed (spam prevention)
  const isRefreshAllowed = async () => {
    const storedRefreshTime = await storageService.getLastJobsRefresh();
    
    if (!storedRefreshTime) {
      console.log('⏱️ First worker refresh allowed - no previous refresh time');
      return true; // First refresh is always allowed
    }
    
    const now = new Date();
    const lastCall = new Date(storedRefreshTime);
    const timeSinceLastCall = (now - lastCall) / 1000; // Convert to seconds
    const timeout = 60; // 1 minute timeout for development
    
    const allowed = timeSinceLastCall >= timeout;
    
    console.log('⏱️ Worker Refresh Check:', {
      allowed,
      lastCall: storedRefreshTime,
      timeSinceLastCall: `${timeSinceLastCall}s`,
      timeout: `${timeout}s`
    });
    
    return allowed;
  };

  // Load user profile to get city for filtering
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const profile = await storageService.getUserProfile();
        if (profile?.location_city) {
          setUserCity(profile.location_city);
          console.log('📍 Worker location:', profile.location_city);
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
      }
    };

    loadUserProfile();
  }, []);

  // Fetch available jobs for worker
  const fetchAvailableJobs = async (forceRefresh = false) => {
    console.log('🔄 Worker fetchAvailableJobs called, forceRefresh:', forceRefresh);
    
    // Check if refresh is allowed (spam prevention)
    if (forceRefresh) {
      const refreshAllowed = await isRefreshAllowed();
      if (!refreshAllowed) {
        console.log('🚫 Worker refresh blocked - within timeout period');
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
      const localJobs = await storageService.getAvailableJobs();
      console.log('💾 Local available jobs found:', localJobs?.length || 0);
      
      if (localJobs && localJobs.length > 0) {
        setJobs(localJobs);
        setLoading(false);
        setDataStale(false);
      }

      // STEP 2: Only make API call if explicitly requested (pull-to-refresh)
      if (forceRefresh) {
        console.log('📥 TYPE A CALL - Worker manual refresh from Supabase');
        
        // Build query - only open jobs in worker's city
        let query = supabase
          .from('jobs')
          .select('*')
          .eq('status', 'open')
          .order('created_at', { ascending: false });

        // Add location filter if user has a city
        if (userCity) {
          query = query.ilike('location_city', `%${userCity}%`);
          console.log('📍 Filtering jobs by city:', userCity);
        }

        const { data, error } = await query;

        if (error) throw error;

        console.log('✅ Available jobs fetched:', data?.length || 0);
        
        // STEP 3: Update local storage and state
        if (data && data.length > 0) {
          await storageService.setAvailableJobs(data);
          setJobs(data);
          setDataStale(false);
          
          // Save to AsyncStorage (survives logout/login)
          const refreshTime = new Date().toISOString();
          await storageService.setLastJobsRefresh(refreshTime);
          setLastRefreshTime(refreshTime);
          console.log('✅ Worker manual refresh completed - time saved to storage');
        } else if (data && data.length === 0) {
          // Clear local storage if no jobs on server
          await storageService.setAvailableJobs([]);
          setJobs([]);
          setDataStale(false);
        }
      }

    } catch (error) {
      console.error('💥 Error fetching available jobs:', error);
      
      // If Supabase fails but we have local data, use it
      const localJobs = await storageService.getAvailableJobs();
      if (localJobs && localJobs.length > 0) {
        console.log('🔄 Using local data due to Supabase error');
        setJobs(localJobs);
        if (forceRefresh) {
          Alert.alert('Offline Mode', 'Showing locally saved jobs');
        }
      } else {
        Alert.alert('Error', 'Failed to load available jobs');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial load - ONLY from local storage, NO API call
  useEffect(() => {
    const initializeJobs = async () => {
      console.log('🚀 WorkerJobsScreen mounted - loading from local storage only');
      
      // Load last refresh time from AsyncStorage
      const storedRefreshTime = await storageService.getLastJobsRefresh();
      if (storedRefreshTime) {
        setLastRefreshTime(storedRefreshTime);
        console.log('⏱️ Worker loaded previous refresh time:', storedRefreshTime);
      }
      
      // Load from local storage ONLY (no API call)
      const localJobs = await storageService.getAvailableJobs();
      if (localJobs && localJobs.length > 0) {
        console.log('⚡ Worker immediate local load:', localJobs.length, 'jobs');
        setJobs(localJobs);
        
        // Check if data might be stale (no recent refresh)
        const now = new Date();
        if (storedRefreshTime) {
          const timeSinceLastRefresh = (now - new Date(storedRefreshTime)) / 1000 / 60; // minutes
          if (timeSinceLastRefresh > 5) { // 5 minutes threshold
            setDataStale(true);
            console.log('📱 Worker data may be stale - last refresh was', timeSinceLastRefresh.toFixed(0), 'minutes ago');
          }
        }
      } else {
        console.log('💾 No local jobs found for worker - will load on first refresh');
        // No local data, but don't auto-fetch - wait for manual refresh
      }
      
      setLoading(false);
    };

    if (userCity) {
      initializeJobs();
    }
  }, [userCity]);

  // Navigation focus - ONLY set stale indicator, NO API calls
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('🎯 WorkerJobsScreen focused - NO API calls');
      
      // Check if data might be stale, but DO NOT make API calls
      const now = new Date();
      const isStale = !lastRefreshTime || (now - new Date(lastRefreshTime)) > 300000; // 5 minutes
      
      if (isStale) {
        setDataStale(true); // Just set a flag - NO API CALL
        console.log('📱 Worker data may be stale - showing refresh indicator');
      }
    });
    return unsubscribe;
  }, [navigation, lastRefreshTime]);

  // Pull to refresh - ONLY manual API calls allowed
  const onRefresh = () => {
    console.log('⬇️ Worker pull to refresh triggered - manual API call');
    setRefreshing(true);
    fetchAvailableJobs(true); // Force refresh from Supabase (ONLY manual trigger)
  };

  const handleViewJob = (job) => {
    navigation.navigate('WorkerJobDetail', { jobId: job.id });
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

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Finding jobs near you...</Text>
        {userCity && (
          <Text style={styles.locationText}>Location: {userCity}</Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Clean Header - White background, blue text */}
      <View style={styles.header}>
        <Text style={styles.title}>Available Jobs</Text>
        <Text style={styles.subtitle}>
          {jobs.length} job{jobs.length !== 1 ? 's' : ''} available
          {userCity && ` in ${userCity}`}
          {dataStale ? ' 🔄 Refresh available' : 
           lastRefreshTime ? ` • Updated ${new Date(lastRefreshTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : 
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
            <Text style={styles.emptyTitle}>No jobs available</Text>
            <Text style={styles.emptyText}>
              {userCity 
                ? `No open jobs found in ${userCity}. Check back later!`
                : 'Complete your profile with your location to see local jobs.'
              }
            </Text>
            <TouchableOpacity 
              style={styles.updateProfileButton}
              onPress={() => navigation.navigate('Profile')}
            >
              <Text style={styles.updateProfileText}>Update Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.refreshButton}
              onPress={onRefresh}
            >
              <Text style={styles.refreshText}>Refresh Jobs</Text>
            </TouchableOpacity>
          </View>
        ) : (
          jobs.map((job) => (
            <TouchableOpacity
              key={job.id}
              style={styles.jobCard}
              onPress={() => handleViewJob(job)}
            >
              {/* Job Header */}
              <View style={styles.cardHeader}>
                <View style={styles.headerLeft}>
                  <Text style={styles.jobReference}>{job.job_reference}</Text>
                  {/* CHANGED: Category color to green */}
                  <Text style={styles.jobCategory}>{job.category}</Text>
                </View>
              </View>

              <View style={styles.locationRow}>
                <Text style={styles.location}>📍 {job.location_suburb}, {job.location_city}</Text>
              </View>

              <View style={styles.timeRow}>
                <Text style={styles.date}>{formatDate(job.scheduled_date)}</Text>
                <Text style={styles.time}>
                  {formatTime(job.time_from)} - {formatTime(job.time_to)}
                </Text>
              </View>

              {/* CHANGED: Simple green text instead of button */}
              <View style={styles.tapInstruction}>
                <Text style={styles.tapInstructionText}>Tap card to view details</Text>
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
  // Clean Header - White background, blue text
  header: {
    padding: SIZES.padding,
    paddingBottom: SIZES.padding / 2,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
    marginTop: 10,
  },
  title: {
    fontSize: SIZES.xLarge,
    textAlign: 'center',
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 4,
    marginTop: 15,
  },
  subtitle: {
    fontSize: SIZES.small,
    color: COLORS.gray600,
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
  locationText: {
    textAlign: 'center',
    marginTop: 8,
    color: COLORS.gray500,
    fontSize: SIZES.small,
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
  updateProfileButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: SIZES.radius,
    marginTop: SIZES.margin,
  },
  updateProfileText: {
    color: COLORS.white,
    fontSize: SIZES.small,
    fontWeight: '600',
  },
  refreshButton: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: SIZES.radius,
    marginTop: 8,
  },
  refreshText: {
    color: COLORS.primary,
    fontSize: SIZES.small,
    fontWeight: '600',
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
    // CHANGED: Green color for category
    fontSize: SIZES.small,
    fontWeight: '600',
    color: '#16a34a', // Green color
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
    marginBottom: 8,
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
  tapInstruction: {
    alignItems: 'center',
    marginTop: 4,
  },
  tapInstructionText: {
    // CHANGED: Green text for tap instruction
    fontSize: SIZES.xSmall,
    color: '#16a34a', // Green color
    fontWeight: '500',
    fontStyle: 'italic',
  },
};