const { prefix, embedColors } = require('../../config.json');

module.exports = {
    name: 'update',
    description: 'Add or deduct currency amount for the specified user(s).',
    aliases: ['u', 'updatewallet'],
    args: true,
    argCount: 3,
    usage(){ return `${prefix}${this.name} [currency] [user(s)] [amount[multiplier]]`; },
    cooldown: 0,
    guildOnly: true,
    async execute(message, args) {
        const currencyHandler = message.client.currencyHandler;
        const member = message.guild.member(message.author);
        let updateEmbed = new message.client.discord.RichEmbed()
            .setAuthor(member.displayName);
        if(!message.mentions.users.size) {
            updateEmbed.setColor(embedColors.error)
            .addField("Error", "You did not specify a valid user.");
            return message.channel.send(updateEmbed).catch(console.error);
        }
        const currency = currencyHandler.Currency(message.guild.id, args[0], args[args.length-1], message.author.id);
        const validCurrency = await currencyHandler.validCurrency(currency);
        if(!validCurrency) {
            let currencyList = await currencyHandler.getCurrencies(message.guild.id);
            updateEmbed.setColor(embedColors.error)
            .addField("Error", "Invalid currency entered.")
            .addField("Valid Currencies", currencyList);
            return message.channel.send(updateEmbed).catch(console.error);
        }
        const allowUpdate = await currencyHandler.canUpdate(currency);
        if(!member || (member.guild.ownerID != member.id && !allowUpdate)) {
            updateEmbed.setColor(embedColors.error)
            .addField("Error", `Only the guild owner or a ${currency.name} updater can use command ${this.name}.`);
            return message.channel.send(updateEmbed).catch(console.error);
        }
        const parsedCurrency = await currencyHandler.parseCurrency(currency);
        if(isNaN(parsedCurrency)) {
            updateEmbed.setColor(embedColors.error)
            .addField("Error", `'${args[args.length-1]}' is an invalid amount.`);
            return message.channel.send(updateEmbed).catch(console.error);
        } else if(!isFinite(parsedCurrency)){
            updateEmbed.setColor(embedColors.error)
            .addField("Error", `'${args[args.length-1]}' contains in invalid multiplier.`);
            return message.channel.send(updateEmbed).catch(console.error);
        }
        let currencyInfo = await currencyHandler.getCurrencyInfo(message.guild.id);
        if(currencyInfo && Math.abs(parsedCurrency) < (1/Math.pow(10, currencyInfo[currency.name].maxDecimals))){
            updateEmbed.setColor(embedColors.error)
            .addField("Error", `'${args[args.length-1]}' is below the maximum number of allowable decimals (${currencyInfo[currency.name].maxDecimals}).`);
            return message.channel.send(updateEmbed).catch(console.error);
        }
        let userList = "";
        const users = Array.from(message.mentions.users.values());
        for(let i = 0; i<users.length;i++){
            let user = users[i];
            let result = await currencyHandler.addBalance(user.id, currency);
            if(result){
                userList += `${user} `;
            } else {
                let errorEmbed = new message.client.discord.RichEmbed()
                    .setColor(embedColors.error)
                    .addField("Error", `An error occured trying to update balance of ${user}.`);
                message.channel.send(errorEmbed).catch(console.error);
            }
        }
        if(userList !== ""){
            let currencyString = await currencyHandler.getCurrencyString(currency);
            updateEmbed.setColor(embedColors.general)
                .addField("Currency Update", `Successfully added ${currencyString} to ${userList}wallet${(message.mentions.users.size>1)?"s":""}.`);
            return message.channel.send(updateEmbed).catch(console.error);
        }
    },
};