// Load environment variables from a .env file into process.env
require('dotenv').config();

// Import necessary modules
const fs = require('fs'); // File system module to interact with the file system
const path = require('path'); // Path module to handle file paths
const { downloadFromDrive } = require('../utils/downloadUtils'); // Custom utility function to download files from Google Drive
const { checkForChanges } = require('../services/sheetService'); // Service function to check for changes in Google Sheets

/**
 * Function to process data from the Google Sheet and handle FTP uploads.
 * This function checks for any changes in the Google Sheet, downloads any updated files from Google Drive,
 * and uploads them to the specified folder structure.
 */
const processSheetData = async () => {
    try {
        // Check for changes in the Google Sheet using the checkForChanges function
        const changedData = await checkForChanges();

        // If changes are detected in the Google Sheet
        if (changedData && changedData.length > 0) {
            for (const [index, row] of changedData.entries()) {
                const [text, videoLink, imageLink] = row; // Destructure the row into text, videoLink, and imageLink
                const folderPath = path.join(__dirname, '../../uploads/', text); // Define the folder path based on the text

                // Ensure the folder exists, creating it if necessary
                if (!fs.existsSync(folderPath)) {
                    fs.mkdirSync(folderPath, { recursive: true });
                }

                // Prepare a list of files to download based on which links are present
                const filesToDownload = [];
                if (videoLink) filesToDownload.push({ link: videoLink, type: 'video' });
                if (imageLink) filesToDownload.push({ link: imageLink, type: 'image' });

                // Process each updated file (video or image) by downloading and uploading
                for (const { link: fileLink, type: fileType } of filesToDownload) {
                    try {
                        // Download the file from Google Drive and save it in the folderPath
                        const uploadedFileName = await downloadFromDrive(fileLink, folderPath);
                        console.log(`Successfully processed ${fileType} file: ${uploadedFileName} in ${folderPath}`);
                    } catch (error) {
                        // Log any errors that occur during the download process
                        console.error(`Error processing ${fileType} file ${fileLink} in row ${index + 1}: ${error.message}`);
                    }
                }

                console.log(`Completed updating folder: ${folderPath}`); // Log the completion of the folder update
            }
            return 'Folders updated based on sheet changes.';
        } else {
            console.log('No changes detected in the sheet.'); // Log if no changes were detected
            return 'No changes detected in the sheet.';
        }
    } catch (error) {
        // Catch and log any errors that occur during the sheet processing
        console.error(`Error in processing sheet data: ${error.message}`);
        throw error; // Re-throw the error for further handling
    }
};

// Export the processSheetData function so it can be used in other parts of the application
module.exports = { processSheetData };
