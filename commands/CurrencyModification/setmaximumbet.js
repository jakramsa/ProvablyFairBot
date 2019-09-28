const { prefix, embedColors } = require('../../config.json');

module.exports = {
    name: 'setmaximumbet',
    description: 'Sets the maximum allowable bet of a currency.',
    aliases: ['smab'],
    args: true,
    argCount: 2,
    usage(){ return `${prefix}${this.name} [currency] [maximum bet amount]`; },
    cooldown: 0,
    guildOnly: true,
    async execute(message, args) {
        const currencyHandler = message.client.currencyHandler;
        const member = message.guild.member(message.author);
        let embed = new message.client.discord.RichEmbed()
            .setAuthor(member.displayName);
        const currency = currencyHandler.Currency(message.guild.id, args[0], null, message.author.id);
        const validCurrency = await currencyHandler.validCurrency(currency);
        if(!validCurrency){
            let currencyList = await currencyHandler.getCurrencies(message.guild.id);
            embed.setColor(embedColors.error)
            .addField("Error", `'${currency.name}' is not a valid currency.`)
            .addField("Valid Currencies", currencyList);
            return message.channel.send(embed).catch(console.error);
        }
        const allowUpdate = await currencyHandler.canUpdate(currency);
        if(!member || (member.guild.ownerID != member.id && !allowUpdate)) {
            embed.setColor(embedColors.error)
            .addField("Error", `Only the guild owner or a ${currency.name} updater can use command ${this.name}.`);
            return message.channel.send(embed).catch(console.error);
        }
        const newMaximum = parseFloat(args[1]);
        if(isNaN(newMaximum)){
            embed.setColor(embedColors.error)
            .addField("Error", `'${args[1]}' is not a valid bet amount.`);
            return message.channel.send(embed).catch(console.error);
        }
        let currencyInfo = await currencyHandler.getCurrencyInfo(currency.guildId);
        if(newMaximum < currencyInfo[currency.name].minimumBet){
            embed.setColor(embedColors.error)
            .addField("Error", `'${newMaximum}' is below the minimum bet (${currencyInfo[currency.name].minimumBet}).`);
            return message.channel.send(embed).catch(console.error);
        }
        const result  = await currencyHandler.setMaximumBet(currency, newMaximum).catch(console.error);
        if(result){
                embed.setColor(embedColors.general)
                .addField("Success", `'${newMaximum}' was successfully set as the maximum bet for ${currency.name}.`);
                return message.channel.send(embed).catch(console.error);
        } else {
                embed.setColor(embedColors.error)
                .addField("Error", `An error occurred while trying to set the maximum bet of '${newMaximum}' for ${currency.name}.`);
                return message.channel.send(embed).catch(console.error);
        }
    },
};