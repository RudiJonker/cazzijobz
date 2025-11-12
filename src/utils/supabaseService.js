// src/utils/supabaseService.js
import { supabase } from './supabaseClient';
import * as FileSystem from 'expo-file-system/legacy';


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
  },

  // ✅ NEW: Profile Picture Upload Function
  uploadProfileImage: async (imageUri, fileName, userId = null) => {
  await trackApiCall('TYPE_A', 'UPLOAD_PROFILE_IMAGE', userId);
  
  try {
    // Use the new FileSystem API
    const fileInfo = await FileSystem.getInfoAsync(imageUri);
    if (!fileInfo.exists) {
      throw new Error('File does not exist');
    }

    // Read file as base64 using the new API
    const fileContent = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Determine file type
    const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
    const contentType = `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('profile-pictures')
      .upload(fileName, decodeBase64(fileContent), {
        contentType: contentType,
        upsert: true
      });

    if (error) throw error;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('profile-pictures')
      .getPublicUrl(fileName);

    return {
      data: {
        publicUrl: urlData.publicUrl,
        fileName: fileName
      },
      error: null
    };

  } catch (error) {
    console.error('Profile image upload error:', error);
    return {
      data: null,
      error: error
    };
  }
},

  // ✅ NEW: Delete Profile Picture
  deleteProfileImage: async (fileName, userId = null) => {
    await trackApiCall('TYPE_A', 'DELETE_PROFILE_IMAGE', userId);
    
    try {
      const { data, error } = await supabase.storage
        .from('profile-pictures')
        .remove([fileName]);

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error('Profile image delete error:', error);
      return { data: null, error };
    }
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

// Add to src/utils/supabaseService.js
export const jobService = {
  generateJobReference: async () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const nums = '0123456789';
    
    let reference = '';
    // First 2 letters
    for (let i = 0; i < 2; i++) {
      reference += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // Then 5 numbers
    for (let i = 0; i < 5; i++) {
      reference += nums.charAt(Math.floor(Math.random() * nums.length));
    }
    
    return reference;
  },

  createJob: async (jobData, userId = null) => {
    await trackApiCall('TYPE_A', 'CREATE_JOB', userId);
    
    try {
      // Generate human-readable reference
      const jobReference = await jobService.generateJobReference();
      
      const jobPayload = {
        ...jobData,
        job_reference: jobReference,
        // Remove title if it exists
        title: undefined
      };
      
      const { data, error } = await supabase
        .from('jobs')
        .insert([jobPayload])
        .select()
        .single();

      if (error) throw error;
      
      console.log('✅ Job created with reference:', jobReference);
      return { data, error: null };
      
    } catch (error) {
      console.error('❌ Job creation error:', error);
      return { data: null, error };
    }
  }
};

// ✅ NEW: Helper function to decode base64 to Uint8Array
const decodeBase64 = (base64) => {
  try {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } catch (error) {
    console.error('Base64 decode error:', error);
    throw new Error('Failed to process image');
  }
};

export const getLocalApiCallCount = () => localApiCallCount;