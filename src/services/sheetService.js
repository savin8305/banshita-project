// Import the necessary modules
const { google } = require('googleapis'); // Google APIs client library for Node.js
const oAuth2Client = require('../config/driveAuth'); // OAuth2 client for authenticating Google API requests

// Initialize the Google Sheets API client
const sheets = google.sheets({ version: 'v4', auth: oAuth2Client });

// Declare a variable to store the previous sheet data for change detection
let lastData = null;

/**
 * Function to fetch data from the Google Sheet.
 * 
 * This function retrieves data from a specific range in the Google Sheet specified
 * by the spreadsheet ID in the environment variables.
 * 
 * @returns {Array} - A 2D array representing the rows and columns of the sheet data.
 * @throws {Error} - Throws an error if the spreadsheet ID is missing or if there is an issue fetching the data.
 */
const getSheetData = async () => {
    const spreadsheetId = process.env.SHEET_ID; // Get the spreadsheet ID from environment variables

    // Throw an error if the spreadsheet ID is not provided
    if (!spreadsheetId) {
        throw new Error('Missing required parameter: spreadsheetId');
    }

    const range = 'Sheet1!A:C'; // Define the range to fetch data from (adjust as needed)

    try {
        // Fetch the data from the specified range in the Google Sheet
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
        });

        // Return the data values as a 2D array
        return response.data.values;
    } catch (error) {
        // Log and re-throw any errors encountered during the data fetch
        console.error(`Error fetching sheet data: ${error.message}`);
        throw error;
    }
};

/**
 * Function to check for changes in the sheet data.
 * 
 * This function compares the current sheet data with the previous data stored in `lastData`.
 * It detects any rows that have changed and returns those rows.
 * 
 * @returns {Array|null} - An array of changed rows if any changes are detected, otherwise null.
 * @throws {Error} - Throws an error if there is an issue checking for changes.
 */
const checkForChanges = async () => {
    try {
        // Fetch the current data from the Google Sheet
        const newData = await getSheetData();
        const changedRows = []; // Array to store rows that have been updated

        // If there is previous data, compare each row for changes
        if (lastData) {
            newData.forEach((row, index) => {
                // Compare the current row with the corresponding row in the lastData
                if (!lastData[index] || JSON.stringify(row) !== JSON.stringify(lastData[index])) {
                    changedRows.push(row); // If different, push to changedRows array
                }
            });
        }

        // Update lastData with the current data for the next comparison
        lastData = newData;

        // Return only the rows that have changed, or null if no changes were detected
        return changedRows.length > 0 ? changedRows : null;
    } catch (error) {
        // Log and re-throw any errors encountered during the change detection
        console.error(`Error checking for changes: ${error.message}`);
        throw error;
    }
};

// Export the functions for use in other parts of the application
module.exports = { getSheetData, checkForChanges };
