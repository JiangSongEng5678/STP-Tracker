// netlify/functions/get-vapid-key.js

exports.handler = async function(event, context) {
    // This function simply returns the VAPID Public Key stored in environment variables.
    // This is more secure than hardcoding it in the front-end HTML.
    const publicKey = process.env.VAPID_PUBLIC_KEY;

    if (!publicKey) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'VAPID Public Key not set in environment variables.' })
        };
    }

    return {
        statusCode: 200,
        body: JSON.stringify({ publicKey: publicKey })
    };
};