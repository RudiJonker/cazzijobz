import { useState, useEffect, useCallback } from 'react';
import { storageService } from '../utils/storageService';
import { authService } from '../utils/supabaseService';
import { debounce } from '../utils/debounce';

// Configuration
const TYPE_B_TIMEOUT_DEV = 60000; // 1 minute for development
const TYPE_B_TIMEOUT_PROD = 600000; // 10 minutes for production
const IS_DEV = __DEV__; // Expo development mode

const TYPE_B_TIMEOUT = IS_DEV ? TYPE_B_TIMEOUT_DEV : TYPE_B_TIMEOUT_PROD;

export const useProfileSync = () => {
  const [pendingChanges, setPendingChanges] = useState({});
  const [lastSync, setLastSync] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load pending changes on mount
  useEffect(() => {
    loadPendingChanges();
  }, []);

  const loadPendingChanges = async () => {
    try {
      const changes = await storageService.getPendingChanges();
      const lastSyncTime = await storageService.getLastSync();
      
      if (changes) setPendingChanges(changes);
      if (lastSyncTime) setLastSync(new Date(lastSyncTime));
    } catch (error) {
      console.error('Error loading pending changes:', error);
    }
  };

  // Debounced sync function
  const debouncedSync = useCallback(
    debounce(async (changes, userId) => {
      console.log('🔄 Executing debounced Type B sync...');
      await syncToSupabase(changes, userId);
    }, TYPE_B_TIMEOUT),
    []
  );

  // Queue a Type B update
  const queueUpdate = useCallback(async (updates, userId) => {
    if (!userId) {
      console.error('No user ID provided for Type B update');
      return;
    }

    try {
      // Merge with existing pending changes
      const newPendingChanges = { ...pendingChanges, ...updates };
      setPendingChanges(newPendingChanges);

      // Save to local storage
      await storageService.setPendingChanges(newPendingChanges);

      // Update local profile immediately for UI
      const currentProfile = await storageService.getUserProfile();
      if (currentProfile) {
        const updatedProfile = { ...currentProfile, ...updates };
        await storageService.setUserProfile(updatedProfile);
      }

      console.log('📝 Type B update queued:', updates);
      console.log('⏰ Next sync in:', TYPE_B_TIMEOUT / 1000, 'seconds');

      // Start debounced sync
      debouncedSync(newPendingChanges, userId);

    } catch (error) {
      console.error('Error queueing Type B update:', error);
    }
  }, [pendingChanges, debouncedSync]);

  // Manual sync trigger
  const manualSync = async (userId) => {
    if (!pendingChanges || Object.keys(pendingChanges).length === 0) {
      console.log('No pending changes to sync');
      return;
    }

    console.log('🔄 Manual sync triggered');
    await syncToSupabase(pendingChanges, userId);
  };

  // Actual Supabase sync
  const syncToSupabase = async (changes, userId) => {
    if (!changes || Object.keys(changes).length === 0 || !userId) {
      return;
    }

    setIsSyncing(true);
    try {
      console.log('🚀 Syncing Type B changes to Supabase:', changes);
      
      const { error } = await authService.updateProfile({
        id: userId,
        ...changes,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;

      // Clear pending changes on success
      setPendingChanges({});
      await storageService.clearPendingChanges();
      await storageService.setLastSync(new Date().toISOString());
      
      console.log('✅ Type B sync completed successfully');

    } catch (error) {
      console.error('❌ Type B sync failed:', error);
      // Changes remain in pendingChanges for retry
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    queueUpdate,
    manualSync,
    pendingChanges,
    lastSync,
    isSyncing,
  };
};