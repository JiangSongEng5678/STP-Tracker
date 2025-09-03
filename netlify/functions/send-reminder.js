// netlify/functions/send-reminder.js
const { createClient } = require('@supabase/supabase-js');
const webpush = require('web-push');

exports.handler = async function(event) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const { prospect } = JSON.parse(event.body);
    if (!prospect || !prospect.user_id) {
        return { statusCode: 400, body: 'Invalid prospect data provided.' };
    }

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

    // Fetch the user's notification subscription
    const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .select('subscription_data')
        .eq('user_id', prospect.user_id)
        .single();

    if (subError || !subscription) {
        console.error('Subscription not found:', subError);
        return { statusCode: 404, body: 'Subscription not found for user.' };
    }
    
    // Configure web-push
    webpush.setVapidDetails(
        'mailto:jiangsongeg@gmail.com', // Replace with your email
        'BM-rYXi3UD0QXBdZxacdgzlKI6oikvIv0j-818-RejlqQ8dKWxCFXVBLdtM9-msrPaKgGuBbCGAdhLwQsWV3miM',         // Replace with your PUBLIC Vapid key
        process.env.VAPID_PRIVATE_KEY
    );

    const payload = JSON.stringify({
        title: `Reminder: Appointment with ${prospect.name}`,
        body: `Your ${prospect.status === 'STP' ? 'STP' : 'GMS'} is scheduled for ${new Date(prospect.stpTime || prospect.gmsTime).toLocaleTimeString()}`,
    });

    try {
        await webpush.sendNotification(subscription.subscription_data, payload);
        return { statusCode: 200, body: 'Notification sent.' };
    } catch (error) {
        console.error('Error sending notification:', error);
        return { statusCode: 500, body: 'Failed to send notification.' };
    }
};