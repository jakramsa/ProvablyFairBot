const { prefix, embedColors, storeServerSeeds } = require('../../config.json');

module.exports = {
    name: '50',
    description: 'Bet that a roll will be above 50',
    args: true,
    argCount: 2,
    usage(){ return `${prefix}${this.name} [currency] [amount[multiplier]]`; },
    cooldown: 0,
    guildOnly: true,
    multiplier: 1.9,
    async execute(message, args) {
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
                resultsEmbed.setFooter((storeServerSeeds? `Server Seed: ${message.client.serverSeedId} `:"")+"Client Seed: '"+clientSeed+"' Nonce: "+message.client.nonce);
                const rollValue = Math.ceil(message.client.roll(clientSeed));
                if(rollValue == -1){
                    resultsEmbed.setTitle("An error occured while generating a roll.")
                    .setColor(embedColors.error);
                    return message.channel.send(resultsEmbed).catch(console.error);
                }
                const wagerAmount = await currencyHandler.parseCurrency(bet);

                let wagerResult = wagerAmount;
                let result = null;
                if(rollValue >= parseInt(this.name)+1){
                    resultsEmbed.setColor(embedColors.win);
                    wagerResult = this.multiplier*wagerAmount;
                    bet.amount = (this.multiplier-1)*wagerAmount;
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
                resultsEmbed.addField(`${this.name}x${this.multiplier} Dicing`, `Rolled **${rollValue}** out of 100. You **${(wagerResult > wagerAmount?"won":"lost")} ${currencyResultString}**.`);
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
                //return message.channel.send("Invalid Bet State").catch(console.error);
        }
    },
};