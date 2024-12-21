const { google } = require('googleapis'); // Google APIs client library for Node.js
const oAuth2Client = require('../config/driveAuth'); // OAuth2 client for authenticating Google API requests
const drive = google.drive({ version: 'v3', auth: oAuth2Client }); // Initialize Google Drive API client
const fs = require('fs'); // File system module for interacting with the local file system
const path = require('path'); // Path module for handling file paths
const mime = require('mime'); // Library to determine file MIME types

/**
 * Function to upload a file to Google Drive.
 *
 * @param {string} filePath - The path of the file to be uploaded.
 * @param {string} [parentFolderId] - Optional parent folder ID for organizing files in Google Drive.
 * @returns {Promise<Object>} - A promise that resolves to the response data from Google Drive, including the file ID.
 */
exports.uploadToDrive = async (filePath, parentFolderId = null) => {
    try {
        // Validate the file path
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }

        // Extract the file name and determine its MIME type
        const fileName = path.basename(filePath);
        const mimeType = mime.getType(filePath) || 'application/octet-stream';

        // Prepare file metadata
        const fileMetadata = { name: fileName };
        if (parentFolderId) {
            fileMetadata.parents = [parentFolderId]; // Specify the parent folder
        }

        // Prepare media object
        const media = { mimeType, body: fs.createReadStream(filePath) };

        // Upload the file to Google Drive
        const response = await drive.files.create({
            resource: fileMetadata,
            media,
            fields: 'id', // Request only the file ID in the response
        });

        console.log(`File uploaded successfully: ${fileName}, File ID: ${response.data.id}`);
        return response.data; // Return the file ID and other response data
    } catch (error) {
        console.error(`Error uploading file to Google Drive: ${error.message}`);
        throw error; // Re-throw the error for further handling
    }
};

/**
 * Function to generate a direct download link for a file on Google Drive.
 *
 * @param {string} fileId - The ID of the file on Google Drive.
 * @returns {string} - A URL that can be used to directly download the file.
 */
exports.getDownloadLink = (fileId) => {
    try {
        if (!fileId) {
            throw new Error('Invalid file ID');
        }
        // Generate and return the download link using the file ID
        return `https://drive.google.com/uc?id=${fileId}&export=download`;
    } catch (error) {
        console.error(`Error generating download link: ${error.message}`);
        throw error; // Re-throw the error for further handling
    }
};