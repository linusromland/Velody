//External Dependencies:
const fs = require('fs');

exports.createEnvFile = () => {
    //Check if .env file exists
    if (fs.existsSync('.env')) {
        console.log('.env file already exists');
        return;
    }

    //Create .env file
    fs.writeFileSync(
        '.env',
        'DISCORD_BOT_TOKEN=ENTER_YOUR_TOKEN HERE\nDISCORD_BOT_PREFIX=!\nDISCORD_BOT_OWNER_ID=ENTER_YOUR_OWNER_ID_HERE\n',
    );
    console.log('.env file created');
};
