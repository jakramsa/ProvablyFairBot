const { prefix, embedColors } = require('../../config.json');

module.exports = {
    name: 'seed',
    description: 'Show or set client seed.',
    aliases: ['s'],
    args: false,
    usage(){ `${prefix}${this.name} "[new seed]"`; },
    cooldown: 0,
    guildOnly: true,
    async execute(message, args) {
        const currencyHandler = message.client.currencyHandler;
        let clientSeed = message.client.defaultClientSeed;
        const wallets = await currencyHandler.getWallets(message.guild.id);
        if(!wallets){ return message.channel.send("There was a problem retrieving the wallet information.").catch(console.error); }
        if((message.author.id in wallets) && wallets[message.author.id].seed !== "") {
            clientSeed = wallets[message.author.id].seed;
        }

        const embed = new message.client.discord.RichEmbed()
        .setAuthor(message.author.username)
        .setColor(embedColors.general);

        if(args[0]){
            if(args[0][0] === '"'){
                clientSeed = message.content.match(/".*?"/g);
                if(clientSeed == null || clientSeed.length < 1){
                    clientSeed = message.content.split(/ +/)[1];
                } else {
                    clientSeed = clientSeed[0].substring(1, clientSeed[0].length-1);
                }
            } else {
                clientSeed = message.content.split(/ +/)[1];
            }
            currencyHandler.setSeed(message, clientSeed);
            embed.addField("Client Seed", `Client seed for ${message.author.username} set to ${clientSeed}`);
        } else {
            embed.addField(message.author.username+"'s Seed", clientSeed);
        }
        return message.channel.send(embed).catch(console.error);
    },
};