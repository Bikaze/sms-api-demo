require('dotenv').config();
const axios = require('axios');

// ⚙️ Configuration from .env
const key = process.env.MTN_CONSUMER_KEY?.trim();
const secret = process.env.MTN_CONSUMER_SECRET?.trim();
const baseUrl = process.env.MTN_BASE_URL?.trim();

// 🎫 Token Cache
let cachedToken = null;
let expiryTimestamp = 0;

// 🛌 Helper: Sleep for retries
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 🔐 Step 1: Fetch Access Token with Retries
 * Uses the token URL defined in the API security settings.
 */
async function fetchNewToken() {
  const maxRetries = 3;
  // Construct the URL safely using the path from the API definition
  const tokenUrl = `${new URL('/v1/oauth/access_token/accesstoken', baseUrl).toString()}?grant_type=client_credentials`;

  for (let i = 1; i <= maxRetries; i++) {
    try {
      console.log(`[Auth] Attempt ${i}: Requesting new token... 🛰️`);
      const response = await axios.post(tokenUrl, null, {
        auth: { username: key, password: secret },
        headers: { 'Accept': 'application/json' },
        timeout: 10000
      });
      return response.data;
    } catch (error) {
      if (i < maxRetries) {
        console.warn(`[Auth] Attempt ${i} failed. Retrying in 2s... ⏳`);
        await sleep(2000);
      } else {
        console.error('[Auth] Final attempt failed. Check your keys or network. 🛑');
        throw error;
      }
    }
  }
}

/**
 * 🛡️ Step 2: Token Manager (Pre-flight Check)
 */
async function getValidToken() {
  const now = Date.now();
  const buffer = 300000; // 5-minute safety buffer

  if (cachedToken && now < (expiryTimestamp - buffer)) {
    return cachedToken;
  }

  const data = await fetchNewToken();
  cachedToken = data.access_token;
  // expires_in is usually 3599 seconds
  expiryTimestamp = Date.now() + (parseInt(data.expires_in) * 1000);
  console.log('[Auth] Token refreshed successfully. ✅');
  return cachedToken;
}

/**
 * 📲 Step 3: Send SMS
 * Uses the /messages/sms/outbound endpoint.
 */
async function sendSMS(recipients, messageText) {
  try {
    const token = await getValidToken();
    const smsUrl = new URL('/v3/sms/messages/sms/outbound', baseUrl).toString();

    // 📦 Build the request body based on the API definition
    const payload = {
      message: messageText,
      serviceCode: "250789428456", // 🧪 Test value: Replace with your actual Short Code later
      senderAddress: "250789428456", // 🧪 Test value: Replace with your approved Sender ID
      receiverAddress: recipients, // Must be an array of E.164 numbers
      clientCorrelatorId: `INV-${Date.now()}`, // Unique ID for tracking (max 36 chars)
      requestDeliveryReceipt: false // Optional: Set to true if you subscribe to receipts
    };

    const response = await axios.post(smsUrl, payload, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    console.log('--- SMS Response ---');
    console.log(JSON.stringify(response.data, null, 2));
    return response.data;

  } catch (error) {
    console.error('[SMS Error]:', error.response ? error.response.data : error.message);
    return null;
  }
}

// 🚀 Execute Test
// Using Rwandan number format: 250 + 78/79/72/73...
const testRecipients = ["250789428456"]; // 🧪 Test recipient: Replace with a valid number for real tests
const testMessage = "Hello from your new Bus Ticket system! 🚌";

sendSMS(testRecipients, testMessage);