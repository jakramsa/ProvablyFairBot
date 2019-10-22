const { prefix, embedColors, includesDir, storeServerSeeds, findCardEmojisByName } = require('../../config.json');
const cardIds = require('../../'+includesDir+'CardIds.json');

module.exports = {
    name: 'blackjack',
    description: 'Play a game of blackjack.',
    aliases: ['bj'],
    args: true,
    argCount: 2,
    usage(){ return `${prefix}${this.name} [currency] [amount[multiplier]]`; },
    cooldown: 0,
    guildOnly: true,
    multiplier: 2,
    async execute(message, args, update) {
        const currencyHandler = message.client.currencyHandler;
        const member = message.guild.member(update?message.client.users.get(args.bet.userId):message.author);
        let resultsEmbed = new message.client.discord.RichEmbed()
            .setAuthor(member.displayName, member.user.avatarURL)
            .setColor(embedColors.general);
        if(update){
            let blackjackGame = args;
            let gameMessage = blackjackGame.gameMessage;
            let gameOver = false;
            if(update === 'hit'){
                if(blackjackGame.serverSeeds && !blackjackGame.serverSeeds.includes(gameMessage.client.serverSeedId)){ blackjackGame.serverSeeds.push(gameMessage.client.serverSeedId); }
                blackjackGame.nonces.push(gameMessage.client.nonce);
                let rollValue = gameMessage.client.roll(blackjackGame.seed);
                if(rollValue == -1){
                    resultsEmbed.setTitle("An error occured while generating a roll.")
                    .setColor(embedColors.error);
                    return gameMessage.channel.send(resultsEmbed).catch(console.error);
                }
                blackjackGame.playerRolls.push(rollValue);
            }
            let playerHandValue = this.rollsToHandValue(blackjackGame.playerRolls);
            if(playerHandValue >= 21){
                gameOver = true;
                update = 'stand';
            }
            let dealerHandValue = this.rollsToHandValue(blackjackGame.dealerRolls);
            if(update === 'stand'){
                while(dealerHandValue < 17){
                    if(blackjackGame.serverSeeds && !blackjackGame.serverSeeds.includes(gameMessage.client.serverSeedId)){ blackjackGame.serverSeeds.push(gameMessage.client.serverSeedId); }
                    blackjackGame.nonces.push(gameMessage.client.nonce);
                    let rollValue = gameMessage.client.roll(blackjackGame.seed);
                    if(rollValue == -1){
                        resultsEmbed.setTitle("An error occured while generating a roll.")
                        .setColor(embedColors.error);
                        return gameMessage.channel.send(resultsEmbed).catch(console.error);
                    }
                    blackjackGame.dealerRolls.push(rollValue);
                    dealerHandValue = this.rollsToHandValue(blackjackGame.dealerRolls);
                }
                gameOver = true;
            }
            const wagerString = await currencyHandler.getCurrencyString(blackjackGame.bet);
            if(gameOver){
                const payoutString = await currencyHandler.getCurrencyString(currencyHandler.Currency(gameMessage.guild.id, blackjackGame.bet.name,
 (playerHandValue <= 21 && playerHandValue == dealerHandValue?blackjackGame.bet.amount:(((playerHandValue <= 21 && playerHandValue > dealerHandValue) || (playerHandValue <= 21 && dealerHandValue > 21))?blackjackGame.bet.amount*this.multiplier:0)), blackjackGame.bet.userId));
                resultsEmbed.addField("Blackjack",`Results: **${playerHandValue <= 21 && playerHandValue == dealerHandValue?"Tie":(((playerHandValue <= 21 && playerHandValue > dealerHandValue) || (playerHandValue <= 21 && dealerHandValue > 21))?"Player Wins":"Dealer Wins")}**\nWager: **${wagerString}** - Payout ${payoutString}`, false);
                resultsEmbed.addField("Players Hand",`${this.rollsToString(blackjackGame.playerRolls, false)}`, true);
                resultsEmbed.addField("Dealers Hand",`${this.rollsToString(blackjackGame.dealerRolls, false)}`, true);
                result = await currencyHandler.addWager(blackjackGame.bet.userId, blackjackGame.bet);
                if(!result){
                    resultsEmbed
                    .addField("Error", "An error occured updating wager.")
                    .setColor(embedColors.error);
                    return gameMessage.channel.send(resultsEmbed).catch(console.error);
                }
                const wagerAmount = await currencyHandler.parseCurrency(blackjackGame.bet);
                if((playerHandValue <= 21 && playerHandValue > dealerHandValue) || (playerHandValue <= 21 && dealerHandValue > 21)){
                    resultsEmbed.setColor(embedColors.win);
                    blackjackGame.bet.amount = (this.multiplier-1)*wagerAmount;
                    result = await currencyHandler.addBalance(blackjackGame.bet.userId, blackjackGame.bet);
                } else if(playerHandValue <= 21 && playerHandValue == dealerHandValue){
                    resultsEmbed.setColor(embedColors.light);
                    result = true;
                } else {
                    resultsEmbed.setColor(embedColors.loss);
                    result = await currencyHandler.deductBalance(blackjackGame.bet.userId, blackjackGame.bet);
                }
                if(!result){
                    resultsEmbed
                    .addField("Error", "An error occured updating balance.")
                    .setColor(embedColors.error);
                    return gameMessage.channel.send(resultsEmbed).catch(console.error);
                }

                message.client.blackjack.delete(blackjackGame.bet.userId);
            } else {
                resultsEmbed.addField("Blackjack",`Wager: ${wagerString}\nPlease type **hit** or **stand**`, false);
                resultsEmbed.addField("Players Hand",`${this.rollsToString(blackjackGame.playerRolls, false)}`, true);
                resultsEmbed.addField("Dealers Hand",`${this.rollsToString(blackjackGame.dealerRolls, true)}`, true);
            }
            resultsEmbed.setFooter((blackjackGame.serverSeeds?`Server Seed(s): ${blackjackGame.serverSeeds.join(", ")} `:"")+"Client Seed: '"+blackjackGame.seed+"' Nonce: "+blackjackGame.nonces.join(", "));
            return gameMessage.edit("", resultsEmbed);
        }
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
                let blackjackGame = {"bet": bet, "seed": clientSeed, "nonces": [], "playerRolls": [], "dealerRolls": []};
                if(storeServerSeeds){ blackjackGame.serverSeeds = []; blackjackGame.serverSeeds.push(message.client.serverSeedId); }
                const wagerString = await currencyHandler.getCurrencyString(bet);
                resultsEmbed.addField("Blackjack",`Wager: ${wagerString}\nPlease type **hit** or **stand**`, false);
                for(let i = 0;i < 4; i++){
                    blackjackGame.nonces.push(message.client.nonce);
                    let rollValue = message.client.roll(clientSeed);
                    if(rollValue == -1){
                        resultsEmbed.setTitle("An error occured while generating a roll.")
                        .setColor(embedColors.error);
                        return message.channel.send(resultsEmbed).catch(console.error);
                    }
                    if(i%2==0){
                        blackjackGame.playerRolls.push(rollValue);
                    } else {
                        blackjackGame.dealerRolls.push(rollValue);
                    }
                }
                resultsEmbed.addField("Players Hand",`${this.rollsToString(blackjackGame.playerRolls, false)}`, true)
                    .addField("Dealers Hand",`${this.rollsToString(blackjackGame.dealerRolls, true)}`, true);
                resultsEmbed.setFooter((blackjackGame.serverSeeds?`Server Seed(s): ${blackjackGame.serverSeeds.join(", ")} `:"")+"Client Seed: '"+blackjackGame.seed+"' Nonce: "+blackjackGame.nonces.join(", "));
                let playerHandValue = this.rollsToHandValue(blackjackGame.playerRolls);
                return message.channel.send(resultsEmbed).then((m) => {
                    blackjackGame.gameMessage = m;
                    message.client.blackjack.set(message.author.id, blackjackGame);
                    if(playerHandValue == 21){
                        this.execute(message, blackjackGame, 'stand');
                    }
                }).catch(console.error);
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
                //return message.channel.send("Invalid Bet State").catch(console.error);
        }
    },
    rollToCard(rollValue){
        const remapedValue = rollValue*0.52;
        const cardRank = Math.floor(remapedValue%13+1);
        const suite = Math.floor(remapedValue/13);
        let cardFace = '';
        let cardValue = 0;
        switch(cardRank){
            case 1:
                cardFace = "A";
                cardValue = 1;
                break;
            case 11:
                cardFace = "J";
                cardValue = 10;
                break;
            case 12:
                cardFace = "Q";
                cardValue = 10;
                break;
            case 13:
                cardFace = "K";
                cardValue = 10;
                break;
            default:
                cardFace = cardRank;
                cardValue = cardRank;
                break;
        }
        switch(suite){
            case 0:
                cardFace += "S";
                break;
            case 1:
                cardFace += "D";
                break;
            case 2:
                cardFace += "H";
                break;
            case 3:
                cardFace += "C";
                break;
        }
        cardEmoji = bot.emojis.get(cardIds[cardFace]) || (findCardEmojisByName?bot.emojis.find(emoji => emoji.name === cardFace):false) || `:${cardFace}:`;
        return {"cardValue": cardValue, "emoji": cardEmoji};
    },
    rollsToString(rolls, hideValues){
        let top = "";
        let middle = "";
        let bottom = "";
        let expectedHandValue = this.rollsToHandValue(rolls);
        let currentCard = null;
        if(hideValues){
            currentCard = this.rollToCard(rolls[0]);
            let backcard = bot.emojis.get(cardIds.backcard) || (findCardEmojisByName?bot.emojis.find(emoji => emoji.name === 'backcard'):false) || ':backcard:';
            top = `${currentCard.emoji}${backcard}`;
            middle = `${currentCard.cardValue!=1?currentCard.cardValue:11} + ?`;
            bottom = `Soft Value: **?**`;
        } else {
            let handValue = 0;
            for(let i = 0;i < rolls.length; i++){
                currentCard = this.rollToCard(rolls[i]);
                top += currentCard.emoji;
                middle += `${currentCard.cardValue}${i<rolls.length-1?" + ":""}`;
                handValue += currentCard.cardValue;
            }
            if(handValue != expectedHandValue){
                middle = middle.replace(/(?:\s|^)1(?:\s|$)/, '11');//replace(/[^\d]?1[^\d]?/, '11');
                handValue = expectedHandValue
            }
            bottom = `Soft Value: **${handValue>21?'BUST':handValue}**`;
        }
        return `${top}\n**${middle}**\n${bottom}`;
    },
    rollsToHandValue(rolls){
        //let handValue = rolls.reduce((a, b) => a + this.rollToCard(b).cardValue, 0);
        let cardValues = [];
        for(let i = 0; i < rolls.length; i++){
            cardValues.push(this.rollToCard(rolls[i]).cardValue);
        }
        let handValue = cardValues.reduce((a, b) => a + b, 0);
        if(cardValues.includes(1) && handValue+10 <= 21){ handValue += 10; }
        return handValue;
    }
    
};