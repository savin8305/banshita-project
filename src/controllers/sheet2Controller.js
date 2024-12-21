// src/controllers/sheet2Controller.js

// Import necessary modules
const { google } = require('googleapis'); // Google API library to access Google Sheets
const { updateData } = require('../services/mongoService'); // Custom service to update data in MongoDB
const oAuth2Client = require('../config/driveAuth'); // OAuth2 client for authenticating Google API requests

// Initialize the Google Sheets API client
const sheets = google.sheets({ version: 'v4', auth: oAuth2Client });

/**
 * Function to fetch data from Google Sheets (Sheet2) and push it to MongoDB.
 * The function reads data from the sheet, maps the data using the header row,
 * and updates the corresponding documents in MongoDB based on the first column as an identifier.
 */
async function pushSheet2DataToMongoDB() {
    try {
        // Fetch the data from the specified range in the Google Sheet
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: process.env.SHEET_ID, // Spreadsheet ID from environment variables
            range: 'Sheet2!A1:Z1000', // Range to fetch the data from Sheet2 (adjust as needed)
        });

        const rows = response.data.values; // Extract the values from the response

        if (rows.length) {
            const headers = rows[0]; // Assume the first row contains the headers
            console.log('Headers:', headers);

            // Loop through each row starting from the second row (index 1)
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                const data = {};

                // Map each header to its corresponding cell value in the row
                headers.forEach((header, index) => {
                    data[header] = row[index] || null; // If the cell is empty, assign null
                });

                console.log('Mapped data:', data);

                const identifier = headers[0]; // Assume the first column is a unique identifier

                // Update the existing document in MongoDB using the identifier (usually the first field)
                const result = await updateData('Sheet2Collection', { [identifier]: row[0] }, data);

                // Log the result of the update operation
                if (result.matchedCount > 0) {
                    console.log(`Updated data in MongoDB: ${JSON.stringify(data)}`);
                } else {
                    console.log(`No matching document found to update for ${row[0]}`);
                }
            }
        } else {
            console.log('No data found in Sheet2.');
        }
    } catch (error) {
        console.error('Error fetching data from Sheet2:', error.message);
    }
}

// Export the function so it can be used elsewhere in the application
module.exports = { pushSheet2DataToMongoDB };
