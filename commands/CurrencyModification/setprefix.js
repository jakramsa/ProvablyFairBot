const { prefix, embedColors } = require('../../config.json');

module.exports = {
    name: 'setprefix',
    description: 'Sets a postfix string that is displayed for a currency.',
    args: true,
    argCount: 2,
    usage(){ return `${prefix}${this.name} [currency] "[prefix]"`; },
    cooldown: 0,
    guildOnly: true,
    maximumPrefixLength: 10,
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
        let newPrefix;
        if(args[1][0] === '"'){
            newPrefix = message.content.match(/".*?"/g);
            if(newPrefix == null || newPrefix.length < 1){
                newPrefix = message.content.split(/ +/)[2];
            } else {
                newPrefix = newPrefix[0].substring(1, newPrefix[0].length-1);
            }
        } else {
            newPrefix = message.content.split(/ +/)[2];
        }
        if(newPrefix.length > this.maximumPrefixLength){
            embed.setColor(embedColors.error)
            .addField("Error", `The maximum allowable prefix length is ${this.maximumPrefixLength}.`);
            return message.channel.send(embed).catch(console.error);
        }
        let result = await currencyHandler.setPrefix(currency, newPrefix).catch(console.error);
        if(result){
                embed.setColor(embedColors.general)
                .addField("Success", `'${newPrefix}' was successfully set as the prefix for ${currency.name}.`);
                return message.channel.send(embed).catch(console.error);
        } else {
                embed.setColor(embedColors.error)
                .addField("Error", `An error occurred while trying to set prefix to '${newPrefix}' for ${currency.name}.`);
                return message.channel.send(embed).catch(console.error);
        }
    },
};