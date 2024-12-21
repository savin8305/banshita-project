const fs = require('fs');

// Retrieve Base64-encoded credentials from the environment
const encodedCredentials = process.env.GOOGLE_CREDENTIALS;

if (!encodedCredentials) {
  throw new Error('GOOGLE_CREDENTIALS environment variable is missing');
}

try {
  // Decode the Base64 string
  const decodedCredentials = Buffer.from(encodedCredentials, 'base64').toString('utf8');

  // Validate the JSON structure
  const credentialsJson = JSON.parse(decodedCredentials);

  // Write the credentials to a file
  const credentialsPath = './credentials.js';
  if (!fs.existsSync(credentialsPath)) {
    fs.writeFileSync(credentialsPath, JSON.stringify(credentialsJson, null, 2));
    console.log('credentials.js created successfully.');
  }
} catch (error) {
  console.error('Failed to decode and parse GOOGLE_CREDENTIALS:', error.message);
  throw error;
}
