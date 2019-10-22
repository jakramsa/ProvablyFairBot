const { prefix } = require('../../config.json');
const endGame = require('./endgame.js');

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
        if(game && game.gameMessage){
            if(args && args[0] && args[0] === "end"){
                endGame.execute(message, null);
            } else {
                message.author.send(endGame.messageToLink(game.gameMessage)).catch(console.error);
            }
        } else {
            message.author.send("You are not currently in a game.").catch(console.error);
        }
    }
};