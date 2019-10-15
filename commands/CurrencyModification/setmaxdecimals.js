const { prefix, embedColors } = require('../../config.json');

module.exports = {
    name: 'setmaxdecimals',
    description: 'Sets the maximum number of decimals a currency can use.',
    aliases: ['smd'],
    args: true,
    argCount: 2,
    usage(){ return `${prefix}${this.name} [currency] [number of decimals]`; },
    cooldown: 0,
    guildOnly: true,
    decimalLowerLimit: 0,
    decimalUpperLimit: 8,
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
        const numberOfDecimals = parseInt(args[1]);
        if(isNaN(numberOfDecimals)){
            embed.setColor(embedColors.error)
            .addField("Error", `'${args[1]}' is not a valid number of decimals.`);
            return message.channel.send(embed).catch(console.error);
        }
        if(numberOfDecimals < this.decimalLowerLimit || numberOfDecimals > this.decimalUpperLimit){
            embed.setColor(embedColors.error)
            .addField("Error", `The maximum number of decimals is limited to range [${this.decimalLowerLimit}, ${this.decimalUpperLimit}].`);
            return message.channel.send(embed).catch(console.error);
        }
        let result = await currencyHandler.setDecimals(currency, numberOfDecimals).catch(console.error);
        if(result){
                embed.setColor(embedColors.general)
                .addField("Success", `'${numberOfDecimals}' was successfully set as the maximum number of decimals for ${currency.name}.`);
                return message.channel.send(embed).catch(console.error);
        } else {
                embed.setColor(embedColors.error)
                .addField("Error", `An error occurred while trying to set the maximum number of decimals '${numberOfDecimals}' for ${currency.name}.`);
                return message.channel.send(embed).catch(console.error);
        }
    },
};