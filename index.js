require('dotenv').config();
const axios = require('axios');

const key = process.env.MTN_CONSUMER_KEY?.trim();
const secret = process.env.MTN_CONSUMER_SECRET?.trim();
const baseUrl = process.env.MTN_BASE_URL?.trim();

async function getAccessToken() {
  if (!key || !secret || !baseUrl) {
    throw new Error('Missing required env vars: MTN_CONSUMER_KEY, MTN_CONSUMER_SECRET, MTN_BASE_URL');
  }

  const tokenUrl = `${new URL('/v1/oauth/access_token/accesstoken', baseUrl).toString()}?grant_type=client_credentials`;
  const config = {
    auth: {
      username: key,
      password: secret
    },
    headers: {
      'Accept': 'application/json'
    },
    timeout: 15000
  };

  try {
    const response = await axios.post(tokenUrl, null, config);

    console.log('--- Full Response Data ---');
    console.log(JSON.stringify(response.data, null, 2));

    const token = response.data.access_token;
    console.log('\n--- Extracted Token ---');
    console.log(token);

    return token;
  } catch (error) {
    console.error('Error details:', error.response ? error.response.data : error.message);
    return null;
  }
}

getAccessToken().then((token) => {
  if (!token) {
    process.exitCode = 1;
  }
});