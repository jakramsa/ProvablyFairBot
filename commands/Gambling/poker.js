const { prefix, embedColors, includesDir, storeServerSeeds } = require('../../config.json');
const cardIds = require('../../'+includesDir+'CardIds.json');

module.exports = {
    name: 'poker',
    description: 'Play a game of video poker.',
    aliases: ['videopoker'],
    args: true,
    argCount: 2,
    usage(){ return `${prefix}${this.name} [currency] [amount[multiplier]]`; },
    cooldown: 0,
    guildOnly: true,
    pairMultiplier: 2,
    twoPairMultiplier: 3,
    threeOfAKindMultiplier: 4,
    straightMultiplier: 5,
    flushMultiplier: 7,
    fullHouseMultiplier: 10,
    fourOfAKindMultiplier: 26,
    straightFlushMultiplier: 51,
    royalFlushMultiplier: 251,
    async execute(message, args, update) {
       
    },
};