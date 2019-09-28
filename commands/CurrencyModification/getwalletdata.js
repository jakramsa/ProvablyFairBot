const { prefix, embedColors, includesDir, pastebinConfig } = require('../../config.json');
const pastebin = require('../../'+includesDir+'pastebin.js');

module.exports = {
    name: 'getwalletdata',
    description: 'DM a pastebin link containing the current guild wallet data in json format.',
    aliases: ['gwd'],
    args: false,
    usage(){ return `${prefix}${this.name}`; },
    cooldown: 600,
    guildOnly: true,
    async execute(message, args) {
        const currencyHandler = message.client.currencyHandler;
        const member = message.guild.member(message.author);
        let embed = new message.client.discord.RichEmbed()
            .setAuthor(member.displayName);
        const currency = currencyHandler.Currency(message.guild.id, args[0]);
        if(!member || member.guild.ownerID != member.id) {
            embed.setColor(embedColors.error)
            .addField("Error", `Only the guild owner can use command ${this.name}.`);
            return message.channel.send(embed).catch(console.error);
        }
        if(!pastebinConfig.allowPastes){
            embed.setColor(embedColors.error)
            .addField("Error", `Exporting to pastebin is not allowed.`);
            return message.channel.send(embed).catch(console.error);
        }
        const wallets = await currencyHandler.getWallets(message.guild.id);
        if(!wallets){
            embed.setColor(embedColors.error)
            .addField("Error", `An error occured while trying to retrieve wallet data.`);
            return message.channel.send(embed).catch(console.error);
        }
        pastebin.submitPaste(wallets, message);
    },
};