const { prefix, embedColors } = require('../../config.json');

module.exports = {
    name: 'setrate',
    description: 'Sets the conversion rate from one currency to another.',
    aliases: ['setrates', 'sr'],
    args: true,
    argCount: 3,
    usage(){ return `${prefix}${this.name} [source currency] [destination currency] [rate]`; },
    cooldown: 0,
    guildOnly: true,
    async execute(message, args) {
        const currencyHandler = message.client.currencyHandler;
        const member = message.guild.member(message.author);
        let embed = new message.client.discord.RichEmbed()
            .setAuthor(member.displayName);
        const sourceCurrency = currencyHandler.Currency(message.guild.id, args[0], null, message.author.id);
        let currencyList = await currencyHandler.getCurrencies(message.guild.id);
        let validCurrency = await currencyHandler.validCurrency(sourceCurrency);
        if(!validCurrency){
            embed.setColor(embedColors.error)
            .addField("Error", `'${args[0]}' is not a valid currency.`)
            .addField("Valid Currencies", currencyList);
            return message.channel.send(embed).catch(console.error);
        }
        const allowUpdate = await currencyHandler.canUpdate(sourceCurrency);
        if(!member || (member.guild.ownerID != member.id && !allowUpdate)) {
            embed.setColor(embedColors.error)
            .addField("Error", `Only the guild owner or a ${currency.name} updater can use command ${this.name}.`);
            return message.channel.send(embed).catch(console.error);
        }
        const destCurrency = currencyHandler.Currency(message.guild.id, args[1], null);
        validCurrency = await currencyHandler.validCurrency(destCurrency);
        if(!validCurrency){
            embed.setColor(embedColors.error)
            .addField("Error", `'${args[1]}' is not a valid currency.`)
            .addField("Valid Currencies", currencyList);
            return message.channel.send(embed).catch(console.error);
        }
        if(sourceCurrency.name === destCurrency.name){
            embed.setColor(embedColors.error)
            .addField("Error", `You cannot convert to the same curency.`);
            return message.channel.send(embed).catch(console.error);
        }
        const rate = parseFloat(args[2]);
        if(isNaN(rate)){
            embed.setColor(embedColors.error)
            .addField("Error", `'${args[2]}' is not a valid value.`);
            return message.channel.send(embed).catch(console.error);
        }
        let result = await currencyHandler.setRate(sourceCurrency, destCurrency, rate).catch(console.error);
        if(result){
            let response = ' ';
            if (rate == 0) {
                response = `The rate from ${sourceCurrency.name} to ${destCurrency.name} was sucessfully deleted.`;
            } else {
                response = `'${rate}' was successfully set as the rate from ${sourceCurrency.name} to ${destCurrency.name}.`;
            }
            embed.setColor(embedColors.general)
            .addField("Success", response);
            return message.channel.send(embed).catch(console.error);
        } else {
            embed.setColor(embedColors.error)
            .addField("Error", `An error occurred while trying to set the rate to '${rate}' for ${sourceCurrency.name} to ${destCurrency.name}.`);
            return message.channel.send(embed).catch(console.error);
        }
    },
};