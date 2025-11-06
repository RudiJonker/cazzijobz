import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert
} from 'react-native';
import { lightTheme } from '../../styles/theme';
import { adminService } from '../../utils/supabaseService';

export default function AdminScreen() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalWorkers: 0,
    totalEmployers: 0,
    totalApiCalls: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = async () => {
    try {
      // TODO: Pass actual user ID when we have auth state
      const statsData = await adminService.getStats('temp-user-id');
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load admin stats:', error);
      Alert.alert('Error', 'Failed to load statistics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadStats();
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: lightTheme.colors.background }]}>
        <Text style={[styles.title, { color: lightTheme.colors.text }]}>
          Loading Admin Dashboard...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: lightTheme.colors.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      contentContainerStyle={styles.scrollContent}
    >
      <Text style={[styles.title, { color: lightTheme.colors.text }]}>
        Admin Dashboard
      </Text>

      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: lightTheme.colors.card }]}>
          <Text style={[styles.statNumber, { color: lightTheme.colors.primary }]}>
            {stats.totalUsers}
          </Text>
          <Text style={[styles.statLabel, { color: lightTheme.colors.text }]}>
            Total Users
          </Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: lightTheme.colors.card }]}>
          <Text style={[styles.statNumber, { color: lightTheme.colors.primary }]}>
            {stats.totalWorkers}
          </Text>
          <Text style={[styles.statLabel, { color: lightTheme.colors.text }]}>
            Workers
          </Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: lightTheme.colors.card }]}>
          <Text style={[styles.statNumber, { color: lightTheme.colors.primary }]}>
            {stats.totalEmployers}
          </Text>
          <Text style={[styles.statLabel, { color: lightTheme.colors.text }]}>
            Employers
          </Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: lightTheme.colors.card }]}>
          <Text style={[styles.statNumber, { color: lightTheme.colors.primary }]}>
            {stats.totalApiCalls}
          </Text>
          <Text style={[styles.statLabel, { color: lightTheme.colors.text }]}>
            API Calls
          </Text>
        </View>
      </View>

      <View style={styles.infoSection}>
        <Text style={[styles.infoTitle, { color: lightTheme.colors.text }]}>
          Supabase Usage
        </Text>
        <Text style={[styles.infoText, { color: lightTheme.colors.text }]}>
          Free Tier: 100,000 API calls per month
        </Text>
        <Text style={[styles.infoText, { color: lightTheme.colors.text }]}>
          Current Usage: {stats.totalApiCalls} calls
        </Text>
        <Text style={[styles.infoText, { color: stats.totalApiCalls > 80000 ? lightTheme.colors.error : lightTheme.colors.text }]}>
          Remaining: {100000 - stats.totalApiCalls} calls
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  statCard: {
    width: '48%',
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    textAlign: 'center',
  },
  infoSection: {
    backgroundColor: '#f8fafc',
    padding: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    marginBottom: 5,
  },
});