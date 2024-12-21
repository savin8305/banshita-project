// Import necessary modules
const { google } = require('googleapis'); // Google APIs client library for Node.js
const oAuth2Client = require('../config/driveAuth'); // OAuth2 client for authenticating Google API requests
const drive = google.drive({ version: 'v3', auth: oAuth2Client }); // Initialize Google Drive API client
const fs = require('fs'); // File system module for interacting with the local file system

/**
 * Function to upload a file to Google Drive.
 * 
 * @param {string} filePath - The path of the file to be uploaded.
 * @returns {Promise<Object>} - A promise that resolves to the response data from Google Drive, including the file ID.
 */
exports.uploadToDrive = async (filePath) => {
    // Extract the file name from the file path
    const fileMetadata = { name: filePath.split('/').pop() };
    
    // Define the media object for the upload, including the file's MIME type and the file stream
    const media = { mimeType: 'application/octet-stream', body: fs.createReadStream(filePath) };
    
    // Upload the file to Google Drive
    const response = await drive.files.create({
        resource: fileMetadata, // File metadata (e.g., file name)
        media: media,           // File content and MIME type
        fields: 'id',           // Request only the file ID in the response
    });
    
    // Return the response data containing the file ID
    return response.data;
};

/**
 * Function to generate a direct download link for a file on Google Drive.
 * 
 * @param {string} fileId - The ID of the file on Google Drive.
 * @returns {string} - A URL that can be used to directly download the file.
 */
exports.getDownloadLink = (fileId) => {
    // Generate and return the download link using the file ID
    return `https://drive.google.com/uc?id=${fileId}&export=download`;
};
