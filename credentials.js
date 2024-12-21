import { writeFileSync } from 'fs';

// Decode the Base64 string
const googleCredentials = Buffer.from(process.env.GOOGLE_CREDENTIALS, 'base64').toString('utf8');

// Write the decoded credentials to a temporary file
writeFileSync('credentials.json', googleCredentials);

console.log('credentials.json created successfully.');
