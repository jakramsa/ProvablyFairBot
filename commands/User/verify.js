const { prefix, embedColors, storeServerSeeds } = require('../../config.json');
module.exports = {
    name: 'verify',
    description: 'Verify bet through DiceSites.com.',
    aliases: ['v'],
    args: true,
    argCount: 1,
    usage(){ return `${prefix}${this.name} [server seed id] "[client seed]"`; },
    cooldown: 0,
    guildOnly: false,
    async execute(message, args) {
        if(!storeServerSeeds){ return message.channel.send("Server seeds are not stored in a database. Please manually verify your bet.").catch(error); }
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
        const serverSeedId = parseInt(args[0]);
        if(isNaN(serverSeedId)){
            embed.addField("Invalid Server Seed ID", `'args[0]' is not a valid server seed id`);
            return message.channel.send(embed).catch(console.error);
        } else if(serverSeedId >= message.client.serverSeedId){
            embed.addField("Invalid Server Seed ID", `This seed has not been revealed yet. You cannot verify against the current or future seeds. Please wait until the seed is revealed.`);
            return message.channel.send(embed).catch(console.error);
        }
        if(args[1]){
            if(args[1][0] === '"'){
                clientSeed = message.content.substring(message.content.indexOf(args[1])).match(/".*?"/g);
                if(clientSeed == null || clientSeed.length < 1){
                    clientSeed = message.content.split(/ +/)[2];
                } else {
                    clientSeed = clientSeed[0].substring(1, clientSeed[0].length-1);
                }
            } else {
                clientSeed = args[1];
            }
        }
        let result = await message.client.dbClient.query('SELECT (server_seed, last_nonce) FROM seeds WHERE server_seed_id = $1;', [serverSeedId]);
        result = result.rows[0].row.substring(1, result.rows[0].row.length-1).split(",");
        const serverSeed = result[0];
        const lastNonce = result[1];
        const link = `https://dicesites.com/primedice/verifier?ss=${serverSeed}&cs=${encodeURIComponent(clientSeed)}&ln=${(lastNonce>=0?lastNonce:0)}&n=0&ssh=${(serverSeed?message.client.crypto.createHash('sha256').update(serverSeed).digest('hex'):"")}`;
        embed.addField(`Rolls for server seed ${serverSeedId}`,link);
        return message.channel.send(embed).catch(console.error);
    },
};