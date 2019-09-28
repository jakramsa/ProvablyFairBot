const { prefix, embedColors } = require('../../config.json');

module.exports = {
    name: 'rates',
    description: 'Show currency exchange rates.',
    args: false,
    argCount: 0,
    usage(){ return `${prefix}${this.name} [source currency]`; },
    cooldown: 0,
    guildOnly: true,
    async execute(message, args) {
        const currencyHandler = message.client.currencyHandler;
        const member = message.guild.member(message.author);
        let embed = new message.client.discord.RichEmbed()
            .setColor(embedColors.general)
            .setAuthor(member.displayName)
            .setTitle("Conversion Rates");
        let currencyInfo = await currencyHandler.getCurrencyInfo(message.guild.id);
        if(args && args[0] && (args[0] in currencyInfo)){
            let rates = "";
            for(let endCurrency in currencyInfo[args[0]].rates){
                rates += `\t${args[0]}:${endCurrency} ( 1:${currencyInfo[args[0]].rates[endCurrency]} )\n`;
            }
            if(rates === "") rates = "-No conversion rates to other currencies-";
            embed.addField(args[0],rates);
        } else {
            if(!currencyInfo){ return message.channel.send("There was a problem retrieving the currency information.").catch(console.error); }
            if(Object.keys(currencyInfo).length == 0){
               return message.channel.send("This guild has no currencies, which means there are no conversion rates.").catch(console.error);
            }
            for(let currency in currencyInfo){
                let rates = "";
                for(let endCurrency in currencyInfo[currency].rates){
                    rates += `\t${currency}:${endCurrency} ( 1:${currencyInfo[currency].rates[endCurrency]} )\n`;
                }
                if(rates === "") rates = "-No conversion rates to other currencies-";
                embed.addField(currency,rates);
            }
        }
        return message.channel.send(embed).catch(console.error);
    },
};