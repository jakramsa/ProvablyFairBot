const { prefix, embedColors, includesDir, storeServerSeeds, findCardEmojisByName } = require('../../config.json');
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
    responseTime: 60000,
    gameTitle: 'Video Poker (Jack or Better)',
    pairMultiplier: 2,
    twoPairMultiplier: 3,
    threeOfAKindMultiplier: 4,
    straightMultiplier: 5,
    flushMultiplier: 7,
    fullHouseMultiplier: 10,
    fourOfAKindMultiplier: 26,
    straightFlushMultiplier: 51,
    royalFlushMultiplier: 251,
    handsEnum: {
        NONE: 0,
        PAIR: 1,
        TWO_PAIR: 2,
        THREE_OAK: 3,
        STRAIGHT: 4,
        FLUSH: 5,
        FULL_HOUSE: 6,
        FOUR_OAK: 7,
        STRAIGHT_FLUSH: 8,
        ROYAL_FLUSH: 9
    },
    handNames: {
        0: 'None',
        1: 'Pair',
        2: 'Two Pair',
        3: 'Three of a Kind',
        4: 'Straight',
        5: 'Flush',
        6: 'Full House',
        7: "Four of a Kind",
        8: 'Straight Flush',
        9: 'Royal Flush'
    },
    positionEmojis: ["\u0031\u20E3", "\u0032\u20E3", "\u0033\u20E3", "\u0034\u20E3","\u0035\u20E3"],
    acceptEmoji: "\uD83D\uDC4C",
    async execute(message, args) {
        const currencyHandler = message.client.currencyHandler;
        const member = message.guild.member(message.author);
        let resultsEmbed = new message.client.discord.RichEmbed()
            .setAuthor(member.displayName, member.user.avatarURL, 'https://discordapp.com/channels/'+message.guild.id+'/'+message.channel.id+'/'+message.id)
            .setColor(embedColors.general);
        const currencyName = args[0];
        const betAmount = args[1];
        const bet = currencyHandler.Currency(message.guild.id, currencyName, betAmount, message.author.id);
        const betValidity = await currencyHandler.validBet(bet);
        switch(betValidity){
            case currencyHandler.BetValidityEnum.VALID_BET:
                if(message.client.cannotBet(message.author.id)){
                    return message.channel.send("You are currently playing a game or performing a currency swap. Please finish to make another bet.").catch(console.error);
                }
                let clientSeed = await currencyHandler.getSeed(message);
                if (clientSeed === ""){
                    clientSeed = message.client.defaultClientSeed;
                }
                pokerGame = { "message": message, "bet": bet, "seed": clientSeed, "handRolls": [], "removedRolls": [], "nonces":[], "over": false };
                message.client.poker.set(message.author.id, pokerGame);
                if(storeServerSeeds){ pokerGame.serverSeeds = []; pokerGame.serverSeeds.push(message.client.serverSeedId); }
                const wagerString = await currencyHandler.getCurrencyString(bet);
                resultsEmbed.addField(this.gameTitle,`Wager: ${wagerString}`, false);
                for(let i = 0; i < 5; i++){
                    pokerGame.nonces.push(message.client.nonce);
                    let rollValue = message.client.roll(clientSeed);
                    if(rollValue === -1){
                        resultsEmbed.setTitle("An error occured while generating a roll.")
                        .setColor(embedColors.error);
                        message.client.poker.delete(message.author.id);
                        return message.channel.send(resultsEmbed).catch(console.error);
                    }
                    pokerGame.handRolls.push(rollValue);
                }
                resultsEmbed.addField("Player Hand",`${this.rollsToString(pokerGame.handRolls, pokerGame.removedRolls)}`, true)
                    .addField("Select Holds",`Choose which cards you want to hold, within the next ${ this.responseTime/1000 } seconds. Either react with the card numbers you want to hold then react with ${this.acceptEmoji} or enter the card numbers to hold separated by commas. Example: 1,2,5 will hold the first, second, and fifth card while discarding the rest.\n\n**All cards will be held if no valid response is received or you respond with hold.** `, true)
                    .setFooter((pokerGame.serverSeeds?`Server Seed(s): ${pokerGame.serverSeeds.join(", ")} `:"")+"Client Seed: '"+pokerGame.seed+"' Nonce: "+pokerGame.nonces.join(", "));
                message.channel.send(resultsEmbed).then(async (m) => {
                    pokerGame.gameMessage = m;
                    message.channel.awaitMessages((nm) => {
                        return this.validPositionsMessage(message, nm);
                    }, {
                        max: 1, time: this.responseTime, errors: ['time']
                    }).then(async (collected) => {
                        if(pokerGame.over === true){ return; }
                        pokerGame.over = true;
                        if(collected.first().content.toLowerCase() === 'hold'){ return this.showResults(pokerGame); }
                        let holdArray = collected.first().content.toLowerCase().split(",").filter(e => { const potentialInt = parseInt(e); return (!isNaN(potentialInt) && potentialInt >= 1 && potentialInt <= 5) }).map((string) => { return parseInt(string); });
                        let removeArray = new Array(5);
                        for(let i = 5;i--;removeArray[i]=i+1);
                        for(let i = 0; i < 5; i++){
                            if(removeArray.includes(holdArray[i])){
                                removeArray.splice(removeArray.indexOf(holdArray[i]), 1);
                            }
                            if(i < 5-holdArray.length){
                                pokerGame.nonces.push(message.client.nonce);
                                let rollValue = message.client.roll(clientSeed);
                                if(rollValue === -1){
                                    resultsEmbed.setTitle("An error occured while generating a roll.")
                                    .setColor(embedColors.error);
                                    message.client.poker.delete(message.author.id);
                                    return message.channel.send(resultsEmbed).catch(console.error);
                                }
                                pokerGame.handRolls.push(rollValue);
                            }
                        }
                        removeArray.sort(function(a, b) { return b - a; });
                        pokerGame.removedRolls = removeArray;
                        this.showResults(pokerGame);
                    }).catch((collected) => {
                        if(pokerGame.over === true){ return; }
                        pokerGame.over = true;
                        message.reply(`you did not respond in time with a valid hold. Holding all cards in hand.`);
                        this.showResults(pokerGame);
                    });
                    for(let i = 0; i < this.positionEmojis.length; i++){
                        await m.react(this.positionEmojis[i]).catch(console.error);
                    }
                    await m.react(this.acceptEmoji).catch(console.error);
                    m.awaitReactions((reaction, user) => { return reaction.emoji.name === this.acceptEmoji && user.id === message.author.id}, { maxEmojis: 1, time: this.responseTime, errors: ['time'] }
                    ).then(async (collected) => {
                        if(pokerGame.over === true){ return; }
                        pokerGame.over = true;
                        let holdArray = [];
                        for(let i = 0; i < this.positionEmojis.length; i++){
                           let reacted = m.reactions.find((reaction) => reaction.emoji.name === this.positionEmojis[i] && reaction.users.has(message.author.id));
                           if(reacted){
                               holdArray.push(i+1);
                           }
                        }
                        let removeArray = new Array(5);
                        for(let i = 5;i--;removeArray[i]=i+1);
                        for(let i = 0; i < 5; i++){
                            if(removeArray.includes(holdArray[i])){
                                removeArray.splice(removeArray.indexOf(holdArray[i]), 1);
                            }
                            if(i < 5-holdArray.length){
                                pokerGame.nonces.push(message.client.nonce);
                                let rollValue = message.client.roll(clientSeed);
                                if(rollValue === -1){
                                    resultsEmbed.setTitle("An error occured while generating a roll.")
                                    .setColor(embedColors.error);
                                    message.client.poker.delete(message.author.id);
                                    return message.channel.send(resultsEmbed).catch(console.error);
                                }
                                pokerGame.handRolls.push(rollValue);
                            }
                        }
                        removeArray.sort(function(a, b) { return b - a; });
                        pokerGame.removedRolls = removeArray;
                        return this.showResults(pokerGame);
                    }).catch((error) => {});
                    return;
                }).catch(console.error);
                return;
                break;
            case currencyHandler.BetValidityEnum.INVALID_CURRENCY:
                let currencyList = await currencyHandler.getCurrencies(message.guild.id);
                resultsEmbed.setTitle("You've entered an invalid currency.")
                .addField("Usage", this.usage())
                .addField("Valid Currencies", currencyList)
                .setColor(embedColors.error);
                return message.channel.send(resultsEmbed).catch(console.error);
                break;
            case currencyHandler.BetValidityEnum.INVALID_AMOUNT:
                resultsEmbed.setTitle("You've entered an invalid amount.")
                .addField("Usage", this.usage())
                .setColor(embedColors.error);
                return message.channel.send(resultsEmbed).catch(console.error);
                break;
            case currencyHandler.BetValidityEnum.AMOUNT_TOO_LOW:
                let minimumBet = await currencyHandler.getMinimumBet(bet);
                resultsEmbed.setTitle("Your bet was too low.")
                .addField("Usage", this.usage())
                .addField("Minimum bet for "+bet.name, minimumBet)
                .setColor(embedColors.error);
                return message.channel.send(resultsEmbed).catch(console.error);
                break;
            case currencyHandler.BetValidityEnum.AMOUNT_TOO_HIGH:
                let maximumBet = await currencyHandler.getMaximumBet(bet);
                resultsEmbed.setTitle("Your bet was too high.")
                .addField("Usage", this.usage())
                .addField("Maximum bet for "+bet.name, maximumBet)
                .setColor(embedColors.error);
                return message.channel.send(resultsEmbed).catch(console.error);
                break;
            case currencyHandler.BetValidityEnum.INVALID_MULTIPLIER:
                let multiplierString = await currencyHandler.getMultipliers(bet);
                resultsEmbed.setTitle("You've entered an invalid multiplier.")
                .addField("Usage", this.usage())
                .addField("Valid Multipliers", multiplierString)
                .setColor(embedColors.error);
                return message.channel.send(resultsEmbed).catch(console.error);
                break;
            case currencyHandler.BetValidityEnum.INSUFFICIENT_BALANCE:
                resultsEmbed.setColor(embedColors.error).addField("Error", "You don't have enough balance.");
                return message.channel.send(resultsEmbed).catch(console.error);
            case currencyHandler.BetValidityEnum.ERROR:
            case undefined:
            default:
                resultsEmbed.setColor(embedColors.error)
                .addField("Error", `Unknown validity state.`);
                return message.channel.send(resultsEmbed).catch(console.error);
        }
    },
    rollsToCards(rollValues, removedIndices){
        let deck = [];
        for(let i = 0; i < 52; i++){
            let cardRank = Math.floor(i%13+1);
            let suite = Math.floor(i/13);
            let cardFace = '';
            let cardSuite = '';
            switch(cardRank){
                case 1:
                    cardFace = "A";
                    break;
                case 11:
                    cardFace = "J";
                    break;
                case 12:
                    cardFace = "Q";
                    break;
                case 13:
                    cardFace = "K";
                    break;
                default:
                    cardFace = cardRank;
                    break;
            }
            switch(suite){
                default:
                case 0:
                    cardFace += "S";
                    cardSuite = "S";
                    break;
                case 1:
                    cardFace += "D";
                    cardSuite = "D";
                    break;
                case 2:
                    cardFace += "H";
                    cardSuite = "H";
                    break;
                case 3:
                    cardFace += "C";
                    cardSuite = "C";
                    break;
            }
            let cardEmoji = bot.emojis.get(cardIds[cardFace]) || (findCardEmojisByName?bot.emojis.find(emoji => emoji.name === cardFace):false) || `:${cardFace}:`;
            deck.push({"cardRank": cardRank, "cardSuite": cardSuite, "emoji": cardEmoji});
        }
        let hand = [];
        for(let i = 0; i < rollValues.length; i++){
            let pulledCard = Math.floor(rollValues[i]*deck.length/100);
            hand.push(deck[pulledCard]);
            deck.splice(pulledCard, 1);
        }
        for(let i = 0; i < removedIndices.length; i++){
            hand.splice(removedIndices[i]-1, 1);
        }
        return hand;
    },
    rollsToString(rolls, removedIndices, showNumbers = true, limitToFiveCards = false){
        let hand = this.rollsToCards(rolls, removedIndices);
        let top = "";
        let numberOfCards = 5;
        if(!limitToFiveCards){ numberOfCards = hand.length; }
        for(let i = 0;i < numberOfCards; i++){
            top += (showNumbers?`**(${i+1})**`:'')+hand[i].emoji+' ';
        }
        let valuedHand = hand;
        if(limitToFiveCards){ valuedHand = hand.slice(0, 5); }
        let bottom = `Hand: **${this.handValueAsString(this.handValue(valuedHand))}**`;
        return `${top}\n${bottom}`;
    },
    getMultiplier(rolls, removedIndices){
        switch(this.handValue(this.rollsToCards(rolls, removedIndices))){
            default:
            case undefined:
            case this.handsEnum.NONE:
                return 0;
            case this.handsEnum.PAIR:
                return this.pairMultiplier;
            case this.handsEnum.TWO_PAIR:
                return this.twoPairMultiplier;
            case this.handsEnum.THREE_OAK:
                return this.threeOfAKindMultiplier;
            case this.handsEnum.STRAIGHT:
                return this.straightMultiplier;
            case this.handsEnum.FLUSH:
                return this.flushMultiplier;
            case this.handsEnum.FULL_HOUSE:
                return this.fullHouseMultiplier;
            case this.handsEnum.FOUR_OAK:
                return this.fourOfAKindMultiplier;
            case this.handsEnum.STRAIGHT_FLUSH:
                return this.straightFlushMultiplier;
            case this.handsEnum.ROYAL_FLUSH:
                return this.royalFlushMultiplier;
        }
    },
    handValueAsString(handValue){
        return this.handNames[handValue];
    },
    handValue(hand){
        let handValue = this.handsEnum.NONE;
        let cards = [];
        let suites = {};
        let ranks = {};
        let cardRanks = [];
        for(let i = 0; i < hand.length; i++){
            cardRanks.push(hand[i].cardRank);
            if(suites[hand[i].cardSuite]){
                suites[hand[i].cardSuite] += 1;
            } else {
                suites[hand[i].cardSuite] = 1;
            }
            if(ranks[hand[i].cardRank]){
                ranks[hand[i].cardRank] += 1;
            } else {
                ranks[hand[i].cardRank] = 1;
            }
        }
        if(Object.keys(suites).length === 1){
            handValue = this.handsEnum.FLUSH;
        }
        cardRanks.sort(function(a, b) { return a - b; });
        for(let i = 0; i < cardRanks.length-1; i++){
            if(cardRanks[i]+1 !== cardRanks[i+1] && !(cardRanks[i] === 1 && cardRanks[i+1] === 10)){
                break;
            }
            if(i === cardRanks.length-2){
                if(handValue === this.handsEnum.FLUSH){
                    if(cardRanks[0] === 1 && cardRanks[cardRanks.length-1] === 13){
                        handValue = this.handsEnum.ROYAL_FLUSH;
                    } else {
                        handValue = this.handsEnum.STRAIGHT_FLUSH;
                    }
                } else {
                    handValue = this.handsEnum.STRAIGHT;
                }
            }
        }
        Object.keys(ranks).map(function(key, index) {
            if(ranks[key] === 4 && handValue < this.handsEnum.FOUR_OAK){
                handValue = this.handsEnum.FOUR_OAK;
            } else if(ranks[key] === 3){
                if(Object.values(ranks).includes(2) && handValue < this.handsEnum.FULL_HOUSE){
                    handValue = this.handsEnum.FULL_HOUSE;
                } else if(handValue < this.handsEnum.THREE_OAK){
                    handValue = this.handsEnum.THREE_OAK;
                }
            } else if(ranks[key] === 2){
                if(Object.keys(ranks).length === 2 && handValue < this.handsEnum.FULL_HOUSE){
                    handValue = this.handsEnum.FULL_HOUSE;
                } else if(Object.keys(ranks).length === 3 && handValue < this.handsEnum.TWO_PAIR){
                    handValue = this.handsEnum.TWO_PAIR;
                } else if((parseInt(key) >= 11 || parseInt(key) === 1) && handValue < this.handsEnum.PAIR){
                    handValue = this.handsEnum.PAIR;
                }
            }
        }, this);
        return handValue;
    },
    validPositionsMessage(userMessage, testMessage){
        return testMessage.author.id === userMessage.author.id &&
               (/^\d$/.test(testMessage.content) ||
               testMessage.content.toLowerCase().split(",").filter(e => {
                   const potentialInt = parseInt(e);
                   return (!isNaN(potentialInt) && potentialInt >= 1 && potentialInt <= 5)
               }).length > 1 ||
               testMessage.content === 'hold');
    },
    async showResults(pokerGame){
        const message = pokerGame.message;
        const gameMessage = pokerGame.gameMessage;
        const currencyHandler = message.client.currencyHandler;
        const bet = pokerGame.bet;
        let resultsEmbed = new message.client.discord.RichEmbed()
               .setColor(embedColors.general)
               .setFooter((pokerGame.serverSeeds?`Server Seed(s): ${pokerGame.serverSeeds.join(", ")} `:"")+"Client Seed: '"+pokerGame.seed+"' Nonce: "+pokerGame.nonces.join(", "));
        if(gameMessage && gameMessage.embeds && gameMessage.embeds.length >= 1){
               resultsEmbed.setAuthor(gameMessage.embeds[0].author.name, gameMessage.embeds[0].author.iconURL, gameMessage.embeds[0].author.url);
        }
        const multiplier = this.getMultiplier(pokerGame.handRolls, pokerGame.removedRolls);
        const wonBet = multiplier > 1;
        const wagerAmount = await currencyHandler.parseCurrency(bet);
        const wagerString = await currencyHandler.getCurrencyString(bet);
        let wagerResult = wagerAmount;
        let result = null;
        if(wonBet){
            resultsEmbed.setColor(embedColors.win);
            wagerResult = multiplier*wagerAmount;
            bet.amount = (multiplier-1)*wagerAmount;
            result = await currencyHandler.addBalance(message.author.id, bet);
        } else {
            resultsEmbed.setColor(embedColors.loss);
            wagerResult = multiplier*wagerAmount;
            result = await currencyHandler.deductBalance(message.author.id, bet);
        }
        if(!result){
            resultsEmbed.addField("Error", "An error occurred updating balance.")
            .setColor(embedColors.error);
            message.client.poker.delete(message.author.id);
            return message.channel.send(resultsEmbed).catch(console.error);
        }
        result = await currencyHandler.addWager(message.author.id, bet);
        if(!result){
            resultsEmbed.addField("Error", "An error occurred updating wager.")
            .setColor(embedColors.error);
            message.client.poker.delete(message.author.id);
            return message.channel.send(resultsEmbed).catch(console.error);
        }
        const currencyResultString = await currencyHandler.getCurrencyString(currencyHandler.Currency(message.guild.id, bet.name, wagerResult));
        resultsEmbed.addField(this.gameTitle,`Wager: ${wagerString} Payout: ${currencyResultString}\nThe player ${wonBet?'won':'lost'}.`, false)
            .addField("Old Hand",`${this.rollsToString(pokerGame.handRolls, [], false, true)}`, true)
            .addField("Player Hand",`${this.rollsToString(pokerGame.handRolls, pokerGame.removedRolls, false)}`, true);
        message.client.poker.delete(message.author.id);
        if(gameMessage){
            return gameMessage.edit("", resultsEmbed).catch(console.error);
        } else {
            return message.channel.send(resultsEmbed).catch(console.error);
        }
    },
};