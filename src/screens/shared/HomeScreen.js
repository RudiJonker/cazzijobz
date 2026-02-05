// src/screens/shared/HomeScreen.js - UPDATED WITH CLEAN HEADER
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { storageService } from '../../utils/storageService';
import { supabase } from '../../utils/supabaseClient';
import { COLORS, SIZES } from '../../styles/theme';
import { lightTheme } from '../../styles/theme';

export default function HomeScreen({ navigation }) {
  const [userProfile, setUserProfile] = useState(null);
  const [stats, setStats] = useState({});
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const profile = await storageService.getUserProfile();
      setUserProfile(profile);
      
      // Load role-specific stats
      if (profile?.role === 'worker') {
        await loadWorkerStats(profile);
      } else if (profile?.role === 'employer') {
        await loadEmployerStats(profile);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    }
  };

  const loadWorkerStats = async (profile) => {
    try {
      const userId = profile.id;

      // Get application counts
      const { data: applications, error: appsError } = await supabase
        .from('applications')
        .select('status, jobs(scheduled_date)')
        .eq('worker_id', userId);

      if (appsError) throw appsError;

      // Count applications by status
      const appStats = applications?.reduce((acc, app) => {
        acc[app.status] = (acc[app.status] || 0) + 1;
        return acc;
      }, {}) || {};

      // Count upcoming jobs (hired applications in the future)
      const now = new Date();
      const upcomingJobs = applications?.filter(app =>
        app.status === 'hired' &&
        app.jobs &&
        new Date(app.jobs.scheduled_date) > now
      ).length || 0;

      // Get available jobs count (rough estimate)
      const { count: availableJobsCount, error: jobsError } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'open')
        .ilike('location_city', `%${profile.location_city || ''}%`);

      setStats({
        pendingApplications: appStats.applied || 0,
        upcomingJobs: upcomingJobs,
        totalEarnings: 0, // TODO: Implement when payment system is added
        newJobsAvailable: availableJobsCount || 0
      });

    } catch (error) {
      console.error('Error loading worker stats:', error);
      // Fallback to zeros
      setStats({
        pendingApplications: 0,
        upcomingJobs: 0,
        totalEarnings: 0,
        newJobsAvailable: 0
      });
    }
  };

  const loadEmployerStats = async (profile) => {
    try {
      const userId = profile.id;

      // Get job counts by status
      const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select('status')
        .eq('employer_id', userId);

      if (jobsError) throw jobsError;

      // Count jobs by status
      const jobStats = jobs?.reduce((acc, job) => {
        acc[job.status] = (acc[job.status] || 0) + 1;
        return acc;
      }, {}) || {};

      // Get application counts
      const { data: applications, error: appsError } = await supabase
        .from('applications')
        .select('status, jobs(status)')
        .eq('jobs.employer_id', userId);

      if (appsError) throw appsError;

      // Count applications by status
      const appStats = applications?.reduce((acc, app) => {
        acc[app.status] = (acc[app.status] || 0) + 1;
        return acc;
      }, {}) || {};

      setStats({
        openJobs: jobStats.open || 0,
        pendingApplications: appStats.applied || 0,
        activeJobs: jobStats.active || 0,
        totalHires: appStats.hired || 0
      });

    } catch (error) {
      console.error('Error loading employer stats:', error);
      // Fallback to zeros
      setStats({
        openJobs: 0,
        pendingApplications: 0,
        activeJobs: 0,
        totalHires: 0
      });
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const StatCard = ({ title, value, subtitle, color = COLORS.primary, onPress }) => (
    <TouchableOpacity 
      style={[styles.statCard, { borderLeftColor: color }]}
      onPress={onPress}
    >
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </TouchableOpacity>
  );

  if (!userProfile) {
    return (
      <View style={styles.container}>
        <Text>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={onRefresh}
          colors={[COLORS.primary]}
        />
      }
    >
      {/* Clean Header - White background, blue text */}
      <View style={styles.header}>
        <Text style={styles.welcomeText}>
          Dashboard
        </Text>
        <Text style={styles.roleText}>
          {userProfile.role === 'worker' ? 'Worker' : 'Employer'} Dashboard
        </Text>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>Quick Overview</Text>
        
        {userProfile.role === 'worker' ? (
          <View style={styles.statsGrid}>
            <StatCard 
              title="Pending Applications" 
              value={stats.pendingApplications || 0}
              color={COLORS.warning}
              onPress={() => navigation.navigate('My Applications')}
            />
            <StatCard 
              title="Upcoming Jobs" 
              value={stats.upcomingJobs || 0} 
              color={COLORS.success}
              onPress={() => navigation.navigate('My Schedule')}
            />
            <StatCard 
              title="New Jobs Available" 
              value={stats.newJobsAvailable || 0}
              subtitle="Near you"
              color={COLORS.primary}
              onPress={() => navigation.navigate('Find Jobs')}
            />
            <StatCard 
              title="Total Earnings" 
              value={`R${stats.totalEarnings || 0}`}
              color={COLORS.info}
            />
          </View>
        ) : (
          <View style={styles.statsGrid}>
            <StatCard 
              title="Open Jobs" 
              value={stats.openJobs || 0}
              color={COLORS.primary}
              onPress={() => navigation.navigate('My Jobs')}
            />
            <StatCard 
              title="Pending Applications" 
              value={stats.pendingApplications || 0}
              color={COLORS.warning}
              onPress={() => navigation.navigate('My Jobs')}
            />
            <StatCard 
              title="Active Jobs" 
              value={stats.activeJobs || 0}
              color={COLORS.success}
            />
            <StatCard 
              title="Total Hires" 
              value={stats.totalHires || 0}
              color={COLORS.info}
            />
          </View>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsSection}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        
        {userProfile.role === 'worker' ? (
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('Find Jobs')}
            >
              <Text style={styles.actionEmoji}>🔍</Text>
              <Text style={styles.actionText}>Find Jobs</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('My Applications')}
            >
              <Text style={styles.actionEmoji}>📋</Text>
              <Text style={styles.actionText}>My Applications</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('My Schedule')}
            >
              <Text style={styles.actionEmoji}>📅</Text>
              <Text style={styles.actionText}>My Schedule</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('Post Job')}
            >
              <Text style={styles.actionEmoji}>📝</Text>
              <Text style={styles.actionText}>Post a Job</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('My Jobs')}
            >
              <Text style={styles.actionEmoji}>📋</Text>
              <Text style={styles.actionText}>Manage Jobs</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: lightTheme.colors.background,
  },
  // Clean Header - White background, blue text
  header: {
    padding: SIZES.padding,
    paddingBottom: SIZES.padding / 2,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  welcomeText: {
    fontSize: SIZES.xLarge,
    fontWeight: 'bold',
    textAlign: 'center',
    color: COLORS.primary,
    marginBottom: 4,
    marginTop: 15,
  },
  roleText: {
    fontSize: SIZES.small,
    color: COLORS.gray600,
  },
  statsSection: {
    padding: SIZES.padding,
  },
  sectionTitle: {
    fontSize: SIZES.large,
    fontWeight: 'bold',
    color: COLORS.gray800,
    marginBottom: SIZES.margin,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: COLORS.white,
    padding: SIZES.padding,
    borderRadius: SIZES.radius,
    marginBottom: SIZES.margin,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    shadowColor: COLORS.gray800,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: SIZES.xLarge,
    fontWeight: 'bold',
    color: COLORS.gray800,
    marginBottom: 4,
  },
  statTitle: {
    fontSize: SIZES.xSmall,
    color: COLORS.gray600,
    fontWeight: '500',
  },
  statSubtitle: {
    fontSize: SIZES.xxSmall,
    color: COLORS.gray500,
    marginTop: 2,
  },
  actionsSection: {
    padding: SIZES.padding,
    paddingTop: 0,
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '48%',
    backgroundColor: COLORS.white,
    padding: SIZES.padding,
    borderRadius: SIZES.radius,
    marginBottom: SIZES.margin,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.gray300,
  },
  actionEmoji: {
    fontSize: SIZES.xLarge,
    marginBottom: 8,
  },
  actionText: {
    fontSize: SIZES.small,
    color: COLORS.gray700,
    fontWeight: '500',
    textAlign: 'center',
  },
};