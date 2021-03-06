const { prefix, embedColors } = require('../../config.json');

module.exports = {
    name: 'removeupdater',
    description: 'Removes a user from being able to alter a currency.',
    aliases: ['ru'],
    args: true,
    argCount: 1,
    usage(){ return `${prefix}${this.name} [currency name] [user]`; },
    cooldown: 0,
    guildOnly: true,
    async execute(message, args) {
        const currencyHandler = message.client.currencyHandler;
        const member = message.guild.member(message.author);
        let embed = new message.client.discord.RichEmbed()
            .setAuthor(member.displayName);
        if(!member || member.guild.ownerID != member.id) {
            embed.setColor(embedColors.error)
            .addField("Error", `Only the guild owner can use command ${this.name}.`);
            return message.channel.send(embed).catch(console.error);
        }
        if(!message.mentions.users.size){
            embed.setColor(embedColors.error)
            .addField("Error", "You did not specify a valid user.");
            return message.channel.send(transferEmbed).catch(console.error);
        }
        const currency = currencyHandler.Currency(message.guild.id, args[0], null, message.mentions.users.first().id);
        const validCurrency = await currencyHandler.validCurrency(currency);
        if(validCurrency){
            let canUpdate = await currencyHandler.canUpdate(currency);
            if(!canUpdate){
                embed.setColor(embedColors.error)
                .addField("Error", `${message.guild.member(message.mentions.users.first()).displayName} is not an updater for '${currency.name}'.`);
                return message.channel.send(embed).catch(console.error);
            }
            let result = await currencyHandler.removeUpdater(currency).catch(console.error);
            if(result){
                embed.setColor(embedColors.general)
                .addField("Success", `${message.guild.member(message.mentions.users.first()).displayName} was successfully removed as a currency updater for '${currency.name}'.`);
                return message.channel.send(embed).catch(console.error);
            } else {
                embed.setColor(embedColors.error)
                .addField("Error", `An error occurred while trying to remove updater for '${currency.name}'.`);
                return message.channel.send(embed).catch(console.error);
            }
        } else {
            let currencyList = await currencyHandler.getCurrencies(message.guild.id);
            embed.setColor(embedColors.error)
            .addField("Error", `'${currency.name}' is not a valid currency.`)
            .addField("Valid Currencies", currencyList);
            return message.channel.send(embed).catch(console.error);
        }
    },
};