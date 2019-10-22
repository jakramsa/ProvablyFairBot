const { prefix } = require('../../config.json');

module.exports = {
    name: 'endgame',
    description: 'Forfeits your current game.',
    aliases: ['eg'],
    args: false,
    usage(){ return `${prefix}${this.name}`; },
    cooldown: 0,
    guildOnly: false,
    async execute(message, args) {
        const game = message.client.getGame(message.author.id);
        if(game && game.gameMessage){
            message.author.send(`Would you like to forfeit the game you are playing at ${this.messageToLink(game.gameMessage)}? Response with **accept** to **forfeit**.\n**By forfeiting you will lose your bet.**`).then().catch(console.error);
        } else {
            message.author.send("You are not currently in a game.").catch(console.error);
        }
    },
    messageToLink(message){
        return `https://discordapp.com/channels/${message.guild.id}/${message.channel.id}/${message.id}`;
    }
};