const { prefix, embedColors, includesDir, pastebinConfig } = require('../../config.json');
const pastebin = require('../../'+includesDir+'pastebin.js');

module.exports = {
    name: 'getcurrencydata',
    description: 'DM a pastebin link containing the current guild currency data in json format.',
    aliases: ['gcd'],
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
        const currencyInfo = await currencyHandler.getCurrencyInfo(message.guild.id);
        if(!currencyInfo){
            embed.setColor(embedColors.error)
            .addField("Error", `An error occured while trying to retrieve currency data.`);
            return message.channel.send(embed).catch(console.error);
        }
        pastebin.submitPaste(currencyInfo, message);
    },
};