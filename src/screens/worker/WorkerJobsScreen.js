import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  RefreshControl,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../utils/supabaseClient';
import { useSupabase } from '../../hooks/useSupabase';
import { storageService } from '../../utils/storageService';
import { COLORS, SIZES } from '../../styles/theme';
import { Ionicons } from '@expo/vector-icons';

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
      return true;
    }
    
    const now = new Date();
    const lastCall = new Date(storedRefreshTime);
    const timeSinceLastCall = (now - lastCall) / 1000;
    const timeout = 60;
    
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

  // Helper function to add application status to jobs
  const addApplicationStatusToJobs = async (jobs, userId) => {
    if (!jobs || jobs.length === 0) return jobs;
    
    try {
      console.log('🔍 Checking application status for', jobs.length, 'jobs');
      
      const jobIds = jobs.map(job => job.id);
      
      const { data: applications, error } = await supabase
        .from('applications')
        .select('job_id, status')
        .in('job_id', jobIds)
        .eq('worker_id', userId);

      if (error) {
        console.error('❌ Error fetching applications:', error);
        return jobs;
      }

      console.log('✅ Found', applications?.length || 0, 'applications for user');
      
      const applicationMap = {};
      if (applications) {
        applications.forEach(app => {
          applicationMap[app.job_id] = app.status;
        });
      }

      const jobsWithStatus = jobs.map(job => ({
        ...job,
        application_status: applicationMap[job.id] || null
      }));

      return jobsWithStatus;

    } catch (error) {
      console.error('❌ Error in addApplicationStatusToJobs:', error);
      return jobs;
    }
  };

  const fetchAvailableJobs = async (forceRefresh = false) => {
    console.log('🔄 Worker fetchAvailableJobs called, forceRefresh:', forceRefresh);
    
    if (forceRefresh) {
      const refreshAllowed = await isRefreshAllowed();
      if (!refreshAllowed) {
        console.log('🚫 Worker refresh blocked - within timeout period');
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
      // STEP 1: Always load from local storage first (immediate)
      const localJobs = await storageService.getAvailableJobs();
      console.log('💾 Local available jobs found:', localJobs?.length || 0);
      
      // FIXED: Handle null case properly
      if (localJobs !== null && localJobs !== undefined && localJobs.length > 0) {
        const jobsWithStatus = await addApplicationStatusToJobs(localJobs, currentUser.id);
        setJobs(jobsWithStatus);
        setLoading(false);
        setDataStale(false);
      }

      // STEP 2: Only make API call if explicitly requested (pull-to-refresh)
      if (forceRefresh) {
        console.log('📥 TYPE A CALL - Worker manual refresh from Supabase');
        
        let query = supabase
          .from('jobs')
          .select('*')
          .eq('status', 'open')
          .order('created_at', { ascending: false });

        if (userCity) {
          query = query.ilike('location_city', `%${userCity}%`);
          console.log('📍 Filtering jobs by city:', userCity);
        }

        const { data, error } = await query;

        if (error) throw error;

        console.log('✅ Available jobs fetched:', data?.length || 0);
        
        if (data && data.length > 0) {
          const jobsWithStatus = await addApplicationStatusToJobs(data, currentUser.id);
          
          // FIXED: Save the jobs with application status to storage
          console.log('💾 Saving available jobs to storage:', data.length, 'jobs');
          await storageService.setAvailableJobs(data); // Save original data without status
          console.log('✅ Available jobs saved to storage successfully');
          
          setJobs(jobsWithStatus);
          setDataStale(false);
          
          const refreshTime = new Date().toISOString();
          await storageService.setLastJobsRefresh(refreshTime);
          setLastRefreshTime(refreshTime);
          console.log('✅ Worker manual refresh completed - time saved to storage');
          
          const verifyJobs = await storageService.getAvailableJobs();
          console.log('🔍 Verification - jobs in storage:', verifyJobs?.length || 0);
        } else if (data && data.length === 0) {
          console.log('💾 Clearing available jobs from storage (no jobs on server)');
          await storageService.setAvailableJobs([]);
          setJobs([]);
          setDataStale(false);
        }
      }

    } catch (error) {
      console.error('💥 Error fetching available jobs:', error);
      
      const localJobs = await storageService.getAvailableJobs();
      // FIXED: Handle null case in error fallback
      if (localJobs !== null && localJobs !== undefined && localJobs.length > 0) {
        console.log('🔄 Using local data due to Supabase error');
        const jobsWithStatus = await addApplicationStatusToJobs(localJobs, currentUser.id);
        setJobs(jobsWithStatus);
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

  // FIXED: Initial load - handle null storage properly
  useEffect(() => {
    const initializeJobs = async () => {
      // Only initialize if we have a real city value (not empty string)
      if (!userCity || userCity === '') {
        console.log('📍 Waiting for valid city...');
        return;
      }
      
      console.log('🚀 WorkerJobsScreen mounted - loading from local storage');
      
      const storedRefreshTime = await storageService.getLastJobsRefresh();
      if (storedRefreshTime) {
        setLastRefreshTime(storedRefreshTime);
        console.log('⏱️ Worker loaded previous refresh time:', storedRefreshTime);
      }
      
      let currentUser = user;
      if (!currentUser) {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        currentUser = authUser;
      }
      
      const localJobs = await storageService.getAvailableJobs();
      console.log('💾 Local jobs from storage:', localJobs);
      
      // FIXED: Handle both null and empty array cases
      if (localJobs !== null && localJobs !== undefined) {
        console.log('💾 Showing cached jobs from storage:', localJobs.length, 'jobs');
        
        if (currentUser) {
          const jobsWithStatus = await addApplicationStatusToJobs(localJobs, currentUser.id);
          setJobs(jobsWithStatus);
        } else {
          setJobs(localJobs);
        }
        
        const now = new Date();
        if (storedRefreshTime) {
          const timeSinceLastRefresh = (now - new Date(storedRefreshTime)) / 1000 / 60;
          if (timeSinceLastRefresh > 5) {
            setDataStale(true);
            console.log('📱 Showing cached data - last refresh was', timeSinceLastRefresh.toFixed(0), 'minutes ago');
          }
        }
      } else {
        console.log('💾 No cached jobs found in storage - will show empty state');
        setJobs([]);
      }
      
      console.log('✅ WorkerJobsScreen initialization complete');
      setLoading(false);
    };

    // Only initialize if we have a valid city
    if (userCity && userCity !== '') {
      console.log('📍 Initializing jobs with city:', userCity);
      initializeJobs();
    }
  }, [userCity]);

  // Navigation focus - ONLY set stale indicator, NO API calls
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('🎯 WorkerJobsScreen focused - NO API calls');
      
      const now = new Date();
      const isStale = !lastRefreshTime || (now - new Date(lastRefreshTime)) > 300000;
      
      if (isStale) {
        setDataStale(true);
        console.log('📱 Worker data may be stale - showing refresh indicator');
      }
    });
    return unsubscribe;
  }, [navigation, lastRefreshTime]);

  // Add safety timeout to prevent infinite loading
  useEffect(() => {
    const safetyTimeout = setTimeout(() => {
      if (loading) {
        console.log('⚠️ Safety timeout - forcing loading to false');
        setLoading(false);
      }
    }, 5000); // 5 second timeout

    return () => clearTimeout(safetyTimeout);
  }, [loading]);

  // Pull to refresh - ONLY manual API calls allowed
  const onRefresh = () => {
    console.log('⬇️ Worker pull to refresh triggered - manual API call');
    setRefreshing(true);
    fetchAvailableJobs(true);
  };

  const handleViewJob = (job) => {
    navigation.navigate('WorkerJobDetail', { 
      jobId: job.id,
      job: job
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

  // Helper function for status dot colors
  const getStatusDotColor = (job) => {
    if (job.application_status === 'applied') return '#10b981';
    if (job.application_status === 'hired') return '#ef4444';
    return 'transparent';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.loadingText}>Finding jobs near you...</Text>
          {userCity && (
            <Text style={styles.locationText}>Location: {userCity}</Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // Debug log
  console.log('🎯 WorkerJobsScreen render - dataStale:', dataStale, 'jobs count:', jobs.length);

  return (
  <SafeAreaView style={styles.safeArea} edges={['top']}>
    <View style={styles.container}>
      {/* UPDATED: Left-aligned header like MyJobsScreen */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Available Jobs</Text>
          <Text style={styles.subtitle}>
            {jobs.length} job{jobs.length !== 1 ? 's' : ''} available
            {userCity && ` in ${userCity}`}
            {lastRefreshTime && ` • Updated ${new Date(lastRefreshTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`}
          </Text>
        </View>
          
          {/* UPDATED: Refresh icon aligned in same row */}
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
          {jobs.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No jobs available</Text>
              <Text style={styles.emptyText}>
                {userCity 
                  ? `No open jobs found in ${userCity}. Check back later!`
                  : 'Complete your profile with your location to see local jobs.'
                }
              </Text>
              
              {!userCity && (
                <TouchableOpacity 
                  style={styles.updateProfileButton}
                  onPress={() => navigation.navigate('Profile')}
                >
                  <Text style={styles.updateProfileText}>Update Profile</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity 
                style={styles.refreshButtonLarge}
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
                <View style={styles.cardHeader}>
                  <View style={styles.headerLeft}>
                    <Text style={styles.jobReference}>{job.job_reference}</Text>
                    <Text style={styles.jobCategory}>{job.category}</Text>
                  </View>
                  
                  <View style={[
                    styles.statusDot,
                    { backgroundColor: getStatusDotColor(job) }
                  ]} />
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

                <View style={styles.tapInstruction}>
                  <Text style={styles.tapInstructionText}>Tap card to view details</Text>
                </View>
              </TouchableOpacity>
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
  // UPDATED: Exact same header as MyJobsScreen - left aligned
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start', // Changed from 'center' to 'flex-start'
    padding: SIZES.padding,
    paddingBottom: SIZES.padding / 2,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
    
  },
  headerLeft: {
    flex: 1,
    // REMOVED: alignItems: 'center' - this makes it left-aligned
  },
  title: {
    fontSize: SIZES.xLarge,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 4,
   
    // REMOVED: textAlign: 'center' - this makes it left-aligned
  },
  subtitle: {
    fontSize: SIZES.small,
    color: COLORS.gray600,
    // REMOVED: textAlign: 'center' - this makes it left-aligned
  },
  refreshButton: {
    padding: 8,
    marginLeft: 8,
    marginTop: 5,
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
  refreshButtonLarge: {
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
  jobReference: {
    fontSize: SIZES.medium,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 2,
  },
  jobCategory: {
    fontSize: SIZES.small,
    fontWeight: '600',
    color: '#16a34a',
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
    fontSize: SIZES.xSmall,
    color: '#16a34a',
    fontWeight: '500',
    fontStyle: 'italic',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: COLORS.gray300,
  },
};