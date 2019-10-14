const { prefix, supportServerLink } = require('../../config.json');

module.exports = {
    name: 'support',
    description: 'Sends the support server invite link.',
    args: false,
    usage(){ return `${prefix}${this.name}`; },
    cooldown: 0,
    guildOnly: false,
    execute(message, args) {
        return message.channel.send(supportServerLink).catch(console.error);
    },
};