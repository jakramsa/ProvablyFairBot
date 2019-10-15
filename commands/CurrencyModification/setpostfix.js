const { prefix, embedColors } = require('../../config.json');

module.exports = {
    name: 'setpostfix',
    description: 'Sets a postfix string that is displayed for a currency.',
    args: true,
    argCount: 2,
    usage(){ return `${prefix}${this.name} [currency] "[postfix]"`; },
    cooldown: 0,
    guildOnly: true,
    maximumPostfixLength: 10,
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
        let newPostfix;
        if(args[1][0] === '"'){
            newPostfix = message.content.match(/".*?"/g);
            if(newPostfix == null || newPostfix.length < 1){
                newPostfix = message.content.split(/ +/)[2];
            } else {
                newPostfix = newPostfix[0].substring(1, newPostfix[0].length-1);
            }
        } else {
            newPostfix = message.content.split(/ +/)[2];
        }
        if(newPostfix.length > this.maximumPostfixLength){
            embed.setColor(embedColors.error)
            .addField("Error", `The maximum allowable postfix length is ${this.maximumPostfixLength}.`);
            return message.channel.send(embed).catch(console.error);
        }
        let result = await currencyHandler.setPostfix(currency, newPostfix).catch(console.error);
        if(result){
                embed.setColor(embedColors.general)
                .addField("Success", `'${newPostfix}' was successfully set as the postfix for ${currency.name}.`);
                return message.channel.send(embed).catch(console.error);
        } else {
                embed.setColor(embedColors.error)
                .addField("Error", `An error occurred while trying to set postfix to '${newPostfix}' for ${currency.name}.`);
                return message.channel.send(embed).catch(console.error);
        }
    },
};