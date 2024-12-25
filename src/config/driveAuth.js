// Import the required modules from Google APIs
const { google } = require('googleapis');

// Parse the GOOGLE_SERVICE_ACCOUNT_KEY environment variable
const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);

// Configure a JWT (JSON Web Token) auth client using the service account credentials
const jwtClient = new google.auth.JWT(
    credentials.client_email,
    null,
    credentials.private_key,
    ['https://www.googleapis.com/auth/drive'] // Scope specifying access to Google Drive
);

// Authorize the JWT client with Google APIs
jwtClient.authorize((err, tokens) => {
    if (err) {
        console.error('Error authorizing JWT client:', err);
        return;
    }
    console.log('Successfully authenticated with Google APIs');
});

// Export the authorized JWT client for use in other modules
module.exports = jwtClient;

// Log the first few characters of the private key to verify it's loaded correctly
console.log('First 50 characters of private key:', credentials.private_key.substring(0, 50));