//TODO: Should use awaitMessages here instead

const { prefix, embedColors } = require('../../config.json');

module.exports = {
    name: 'exchange',
    description: 'Exchange currency to another currency.',
    aliases: ['e','ex','swap'],
    args: true,
    argCount: 3,
    usage(){ return `${prefix}${this.name} [source currency] [destination currency] [amount]`; },
    cooldown: 0,
    guildOnly: true,
    acceptTime: 20,
    async execute(message, args, originalArgs) {
        const currencyHandler = message.client.currencyHandler;
        const member = message.guild.member(message.author);
        let embed = new message.client.discord.RichEmbed()
            .setAuthor(member.displayName);

        if(originalArgs && args !== 'accept'){
            if(message.client.swaps.has(message.author.id)){message.client.swaps.delete(message.author.id);}
            embed.setColor(embedColors.general)
            .addField("Swap Declined", `Your exchange request has been declined.`);
            return message.channel.send(embed).catch(console.error);
        }

        let currencyList = await currencyHandler.getCurrencies(message.guild.id);
        const sourceCurrency = currencyHandler.Currency(message.guild.id, originalArgs?originalArgs[0]:args[0], originalArgs?originalArgs[2]:args[2], message.author.id);

        const validity = await currencyHandler.validBet(sourceCurrency);
        switch(validity) {
            case currencyHandler.BetValidityEnum.ERROR:
            case undefined:
            default:
                embed.addField("Error", `Unknown validity state.`);
                return message.channel.send(embed).catch(console.error);
            case currencyHandler.BetValidityEnum.INVALID_CURRENCY:
                embed.setColor(embedColors.error)
                .addField("Error", `'${sourceCurrency.name}' is not a valid currency.`)
                .addField("Valid Currencies", currencyList);
                return message.channel.send(embed).catch(console.error);
            case currencyHandler.BetValidityEnum.AMOUNT_TOO_LOW:
                let minimum = await currencyHandler.getMinimumBet(sourceCurrency);
                let minimumCurrencyString = await currencyHandler.getCurrencyString(currencyHandler.Currency(message.guild.id, sourceCurrency.name, minimum));
                embed.setColor(embedColors.error)
                .addField("Error", `'${originalArgs?originalArgs[2]:args[2]}' is too low to exchange.`)
                .addField("Minimum Exchange Amount", `${minimumCurrencyString}`);
                return message.channel.send(embed).catch(console.error);
            case currencyHandler.BetValidityEnum.INVALID_AMOUNT:
                embed.setColor(embedColors.error)
                .addField("Error", `'${originalArgs?originalArgs[2]:args[2]}' is an invalid amount.`);
                return message.channel.send(embed).catch(console.error);
            case currencyHandler.BetValidityEnum.INVALID_MULTIPLIER:
                embed.setColor(embedColors.error)
                .addField("Error", `'${originalArgs?originalArgs[2]:args[2]}' has an invalid multiplier.`);
                return message.channel.send(embed).catch(console.error);
            case currencyHandler.BetValidityEnum.INSUFFICIENT_BALANCE:
                embed.setColor(embedColors.error)
                .addField("Error", `You don't have enough balance.`);
                return message.channel.send(embed).catch(console.error);
            case currencyHandler.BetValidityEnum.VALID_BET:
            case currencyHandler.BetValidityEnum.AMOUNT_TOO_HIGH:
                break;
        }

        const destCurrency = currencyHandler.Currency(message.guild.id, originalArgs?originalArgs[1]:args[1], 0);
        let validCurrency = await currencyHandler.validCurrency(destCurrency);
        if(!validCurrency){
            embed.setColor(embedColors.error)
            .addField("Error", `'${destCurrency.name}' is not a valid currency.`)
            .addField("Valid Currencies", currencyList);
            return message.channel.send(embed).catch(console.error);
        }

        if(sourceCurrency.name === destCurrency.name){
            embed.setColor(embedColors.error)
            .addField("Error", `You cannot convert to the same curency.`);
            return message.channel.send(embed).catch(console.error);
        }
        const rate = await currencyHandler.getRate(sourceCurrency, destCurrency);
        if(!rate) {
            embed.setColor(embedColors.error)
            .addField("Error", `An exchange rate is not set to convert from ${sourceCurrency.name} to ${destCurrency.name}.`);
            return message.channel.send(embed).catch(console.error);
        }

        const sourceAmount = await currencyHandler.parseCurrency(sourceCurrency);
        const destAmount = await currencyHandler.roundCurrency(currencyHandler.Currency(message.guild.id, destCurrency.name, sourceAmount*rate));
        destCurrency.amount = destAmount;
        if(originalArgs){
            message.client.swaps.delete(message.author.id);
            let result = await currencyHandler.deductBalance(message.author.id, sourceCurrency);
            if(result){
                result = await currencyHandler.addBalance(message.author.id, destCurrency);
                if(result){
                    const sourceCurrencyString = await currencyHandler.getCurrencyString(sourceCurrency);
                    const destCurrencyString = await currencyHandler.getCurrencyString(destCurrency);
                    embed.setColor(embedColors.general)
                    .addField("Swap Successful", `Your exchange from **${sourceCurrencyString}** to **${destCurrencyString}** was successful.`);
                    return message.channel.send(embed).catch(console.error);
                } else {
                    let errorEmbed = new message.client.discord.RichEmbed()
                        .setColor(embedColors.error)
                        .addField("Error", `An error occured trying to add ${destCurrency.name} balance of ${member}.`);
                    return message.channel.send(errorEmbed).catch(console.error);
                }
            } else {
                let errorEmbed = new message.client.discord.RichEmbed()
                    .setColor(embedColors.error)
                    .addField("Error", `An error occured trying to deduct ${sourceCurrency.name} balance of ${member}.`);
                return message.channel.send(errorEmbed).catch(console.error);
            }
        } else {
                if(message.client.cannotBet(message.author.id)){ return message.channel.send("You are currently playing a game or performing a swap. Please finish to perform a swap.").catch(console.error); }
                /*if(message.client.swaps.has(message.author.id)){
                    embed.setColor(embedColors.error)
                    .addField("Error", `You already have a pending swap request. Please accept, decline, or wait for the current swap request to expire before requesting another swap.`);
                    return message.channel.send(embed).catch(console.error);
                }*/
                message.client.swaps.set(message.author.id, args);
                const sourceCurrencyString = await currencyHandler.getCurrencyString(sourceCurrency);
                const destCurrencyString = await currencyHandler.getCurrencyString(destCurrency);
                setTimeout(() => {
                    if(message.client.swaps.has(message.author.id)){
                            message.client.swaps.delete(message.author.id);
                            let embed = new message.client.discord.RichEmbed()
                                .setColor(this.embedColor)
                                .setAuthor(member.displayName)
                                .addField("Swap Expired", `Your exchange request has expired.`);
                            message.channel.send(embed).catch(console.error);
                }}, this.acceptTime*1000);
                embed.setColor(embedColors.general)
                .addField("Exchange Request", `For **${sourceCurrencyString}** you will recieve **${destCurrencyString}**. Respond with **accept** to confirm or **decline** to cancel.`);
                return message.channel.send(embed).catch(console.error);
        }
    },
};