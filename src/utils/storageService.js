// src/utils/storageService.js
import AsyncStorage from '@react-native-async-storage/async-storage';

export const storageService = {
  // User data
  setUserProfile: async (profile) => {
    await AsyncStorage.setItem('userProfile', JSON.stringify(profile));
  },
  
  getUserProfile: async () => {
    const profile = await AsyncStorage.getItem('userProfile');
    return profile ? JSON.parse(profile) : null;
  },
  
  setAdminStatus: async (isAdmin) => {
    await AsyncStorage.setItem('isAdmin', isAdmin.toString());
  },
  
  getAdminStatus: async () => {
    const isAdmin = await AsyncStorage.getItem('isAdmin');
    return isAdmin === 'true';
  },
  
  // Auth state
  setAuthToken: async (token) => {
    await AsyncStorage.setItem('authToken', token);
  },
  
  getAuthToken: async () => {
    return await AsyncStorage.getItem('authToken');
  },
  
  // Type B sync management
  setPendingChanges: async (changes) => {
    await AsyncStorage.setItem('pending_profile_changes', JSON.stringify(changes));
  },
  
  getPendingChanges: async () => {
    const changes = await AsyncStorage.getItem('pending_profile_changes');
    return changes ? JSON.parse(changes) : null;
  },
  
  clearPendingChanges: async () => {
    await AsyncStorage.removeItem('pending_profile_changes');
  },
  
  // API call tracking for timeout
  setLastApiCall: async (timestamp) => {
    await AsyncStorage.setItem('last_api_call', timestamp);
  },
  
  getLastApiCall: async () => {
    return await AsyncStorage.getItem('last_api_call');
  },
  
  // Profile sync tracking (if needed for future features)
  setLastSync: async (timestamp) => {
    await AsyncStorage.setItem('last_profile_sync', timestamp);
  },
  
  getLastSync: async () => {
    return await AsyncStorage.getItem('last_profile_sync');
  },
  
  // Clear all user data (for sign out) - ORIGINAL
  clearUserData: async () => {
    await AsyncStorage.multiRemove([
      'userProfile',
      'isAdmin', 
      'authToken',
      'last_profile_sync',
      'pending_profile_changes',
      'last_api_call'
    ]);
  },
  
  // ✅ NEW: Clear user data but preserve pending changes
  clearUserDataButKeepPendingChanges: async () => {
    await AsyncStorage.multiRemove([
      'userProfile',
      'isAdmin', 
      'authToken',
      'last_profile_sync',
      'last_api_call'
      // 'pending_profile_changes' is NOT removed - preserves unsynced data
    ]);
  },
  
  // ✅ NEW: Clear everything including pending changes (for complete reset)
  clearAllData: async () => {
    await AsyncStorage.multiRemove([
      'userProfile',
      'isAdmin', 
      'authToken',
      'last_profile_sync',
      'pending_profile_changes',
      'last_api_call'
    ]);
  },

  // ✅ NEW: Jobs storage functions
  setMyJobs: async (jobs) => {
    try {
      await AsyncStorage.setItem('my_jobs', JSON.stringify(jobs));
      console.log('💾 Jobs saved to local storage:', jobs.length);
    } catch (error) {
      console.error('Error saving jobs to storage:', error);
    }
  },

  getMyJobs: async () => {
    try {
      const jobs = await AsyncStorage.getItem('my_jobs');
      const parsedJobs = jobs ? JSON.parse(jobs) : [];
      console.log('💾 Jobs loaded from local storage:', parsedJobs.length);
      return parsedJobs;
    } catch (error) {
      console.error('Error getting jobs from storage:', error);
      return [];
    }
  },

  addJobToStorage: async (newJob) => {
    try {
      const existingJobs = await storageService.getMyJobs();
      const updatedJobs = [newJob, ...existingJobs];
      await storageService.setMyJobs(updatedJobs);
      console.log('💾 Job added to local storage:', newJob.job_reference);
      return updatedJobs;
    } catch (error) {
      console.error('Error adding job to storage:', error);
      return [];
    }
  },

  updateJobInStorage: async (jobId, updates) => {
    try {
      const existingJobs = await storageService.getMyJobs();
      const updatedJobs = existingJobs.map(job => 
        job.id === jobId ? { ...job, ...updates } : job
      );
      await storageService.setMyJobs(updatedJobs);
      console.log('💾 Job updated in local storage:', jobId);
      return updatedJobs;
    } catch (error) {
      console.error('Error updating job in storage:', error);
      return existingJobs;
    }
  },

  deleteJobFromStorage: async (jobId) => {
    try {
      const existingJobs = await storageService.getMyJobs();
      const updatedJobs = existingJobs.filter(job => job.id !== jobId);
      await storageService.setMyJobs(updatedJobs);
      console.log('💾 Job deleted from local storage:', jobId);
      return updatedJobs;
    } catch (error) {
      console.error('Error deleting job from storage:', error);
      return existingJobs;
    }
  },

  // ✅ NEW: Clear only jobs data (for testing or cleanup)
  clearJobsData: async () => {
    try {
      await AsyncStorage.removeItem('my_jobs');
      console.log('💾 Jobs data cleared from storage');
    } catch (error) {
      console.error('Error clearing jobs data:', error);
    }
  }
};

// ✅ NEW: Export individual functions for easier imports
export const setMyJobs = storageService.setMyJobs;
export const getMyJobs = storageService.getMyJobs;
export const addJobToStorage = storageService.addJobToStorage;
export const updateJobInStorage = storageService.updateJobInStorage;
export const deleteJobFromStorage = storageService.deleteJobFromStorage;
export const clearJobsData = storageService.clearJobsData;