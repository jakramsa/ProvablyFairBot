const { prefix, embedColors } = require('../../config.json');

module.exports = {
    name: 'wallet',
    description: 'Show wallet balances for user in guild.',
    aliases: ['w', '$', 'wealth', 'bal', 'balance'],
    args: false,
    usage(){ return `${prefix}${this.name} [user]`; },
    cooldown: 0,
    guildOnly: true,
    async execute(message, args) {
        const currencyHandler = message.client.currencyHandler;
        let walletEmbed = new message.client.discord.RichEmbed()
        .setColor(embedColors.general);
        let userId = 0;
        let member = message.guild.member(message.author);
        if(args && args.length >= 1){
            if(message.mentions.members.size){
                member = message.mentions.members.first();
            } else {
                let tag = message.content.substring(message.content.indexOf(" ")).trim();
                member = message.guild.members.filter(mem => (mem.user.tag === tag)).first();
                if(member == null){ return message.channel.send("Invalid User").catch(console.error); }
            }
        }
        walletEmbed.setAuthor(member.displayName);
        userId = member.id;
        const wallets = await currencyHandler.getWallets(message.guild.id).catch(console.error);
        if(!wallets){ return message.channel.send("There was a problem retrieving the wallet information.").catch(console.error); }
        if(!(userId in wallets)){ wallets[userId] = {"currencies": {}, "private": false, "seed": ""};}
        if(wallets[userId].private && userId !== message.author.id && member.guild.ownerID != message.author.id){
            return message.channel.send("Sorry, that user has wallet privacy mode enabled.");
        }

        const currencyInfo = await currencyHandler.getCurrencyInfo(message.guild.id).catch(console.error);
        if(!currencyInfo){ return message.channel.send("There was a problem retrieving the currency information.").catch(console.error); }
        if(Object.keys(currencyInfo).length == 0){
           return message.channel.send("This guild has no currencies, which means there is no wallet information.").catch(console.error);
        }
        for(let currencyName in currencyInfo){
            let currencyAmount = (0).toFixed(currencyInfo[currencyName].maxDecimals);
            if(currencyName in wallets[userId].currencies && Math.abs(wallets[userId].currencies[currencyName].balance) > 0){
                //currencyAmount = parseFloat(Math.round(wallets[userId].currencies[currencyName].balance * Math.pow(10,currencyInfo[currencyName].maxDecimals)) / Math.pow(10,currencyInfo[currencyName].maxDecimals)).toFixed(currencyInfo[currencyName].maxDecimals);
                let precision = Math.ceil(Math.abs(wallets[userId].currencies[currencyName].balance/10))+currencyInfo[currencyName].maxDecimals;
                if(precision < 1){ precision = 1; }
                else if(precision > 100){ precision = 100; }
                currencyAmount = wallets[userId].currencies[currencyName].balance.toPrecision(precision);
            }
            walletEmbed.addField(`${currencyName} Balance`, `${currencyInfo[currencyName].prefix}${parseFloat(currencyAmount).toFixed(currencyInfo[currencyName].maxDecimals)}${currencyInfo[currencyName].postfix}`);
        }
        if(wallets[userId].private){
            walletEmbed.setTitle(`Guild: ${message.guild.name} (ID:${message.guild.id})`);
            return message.author.send(walletEmbed).then(m => message.react('\u{1F4EC}').catch(console.error)).catch(console.error);
        } else {
            return message.channel.send(walletEmbed).catch(console.error);
        }
    },
};