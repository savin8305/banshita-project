// Import necessary modules
const express = require('express');
const router = express.Router(); // Create an Express router instance
const upload = require('../config/multerConfig'); // Import Multer configuration for handling file uploads
const uploadController = require('../controllers/uploadController'); // Import the upload controller

/**
 * Route to handle file uploads.
 * 
 * The `upload.none()` middleware is used here because this route does not expect any file data in the request body.
 * Instead, it processes metadata or form data. If file uploads are needed, adjust the Multer configuration accordingly.
 * 
 * The `uploadFiles` method from `uploadController` handles the logic for processing the incoming request.
 */
router.post('/upload', upload.none(), uploadController.uploadFiles);

// Export the router for use in other parts of the application
module.exports = router;