const { prefix, embedColors } = require('../../config.json');

module.exports = {
    name: 'showcurrencyinfo',
    description: 'Shows the information for the specified currency.',
    aliases: ['sci', 'currencyinfo', 'currency'],
    args: true,
    argCount: 1,
    usage(){ return `${prefix}${this.name} [currency]`; },
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
        let multipliers =  await currencyHandler.getMultipliers(currency);
        let currencyInfo = await currencyHandler.getCurrencyInfo(message.guild.id);
        embed.setTitle(`${currency.name} Information`)
        .addField("Prefix", "'"+currencyInfo[currency.name].prefix+"'", true)
        .addField("Postfix", "'"+currencyInfo[currency.name].postfix+"'", true)
        .addField("Max Decimals", currencyInfo[currency.name].maxDecimals)
        .addField("Minimum Bet", currencyInfo[currency.name].minimumBet, true)
        .addField("Maximum Bet", currencyInfo[currency.name].maximumBet, true)
        .addField("Multipliers", multipliers)
        .addField("Rates", `Use !rates ${currency.name}`)
        .addField("Updaters", `${(currencyInfo[currency.name].updaters.length>=1?"<@":"")+currencyInfo[currency.name].updaters.join('>, <@')+(currencyInfo[currency.name].updaters.length>=1?">":"None")} `);
        return message.channel.send(embed).catch(console.error);
    },
};