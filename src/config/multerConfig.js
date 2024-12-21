// Import the necessary modules
const multer = require('multer');
const path = require('path');

// Configure multer storage options
const storage = multer.diskStorage({
    // Define the destination directory for uploaded files
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Save files in the 'uploads/' directory
    },
    // Define a custom filename for each uploaded file
    filename: function (req, file, cb) {
        // Create a unique filename by prefixing the original file name with the current timestamp
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
    }
});

// Initialize multer with the defined storage settings
const upload = multer({ storage });

// Export the configured multer instance for use in other modules
module.exports = upload;