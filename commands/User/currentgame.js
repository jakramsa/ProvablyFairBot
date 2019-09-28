const { prefix, embedColors } = require('../../config.json');

module.exports = {
    name: 'currentgame',
    description: 'Returns a link to your current game.',
    aliases: ['cg'],
    args: false,
    usage(){ return `${prefix}${this.name} [end]`; },
    cooldown: 0,
    guildOnly: false,
    async execute(message, args) {
        const game = message.client.getGame(message.author.id);
        if(game && game.gameMessage){ message.author.send(this.messageToLink(game.gameMessage)).catch(console.error); }
    },
    messageToLink(message){
        return `https://discordapp.com/channels/${message.guild.id}/${message.channel.id}/${message.id}`;
    }
};