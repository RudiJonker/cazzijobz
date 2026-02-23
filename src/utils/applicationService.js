// src/utils/applicationService.js
import { supabase } from './supabaseClient';

export const applicationService = {
  // Auto-decline conflicting hire offers and notify employer
  handleScheduleConflict: async (workerId, newJob, acceptedApplicationId) => {
    try {
      console.log('🚨 Handling schedule conflicts for worker:', workerId);
      
      // Find all other hired (but not confirmed) applications for this worker
      const { data: otherHireOffers, error } = await supabase
        .from('applications')
        .select(`
          id,
          job_id,
          jobs!inner (
            id,
            job_reference,
            scheduled_date,
            time_from,
            time_to,
            employer_id,
            profiles!jobs_employer_id_fkey (
              email,
              full_name
            )
          )
        `)
        .eq('worker_id', workerId)
        .eq('status', 'hired')
        .eq('worker_confirmed', false)
        .neq('id', acceptedApplicationId);

      if (error) throw error;

      if (!otherHireOffers || otherHireOffers.length === 0) {
        console.log('✅ No other hire offers to decline');
        return;
      }

      // Check each hire offer for time conflict
      const conflictingOffers = [];
      for (const offer of otherHireOffers) {
        const existingJob = offer.jobs;
        const conflict = checkTimeOverlap(
          existingJob.time_from,
          existingJob.time_to,
          newJob.time_from,
          newJob.time_to
        );

        if (conflict) {
          conflictingOffers.push(offer);
        }
      }

      if (conflictingOffers.length === 0) {
        console.log('✅ No schedule conflicts with other hire offers');
        return;
      }

      console.log(`❌ Auto-declining ${conflictingOffers.length} conflicting hire offers`);

      // Auto-decline all conflicting offers
      const declinePromises = conflictingOffers.map(async (offer) => {
        // Update application status
        await supabase
          .from('applications')
          .update({
            status: 'declined',
            auto_declined_reason: 'Worker accepted conflicting job offer',
            worker_confirmed: false
          })
          .eq('id', offer.id);

        // TODO: Create notification for employer
        // await createNotificationForEmployer(offer.jobs.employer_id, {
        //   type: 'conflict',
        //   job_reference: offer.jobs.job_reference,
        //   worker_name: 'The worker',
        //   reason: 'already scheduled for another job at this time'
        // });

        console.log(`✅ Auto-declined offer for job: ${offer.jobs.job_reference}`);
      });

      await Promise.all(declinePromises);

      console.log('🎉 All conflicting offers auto-declined successfully');

    } catch (error) {
      console.error('❌ Error handling schedule conflicts:', error);
      // Don't throw - let the main acceptance succeed
    }
  },

  // Check time overlap helper
  checkTimeOverlap: (existingStart, existingEnd, newStart, newEnd) => {
    const toMinutes = (timeStr) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const existingStartMin = toMinutes(existingStart);
    const existingEndMin = toMinutes(existingEnd);
    const newStartMin = toMinutes(newStart);
    const newEndMin = toMinutes(newEnd);

    // 30-minute grace period
    const gracePeriod = 30;
    const effectiveExistingStart = existingStartMin - gracePeriod;
    const effectiveExistingEnd = existingEndMin + gracePeriod;

    return newStartMin < effectiveExistingEnd && newEndMin > effectiveExistingStart;
  }
};