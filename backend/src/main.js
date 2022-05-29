//Internal Dependencies:
const { createEnvFile } = require('./config/dotenv');

//Create .env file if it doesn't exist
createEnvFile();

//Initialize dotenv
require('dotenv').config();
