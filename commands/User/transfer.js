const { prefix, embedColors } = require('../../config.json');

module.exports = {
    name: 'transfer',
    description: 'Transfer currency from your wallet to (an)other user(s).',
    aliases: ['t', 'give', 'send'],
    args: true,
    argCount: 3,
    usage(){ return `${prefix}${this.name} [currency] [user(s)] [amount[multiplier]]`; },
    cooldown: 0,
    guildOnly: true,
    async execute(message, args) {
        const currencyHandler = message.client.currencyHandler;
        const member = message.guild.member(message.author);
        let transferEmbed = new message.client.discord.RichEmbed()
            .setAuthor(member.displayName);
        if(!message.mentions.users.size){
            transferEmbed.setColor(embedColors.error)
            .addField("Error", "You did not specify a valid user.");
            return message.channel.send(transferEmbed).catch(console.error);
        }

        let currencyList = await currencyHandler.getCurrencies(message.guild.id);
        const currency = currencyHandler.Currency(message.guild.id, args[0], args[args.length-1], message.author.id);
        const validity = await currencyHandler.validBet(currency);
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
                let minimumCurrencyString = await currencyHandler.getCurrencyString(currencyHandler.Currency(message.guild.id, currency.name, minimum));
                embed.setColor(embedColors.error)
                .addField("Error", `'${args[args.length-1]}' is too low to exchange.`)
                .addField("Minimum Exchange Amount", `${minimumCurrencyString}`);
                return message.channel.send(embed).catch(console.error);
            case currencyHandler.BetValidityEnum.INVALID_AMOUNT:
                embed.setColor(embedColors.error)
                .addField("Error", `'${args[args.length-1]}' is an invalid amount.`);
                return message.channel.send(embed).catch(console.error);
            case currencyHandler.BetValidityEnum.INVALID_MULTIPLIER:
                embed.setColor(embedColors.error)
                .addField("Error", `'${args[args.length-1]}' has an invalid multiplier.`);
                return message.channel.send(embed).catch(console.error);
            case currencyHandler.BetValidityEnum.INSUFFICIENT_BALANCE:
                embed.setColor(embedColors.error)
                .addField("Error", `You don't have enough balance.`);
                return message.channel.send(embed).catch(console.error);
            case currencyHandler.BetValidityEnum.VALID_BET:
            case currencyHandler.BetValidityEnum.AMOUNT_TOO_HIGH:
                break;
        }

        let userList = "";
        const users = Array.from(message.mentions.users.values());
        for(let i = 0; i<users.length;i++){
            let user = users[i];
            let result = await currencyHandler.deductBalance(message.author.id, currency);
            if(result){
                result = await currencyHandler.addBalance(user.id, currency);
                if(result){
                    userList += `${user} `;
                } else {
                    let errorEmbed = new message.client.discord.RichEmbed()
                        .setColor(embedColors.error)
                        .addField("Error", `An error occured trying to add balance to ${user}.`);
                    message.channel.send(errorEmbed).catch(console.error);
                }
            } else {
                let errorEmbed = new message.client.discord.RichEmbed()
                    .setColor(embedColors.error)
                    .addField("Error", `An error occured trying to deduct balance from ${message.author}.`);
                message.channel.send(errorEmbed).catch(console.error);
            }
        }
        if(userList !== ""){
            let currencyString = await currencyHandler.getCurrencyString(currency);
            transferEmbed.setColor(embedColors.general)
            .addField("Currency Update", `Successfully transfered ${currencyString} to ${userList}wallet${(message.mentions.users.size>1)?"s":""}.`);
            return message.channel.send(transferEmbed).catch(console.error);
        }
    },
};