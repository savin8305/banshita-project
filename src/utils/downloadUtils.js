// Import necessary modules
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const ftp = require('basic-ftp');
const crypto = require('crypto');
const oAuth2Client = require('../config/driveAuth');

// Initialize Google Drive client
const drive = google.drive({ version: 'v3', auth: oAuth2Client });

// FTP configuration
const ftpConfig = {
    host: process.env.FTP_HOST,
    port: process.env.FTP_PORT || 21,
    user: process.env.FTP_USERNAME,
    password: process.env.FTP_PASSWORD,
    secure: false,
};

/**
 * Calculate the MD5 hash of a file.
 * @param {string} filePath - Path to the file.
 * @returns {Promise<string>} - MD5 hash.
 */
const calculateFileHash = (filePath) => {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('md5');
        const stream = fs.createReadStream(filePath);

        stream.on('data', (data) => hash.update(data));
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', reject);
    });
};

/**
 * Create a directory if it doesn't exist.
 * @param {string} dirPath - Path of the directory.
 */
const ensureDirectoryExists = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};

/**
 * Download a file from Google Drive.
 * @param {string} fileId - ID of the file on Google Drive.
 * @param {string} filePath - Local file path to save the downloaded file.
 * @returns {Promise<void>}
 */
const downloadFileFromDrive = async (fileId, filePath) => {
    const dest = fs.createWriteStream(filePath);
    const res = await drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'stream' }
    );

    return new Promise((resolve, reject) => {
        res.data.pipe(dest);
        dest.on('finish', resolve);
        dest.on('error', reject);
    });
};

/**
 * Upload a file to FTP server.
 * @param {ftp.Client} client - FTP client instance.
 * @param {string} localFilePath - Local file path.
 * @param {string} ftpFilePath - Destination path on FTP server.
 * @returns {Promise<void>}
 */
const uploadFileToFtp = async (client, localFilePath, ftpFilePath) => {
    await client.uploadFrom(localFilePath, ftpFilePath);
};

/**
 * Main function to download from Google Drive and upload to FTP.
 * @param {string} driveLink - Google Drive link.
 * @param {string} folderName - Folder name on FTP server.
 * @param {string} customFileName - Optional custom file name for saving.
 * @returns {Promise<string>} - Name of the uploaded file.
 */
exports.downloadFromDrive = async (driveLink, folderName, customFileName = null) => {
    if (!driveLink) throw new Error('Invalid Drive link');

    // Extract file ID from Drive link
    const fileIdMatch = driveLink.match(/\/d\/([a-zA-Z0-9_-]{25,})/);
    if (!fileIdMatch || !fileIdMatch[1]) throw new Error('Invalid Drive link format');

    const fileId = fileIdMatch[1];
    console.log(`Downloading file with ID: ${fileId}`);

    try {
        // Get file metadata
        const fileMetadata = await drive.files.get({
            fileId,
            fields: 'name, md5Checksum, size',
        });

        const fileName = customFileName || path.basename(fileMetadata.data.name);
        const backupFileName = `${path.basename(fileName, path.extname(fileName))}(m)${path.extname(fileName)}`;
        const driveFileSize = parseInt(fileMetadata.data.size, 10);
        const driveFileHash = fileMetadata.data.md5Checksum;

        const client = new ftp.Client();
        client.ftp.verbose = true;

        try {
            await client.access(ftpConfig);
            const sanitizedFolderName = path.basename(folderName);
            await client.ensureDir(sanitizedFolderName);

            let fileExists = false;

            try {
                await client.cd(sanitizedFolderName);
                const files = await client.list();
                const ftpFile = files.find(file => file.name === fileName);

                if (ftpFile && ftpFile.size === driveFileSize) {
                    const tempDir = path.join(__dirname, '../temp/');
                    ensureDirectoryExists(tempDir);

                    const tempFilePath = path.join(tempDir, fileName);
                    await client.downloadTo(tempFilePath, ftpFile.name);
                    const ftpFileHash = await calculateFileHash(tempFilePath);
                    fs.unlinkSync(tempFilePath);

                    fileExists = ftpFileHash === driveFileHash;

                    if (fileExists) {
                        console.log(`File ${fileName} already exists and is identical. Skipping upload.`);
                        return fileName;
                    }
                }
            } catch (err) {
                if (err.code !== 550) throw err;
            }

            // Backup existing file
            try {
                await client.rename(fileName, backupFileName);
                console.log(`Renamed existing file to: ${backupFileName}`);
            } catch (renameErr) {
                if (renameErr.code !== 550) {
                    console.error(`Failed to rename file: ${renameErr.message}`);
                }
            }

            const tempDir = path.join(__dirname, '../temp/');
            ensureDirectoryExists(tempDir);

            const tempFilePath = path.join(tempDir, fileName);
            await downloadFileFromDrive(fileId, tempFilePath);
            await uploadFileToFtp(client, tempFilePath, path.join(sanitizedFolderName, fileName));

            console.log(`Uploaded file: ${fileName} to ${sanitizedFolderName}`);
            fs.unlinkSync(tempFilePath);
        } catch (ftpError) {
            console.error(`FTP upload failed: ${ftpError.message}`);
            throw ftpError;
        } finally {
            client.close();
        }

        return fileName;
    } catch (error) {
        console.error(`Error during download and upload: ${error.message}`);
        throw error;
    }
};