const app = require('./app'); // Import the Express app instance from the 'app.js' file

const PORT = process.env.PORT || 3000; // Define the port number, defaulting to 3000 if not specified in the environment variables

// Start the server and listen on the defined port
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`); // Log a message when the server starts successfully
});
