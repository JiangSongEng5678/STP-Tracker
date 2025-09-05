// netlify/functions/trigger-reminders.js
const { createClient } = require('@supabase/supabase-js');
const webpush = require('web-push');

exports.handler = async function(event) {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    
    // Configure web-push with your credentials from environment variables
    webpush.setVapidDetails(
        `mailto:${process.env.VAPID_EMAIL}`,
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );

    // Get the time range for upcoming appointments (e.g., next 15 minutes)
    const now = new Date();
    const fifteenMinutesFromNow = new Date(now.getTime() + 15 * 60 * 1000);

    // Fetch all prospects with appointments in the next 15 minutes
    const { data: prospects, error } = await supabase
        .from('prospects')
        .select(`
            *,
            subscriptions (
                subscription_data
            )
        `)
        .or(`
            and(status.eq.STP, stp_time.gte.${now.toISOString()}, stp_time.lte.${fifteenMinutesFromNow.toISOString()}),
            and(status.eq.GMS_Appointment, gms_time.gte.${now.toISOString()}, gms_time.lte.${fifteenMinutesFromNow.toISOString()})
        `)
        .not('subscriptions', 'is', null); // Only get prospects where the user has a subscription

    if (error) {
        console.error('Error fetching prospects:', error);
        return { statusCode: 500, body: 'Error fetching prospects.' };
    }

    if (!prospects || prospects.length === 0) {
        return { statusCode: 200, body: 'No upcoming appointments to notify.' };
    }

    // Process each appointment
    const notificationPromises = prospects.map(async (prospect) => {
        // The user's subscription is joined from the database
        const subscription = prospect.subscriptions.subscription_data;
        if (!subscription) return;

        const appointmentTime = new Date(prospect.stp_time || prospect.gms_time);
        const payload = JSON.stringify({
            title: `Reminder: Appointment with ${prospect.name}`,
            body: `Your ${prospect.status === 'STP' ? 'STP' : 'GMS'} is scheduled for ${appointmentTime.toLocaleTimeString('en-US')}`,
        });

        try {
            await webpush.sendNotification(subscription, payload);
            console.log(`Notification sent for ${prospect.name}`);
        } catch (err) {
            console.error('Error sending notification:', err);
            // If subscription is expired or invalid, remove it from the database
            if (err.statusCode === 410 || err.statusCode === 404) {
                await supabase
                    .from('subscriptions')
                    .delete()
                    .eq('user_id', prospect.user_id);
            }
        }
    });

    await Promise.all(notificationPromises);

    return {
        statusCode: 200,
        body: `Processed ${prospects.length} notifications.`,
    };
};