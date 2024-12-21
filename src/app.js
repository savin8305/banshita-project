require('dotenv').config(); // Load environment variables from the .env file
const express = require('express'); // Import the Express framework
const app = express(); // Create an Express application instance
const { processSheetData } = require('./controllers/uploadController'); // Import the function to process Sheet1 data
const { pushSheet2DataToMongoDB } = require('./controllers/sheet2Controller'); // Import the function to process Sheet2 data and update MongoDB

const CHECK_INTERVAL = 30 * 1000; // Set the interval to check for updates every 30 seconds

// Set up a periodic check for Google Sheets changes
setInterval(async () => {
    try {
        // Process data from Sheet1 and upload to Hostinger
        const uploadMessage = await processSheetData(); 
        // Process data from Sheet2 and update MongoDB
        const mongoMessage = await pushSheet2DataToMongoDB(); 

        // Log the messages returned by the processing functions
        console.log(uploadMessage);
        console.log(mongoMessage);
    } catch (error) {
        // Log any errors that occur during the periodic check
        console.error('Error checking for updates:', error);
    }
}, CHECK_INTERVAL);

app.use(express.json()); // Enable JSON parsing for incoming requests

// Export the Express app for use in other modules
module.exports = app;
