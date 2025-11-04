// src/hooks/useSupabase.js
import { useState } from 'react';

// Track API calls for monitoring
let apiCallCount = 0;

export const useSupabase = () => {
  const [loading, setLoading] = useState(false);

  // Function to track API calls
  const trackApiCall = (type, endpoint) => {
    apiCallCount++;
    console.log(`API Call #${apiCallCount} - Type: ${type}, Endpoint: ${endpoint}`);
  };

  // Type A: Immediate API calls (critical actions)
  const typeACall = async (operation, supabaseFunction) => {
    trackApiCall('TYPE_A', operation);
    setLoading(true);
    try {
      const result = await supabaseFunction();
      return result;
    } catch (error) {
      console.error(`Type A API Error (${operation}):`, error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Type B: Batchable API calls (non-critical updates)
  const typeBCall = async (operation, supabaseFunction) => {
    trackApiCall('TYPE_B', operation);
    setLoading(true);
    try {
      const result = await supabaseFunction();
      return result;
    } catch (error) {
      console.error(`Type B API Error (${operation}):`, error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    typeACall,
    typeBCall,
    getApiCallCount: () => apiCallCount,
  };
};