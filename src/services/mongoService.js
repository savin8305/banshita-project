// Import the MongoClient class from the MongoDB driver
const { MongoClient } = require('mongodb');

let client; // Declare a variable to hold the MongoDB client instance

/**
 * Function to connect to MongoDB.
 * 
 * This function checks if the MongoDB client has already been initialized.
 * If not, it creates a new client using the connection URI from environment variables
 * and connects to the MongoDB server.
 * 
 * @returns {Object} - The database instance connected to the specified database.
 */
async function connectToMongoDB() {
    if (!client) {
        // Initialize the MongoDB client if it hasn't been created yet
        client = new MongoClient(process.env.MONGO_URI, {
            useNewUrlParser: true, // Use the new URL parser to handle connection strings
            useUnifiedTopology: true, // Enable the new unified topology layer for MongoDB
        });
        
        // Connect to the MongoDB server
        await client.connect();
        console.log("Connected to MongoDB");
    }
    
    // Return the database instance, connected to the specified database name
    return client.db(process.env.MONGO_DB_NAME);
}

/**
 * Function to insert data into a specified MongoDB collection.
 * 
 * @param {string} collectionName - The name of the collection where data will be inserted.
 * @param {Object} data - The data to be inserted as a document in the collection.
 * @returns {Object} - The result of the insert operation, including information about the inserted document.
 */
async function insertData(collectionName, data) {
    const db = await connectToMongoDB(); // Get the connected database instance
    const collection = db.collection(collectionName); // Get the collection where the data will be inserted
    const result = await collection.insertOne(data); // Insert the data into the collection
    return result; // Return the result of the insert operation
}

/**
 * Function to update data in a specified MongoDB collection.
 * 
 * @param {string} collectionName - The name of the collection where the data will be updated.
 * @param {Object} filter - The filter to match the document(s) to be updated.
 * @param {Object} data - The data to update the matched document(s) with.
 * @returns {Object} - The result of the update operation, including the number of matched and modified documents.
 */
async function updateData(collectionName, filter, data) {
    try {
        const db = await connectToMongoDB(); // Get the connected database instance
        const collection = db.collection(collectionName); // Get the collection where the data will be updated

        // Perform the update operation using the filter and update data
        const result = await collection.updateOne(filter, { $set: data }, { upsert: true });
        
        // Return the result of the update operation
        return result;
    } catch (err) {
        // Log any errors that occur during the update operation
        console.error('Error updating data:', err);
    }
}

// Export the insertData and updateData functions for use in other parts of the application
module.exports = {
    insertData,
    updateData,
};
