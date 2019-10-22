//'use strict';

const Discord = require('discord.js');
const crypto = require('crypto');
const pg = require('pg');
const fs = require('fs');
const config = require('../config.json');
const CurrencyHandler = require(__dirname+'/CurrencyHandler.js');

class ProvablyFairBot extends Discord.Client {
    constructor() {
        super();

        global.bot = this;

        this.config = config;
        this.crypto = crypto;
        if(this.config.userCurrencyConfig.useDatabase){
            this.dbClient = new pg.Client(this.config.userCurrencyConfig.databaseConnInfo);
            this.dbClient.connect(err => {
                if (err) {
                    console.error('Database Connection Error', err.stack);
                 } else {
                    //TODO: Use better database structures. Json columns are currently implemented to easily integrate with the initial/underlying code that uses javascript objects and json files.    
                    const currencyTable = `CREATE TABLE IF NOT EXISTS currencies (
                        guild_id bigint UNIQUE PRIMARY KEY NOT NULL,
                        json_data JSONB
                    );`;
                    const walletTable = `CREATE TABLE IF NOT EXISTS wallets (
                        guild_id bigint UNIQUE PRIMARY KEY NOT NULL,
                        json_data JSONB
                    );`;
                    const seedTable = `CREATE TABLE IF NOT EXISTS seeds (
                        server_seed_id serial UNIQUE PRIMARY KEY,
                        server_seed char(64),
                        server_seed_hash char(64),
                        last_nonce int
                    );`;
                    this.dbClient.query(currencyTable);
                    this.dbClient.query(walletTable);
                    if(this.config.storeServerSeeds){ this.dbClient.query(seedTable); }
                }
            });
        }
        this.discord = Discord;
        this.fs = fs;
        this.curDir = __dirname+'/';

        this.currencyHandler = new CurrencyHandler(this);

        this.logFile = this.curDir+'../'+this.config.logsDir+"log-"+(new Date()).toISOString()+".log";
        if(this.config.logToFile){
            if(!this.fs.existsSync(this.curDir+'../'+this.config.logsDir)){
                console.log("Making directory '"+this.curDir+"../"+this.config.logsDir+"' since it doesn't exist.");
                this.fs.mkdirSync(this.curDir+'../'+this.config.logsDir, {recursive: true});
                if(!this.fs.existsSync(this.curDir+'../'+this.config.logsDir)){
                    console.log("Directory creation unsuccessful.");
                }
            }
            if(!this.fs.existsSync(this.logFile)){
                this.fs.writeFile(this.logFile, "", { flag: 'w' }, function (error) {
                    if(error) {
                        console.log("Log file "+bot.logFile+" creation was unsuccessful.", error);
                    } else {
                        console.log("Log "+bot.logFile+" file creation was successful.");
                    }
                });
            }
        }
        this.log = function log(message){
            let d = (new Date()).toISOString();
            console.log(`[${d}] ${message}`);
            if(bot.config.logToFile){
                bot.fs.access(bot.logFile, bot.fs.constants.F_OK | bot.fs.constants.W_OK, (error) => {
                    if (error) {
                        console.log(error, "Disabling file logging due to error.");
                        bot.config.logToFile = false;
                    } else {
                        try{
                            bot.fs.appendFileSync(bot.logFile, `[${d}] ${message}\r\n`);
                        } catch(error){
                            console.log(error, "Disabling file logging due to error.");
                            bot.config.logToFile = false;
                        }
                    }
                });
            }
        }
        this.cooldowns = new Discord.Collection();
        this.giveaways = new Discord.Collection();
        this.swaps = new Discord.Collection();
        this.blackjack = new Discord.Collection();
        this.roulette = new Discord.Collection();
        this.poker = new Discord.Collection();
        this.war = new Discord.Collection();
        this.commandQueue = [];
        this.processingCommand = false;
        this.pauseProcessingCommand = false;

        const commandFiles = this.getFilesRecursively(this.curDir+'../'+this.config.commandsDir);
        this.commands = new Discord.Collection();
        for (const file of commandFiles) {
	    const command = require(`${file}`);
	    this.commands.set(command.name, command);
        }

        this.on('ready', () => {
            this.log.call(null, `Successfully logged in as ${this.user.tag}.`);
            this.assignNewSeeds();
        });

        this.on('message', message => {
            //if(!message.content.startsWith(prefix) || message.author.bot) return;
            if(message.author.bot || (this.config.guildRestriction.restrict && !this.config.guildRestriction.allowedGuilds.includes(message.guild.id))){ return; }
            const args = message.content.slice(message.content.startsWith(this.config.prefix)?this.config.prefix.length:0).toLowerCase().split(/ +/);
            const commandName = args.shift().toLowerCase();
            if(commandName) {
                if(this.swaps.has(message.author.id) && (commandName === 'accept' || commandName === 'decline')){
                    return this.commands.get('swap').execute(message, commandName, this.swaps.get(message.author.id)).catch(console.error);
                }
                if(this.blackjack.has(message.author.id) && (commandName === 'hit' || commandName === 'stand')){
                    return this.commands.get('blackjack').execute(message, this.blackjack.get(message.author.id), commandName).catch(console.error);
                }
            }
            if(!message.content.startsWith(this.config.prefix)) return;

            const command = this.commands.get(commandName) || this.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
            if(!command) { return; }
            if(message.channel.type === 'text' && !message.channel.permissionsFor(this.user).has(this.discord.Permissions.FLAGS.SEND_MESSAGES) && command){
                return message.author.send("This bot does not have permission to respond in the channel you sent a message in.");
            }
            if(command.guildOnly && message.channel.type !== 'text'){
                return message.reply(`${command.name} cannot be executed in DM's.`);
            }
            if(command.args && (!args.length || args.length < command.argCount)){
                let usageEmbed = new message.client.discord.RichEmbed()
                    .addField("Usage", command.usage())
                    .setColor(this.config.embedColors.error);
                return message.channel.send(usageEmbed).catch(console.error);
            }
            if(!this.cooldowns.has(command.name)) {
                this.cooldowns.set(command.name, new Discord.Collection());
            }

            const now = Date.now();
            const timestamps = this.cooldowns.get(command.name);
            const cooldownAmount = (command.cooldown || 0) * 1000;

            if(timestamps.has(message.author.id)) {
                const expirationTime = timestamps.get(message.author.id) + cooldownAmount;

                if(now < expirationTime){
                    const timeLeft = (expirationTime - now) / 1000;
                    return message.reply(`You must wait ${timeLeft.toFixed(1)} seconds before using the '${command.name}' command.`);
                }
            }
            timestamps.set(message.author.id, now);
            setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);
            if(config.processCommandsSynchronously){
                this.commandQueue.push({"command": command, "message": message, "args": args});
                if(this.commandQueue.length >= 1 && !this.processingCommand && !this.pauseProcessingCommands){ this.processingCommand = true; this.processCommand(); };
            } else {
                try {
                    command.execute(message, args);
                } catch (error) {
                    this.log.call(null, error);
                    message.channel.send(`Command Error: Please report this error on the support server. ${this.config.supportServerLink}`).catch(console.error);
                    if(this.config.errorChannelId && this.config.errorChannelId !== "" && this.channels.get(this.config.errorChannelId)){
                        let embed = new this.discord.RichEmbed()
                            .setColor(this.config.embedColors.error)
                            .setTitle(message.author.username)
                            .addField("Message Content", message.content)
                            .addField("Error", error);
                        this.channels.get(this.config.errorChannelId).send(embed).catch(console.error);
                    }
                }
            }
        });
        this.on('error', console.error);
        this.login(this.config.token);
    }

    getFilesRecursively(path){
        let paths = require('path');
        const isDirectory = (path) => this.fs.statSync(path).isDirectory();
        const getDirectories = (path) =>
        this.fs.readdirSync(path).map(name => paths.join(path, name)).filter(isDirectory);

        const isFile = (path) => this.fs.statSync(path).isFile() && path.endsWith('.js') ;  
        const getFiles = (path) =>
        this.fs.readdirSync(path).map(name => paths.join(path, name)).filter(isFile);

    
        let dirs = getDirectories(path);
        let files = dirs.map(dir => this.getFilesRecursively(dir)).reduce((a,b) => a.concat(b), []);
        return files.concat(getFiles(path));
    }

    async assignNewSeeds(){
        while(true){
            if(this.processingCommand == true){ this.pauseProcessingCommand = true; }
            while(this.processingCommand == true){
                await this.wait(500);
            }
            if(this.config.storeServerSeeds){
                if(this.serverSeed){
                    await this.dbClient.query('INSERT INTO seeds(server_seed_id, server_seed, server_seed_hash, last_nonce) VALUES($1, $2, $3, $4);', [this.serverSeedId, this.serverSeed, this.crypto.createHash('sha256').update(this.serverSeed).digest('hex'), this.nonce-1]);
                }
                let result = await this.dbClient.query('SELECT count(*) FROM seeds;');
                if(!result || !result.rows || result.rows.length < 0){
                    this.serverSeedId = 0;
                    this.log.call(null, "An error occurred trying to return the seed count.");
                } else {
                    this.serverSeedId = parseInt(result.rows[0].count)+1;
                }
            }
            this.previousSeed = this.serverSeed;
            if(!this.previousSeed && this.config.storeServerSeeds){
                let { rows } = await this.dbClient.query('SELECT server_seed FROM seeds WHERE server_seed_id = $1;', [this.serverSeedId-1]);
                if(rows && rows[0] && rows[0].server_seed){ this.previousSeed = rows[0].server_seed; }
            }
            this.serverSeed = this.crypto.randomBytes(32).toString('hex');
            this.defaultClientSeed = this.crypto.randomBytes(32).toString('hex');
            this.nonce = 0;
            let embed = new this.discord.RichEmbed()
                .setColor(this.config.embedColors.general)
                .setTitle("Provably Fair Seed"+(this.config.storeServerSeeds?` (${this.serverSeedId})`:""))
                .addField("Previous Hash:", this.previousSeed?this.crypto.createHash('sha256').update(this.previousSeed).digest('hex'):"-")
                .addField("Previous Seed"+(this.config.storeServerSeeds?` (${this.serverSeedId-1})`:"")+":", this.previousSeed?this.previousSeed:"-")
                .addField("Current hash:", this.crypto.createHash('sha256').update(this.serverSeed).digest('hex'));
            this.channels.get(this.config.seedChannelId).send(embed).catch(console.error);

            if(this.pauseProcessingCommand == true){
                this.pauseProcessingCommand = false;
                if(this.commandQueue.length >= 1){
                    this.processingCommand = true;
                    this.processCommand();
                }
            }
            await this.wait(this.config.newSeedSeconds);
            //setTimeout(() => this.assignNewSeeds(), this.config.newSeedSeconds*1000);
        }
    }

    roll(clientSeed){
        if (this.serverSeed !== '' && clientSeed !== '' && isNaN(this.nonce) == false) {
            var currentNonce = 0;
            for(0;currentNonce<=this.nonce;currentNonce++) {
                const hmac = this.crypto.createHmac('sha512', bot.serverSeed);
                hmac.update(clientSeed+'-'+currentNonce);
                const rollHash = hmac.digest('hex');
                var roll = -1;
                for(let i=0;i<25;i++) {
                    let calculatedRoll = parseInt(rollHash.substring(5*i,5+5*i),16);
                    if (calculatedRoll < 1000000) {
                        roll = (calculatedRoll%(10000)/100);
                        break;
                    }
                }
                if (roll == -1) {
                    roll = 99.99;
                }
            }
            this.nonce++;
            return roll;
        } else {
            return -1;
        }
    }

    async wait(seconds){
        return new Promise(resolve => setTimeout(resolve, seconds*1000));
    }

    async processCommand(){
        this.processingCommand = true;
        let commandInfo = this.commandQueue.shift();
        try {
            const result = await commandInfo.command.execute(commandInfo.message, commandInfo.args);
        } catch(error) {
            this.log.call(null, error);
            message.channel.send(`Command Error: Please report this error on the support server. ${this.config.supportServerLink}`).catch(console.error);
            if(this.config.errorChannelId && this.config.errorChannelId !== "" && this.channels.get(this.config.errorChannelId)){
                let embed = new this.discord.RichEmbed()
                    .setColor(this.config.embedColors.error)
                    .setTitle(message.author.username)
                    .addField("Message Content", message.content)
                    .addField("Error", error);
                this.channels.get(this.config.errorChannelId).send(embed).catch(console.error);
            }
        }
        if(this.commandQueue.length >= 1 && !this.pauseProcessingCommands){ this.processCommand(); } else { this.processingCommand = false; }
        return;
    }

    cannotBet(userId){
        return this.swaps.has(userId) || this.blackjack.has(userId) || this.roulette.has(userId) || this.war.has(userId) || this.poker.has(userId);
    }

    getGame(userId){
        return this.blackjack.get(userId) || this.roulette.get(userId) || this.war.get(userId) || this.poker.get(userId);
    }
}

module.exports = ProvablyFairBot;