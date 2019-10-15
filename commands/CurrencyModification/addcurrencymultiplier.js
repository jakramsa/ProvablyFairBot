const { prefix, embedColors } = require('../../config.json');

module.exports = {
    name: 'addcurrencymultiplier',
    description: 'Adds a currency multiplier.',
    aliases: ['acm'],
    args: true,
    argCount: 3,
    usage(){ return `${prefix}${this.name} [currency] [multiplier] [multiplier amount]`; },
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
        const newMultiplierAmount = parseFloat(args[2]);
        if(isNaN(newMultiplierAmount)){
            embed.setColor(embedColors.error)
            .addField("Error", `'${args[2]}' is not a valid bet multiplier amount.`);
            return message.channel.send(embed).catch(console.error);
        }
        const newMultiplierName = args[1];
        if(args[1].length > 1 || !(/[A-Za-z]/.test(args[1]))){
            embed.setColor(embedColors.error)
            .addField("Error", `'${args[1]}' is not a valid multiplier. Multipliers must be a single alphabetical character and are not case sensitive.`);
            return message.channel.send(embed).catch(console.error);
        }
        const result  = await currencyHandler.addMultiplier(currency, newMultiplierName, newMultiplierAmount).catch(console.error);
        if(result){
                embed.setColor(embedColors.general)
                .addField("Success", `'${newMultiplierName}' was successfully set as a multiplier of value ${newMultiplierAmount} for ${currency.name}.`);
                return message.channel.send(embed).catch(console.error);
        } else {
                embed.setColor(embedColors.error)
                .addField("Error", `An error occurred while trying to set the multiplier '${newMultiplierName}' of value '${newMultiplierAmount}' for ${currency.name}.`);
                return message.channel.send(embed).catch(console.error);
        }
    },
};