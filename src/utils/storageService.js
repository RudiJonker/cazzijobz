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
  }
};