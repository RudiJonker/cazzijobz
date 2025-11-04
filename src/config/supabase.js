// src/config/supabase.js
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey;

// Initialize Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);