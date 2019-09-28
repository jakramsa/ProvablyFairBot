const { prefix, embedColors } = require('../../config.json');

module.exports = {
    name: 'wager',
    description: 'Show wager information for user.',
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
            if(message.mentions.users.size){
                member = message.mentions.members.first();
            } else {
                let tag = message.content.substring(message.content.indexOf(" ")).trim();
                member = message.guild.members.filter(mem => (mem.user.tag === tag)).first();
                if(member == null){ return message.channel.send("Invalid User").catch(console.error); }
            }
        }
        walletEmbed.setAuthor(member.displayName);
        userId = member.id;
        let currencyInfo = await currencyHandler.getCurrencyInfo(message.guild.id);
        let wallets = await currencyHandler.getWallets(message.guild.id);
        for(let currencyName in currencyInfo){
            let currencyAmount = (0).toFixed(currencyInfo[currencyName].maxDecimals);
            if((userId in wallets) && (currencyName in wallets[userId].currencies)){
                currencyAmount = parseFloat(Math.round(wallets[userId].currencies[currencyName].wager * Math.pow(10,currencyInfo[currencyName].maxDecimals)) / Math.pow(10,currencyInfo[currencyName].maxDecimals)).toFixed(currencyInfo[currencyName].maxDecimals);
            }
            walletEmbed.addField(`${currencyName} Wager`, `${currencyInfo[currencyName].prefix}${currencyAmount}${currencyInfo[currencyName].postfix}`);
        }
        return message.channel.send(walletEmbed).catch(console.error);
    },
};