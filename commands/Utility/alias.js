const { prefix, embedColors } = require('../../config.json');

module.exports = {
    name: 'aliases',
    description: 'Show command alias information.',
    args: false,
    usage(){ return `${prefix}${this.name} [command]`; },
    aliases: ['alias'],
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
            .setTitle("Command Aliases");
        const { commands } = message.client;
        if(args && args[0]){
            let cmd = commands.get(args[0]) || commands.find(cmd => cmd.aliases && cmd.aliases.includes(args[0]));
            if(cmd){
                let aliases = "";
                if(cmd.aliases){
                    for(let alias in cmd.aliases){
                        aliases += `${cmd.aliases[alias]}\n`;
                    }
                } else {
                    aliases = "-";
                }
                embed.addField(cmd.name,aliases);
                return message.channel.send(embed).catch(console.error);
            } else if(!isNaN(parseInt(args[0])) && Math.ceil(commands.size/this.displayLimit) >= parseInt(args[0])){
                let cmds = Array.from(commands.values());
                embed.setFooter(`Page ${parseInt(args[0])}/${Math.ceil(commands.size/this.displayLimit)}`);
                for(let i=(parseInt(args[0])-1)*this.displayLimit; i<cmds.length && embed.fields.length < this.displayLimit;i++){
                    let aliases = "";
                    if(cmds[i].aliases){
                        for(let alias in cmds[i].aliases){
                            aliases += `${cmds[i].aliases[alias]}\n`;
                        }
                    } else {
                        aliases = "-";
                    }
                    embed.addField(cmds[i].name,aliases);
                }
                return message.channel.send(embed).catch(console.error);
            } else {
                embed.setTitle("")
                .setColor(embedColors.error)
                .addField("Error", `'${args[0]}' is not a valid command.`);
                return message.channel.send(embed).catch(console.error);
            }
        }
        let cmds = Array.from(commands.values());
        for(let command in cmds){
            let aliases = "";
            if(cmds[command].aliases){
                for(let alias in cmds[command].aliases){
                    aliases += `${cmds[command].aliases[alias]}\n`;
                }
            } else {
                aliases = "-";
            }
            if(embed.fields.length < this.displayLimit){
                embed.addField(cmds[command].name,aliases);
            }
        }
        return message.channel.send(embed).catch(console.error);
    },
};