const { prefix, embedColors } = require('../../config.json');

module.exports = {
    name: 'help',
    description: 'Display commands and their descriptions.',
    aliases: ['h', 'commands', '?', 'halp'],
    args: false,
    usage(){ return `${prefix}${this.name} [command]`; },
    cooldown: 0,
    guildOnly: false,
    displayLimit: 5,
    execute(message, args) {
        if(!this.displayLimit || this.displayLimit > 25){ this.displayLimit = 25; }
        const member =  message.guild?message.guild.member(message.author):null;
        const displayName = member?member.displayName:message.author.username;
        let embed = new message.client.discord.RichEmbed()
            .setColor(embedColors.general)
            .setAuthor(displayName)
            .setTitle("Command Help");
        const data = [];
        const { commands } = message.client;

        if (args && args[0]) {
            let cmd = commands.get(args[0]) || commands.find(cmd => cmd.aliases && cmd.aliases.includes(args[0]));
            if(cmd){
                embed.addField(cmd.name, cmd.description);
                embed.addField("Usage", cmd.usage());
                return message.channel.send(embed).catch(console.error);
            } else if(!isNaN(parseInt(args[0])) && Math.ceil(commands.size/this.displayLimit) >= parseInt(args[0])){
                let cmds = Array.from(commands.values());
                embed.setFooter(`Page ${parseInt(args[0])}/${Math.ceil(commands.size/this.displayLimit)}`);
                for(let i=(parseInt(args[0])-1)*this.displayLimit; i<cmds.length && embed.fields.length < this.displayLimit;i++){
                    embed.addField(cmds[i].name, cmds[i].description);
                }
                return message.channel.send(embed).catch(console.error);
            } else {
                embed.setTitle("")
                .setColor(embedColors.error)
                .addField("Error", `'${args[0]}' is not a valid command.`);
                return message.channel.send(embed).catch(console.error);
            }
        } else {
            let cmds = Array.from(commands.values());
            embed.setFooter(`Page 1/${Math.ceil(commands.size/this.displayLimit)}`);
            for(let command in cmds){
                if(embed.fields.length < this.displayLimit){
                    embed.addField(cmds[command].name, cmds[command].description);
                }
            }
            return message.channel.send(embed).catch(console.error);
        }
    },
};