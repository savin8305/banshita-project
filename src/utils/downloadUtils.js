// Import necessary modules
const { google } = require('googleapis'); // Google APIs client library for Node.js
const fs = require('fs'); // File system module for file operations
const path = require('path'); // Path module for handling and transforming file paths
const ftp = require('basic-ftp'); // FTP client for uploading/downloading files
const crypto = require('crypto'); // Crypto module for creating hash values
const oAuth2Client = require('../config/driveAuth'); // Import OAuth2 client configuration for Google Drive

// Initialize the Google Drive client with OAuth credentials
const drive = google.drive({ version: 'v3', auth: oAuth2Client });

// FTP configuration using environment variables
const ftpConfig = {
    host: process.env.FTP_HOST, // FTP server host
    port: process.env.FTP_PORT || 21, // FTP server port, defaulting to 21
    user: process.env.FTP_USERNAME, // FTP username
    password: process.env.FTP_PASSWORD, // FTP password
    secure: false, // Use secure connection (FTPS) if set to true
};

/**
 * Function to calculate the MD5 hash of a file to verify its integrity.
 * This is used to ensure that files are identical between Google Drive and the FTP server.
 * 
 * @param {string} filePath - The path of the file to calculate the hash for.
 * @returns {Promise<string>} - A promise that resolves with the MD5 hash of the file.
 */
const calculateFileHash = (filePath) => {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('md5'); // Create an MD5 hash object
        const stream = fs.createReadStream(filePath); // Create a read stream for the file

        stream.on('data', (data) => hash.update(data)); // Update the hash with data chunks as they are read
        stream.on('end', () => resolve(hash.digest('hex'))); // Resolve the promise with the hash value when done
        stream.on('error', reject); // Reject the promise if an error occurs
    });
};

/**
 * Function to download a file from Google Drive to a local file path.
 * 
 * @param {string} fileId - The ID of the file on Google Drive.
 * @param {string} filePath - The local file path to save the downloaded file.
 * @returns {Promise<void>} - A promise that resolves when the download is complete.
 */
const downloadFileFromDrive = async (fileId, filePath) => {
    const dest = fs.createWriteStream(filePath); // Create a write stream to save the file
    const res = await drive.files.get(
        { fileId, alt: 'media' }, // Request file content in media format
        { responseType: 'stream' } // Use streaming for efficient downloading
    );

    return new Promise((resolve, reject) => {
        res.data.pipe(dest); // Pipe the response data to the file
        dest.on('finish', resolve); // Resolve when the download is complete
        dest.on('error', reject); // Reject if there is an error during download
    });
};

/**
 * Function to upload a file to the FTP server.
 * 
 * @param {ftp.Client} client - The FTP client instance.
 * @param {string} localFilePath - The local file path of the file to be uploaded.
 * @param {string} ftpFilePath - The target file path on the FTP server.
 * @returns {Promise<void>} - A promise that resolves when the upload is complete.
 */
const uploadFileToFtp = async (client, localFilePath, ftpFilePath) => {
    await client.uploadFrom(localFilePath, ftpFilePath); // Upload the file from local path to FTP path
};

/**
 * Main function to handle the download from Google Drive and upload to FTP.
 * 
 * @param {string} driveLink - The Google Drive link to download the file from.
 * @param {string} folderName - The folder name on the FTP server to upload the file to.
 * @returns {Promise<string>} - A promise that resolves with the name of the uploaded file.
 */
exports.downloadFromDrive = async (driveLink, folderName) => {
    if (!driveLink) throw new Error('Invalid Drive link'); // Validate that a Drive link is provided

    // Extract the file ID from the Google Drive link using a regular expression
    const fileIdMatch = driveLink.match(/\/d\/([a-zA-Z0-9_-]{25,})/);
    if (!fileIdMatch || !fileIdMatch[1]) throw new Error('Invalid Drive link format'); // Throw an error if the file ID is not found

    const fileId = fileIdMatch[1]; // The extracted file ID
    console.log(`Attempting to download file with ID: ${fileId}`);

    try {
        // Get file metadata from Google Drive (name, MD5 checksum, size)
        const fileMetadata = await drive.files.get({
            fileId,
            fields: 'name, md5Checksum, size',
        });

        // Extract necessary metadata information
        const fileName = path.basename(fileMetadata.data.name); // The original file name
        const backupFileName = `${path.basename(fileName, path.extname(fileName))}(m)${path.extname(fileName)}`; // Backup file name with "(m)"
        const driveFileSize = parseInt(fileMetadata.data.size, 10); // File size in bytes
        const driveFileHash = fileMetadata.data.md5Checksum; // MD5 hash of the file on Google Drive

        const client = new ftp.Client(); // Create a new FTP client instance
        client.ftp.verbose = true; // Enable verbose logging for debugging

        try {
            // Connect to the FTP server using the configuration
            await client.access(ftpConfig);
            const sanitizedFolderName = path.basename(folderName); // Sanitize the folder name to ensure it's valid
            await client.ensureDir(sanitizedFolderName); // Ensure the target directory exists on the FTP server

            let fileExists = false; // Flag to track if the file already exists on the FTP server

            try {
                await client.cd(sanitizedFolderName); // Change to the target directory
                const files = await client.list(); // List all files in the target directory
                const ftpFile = files.find(file => file.name === fileName); // Find the file by name

                // Check if the file exists and matches the size on Google Drive
                if (ftpFile) {
                    if (ftpFile.size === driveFileSize) {
                        // File sizes match; now check MD5 hash
                        const tempDir = path.join(__dirname, '../temp/'); // Temporary directory for downloaded files
                        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true }); // Create the temporary directory if it doesn't exist
                        const tempFilePath = path.join(tempDir, fileName); // Path to save the downloaded file
                        await client.downloadTo(tempFilePath, ftpFile.name); // Download the existing file from the FTP server
                        const ftpFileHash = await calculateFileHash(tempFilePath); // Calculate the hash of the downloaded file
                        fs.unlinkSync(tempFilePath); // Delete the temporary file after hash calculation
                        fileExists = (ftpFileHash === driveFileHash); // Check if the hashes match

                        if (fileExists) {
                            console.log(`File ${fileName} already exists and is identical. Skipping download and upload.`);
                            return fileName; // Files are identical, no need to update
                        }
                    }
                }
            } catch (err) {
                if (err.code !== 550) throw err; // Handle errors other than "file not found"
            }

            // Proceed with file update if sizes differ or hashes do not match
            try {
                await client.rename(fileName, backupFileName); // Rename the existing file to "file(m).ext"
                console.log(`Renamed existing file from ${fileName} to ${backupFileName}`);
            } catch (renameErr) {
                if (renameErr.code !== 550) {
                    console.error(`Failed to rename existing file: ${renameErr.message}`);
                }
            }

            const tempDir = path.join(__dirname, '../temp/'); // Temporary directory for downloading the new file
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true }); // Create the temporary directory if it doesn't exist

            const tempFilePath = path.join(tempDir, fileName); // Local path to save the downloaded file
            await downloadFileFromDrive(fileId, tempFilePath); // Download the new file from Google Drive
            await uploadFileToFtp(client, tempFilePath, fileName); // Upload the new file to the FTP server
            console.log(`Uploaded new file: ${fileName} to ${sanitizedFolderName} on Hostinger's cloud`);

            // Delete the old backup file after successful upload
            try {
                await client.remove(backupFileName); // Remove the backup file "file(m).ext"
                console.log(`Deleted backup file: ${backupFileName}`);
            } catch (deleteErr) {
                if (deleteErr.code !== 550) { // Error code 550 indicates "file not found"
                    console.error(`Failed to delete backup file: ${deleteErr.message}`);
                }
            }

            fs.unlinkSync(tempFilePath); // Clean up local temporary file after uploading
        } catch (ftpError) {
            console.error(`FTP upload failed: ${ftpError.message}`); // Log FTP-related errors
            throw ftpError; // Rethrow the FTP error to be handled by the caller
        } finally {
            client.close(); // Close the FTP client connection
        }

        return fileName; // Return the final file name after successful upload
    } catch (error) {
        console.error(`Failed to download and upload file with ID ${fileId}: ${error.message}`);
        throw error; // Rethrow the error to be handled by the caller
    }
};
