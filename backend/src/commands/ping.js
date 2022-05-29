//Internal Dependencies:
const { reply } = require('../middleware/replyHandler');

module.exports = {
    category: 'Testing',
    description: 'Replies with pong',

    slash: 'both',
    testOnly: true,

    callback: ({ message, interaction }) => {
        reply(
            {
                content: 'pong',
            },
            message,
            interaction,
        );
    },
};
