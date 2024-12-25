require('dotenv').config(); // Load environment variables from the .env file
const express = require('express'); // Import the Express framework
const app = express(); // Create an Express application instance
const { processSheetData } = require('./controllers/uploadController'); // Import the function to process Sheet1 data

const CHECK_INTERVAL = 5 * 60 * 1000; // Set the interval to check for updates every 30 seconds
// Health check route
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Service is running' });
});
// Set up a periodic check for Google Sheets changes
setInterval(async () => {
    try {
        // Process data from Sheet1 and upload to Hostinger
        const uploadMessage = await processSheetData(); 

        // Log the messages returned by the processing function
        console.log(uploadMessage);
    } catch (error) {
        // Log any errors that occur during the periodic check
        console.error('Error checking for updates:', error);
    }
}, CHECK_INTERVAL);

app.use(express.json()); // Enable JSON parsing for incoming requests

// Export the Express app for use in other modules
module.exports = app;