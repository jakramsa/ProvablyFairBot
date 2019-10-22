const { prefix } = require('../../config.json');
const blackJack = require('../Gambling/blackjack.js');

module.exports = {
    name: 'endgame',
    description: 'Ends your current game.',
    aliases: ['eg'],
    args: false,
    usage(){ return `${prefix}${this.name}`; },
    cooldown: 0,
    guildOnly: false,
    responseTime: 30000,
    async execute(message, args) {
        const game = message.client.getGame(message.author.id);
        if(game && game.gameMessage){
            if(message.client.blackjack.has(message.author.id)){
                message.author.send(`Would you like to end your blackjack game you are playing at ${this.messageToLink(game.gameMessage)}? Response with **accept** to stand and end the game.`).then((m) => {
                    m.channel.awaitMessages((newMessage) => {
                        return newMessage.author.id === message.author.id && newMessage.content === "accept";
                    }, {
                        max: 1, time: this.responseTime, errors: ['time']
                    }).then((collected) => {console.log(blackJack);
                        if(message.client.blackjack.has(message.author.id)){
                            return blackJack.execute(message, message.client.blackjack.get(message.author.id), "stand").catch(console.error);
                        }
                    }).catch((timedOut) => {console.log(timedOut);
                        return message.author.send("You did not respond with accept. Your game will continue.").catch(console.error);
                    });
                }).catch(console.error);
                return;
            } else {
                //Blackjack is currently the only game that doesn't timeout on it's own, so all other games will end on their own
                return message.author.send(`Please wait for your current game at ${this.messageToLink(game.gameMessage)} to timeout.`).catch(console.error);
            }
        } else {
            return message.author.send("You are not currently in a game.").catch(console.error);
        }
    },
    messageToLink(message){
        return `https://discordapp.com/channels/${message.guild.id}/${message.channel.id}/${message.id}`;
    }
};