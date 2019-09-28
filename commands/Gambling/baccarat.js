const { prefix, embedColors, includesDir, storeServerSeeds } = require('../../config.json');
const cardIds = require('../../'+includesDir+'CardIds.json');

module.exports = {
    name: 'baccarat',
    description: 'Play a game of baccarat.',
    aliases: ['bac'],
    args: true,
    argCount: 2,
    usage(){ return `${prefix}${this.name} [currency] [amount[multiplier]]`; },
    cooldown: 0,
    guildOnly: true,
    multiplier: 2,
    async execute(message, args, update) {
       
    },
};