import { supabase } from '../db/supabase.js';

export async function processJobAlerts() {
  console.log('[Alert Scheduler] Scanning for newly published jobs and active subscribers...');
  try {
    // 1. Fetch published jobs that haven't been archived
    const { data: jobs } = await supabase
      .from('jobs')
      .select('*')
      .eq('status', 'published');

    if (!jobs || jobs.length === 0) {
      console.log('[Alert Scheduler] No published jobs to distribute.');
      return;
    }

    // 2. Fetch active alert subscriptions
    const { data: subscriptions } = await supabase
      .from('alert_subscriptions')
      .select('*')
      .eq('active', true);

    if (!subscriptions || subscriptions.length === 0) {
      console.log('[Alert Scheduler] No active subscriptions found.');
      return;
    }

    for (const sub of subscriptions) {
      for (const job of jobs) {
        // Check if alert already sent to prevent duplicate notifications (FR-8.7)
        const { data: existing } = await supabase
          .from('alert_deliveries')
          .select('id')
          .eq('subscription_id', sub.id)
          .eq('job_id', job.id)
          .maybeSingle();

        if (existing) continue;

        // Perform keyword and location matching
        const matchesKeyword = sub.keywords && sub.keywords.length > 0
          ? sub.keywords.some((kw: string) => job.title.toLowerCase().includes(kw.toLowerCase()) || job.requirements.toLowerCase().includes(kw.toLowerCase()))
          : true;

        const matchesLocation = !sub.location || job.location.toLowerCase().includes(sub.location.toLowerCase());

        if (matchesKeyword && matchesLocation) {
          console.log(`[Alert Scheduler] Dispatching alert for job "${job.title}" to learner ${sub.learner_id} via ${sub.channel}`);

          // Record delivery in Supabase
          await supabase.from('alert_deliveries').insert({
            subscription_id: sub.id,
            job_id: job.id,
            channel: sub.channel,
            status: 'delivered',
          });
        }
      }
    }
  } catch (error) {
    console.error('[Alert Scheduler] Error processing alerts:', error);
  }
}

