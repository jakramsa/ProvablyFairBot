const { prefix, embedColors } = require('../../config.json');

module.exports = {
    name: 'privacy',
    description: 'Enable or disable wallet privacy. When enabled, balances will be DM\'d rather than shown in the current channel.',
    aliases: ['p', 'privacyon', 'privacyoff'],
    args: false,
    usage(){ return `${prefix}${this.name} [on|off]`; },
    cooldown: 0,
    guildOnly: true,
    async execute(message, args) {
        const currencyHandler = message.client.currencyHandler;
        let member = message.guild.member(message.author);
        let embed = new message.client.discord.RichEmbed()
        .setColor(embedColors.general)
        .setAuthor(member.displayName);
        let enablePrivacy = false;
        if(args.length){
            if(args[0] === 'on') {
                enablePrivacy = true;
            } else if(args[0] !== 'off') {
                let errorEmbed = new message.client.discord.RichEmbed()
                    .setColor(embedColors.error)
                    .addField("Error", `Invalid arguement used.`)
                    .addField("Usage", this.usage());
                return message.channel.send(errorEmbed).catch(console.error);
            }
        } else {
            if(message.content.toLowerCase().indexOf('privacyon') > -1) {
                enablePrivacy = true;
            } else if(message.content.toLowerCase().indexOf('privacyoff') == -1) {
                let errorEmbed = new message.client.discord.RichEmbed()
                    .setColor(embedColors.error)
                    .addField("Error", `Invalid arguement used.`)
                    .addField("Usage", this.usage());
                return message.channel.send(errorEmbed).catch(console.error);
            }
        }
        const result = await currencyHandler.setPrivate(message, enablePrivacy);
        if(result){
            embed.addField("Success", `You have ${enablePrivacy?"enabled":"disabled"} wallet privacy in this guild.`);
        } else {
            embed.addField("Error", "An error occurred while trying to set wallet privacy.");
        }
        return message.channel.send(embed).catch(console.error);
    },
};