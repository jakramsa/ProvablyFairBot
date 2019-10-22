const { prefix, embedColors, includesDir, storeServerSeeds } = require('../../config.json');

module.exports = {
    name: 'roulette',
    description: 'Play a game of roulette.',
    aliases: ['roul', 'r'],
    args: true,
    argCount: 2,
    usage(){ return `${prefix}${this.name} [currency] [amount[multiplier]]`; },
    cooldown: 0,
    guildOnly: true,
    responseTime: 60000,
    rouletteTableImage: 'https://cdn.discordapp.com/attachments/625114264197398528/625550887078854656/roulette-game21.jpg',
    blacks: [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35],
    reds: [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36],
    rouletteBets: ['single', 'straight', 'split', 'street', 'corner', 'basket', 'sixline', 'column', 'dozen', 'even', 'odd', 'black', 'red', 'range', 'low', 'high'],
    singleMultiplier: 36,
    splitMultiplier: 18,
    streetMultiplier: 12,
    cornerMultiplier: 9,
    basketMultiplier: 7,
    sixLineMultiplier: 6,
    columnMultiplier: 3,
    dozenMultiplier: 3,
    oddMultiplier: 2,
    blackMultiplier: 2,
    rangeMultiplier: 2,
    async execute(message, args) {
        const currencyHandler = message.client.currencyHandler;
        const member = message.guild.member(message.author);
        let resultsEmbed = new message.client.discord.RichEmbed()
            .setAuthor(member.displayName, member.user.avatarURL, 'https://discordapp.com/channels/'+message.guild.id+'/'+message.channel.id+'/'+message.id)
            .setColor(embedColors.general);
        const currencyName = args[0];
        const betAmount = args[1];
        const bet = currencyHandler.Currency(message.guild.id, currencyName, betAmount, message.author.id);
        const betValidity = await currencyHandler.validBet(bet);
        switch(betValidity){
            case currencyHandler.BetValidityEnum.VALID_BET:
                if(message.client.cannotBet(message.author.id)){
                    return message.channel.send("You are currently playing a game or performing a currency swap. Please finish to make another bet.").catch(console.error);
                }
                let clientSeed = await currencyHandler.getSeed(message);
                if (clientSeed === ""){
                    clientSeed = message.client.defaultClientSeed;
                }
                rouletteGame = { "message": message, "bet": bet, "seed": clientSeed };
                message.client.roulette.set(message.author.id, rouletteGame);
                let image = new message.client.discord.Attachment(this.rouletteTableImage);
                let rouletteOptionsEmbed = new message.client.discord.RichEmbed()
                    .setTitle("Please Enter Your Bet")
                    .addField("Bet Options", this.rouletteBets.join(", "))
                    .addField("Bet Usage", "[Bet Option] [Bet Placement]")
                    .addField("Examples", "corner 1-2-4-5, street 16-17-18\ncolumn 2, dozen 3\nsingle 30, split 13-14");
                await message.channel.send("", {'embed': rouletteOptionsEmbed,'file': {'attachment': this.rouletteTableImage, 'name': 'table.jpg'}}).then((m) => {return rouletteGame.gameMessage = m;}).catch(console.error);
                message.client.roulette.set(message.author.id, rouletteGame);
                message.channel.awaitMessages((m) => {return m.author.id === message.author.id && this.rouletteBets.includes(m.content.toLowerCase().split(/ +/g)[0])}, { maxMatches: 1, time: this.responseTime, errors: ['time'] })
                .then(async (collected) => {
                    const response = collected.first();
                    const rouletteArgs = response.content.toLowerCase().split(/ +/g);
                    const validPlacement = this.validatePlacement(rouletteArgs[0], rouletteArgs[1]);
                    if(validPlacement){
                        resultsEmbed.setFooter((storeServerSeeds? `Server Seed: ${message.client.serverSeedId} `:"")+"Client Seed: '"+clientSeed+"' Nonce: "+message.client.nonce);
                        const rollValue = message.client.roll(clientSeed);
                        if(rollValue == -1){
                            resultsEmbed.setTitle("An error occured while generating a roll.")
                            .setColor(embedColors.error);
                            message.client.roulette.delete(message.author.id);
                            return message.channel.send(resultsEmbed).catch(console.error);
                        }
                        const multiplier = this.getMultiplier(rouletteArgs[0]);
                        const wonBet = this.wonBet(rouletteArgs[0], rouletteArgs[1], rollValue);
                        const wagerAmount = await currencyHandler.parseCurrency(bet);
                        let wagerResult = wagerAmount;
                        let result = null;
                        if(wonBet){
                            resultsEmbed.setColor(embedColors.win);
                            wagerResult = multiplier*wagerAmount;
                            bet.amount = (multiplier-1)*wagerAmount;
                            result = await currencyHandler.addBalance(message.author.id, bet);
                        } else {
                            resultsEmbed.setColor(embedColors.loss);
                            result = await currencyHandler.deductBalance(message.author.id, bet);
                        }
                        if(!result){
                            resultsEmbed
                            .addField("Error", "An error occured updating balance.")
                            .setColor(embedColors.error);
                            message.client.roulette.delete(message.author.id);
                            return message.channel.send(resultsEmbed).catch(console.error);
                        }
                        result = await currencyHandler.addWager(message.author.id, bet);
                        if(!result){
                            resultsEmbed
                            .addField("Error", "An error occured updating wager.")
                            .setColor(embedColors.error);
                            message.client.roulette.delete(message.author.id);
                            return message.channel.send(resultsEmbed).catch(console.error);
                        }
                        const currencyResultString = await currencyHandler.getCurrencyString(currencyHandler.Currency(message.guild.id, currencyName, wagerResult));
                        let slot = this.rollToSlot(rollValue);
                        let slotColor = (this.blacks.includes(slot)?"BLACK":(this.reds.includes(slot)?"RED":"GREEN"))
                        if(slot == 37){ slot = '00'; }
                        resultsEmbed.addField(`${this.name}`, `Landed on **${slotColor}** **${slot}**. You **${(wagerResult > wagerAmount?"won":"lost")} ${currencyResultString}**.`);
                        message.client.roulette.delete(message.author.id);
                        return message.channel.send(resultsEmbed).catch(console.error);
                    } else {
                        response.channel.send("That is not a valid placement. Ending the game.");
                        message.client.roulette.delete(message.author.id);
                    }
                })
                .catch(collected => {
                    message.channel.send(`You did not respond in time with a valid bet.`);
                    message.client.roulette.delete(message.author.id);
                });
                return;
                break;
            case currencyHandler.BetValidityEnum.INVALID_CURRENCY:
                let currencyList = await currencyHandler.getCurrencies(message.guild.id);
                resultsEmbed.setTitle("You've entered an invalid currency.")
                .addField("Usage", this.usage())
                .addField("Valid Currencies", currencyList)
                .setColor(embedColors.error);
                return message.channel.send(resultsEmbed).catch(console.error);
                break;
            case currencyHandler.BetValidityEnum.INVALID_AMOUNT:
                resultsEmbed.setTitle("You've entered an invalid amount.")
                .addField("Usage", this.usage())
                .setColor(embedColors.error);
                return message.channel.send(resultsEmbed).catch(console.error);
                break;
            case currencyHandler.BetValidityEnum.AMOUNT_TOO_LOW:
                let minimumBet = await currencyHandler.getMinimumBet(bet);
                resultsEmbed.setTitle("Your bet was too low.")
                .addField("Usage", this.usage())
                .addField("Minimum bet for "+bet.name, minimumBet)
                .setColor(embedColors.error);
                return message.channel.send(resultsEmbed).catch(console.error);
                break;
            case currencyHandler.BetValidityEnum.AMOUNT_TOO_HIGH:
                let maximumBet = await currencyHandler.getMaximumBet(bet);
                resultsEmbed.setTitle("Your bet was too high.")
                .addField("Usage", this.usage())
                .addField("Maximum bet for "+bet.name, maximumBet)
                .setColor(embedColors.error);
                return message.channel.send(resultsEmbed).catch(console.error);
                break;
            case currencyHandler.BetValidityEnum.INVALID_MULTIPLIER:
                let multiplierString = await currencyHandler.getMultipliers(bet);
                resultsEmbed.setTitle("You've entered an invalid multiplier.")
                .addField("Usage", this.usage())
                .addField("Valid Multipliers", multiplierString)
                .setColor(embedColors.error);
                return message.channel.send(resultsEmbed).catch(console.error);
                break;
            case currencyHandler.BetValidityEnum.INSUFFICIENT_BALANCE:
                resultsEmbed.setColor(embedColors.error).addField("Error", "You don't have enough balance.");
                return message.channel.send(resultsEmbed).catch(console.error);
            case currencyHandler.BetValidityEnum.ERROR:
            case undefined:
            default:
                resultsEmbed.setColor(embedColors.error)
                .addField("Error", `Unknown validity state.`);
                return message.channel.send(resultsEmbed).catch(console.error);
        }
    },
    getMultiplier(betOption){
        switch(betOption){
            case 'straight':
            case 'single':
                return this.singleMultiplier;
            case 'split':
                return this.splitMultiplier;
            case 'street':
                return this.streetMultiplier;
            case 'corner':
                return this.cornerMultiplier;
            case 'sixline':
                return this.sixLineMultiplier;
            case 'dozen':
                return this.dozenMultiplier;
            case 'column':
                return this.columnMultiplier;
            case 'range':
            case 'low':
            case 'high':
                return this.rangeMultiplier;
            case 'basket':
                return this.basketMultiplier;
            case 'even':
            case 'odd':
                return this.oddMultiplier;
            case 'black':
            case 'red':
                return this.blackMultiplier;
            case undefined:
            default:
                return 1;
        }
    },
    validatePlacement(betOption, betPlacement){
        switch(betOption){
            case 'straight':
            case 'single':
                let number = parseInt(betPlacement);
                return !(isNaN(number) || !isFinite(number) || number > 36 || number < 0);
            case 'split':
            case 'street':
            case 'corner':
            case 'sixline':
                return this.neighborCheck(betOption, betPlacement);
            case 'dozen':
            case 'column':
                return (betPlacement === '1' || betPlacement === '2' || betPlacement === '3');
            case 'range':
                return (betPlacement === '1' || betPlacement === '2');
            case 'low':
            case 'high':
            case 'basket':
            case 'even':
            case 'odd':
            case 'black':
            case 'red':
                return true;
            case undefined:
            default:
                return false;
        }
    },
    neighborCheck(betOption, betPlacement){
        let count = -1;
        switch(betOption){
            case 'split':
                count = 2;
                break;
            case 'street':
                count = 3;
                break;
            case 'corner':
                count = 4;
                break;
            case 'sixline':
                count = 6;
                break;
            default:
                break;
        }
        let numbers = betPlacement.split("-");
        if(!numbers || numbers.length !== count) return false;
        let duplicates = false;
        numbers.forEach((e, i) => {
            if(numbers.indexOf(e, i+1) > -1){
                duplicates = true;
            }
        });
        if(duplicates){ return false; }
        numbers.sort((a, b) => { return a-b; });
        let boardNumbers = [];
        for (let i = 1; i <= 36; i++){
            boardNumbers.push(i);
        }
        let indices = [];
        let rows = [];
        for(let i = 0; i < numbers.length; i++){
            let number = parseInt(numbers[i]);
            if(isNaN(number) || !isFinite(number) || number > 36 || number < 0){ return false; }
            indices.push(boardNumbers.indexOf(number));
            rows.push(Math.floor(indices[i]/3));
        }
        switch(betOption){
            case 'split':
                return ((rows[0] == rows[1] && (indices[0]+1 == indices[1] || indices[0]-1 == indices[1])) || indices[0]+3 == indices[1] || indices[0]-3 == indices[1]);
            case 'street':
                return (rows[0] == rows[1] && rows[1] == rows[2] && indices[0]+1==indices[1] && indices[1]+1 == indices[2]);
            case 'corner':
                return ((rows[0] == rows[1] && indices[0]+1 == indices[1]) && (rows[2] == rows[3] && indices[2]+1 == indices[3])
                    && rows[0]+1 == rows[2] && indices[0]+3 == indices[2]);
            case 'sixline':
                return ((rows[0] == rows[1] && rows[1] == rows[2] && indices[0]+1 == indices[1] && indices[1]+1 == indices[2]) && (rows[3] == rows[4] && rows[4] == rows[5] && indices[3]+1 == indices[4] && indices[4]+1 == indices[5])
                    && rows[0]+1 == rows[3] && indices[0]+3 == indices[3]);
            default:
                return false;
        }
    },
    rollToSlot(rollValue){
        return Math.floor(rollValue*0.38);
    },
    wonBet(betOption, betPlacement, rollValue){
        const rouletteSlot = this.rollToSlot(rollValue);
        let numbers = null;
        switch(betOption){
            case 'straight':
            case 'single':
                numbers = parseInt(betPlacement);
                if(numbers == 0 && betPlacement === '00'){ numbers = 37; }
                return rouletteSlot == numbers;
            case 'split':
            case 'street':
            case 'corner':
            case 'sixline':
                numbers = betPlacement.split("-");
                for(let i = 0; i < numbers.length; i++){
                    numbers[i] = parseInt(numbers[i]);
                }
                return numbers.includes(rouletteSlot);
            case 'dozen':
                numbers = [];
                for(let i = (12*parseInt(betPlacement)-11); numbers.length < 12; i++){
                    numbers.push(i);
                }
                return numbers.includes(rouletteSlot);
            case 'column':
                numbers = [];
                for(let i = parseInt(betPlacement); i < 37; i+=3){
                    numbers.push(i);
                }
                return numbers.includes(rouletteSlot);
            case 'range':
                numbers = [];
                for(let i = (18*parseInt(betPlacement)-17); numbers.length < 18; i++){
                    numbers.push(i);
                }
                return numbers.includes(rouletteSlot);
            case 'low':
            case 'high':
                numbers = [];
                for(let i = (18*(betOption==='low'?1:2)-17); numbers.length < 18; i++){
                    numbers.push(i);
                }
                return numbers.includes(rouletteSlot);
            case 'basket':
                return ((rouletteSlot >= 0 && rouletteSlot <= 3) || rouletteSlot == 37);
            case 'even':
                return (rouletteSlot % 2 == 0 && rouletteSlot != 0 && rouletteSlot != 37);
            case 'odd':
                return (rouletteSlot % 2 == 0 && rouletteSlot != 0 && rouletteSlot != 37);
            case 'black':
                return (this.blacks.includes(rouletteSlot) && rouletteSlot != 0 && rouletteSlot != 37);
            case 'red':
                return (this.reds.includes(rouletteSlot) && rouletteSlot != 0 && rouletteSlot != 37);
            case undefined:
            default:
                return false;
        }
    }
    
};