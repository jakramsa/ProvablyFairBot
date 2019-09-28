const { prefix, embedColors, storeServerSeeds } = require('../../config.json');

module.exports = {
    name: 'war',
    description: 'Battle against the bot or a user.',
    aliases: ['battle', 'dicebattle', 'db'],
    args: true,
    argCount: 2,
    usage(){ return `${prefix}${this.name} [currency] [amount[multiplier]] [user]`; },
    cooldown: 0,
    guildOnly: true,
    multiplier: 1.9,
    maxPoints: 99,
    maxDamage: 33,
    responseTime: 30000,
    hitDelaySeconds: 0.5,
    async execute(message, args) {
        if(message.client.cannotBet(message.author.id)){ return message.channel.send("You are currently playing a game or performing a swap. Please finish to make another bet.").catch(console.error); }
        const currencyHandler = message.client.currencyHandler;
        const currencyName = args[0];
        const betAmount = args[1];
        const bet = currencyHandler.Currency(message.guild.id, currencyName, betAmount, message.author.id);
        const betValidity = await currencyHandler.validBet(bet);
        const member = message.guild.member(message.author);
        let resultsEmbed = new message.client.discord.RichEmbed().setAuthor(member.displayName, member.user.avatarURL);
        switch(betValidity){
            case currencyHandler.BetValidityEnum.VALID_BET:
                if(message.mentions.users.size >= 1){
                    let challengeAccepted = false;
                    let doneWaiting = false;
                    const challengedUser = message.guild.member(message.mentions.users.first());
                    let challengeEmbed = new message.client.discord.RichEmbed()
                        .addField(`${challengedUser.displayName} vs ${member.displayName} (${this.name} challenge)`, `${challengedUser.displayName} type **accept** or **decline** to accept or decline the ${this.name} challenge from ${member.displayName}.`);
                    message.channel.send(challengeEmbed).then((mes) => {
                        message.channel.awaitMessages((m) => {
                            return (m.author.id === challengedUser.user.id && (m.content.toLowerCase() === 'accept' || m.content.toLowerCase() === 'decline'));}, { maxMatches: 1, time: this.responseTime, errors: ['time'] }
                        ).then((collected) => {
                            challengeAccepted = collected.first().content.toLowerCase() === 'accept';
                            doneWaiting = true;
                        })
                        .catch(collected => {
                            doneWaiting = true;
                            //message.channel.send(`${challengedUser.displayName} did not accept your challenge.`);
                        });
                    }).catch(console.error);
                    while(!doneWaiting){ await message.client.wait(1); }
                    if(!challengeAccepted){ return message.channel.send(`${challengedUser.displayName} did not accept your challenge.`).catch(console.error); }
                    const challengedUserBet = currencyHandler.Currency(message.guild.id, currencyName, betAmount, message.mentions.users.first().id);
                    const challengedUserBetValidity = await currencyHandler.validBet(challengedUserBet);
                    switch(challengedUserBetValidity){
                        case currencyHandler.BetValidityEnum.VALID_BET:
                            break;
                        case currencyHandler.BetValidityEnum.INSUFFICIENT_BALANCE:
                            challengeEmbed = new message.client.discord.RichEmbed()
                            .setColor(embedColors.error)
                            .addField("Error", "You don't have enough balance.");
                            return message.channel.send(challengeEmbed).catch(console.error);
                        case undefined:
                        default:
                            challengeEmbed = new message.client.discord.RichEmbed()
                            .setColor(embedColors.error).addField("Error", "Something went wrong.");
                            return message.channel.send(challengeEmbed).catch(console.error);
                    }
                }
                let clientSeed = await currencyHandler.getSeed(message);
                if (clientSeed === ""){
                    clientSeed = message.client.defaultClientSeed;
                }
                let warGame = {'gameMessage': message, 'bet': bet, 'seed': clientSeed, 'nonces': [], 'playerRolls': [], 'botRolls': [], 'opponent': (message.mentions.users.size>=1?message.mentions.users.first():message.client.user)}
                warGame.nonces.push(message.client.nonce);
                const rollValue = Math.ceil(message.client.roll(clientSeed));
                if(rollValue == -1){
                    resultsEmbed.setTitle("An error occured while generating a roll.")
                    .setColor(embedColors.error);
                    return message.channel.send(resultsEmbed).catch(console.error);
                }
                warGame.botHitsFirst = rollValue % 2 == 0;
                resultsEmbed = this.regenerateEmbed(warGame);
                message.client.war.set(message.author.id, warGame);
                if(warGame.opponent != message.client.user){ message.client.war.set(warGame.opponent.id, warGame); }
                message.channel.send(resultsEmbed).then(async (m) => {
                    warGame.gameMessage = m;
                    let playerWon = false;
                    while(this.getPointsLeft(warGame.playerRolls)>0 && this.getPointsLeft(warGame.botRolls)>0){
                        warGame.nonces.push(message.client.nonce);
                        let rollValue = Math.ceil(message.client.roll(clientSeed));
                        if(rollValue == -1){
                            resultsEmbed.setTitle("An error occured while generating a roll.")
                            .setColor(embedColors.error);
                            message.client.war.delete(message.author.id);
                            if(warGame.opponent!=message.client.user){ message.client.war.delete(warGame.opponent.id); }
                            return message.channel.send(resultsEmbed).catch(console.error);
                        }
                        if(warGame.botHitsFirst){
                            warGame.botRolls.push(rollValue);
                            if(this.getPointsLeft(warGame.botRolls) <= 0){
                                break;
                            }
                        } else {
                            warGame.playerRolls.push(rollValue);
                            if(this.getPointsLeft(warGame.playerRolls) <= 0){
                                playerWon = true;
                                break;
                            }
                        }
                        warGame.nonces.push(message.client.nonce);
                        rollValue = Math.ceil(message.client.roll(clientSeed));
                        if(rollValue == -1){
                            resultsEmbed.setTitle("An error occured while generating a roll.")
                            .setColor(embedColors.error);
                            message.client.war.delete(message.author.id);
                            if(warGame.opponent!=message.client.user){ message.client.war.delete(warGame.opponent.id); }
                            return message.channel.send(resultsEmbed).catch(console.error);
                        }
                        if(!warGame.botHitsFirst){
                            warGame.botRolls.push(rollValue);
                            if(this.getPointsLeft(warGame.botRolls) <= 0){
                                break;
                            }
                        } else {
                            warGame.playerRolls.push(rollValue);
                            if(this.getPointsLeft(warGame.playerRolls) <= 0){
                                playerWon = true;
                                break;
                            }
                        }
                        warGame.gameMessage.edit("", this.regenerateEmbed(warGame));
                        await warGame.gameMessage.client.wait(this.hitDelaySeconds);
                    }
                    resultsEmbed = this.regenerateEmbed(warGame);
                    const wagerAmount = await currencyHandler.parseCurrency(bet);

                    let wagerResult = wagerAmount;
                    let result = null;
                    if(playerWon){
                        if(warGame.opponent != message.client.user){
                            result = await currencyHandler.deductBalance(warGame.opponent.id, bet);
                            if(!result){
                                resultsEmbed
                                .addField("Error", `An error occured updating balance of ${warGame.opponent}.`)
                                .setColor(embedColors.error);
                                message.client.war.delete(message.author.id);
                                message.client.war.delete(warGame.opponent.id);
                                return message.channel.send(resultsEmbed).catch(console.error);
                            }
                        }
                        resultsEmbed.setColor(embedColors.win);
                        wagerResult = this.multiplier*wagerAmount;
                        bet.amount = (this.multiplier-1)*wagerAmount;
                        result = await currencyHandler.addBalance(message.author.id, bet);
                        if(!result){
                            resultsEmbed
                            .addField("Error", `An error occured updating balance of ${message.author}.`)
                            .setColor(embedColors.error);
                            message.client.war.delete(message.author.id);
                            if(warGame.opponent != message.client.user){ message.client.war.delete(warGame.opponent.id); }
                            return message.channel.send(resultsEmbed).catch(console.error);
                        }
                    } else {
                        resultsEmbed.setColor(embedColors.loss);
                        result = await currencyHandler.deductBalance(message.author.id, bet);
                        if(!result){
                            resultsEmbed
                            .addField("Error", `An error occured updating balance of ${message.author}.`)
                            .setColor(embedColors.error);
                            message.client.war.delete(message.author.id);
                            if(warGame.opponent != message.client.user){ message.client.war.delete(warGame.opponent.id); }
                            return message.channel.send(resultsEmbed).catch(console.error);
                        }
                        if(warGame.opponent != message.client.user){
                            wagerResult = this.multiplier*wagerAmount;
                            bet.amount = (this.multiplier-1)*wagerAmount;
                            result = await currencyHandler.addBalance(warGame.opponent.id, bet);
                            if(!result){
                                resultsEmbed
                                .addField("Error", `An error occured updating balance of ${warGame.opponent}.`)
                                .setColor(embedColors.error);
                                message.client.war.delete(message.author.id);
                                message.client.war.delete(warGame.opponent.id);
                                return message.channel.send(resultsEmbed).catch(console.error);
                            }
                        }
                    }
                    if(warGame.opponent == message.client.user){
                        result = await currencyHandler.addWager(message.author.id, bet);
                        if(!result){
                            resultsEmbed
                            .addField("Error", "An error occured updating wager.")
                            .setColor(embedColors.error);
                            message.client.war.delete(message.author.id);
                            return message.channel.send(resultsEmbed).catch(console.error);
                        }
                    }
                    const currencyResultString = await currencyHandler.getCurrencyString(currencyHandler.Currency(message.guild.id, currencyName, wagerResult));
                    resultsEmbed.addField(`Results`, `**${playerWon?member.displayName:message.guild.member(warGame.opponent).displayName}** won **${currencyResultString}**.`);
                    message.client.war.delete(message.author.id);
                    if(warGame.opponent != message.client.user){ message.client.war.delete(warGame.opponent.id); }
                    return warGame.gameMessage.edit("", resultsEmbed);
                }).catch(console.error);
                return;
            case currencyHandler.BetValidityEnum.INVALID_CURRENCY:
                let currencyList = await currencyHandler.getCurrencies(message.guild.id);
                resultsEmbed.setTitle("You've entered an invalid currency.")
                .addField("Usage", this.usage())
                .addField("Valid Currencies", currencyList)
                .setColor(embedColors.error);
                return message.channel.send(resultsEmbed).catch(console.error);
            case currencyHandler.BetValidityEnum.INVALID_AMOUNT:
                resultsEmbed.setTitle("You've entered an invalid amount.")
                .addField("Usage", this.usage())
                .setColor(embedColors.error);
                return message.channel.send(resultsEmbed).catch(console.error);
            case currencyHandler.BetValidityEnum.AMOUNT_TOO_LOW:
                let minimumBet = await currencyHandler.getMinimumBet(bet);
                resultsEmbed.setTitle("Your bet was too low.")
                .addField("Usage", this.usage())
                .addField("Minimum bet for "+bet.name, minimumBet)
                .setColor(embedColors.error);
                return message.channel.send(resultsEmbed).catch(console.error);
            case currencyHandler.BetValidityEnum.AMOUNT_TOO_HIGH:
                let maximumBet = await currencyHandler.getMaximumBet(bet);
                resultsEmbed.setTitle("Your bet was too high.")
                .addField("Usage", this.usage())
                .addField("Maximum bet for "+bet.name, maximumBet)
                .setColor(embedColors.error);
                return message.channel.send(resultsEmbed).catch(console.error);
            case currencyHandler.BetValidityEnum.INVALID_MULTIPLIER:
                let multiplierString = await currencyHandler.getMultipliers(bet);
                resultsEmbed.setTitle("You've entered an invalid multiplier.")
                .addField("Usage", this.usage())
                .addField("Valid Multipliers", multiplierString)
                .setColor(embedColors.error);
                return message.channel.send(resultsEmbed).catch(console.error);
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
    rollToDamage(rollValue){
        return Math.ceil(rollValue*this.maxDamage/100)-1;
    },
    getPointsLeft(rolls){
        let points = this.maxPoints;
        for(let i = 0; i < rolls.length; i++){
            points -= this.rollToDamage(rolls[i]);
        }
        return points;
    },
    getPointsAsHitList(playerRolls, botRolls){
        let lists = ["", ""]
        let points = [this.maxPoints, this.maxPoints];
        let maxLength = Math.max(playerRolls.length, botRolls.length);
        for(let i = 0; i < maxLength; i++){
            let botDamage = botRolls[i]?this.rollToDamage(botRolls[i]):0;
            let playerDamage = playerRolls[i]?this.rollToDamage(playerRolls[i]):0;
            points[0] -= botDamage;
            points[1] -= playerDamage;
            lists[0] += playerRolls[i]?`Hit **${playerDamage}** (${Math.max(points[0], 0)}/${this.maxPoints})\n`:"";
            lists[1] += botRolls[i]?`Hit **${botDamage}** (${Math.max(points[1], 0)}/${this.maxPoints})\n`:"";
        }
        return lists;
    },
    regenerateEmbed(warGame){
        let member = warGame.gameMessage.guild.members.get(warGame.bet.userId);
        let lists = this.getPointsAsHitList(warGame.playerRolls, warGame.botRolls);
        let embed = new warGame.gameMessage.client.discord.RichEmbed()
        .setAuthor(member.displayName, member.user.avatarURL)
        .setTitle(`${this.name.toUpperCase()}x${this.multiplier}`)
        .setColor(embedColors.general)
        .addField(member.displayName,`${Math.max(this.getPointsLeft(warGame.botRolls), 0)}/${this.maxPoints} \n${lists[0]}`, true)
        .addField(warGame.gameMessage.guild.member(warGame.opponent?warGame.opponent:warGame.gameMessage.client.user).displayName,`${Math.max(this.getPointsLeft(warGame.playerRolls), 0)}/${this.maxPoints} \n${lists[1]}`, true)
        .setFooter((storeServerSeeds? `Server Seed: ${warGame.gameMessage.client.serverSeedId} `:"")+"Client Seed: '"+warGame.seed+"' Nonce: "+warGame.nonces.join(", "));
        return embed;
    }
};