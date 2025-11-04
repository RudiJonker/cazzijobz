// src/utils/supabaseService.js
import { supabase } from './supabaseClient';

let apiCallCount = 0;

const trackApiCall = (type, endpoint) => {
  apiCallCount++;
  console.log(`API Call #${apiCallCount} - Type: ${type}, Endpoint: ${endpoint}`);
};

export const authService = {
  signUp: async (email, password) => {
    trackApiCall('TYPE_A', 'SIGN_UP');
    return await supabase.auth.signUp({
      email: email,
      password: password,
    });
  },
  
  createProfile: async (profileData) => {
    trackApiCall('TYPE_A', 'CREATE_PROFILE');
    return await supabase
      .from('profiles')
      .insert([profileData]);
  }
};

export const getApiCallCount = () => apiCallCount;