const { prefix, embedColors, includesDir, storeServerSeeds } = require('../../config.json');

module.exports = {
    name: 'slots',
    description: 'Play a game of slots.',
    aliases: ['slot'],
    args: true,
    argCount: 2,
    usage(){ return `${prefix}${this.name} [currency] [amount[multiplier]]`; },
    cooldown: 0,
    guildOnly: true,
    reelCount: 3,
    oneCherryMultiplier: 2,
    twoCherriesMultiplier: 5,
    threeCherriesMultiplier: 10,
    threeDoubleBarsMultiplier: 25,
    threeTripleBarsMultiplier: 40,
    threeSevensMultiplier: 80,
    grapesEmoji: "\u{1f347}",
    orangeEmoji: "\u{1F34A}",
    cherryEmoji: "\u{1F352}",
    singleBarEmoji: "\u{2B50}",
    doubleBarEmoji: "\u{1f31f}",
    tripleBarEmoji: "\u{1F48E}",
    sevenEmoji: ":seven:",
    reelFaces: {
        GRAPES: 0,
        ORANGE: 1,
        CHERRY: 2,
        SINGLE_BAR: 3,
        DOUBLE_BAR: 4,
        TRIPLE_BAR: 5,
        SEVEN: 6
    },
    async execute(message, args, update) {
        if(message.client.cannotBet(message.author.id)){ return message.channel.send("You are currently playing a game or performing a swap. Please finish to make another bet.").catch(console.error); }
        const currencyHandler = message.client.currencyHandler;
        const currencyName = args[0];
        const betAmount = args[1];
        const bet = currencyHandler.Currency(message.guild.id, currencyName, betAmount, message.author.id);
        const betValidity = await currencyHandler.validBet(bet);
        const member = message.guild.member(message.author);
        let resultsEmbed = new message.client.discord.RichEmbed()
            .setAuthor(member.displayName, message.author.avatarURL, 'https://discordapp.com/channels/'+message.guild.id+'/'+message.channel.id+'/'+message.id);
        switch(betValidity){
            case currencyHandler.BetValidityEnum.VALID_BET:
                let clientSeed = await currencyHandler.getSeed(message);
                if (clientSeed === ""){
                    clientSeed = message.client.defaultClientSeed;
                }
                let rolls = [];
                let nonces = [];
                for(let i = 0; i < this.reelCount; i++){
                    nonces.push(message.client.nonce)
                    let rollValue = Math.ceil(message.client.roll(clientSeed));
                    if(rollValue == -1){
                        resultsEmbed.setTitle("An error occured while generating a roll.")
                        .setColor(embedColors.error);
                        return message.channel.send(resultsEmbed).catch(console.error);
                    }
                    rolls.push(rollValue);
                }
                const multiplier = this.getMultiplier(rolls);
                const wagerAmount = await currencyHandler.parseCurrency(bet);

                let wagerResult = wagerAmount;
                resultsEmbed.setFooter((storeServerSeeds? `Server Seed: ${message.client.serverSeedId} `:"")+"Client Seed: '"+clientSeed+"' Nonce: "+nonces.join(", "));
                let result = null;
                if(multiplier > 0){
                    resultsEmbed.setColor(embedColors.win);
                    wagerResult = multiplier*wagerAmount;
                    bet.amount = (multiplier-1)*wagerAmount;
                    result = await currencyHandler.addBalance(message.author.id, bet);
                } else {
                    resultsEmbed.setColor(embedColors.loss);
                    result = await currencyHandler.deductBalance(message.author.id, bet);
                }
                if(!result){
                    resultsEmbed
                    .addField("Error", "An error occured updating balance.")
                    .setColor(embedColors.error);
                    return message.channel.send(resultsEmbed).catch(console.error);
                }
                result = await currencyHandler.addWager(message.author.id, bet);
                if(!result){
                    resultsEmbed
                    .addField("Error", "An error occured updating wager.")
                    .setColor(embedColors.error);
                    return message.channel.send(resultsEmbed).catch(console.error);
                }
                const currencyResultString = await currencyHandler.getCurrencyString(currencyHandler.Currency(message.guild.id, currencyName, wagerResult));
                resultsEmbed.setTitle(`${this.name}`)
                .addField("Reels", `\> > ${this.rollsToReelString(rolls)} <`)
                .addField("Results", `You **${(wagerResult > wagerAmount?"won":"lost")} ${currencyResultString}**.`);
                return message.channel.send(resultsEmbed).catch(console.error);
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
    rollToReelFace(rollValue){
        return Math.floor(rollValue*(Math.max.apply(null, Object.values(this.reelFaces)))/100);
    },
    getMultiplier(rolls){
        const reelFaces = rolls.map((roll) => { return this.rollToReelFace(roll); });
        let multiplier = 0;
        if(reelFaces.includes(this.reelFaces.CHERRY)){
            //multiplier = this.oneCherryMultiplier;
            if(reelFaces.indexOf(this.reelFaces.CHERRY, reelFaces.indexOf(this.reelFaces.CHERRY)+1) > -1){
                multiplier = this.twoCherriesMultiplier;
            }
        }
        if(reelFaces.every(face => face >= this.reelFaces.SINGLE_BAR && face <= this.reelFaces.TRIPLE_BAR)){
            multiplier = this.twoCherriesMultiplier;
        }
        let sameFace = (reelFaces.every(face => face === reelFaces[0])?reelFaces[0]:-1);
        switch(sameFace){
            case this.reelFaces.GRAPES:
            case this.reelFaces.ORANGE:
            case this.reelFaces.CHERRY:
            case this.reelFaces.SINGLE_BAR:
                multiplier = this.threeCherriesMultiplier;
                break;
            case this.reelFaces.DOUBLE_BAR:
                multiplier = this.threeDoubleBarsMultiplier;
                break;
            case this.reelFaces.TRIPLE_BAR:
                multiplier = this.threeTripleBarsMultiplier;
                break;
            case this.reelFaces.SEVEN:
                multiplier = this.threeSevensMultiplier;
                break;
            case -1:
            case undefined:
            default:
                break;
        }
        /*const allSameFace = (faceArray, sameFace) => faceArray.every(face => face === sameFace);
        if(allSameFace(reelFaces, this.reelFaces.CHERRY) || sameFaces(reelFaces, this.reelFaces.SINGLE_BAR)){
            multiplier = this.threeCherriesMultiplier;
        } else if(allSameFace(reelFaces, this.reelFaces.DOUBLE_BAR)){
            multiplier = this.threeDoubleBarsMultiplier;
        } else if(allSameFace(reelFaces, this.reelFaces.TRIPLE_BAR)){
            multiplier = this.threeTripleBarsMultiplier;
        } else if(allSameFace(reelFaces, this.reelFaces.SEVEN)){
            multiplier = this.threeSevensMultiplier;
        }*/
        return multiplier;
    },
    facetoEmoji(face){
        switch(face){
            case this.reelFaces.GRAPES:
            case undefined:
            default:
                return this.grapesEmoji;
            case this.reelFaces.ORANGE:
                return this.orangeEmoji;
            case this.reelFaces.CHERRY:
                return this.cherryEmoji;
            case this.reelFaces.SINGLE_BAR:
                return this.singleBarEmoji;
            case this.reelFaces.DOUBLE_BAR:
                return this.doubleBarEmoji;
            case this.reelFaces.TRIPLE_BAR:
                return this.tripleBarEmoji;
            case this.reelFaces.SEVEN:
                return this.sevenEmoji;
        }
    },
    rollsToReelString(rolls){
        return (rolls.map((roll) => { return this.facetoEmoji(this.rollToReelFace(roll)); })).join(" ");
    }
};