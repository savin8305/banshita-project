require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { downloadFromDrive } = require('../utils/downloadUtils');
const { checkForChanges } = require('../services/sheetService');

/**
 * Function to process data from the Google Sheet and handle FTP uploads.
 * This function checks for any changes in the Google Sheet, downloads any updated files from Google Drive,
 * and saves them to the specified folder structure using the file name from column C.
 */
const processSheetData = async () => {
    try {
        const changedData = await checkForChanges();

        if (changedData && changedData.length > 0) {
            for (const [index, row] of changedData.entries()) {
                const [text, videoLink, imageLink, fileName] = row; // Destructure the row to include column C for file name
                const folderPath = path.join(__dirname, '../../uploads/', text); // Define folder path based on column A (`text`)

                if (!fs.existsSync(folderPath)) {
                    fs.mkdirSync(folderPath, { recursive: true });
                }

                // Ensure the file name from column C is valid
                if (!fileName || fileName.trim() === '') {
                    console.error(`Missing file name in column C for row ${index + 1}. Skipping.`);
                    continue;
                }

                const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, ''); // Sanitize the file name

                // Prepare a list of files to download
                const filesToDownload = [];
                if (videoLink) filesToDownload.push({ link: videoLink, type: 'video' });
                if (imageLink) filesToDownload.push({ link: imageLink, type: 'image' });

                // Process files
                for (const { link: fileLink, type: fileType } of filesToDownload) {
                    try {
                        // Specify the file path for saving based on the file name from column C
                        const filePath = path.join(folderPath, sanitizedFileName);
                        await downloadFromDrive(fileLink, filePath);
                        console.log(`Successfully processed ${fileType} file: ${sanitizedFileName} in ${folderPath}`);
                    } catch (error) {
                        console.error(`Error processing ${fileType} file ${fileLink} in row ${index + 1}: ${error.message}`);
                    }
                }

                console.log(`Completed updating folder: ${folderPath}`);
            }
            return 'Folders updated based on sheet changes.';
        } else {
            console.log('No changes detected in the sheet.');
            return 'No changes detected in the sheet.';
        }
    } catch (error) {
        console.error(`Error in processing sheet data: ${error.message}`);
        throw error;
    }
};

module.exports = { processSheetData };