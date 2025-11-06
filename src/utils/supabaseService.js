// src/utils/supabaseService.js
import { supabase } from './supabaseClient';

let localApiCallCount = 0;

const trackApiCall = async (type, endpoint, userId = null) => {
  localApiCallCount++;
  console.log(`Local API Call #${localApiCallCount} - Type: ${type}, Endpoint: ${endpoint}`);
  
  // Track in database if user is logged in
  if (userId) {
    try {
      await supabase
        .from('api_usage')
        .insert([
          {
            user_id: userId,
            endpoint: endpoint,
            call_type: type,
          }
        ]);
    } catch (error) {
      console.error('Failed to track API call in database:', error);
    }
  }
};

export const authService = {
  signUp: async (email, password) => {
    await trackApiCall('TYPE_A', 'SIGN_UP');
    return await supabase.auth.signUp({
      email: email,
      password: password,
    });
  },

  signIn: async (email, password, userId = null) => {
    await trackApiCall('TYPE_A', 'SIGN_IN', userId);
    return await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });
  },

  signOut: async (userId = null) => {
    await trackApiCall('TYPE_A', 'SIGN_OUT', userId);
    return await supabase.auth.signOut();
  },

  getCurrentUser: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },
  
  createProfile: async (profileData, userId = null) => {
    await trackApiCall('TYPE_A', 'CREATE_PROFILE', userId);
    return await supabase
      .from('profiles')
      .insert([profileData]);
  },

  updateProfile: async (profileData, userId = null) => {
    await trackApiCall('TYPE_A', 'UPDATE_PROFILE', userId);
    
    const { userId: uid, timestamp, ...updateData } = profileData;
    
    return await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId || profileData.id);
  },

  getProfile: async (userId) => {
    await trackApiCall('TYPE_A', 'GET_PROFILE', userId);
    return await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
  }
};

export const adminService = {
  getStats: async (userId) => {
    await trackApiCall('TYPE_A', 'ADMIN_GET_STATS', userId);
    
    // Get total users
    const { count: totalUsers, error: usersError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    
    // Get workers count
    const { count: totalWorkers, error: workersError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'worker');
    
    // Get employers count  
    const { count: totalEmployers, error: employersError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'employer');
    
    // Get total API calls
    const { count: totalApiCalls, error: apiError } = await supabase
      .from('api_usage')
      .select('*', { count: 'exact', head: true });

    if (usersError || workersError || employersError || apiError) {
      throw new Error('Failed to fetch admin stats');
    }

    return {
      totalUsers,
      totalWorkers, 
      totalEmployers,
      totalApiCalls
    };
  }
};

export const getLocalApiCallCount = () => localApiCallCount;