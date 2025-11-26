// utils/storageService.js - COMPLETE UPDATED VERSION
import AsyncStorage from '@react-native-async-storage/async-storage';

const storageService = {
  // ==================== USER & AUTHENTICATION ====================
  
  // User Profile
  setUserProfile: async (profile) => {
    try {
      await AsyncStorage.setItem('user_profile', JSON.stringify(profile));
      console.log('💾 User profile saved to local storage');
    } catch (error) {
      console.error('Error saving user profile:', error);
    }
  },

  getUserProfile: async () => {
    try {
      const profile = await AsyncStorage.getItem('user_profile');
      return profile ? JSON.parse(profile) : null;
    } catch (error) {
      console.error('Error loading user profile:', error);
      return null;
    }
  },

  clearUserProfile: async () => {
    try {
      await AsyncStorage.removeItem('user_profile');
      console.log('🧹 User profile cleared from local storage');
    } catch (error) {
      console.error('Error clearing user profile:', error);
    }
  },

  // Admin Status
  setAdminStatus: async (isAdmin) => {
    try {
      await AsyncStorage.setItem('is_admin', JSON.stringify(isAdmin));
      console.log('💾 Admin status saved:', isAdmin);
    } catch (error) {
      console.error('Error saving admin status:', error);
    }
  },

  getAdminStatus: async () => {
    try {
      const isAdmin = await AsyncStorage.getItem('is_admin');
      return isAdmin !== null ? JSON.parse(isAdmin) : null;
    } catch (error) {
      console.error('Error loading admin status:', error);
      return null;
    }
  },

  // Pending Changes (for smart login merge)
  setPendingChanges: async (changes) => {
    try {
      await AsyncStorage.setItem('pending_changes', JSON.stringify(changes));
      console.log('💾 Pending changes saved:', Object.keys(changes).length, 'fields');
    } catch (error) {
      console.error('Error saving pending changes:', error);
    }
  },

  getPendingChanges: async () => {
    try {
      const changes = await AsyncStorage.getItem('pending_changes');
      return changes ? JSON.parse(changes) : null;
    } catch (error) {
      console.error('Error loading pending changes:', error);
      return null;
    }
  },

  clearPendingChanges: async () => {
    try {
      await AsyncStorage.removeItem('pending_changes');
      console.log('🧹 Pending changes cleared');
    } catch (error) {
      console.error('Error clearing pending changes:', error);
    }
  },

  // Last API Call Tracking (for debugging)
  setLastApiCall: async (apiCall) => {
    try {
      await AsyncStorage.setItem('last_api_call', JSON.stringify(apiCall));
    } catch (error) {
      console.error('Error saving last API call:', error);
    }
  },

  getLastApiCall: async () => {
    try {
      const apiCall = await AsyncStorage.getItem('last_api_call');
      return apiCall ? JSON.parse(apiCall) : null;
    } catch (error) {
      console.error('Error loading last API call:', error);
      return null;
    }
  },

   clearUserDataButKeepPendingChanges: async () => {
  try {
    const pendingChanges = await storageService.getPendingChanges();
    
    // Clear user data BUT KEEP JOBS CACHE
    const keysToRemove = [
      'user_profile',
      'is_admin',
      // REMOVED: 'my_jobs', 'available_jobs' - keep jobs cache
      'last_jobs_refresh',
      'last_api_call'
    ];
    
    await AsyncStorage.multiRemove(keysToRemove);
    console.log('🧹 User data cleared (keeping jobs cache and pending changes)');
    
    if (pendingChanges) {
      await storageService.setPendingChanges(pendingChanges);
      console.log('💾 Pending changes restored after logout');
    }
    
  } catch (error) {
    console.error('Error clearing user data (keep pending):', error);
  }
},

clearUserData: async () => {
  try {
    const keysToRemove = [
      'user_profile',
      'is_admin',
      // REMOVED: 'my_jobs', 'available_jobs' - keep jobs cache
      'pending_changes',
      'last_jobs_refresh'
    ];
    
    await AsyncStorage.multiRemove(keysToRemove);
    console.log('🧹 User data cleared from local storage (keeping jobs cache)');
  } catch (error) {
    console.error('Error clearing user data:', error);
  }
},

  // ==================== EMPLOYER JOBS ====================
  
  // Employer Jobs (My Jobs)
  setMyJobs: async (jobs) => {
    try {
      await AsyncStorage.setItem('my_jobs', JSON.stringify(jobs));
      console.log('💾 Jobs saved to local storage:', jobs.length);
    } catch (error) {
      console.error('Error saving jobs:', error);
    }
  },

  getMyJobs: async () => {
  try {
    const jobs = await AsyncStorage.getItem('my_jobs');
    // FIXED: Return null if key doesn't exist, so we can distinguish between "no data" and "empty array"
    if (jobs === null) return null;
    return JSON.parse(jobs);
  } catch (error) {
    console.error('Error loading jobs:', error);
    return null;
  }
},

  // Update single job in local storage
  updateJobInStorage: async (updatedJob) => {
    try {
      const jobs = await storageService.getMyJobs();
      const updatedJobs = jobs.map(job => 
        job.id === updatedJob.id ? updatedJob : job
      );
      await storageService.setMyJobs(updatedJobs);
      console.log('💾 Job updated in local storage:', updatedJob.id);
    } catch (error) {
      console.error('Error updating job in storage:', error);
    }
  },

  // ==================== WORKER JOBS ====================
  
  // Available Jobs (for Workers)
  setAvailableJobs: async (jobs) => {
    try {
      await AsyncStorage.setItem('available_jobs', JSON.stringify(jobs));
      console.log('💾 Available jobs saved to local storage:', jobs.length);
    } catch (error) {
      console.error('Error saving available jobs:', error);
    }
  },

  getAvailableJobs: async () => {
  try {
    const jobs = await AsyncStorage.getItem('available_jobs');
    // FIXED: Return null if key doesn't exist
    if (jobs === null) return null;
    return JSON.parse(jobs);
  } catch (error) {
    console.error('Error loading available jobs:', error);
    return null;
  }
},

  // ==================== REFRESH TIMEOUT MANAGEMENT ====================
  
  // Last Jobs Refresh (shared between employer and worker)
  setLastJobsRefresh: async (timestamp) => {
    try {
      await AsyncStorage.setItem('last_jobs_refresh', timestamp);
      console.log('⏱️ Jobs refresh time saved:', timestamp);
    } catch (error) {
      console.error('Error saving jobs refresh time:', error);
    }
  },

  getLastJobsRefresh: async () => {
    try {
      return await AsyncStorage.getItem('last_jobs_refresh');
    } catch (error) {
      console.error('Error loading jobs refresh time:', error);
      return null;
    }
  },

  // ==================== APP STATE & SETTINGS ====================
  
  // App First Launch
  setAppFirstLaunch: async () => {
    try {
      await AsyncStorage.setItem('app_first_launch', 'false');
    } catch (error) {
      console.error('Error setting app first launch:', error);
    }
  },

  getAppFirstLaunch: async () => {
    try {
      const firstLaunch = await AsyncStorage.getItem('app_first_launch');
      return firstLaunch === null; // Returns true if first launch
    } catch (error) {
      console.error('Error getting app first launch:', error);
      return true;
    }
  },

  // User Preferences
  setUserPreferences: async (preferences) => {
    try {
      await AsyncStorage.setItem('user_preferences', JSON.stringify(preferences));
    } catch (error) {
      console.error('Error saving user preferences:', error);
    }
  },

  getUserPreferences: async () => {
    try {
      const preferences = await AsyncStorage.getItem('user_preferences');
      return preferences ? JSON.parse(preferences) : {};
    } catch (error) {
      console.error('Error loading user preferences:', error);
      return {};
    }
  },

  // ==================== BULK OPERATIONS ====================
  
  // Clear all app data (logout)
  clearAllAppData: async () => {
    try {
      const keysToKeep = ['app_first_launch', 'user_preferences'];
      const allKeys = await AsyncStorage.getAllKeys();
      const keysToRemove = allKeys.filter(key => !keysToKeep.includes(key));
      
      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
        console.log('🧹 All app data cleared except settings');
      }
    } catch (error) {
      console.error('Error clearing app data:', error);
    }
  },

  // Clear only sensitive user data
  clearUserData: async () => {
    try {
      const keysToRemove = [
        'user_profile',
        'is_admin',
        'pending_changes',
        'my_jobs',
        'available_jobs',
        'last_jobs_refresh'
      ];
      
      await AsyncStorage.multiRemove(keysToRemove);
      console.log('🧹 User data cleared from local storage');
    } catch (error) {
      console.error('Error clearing user data:', error);
    }
  },

  // Debug: Get all storage contents
  getAllStorage: async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const result = await AsyncStorage.multiGet(keys);
      
      const storageContents = {};
      result.forEach(([key, value]) => {
        try {
          storageContents[key] = value ? JSON.parse(value) : value;
        } catch {
          storageContents[key] = value;
        }
      });
      
      return storageContents;
    } catch (error) {
      console.error('Error getting all storage:', error);
      return {};
    }
  }
};

debugStorage: async () => {
  try {
    const allStorage = await storageService.getAllStorage();
    console.log('🔍 STORAGE DEBUG:', {
      hasAvailableJobs: allStorage.available_jobs !== undefined,
      availableJobsCount: allStorage.available_jobs?.length || 0,
      hasMyJobs: allStorage.my_jobs !== undefined, 
      myJobsCount: allStorage.my_jobs?.length || 0,
      lastRefresh: allStorage.last_jobs_refresh
    });
    return allStorage;
  } catch (error) {
    console.error('Storage debug error:', error);
  }
}

export { storageService };