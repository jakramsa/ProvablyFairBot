const { prefix, embedColors } = require('../../config.json');

module.exports = {
    name: 'removecurrency',
    description: 'Removes a guild currency.',
    aliases: ['rc'],
    args: true,
    argCount: 1,
    usage(){ return `${prefix}${this.name} [currency name]`; },
    cooldown: 0,
    guildOnly: true,
    async execute(message, args) {
        const currencyHandler = message.client.currencyHandler;
        const member = message.guild.member(message.author);
        let embed = new message.client.discord.RichEmbed()
            .setAuthor(member.displayName);
        const currency = currencyHandler.Currency(message.guild.id, args[0]);
        if(!member || member.guild.ownerID != member.id) {
            embed.setColor(embedColors.error)
            .addField("Error", `Only the guild owner can use command ${this.name}.`);
            return message.channel.send(embed).catch(console.error);
        }
        let currencyList = await currencyHandler.getCurrencies(message.guild.id);
        const validCurrency = await currencyHandler.validCurrency(currency);
        if(!validCurrency){
            embed.setColor(embedColors.error)
            .addField("Error", `'${currency.name}' is not a valid currency.`)
            .addField("Valid Currencies", currencyList);
            return message.channel.send(embed).catch(console.error);
        } else {
            let result = await currencyHandler.removeCurrencyName(currency).catch(console.error);
            if(result){
                currencyList = await currencyHandler.getCurrencies(message.guild.id);
                embed.setColor(embedColors.general)
                .addField("Success", `'${currency.name}' was successfully removed as a currency.`)
                .addField("Valid Currencies", currencyList);
                return message.channel.send(embed).catch(console.error);
            } else {
                embed.setColor(embedColors.error)
                .addField("Error", `An error occurred while trying to remove currency '${currency.name}'.`)
                .addField("Valid Currencies", currencyList);
                return message.channel.send(embed).catch(console.error);
            }
        }
    },
};