// Import the required modules from Google APIs and Node.js
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

// Define the path to the service account credentials file
const credentialsPath = path.join(__dirname, '../../credentials.json');

// Read and parse the service account credentials from the JSON file
const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

// Configure a JWT (JSON Web Token) auth client using the service account credentials
const jwtClient = new google.auth.JWT(
    credentials.client_email, // Service account email
    null,                     // Path to the private key file (null since we're using the key directly)
    credentials.private_key,  // Service account private key
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