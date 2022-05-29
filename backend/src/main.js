//Internal Dependencies:
const { createEnvFile } = require('./config/dotenv');
const { botStartup } = require('./config/bot');

//Create .env file if it doesn't exist
createEnvFile();

//Initialize dotenv
require('dotenv').config();

//Start the bot
botStartup();
