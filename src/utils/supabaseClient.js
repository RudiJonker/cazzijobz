// src/utils/supabaseClient.js
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// TEMPORARY: Hardcode your Supabase credentials
const supabaseUrl = 'https://wwuqejbsotizqdcwqfpu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3dXFlamJzb3RpenFkY3dxZnB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNDg3MjgsImV4cCI6MjA3NzgyNDcyOH0.9uYGQJr2S2_tCvvo0FhXbRGwklKLZuhUM17nY0TuHfU'; // MAKE SURE THIS IS YOUR REAL KEY

//console.log('Supabase URL:', supabaseUrl);

// Validate credentials
if (!supabaseUrl || !supabaseAnonKey || supabaseAnonKey === 'your_actual_anon_key_here') {
  throw new Error('Missing Supabase credentials - please add your anon key');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});