const { userCurrencyConfig, cacheDataInVariable, walletFile, currencyFile } = require('../config.json');

class CurrencyHandler {

    Currency(guildId, currencyName, currencyAmount, userId) {
        return {
            guildId: guildId,
            name: currencyName,
            amount: currencyAmount,
            userId: userId
        };
    }

    constructor(botClient) {
        this.botClient = botClient;
        if(!userCurrencyConfig.useDatabase){
            this.currencyInfo = require(botClient.curDir+currencyFile);
            this.wallets = require(botClient.curDir+walletFile);
        } else {
            if(cacheDataInVariable){
                this.currencyInfo = {};
                this.wallets = {};
            }
        }
        this.BetValidityEnum = {
            ERROR: 0,
            VALID_BET: 1,
            INVALID_CURRENCY: 2,
            INVALID_AMOUNT: 3,
            AMOUNT_TOO_LOW: 4,
            INVALID_MULTIPLIER: 5,
            INSUFFICIENT_BALANCE: 6,
            AMOUNT_TOO_HIGH: 7,
        };
    }

    async validCurrency(currency){
        let currencyInfo = await this.getCurrencyInfo(currency.guildId);
        return (currencyInfo && currency.name.toLowerCase() in currencyInfo);
    }

    async aboveMinimum(currency){
        const amountType = typeof(currency.amount);
        if(amountType === "string"){
            let parsedBet = this.parseCurrency(currency);
            if(isNaN(parsedBet) || !isFinite(parsedBet)){ return false; }
            currency.amount = parsedBet;
        }
        let minimum = await this.getMinimumBet(currency);
        return currency.amount >= minimum;
    }

    async validBet(currency){
        const parsedBet = await this.parseCurrency(currency);
        if(isNaN(parsedBet)){ return this.BetValidityEnum.INVALID_AMOUNT; }
        if(!isFinite(parsedBet)){ return this.BetValidityEnum.INVALID_MULTIPLIER; }
        const validCurrency = await this.validCurrency(currency);
        if(validCurrency){
            const minimum = await this.getMinimumBet(currency);
            const maximum = await this.getMaximumBet(currency);
            if(parsedBet < minimum){ return this.BetValidityEnum.AMOUNT_TOO_LOW; }
            if(parsedBet > maximum){ return this.BetValidityEnum.AMOUNT_TOO_HIGH; }
            const wallets = await this.getWallets(currency.guildId);
            if(!wallets){ return this.BetValidityEnum.ERROR; }
            if(!(currency.userId in wallets) || !(currency.name in wallets[currency.userId].currencies)){ return this.BetValidityEnum.INSUFFICIENT_BALANCE; }
            const balance = await this.parseCurrency(this.Currency(currency.guildId, currency.name, wallets[currency.userId].currencies[currency.name].balance));
            if(balance >= parsedBet){
                return this.BetValidityEnum.VALID_BET;
            } else {
                return this.BetValidityEnum.INSUFFICIENT_BALANCE;
            }
        } else {
            return this.BetValidityEnum.INVALID_CURRENCY;
        }
    }

    async parseCurrency(currency, floor = false){
        let currencyInfo = await this.getCurrencyInfo(currency.guildId);
        const amountType = typeof(currency.amount);
        /*if(amountType !== "string"){
            return parseFloat(
                parseFloat(
                    (floor?
                    Math.floor(currency.amount*Math.pow(10,currencyInfo[currency.name].maxDecimals)):
                    Math.round(currency.amount*Math.pow(10,currencyInfo[currency.name].maxDecimals)))
                    / Math.pow(10,currencyInfo[currency.name].maxDecimals)
                ).toFixed(currencyInfo[currency.name].maxDecimals)
            );
        }
        let multiplier = 1;
        let letterCount = currency.amount.match(/[a-zA-Z]/g);
        if(letterCount){
            if(letterCount.length > 1 || (letterCount.length == 1 && currencyInfo[currency.name].currencyMultipliers[letterCount[0]] == null)){
                return Infinity;
            } else {
                multiplier = currencyInfo[currency.name].currencyMultipliers[letterCount[0]];
            }
        }
        currency.amount = multiplier*parseFloat(letterCount?currency.amount.replace(letterCount[0], ""):currency.amount);
        const parsedBet = parseFloat(parseFloat(Math.round(currency.amount*Math.pow(10,currencyInfo[currency.name].maxDecimals)) / Math.pow(10,currencyInfo[currency.name].maxDecimals)).toFixed(currencyInfo[currency.name].maxDecimals));
        return parsedBet;*/
        if(amountType === "string"){
            let multiplier = 1;
            let letterCount = currency.amount.match(/[a-zA-Z]/g);
            if(letterCount){
                if(letterCount.length > 1 || (letterCount.length == 1 && currencyInfo[currency.name].currencyMultipliers[letterCount[0]] == null)){
                    return Infinity;
                } else {
                    multiplier = currencyInfo[currency.name].currencyMultipliers[letterCount[0]];
                }
            }
            currency.amount = multiplier*parseFloat(letterCount?currency.amount.replace(letterCount[0], ""):currency.amount);
        }
        return parseFloat(
            parseFloat(
                (floor?
                Math.floor(currency.amount*Math.pow(10,currencyInfo[currency.name].maxDecimals)):
                Math.round(currency.amount*Math.pow(10,currencyInfo[currency.name].maxDecimals)))
                / Math.pow(10,currencyInfo[currency.name].maxDecimals)
            ).toFixed(currencyInfo[currency.name].maxDecimals)
        );
    }

    async addWager(userId, currency){
        const wallets = await this.getWallets(currency.guildId);
        if(!wallets){ return false; }
        const parsedAmount = await this.parseCurrency(currency);
        if(isNaN(parsedAmount) || !isFinite(parsedAmount)){ return false; }
        if(!(userId in wallets)){ wallets[userId] = { "currencies": {}, "private": false, "seed": "" }; }
        if(!(currency.name in wallets[userId].currencies)){ return false; }
        wallets[userId].currencies[currency.name].wager += parsedAmount;
        return this.saveWalletInfo(currency.guildId, wallets);
    }

    async addBalance(userId, currency){
        const wallets = await this.getWallets(currency.guildId);
        if(!wallets){ return false; }
        const parsedAmount = await this.parseCurrency(currency, true);
        if(isNaN(parsedAmount) || !isFinite(parsedAmount)){ return false; }
        if(!(userId in wallets)){ wallets[userId] = {"currencies": {}, "private": false, "seed": ""}; }
        if(!(currency.name in wallets[userId].currencies)){
            wallets[userId].currencies[currency.name] = { "balance": 0, "wager": 0 };
        }
        wallets[userId].currencies[currency.name].balance += parsedAmount;
        return this.saveWalletInfo(currency.guildId, wallets);
    }

    async deductBalance(userId, currency){
        const amount = await this.parseCurrency(currency, true);
        const result = await this.addBalance(userId, this.Currency(currency.guildId, currency.name, -1*amount));
        return result;
    }

    async roundCurrency(currency){
         let currencyInfo = await this.getCurrencyInfo(currency.guildId);
         return parseFloat(Math.round(currency.amount*Math.pow(10,currencyInfo[currency.name].maxDecimals)) / Math.pow(10,currencyInfo[currency.name].maxDecimals)).toFixed(currencyInfo[currency.name].maxDecimals);
    }

    async getCurrencyString(currency){
         const currencyInfo = await this.getCurrencyInfo(currency.guildId);
         const amount = (Math.floor(currency.amount*Math.pow(10, currencyInfo[currency.name].maxDecimals))/Math.pow(10, currencyInfo[currency.name].maxDecimals));
         return `${currencyInfo[currency.name].prefix}${amount.toFixed(Math.min(currencyInfo[currency.name].maxDecimals, String(amount.toFixed(currencyInfo[currency.name].maxDecimals)).replace(/0+$/, "").replace(/\d+./, "").length))}${currencyInfo[currency.name].postfix} ${currency.name}`;
    }

    async getMinimumBet(currency){
        let currencyInfo = await this.getCurrencyInfo(currency.guildId);
        return currencyInfo[currency.name].minimumBet;
    }

    async getMaximumBet(currency){
        let currencyInfo = await this.getCurrencyInfo(currency.guildId);
        return currencyInfo[currency.name].maximumBet;
    }

    async getCurrencies(guildId){
         let currencyInfo = await this.getCurrencyInfo(guildId);
         if(!currencyInfo || Object.keys(currencyInfo).length < 1){
             return "No valid currencies have been added for this guild.";
         }
         let currencyList = "";
         for(let currency in currencyInfo) currencyList += currency+", ";
         currencyList = currencyList.substring(0,currencyList.length-2);
         return currencyList;
    }

    async getMultipliers(currency){
         let currencyInfo = await this.getCurrencyInfo(currency.guildId);
         if(Object.keys(currencyInfo[currency.name].currencyMultipliers).length < 1){
             return "No multipliers have been added for this currency.";
         }
         let multiplierList = "";
         for(let currencyMultiplier in currencyInfo[currency.name].currencyMultipliers){
             multiplierList += `${currencyMultiplier}(${currencyInfo[currency.name].currencyMultipliers[currencyMultiplier]}), `;
         }
         multiplierList = multiplierList.substring(0,multiplierList.length-2);
         return multiplierList;
    }

    async saveWalletInfo(guildId, wallets){
        if(userCurrencyConfig.useDatabase){
            const result = await this.botClient.dbClient.query('INSERT INTO wallets(guild_id, json_data) VALUES($1, $2) ON CONFLICT (guild_id) DO UPDATE SET json_data = EXCLUDED.json_data', [guildId, wallets]);
            if(result && cacheDataInVariable){ this.wallets[guildId] = wallets; }
            return result;
        } else {
            try {
                this.wallets[guildId] = wallets;
                this.botClient.fs.writeFileSync(this.botClient.curDir+walletFile, JSON.stringify(this.wallets));
            } catch(error) {
                try {
                    this.wallets = JSON.parse(this.botClient.fs.readFileSync(this.botClient.curDir+walletFile));
                } catch(error) {
                    this.botClient.log.call(null, error);
                }
                this.botClient.log.call(null, error);
                return false;
            }
            return true;
        }
    }

    async saveCurrencyInfo(guildId, currencyInfo){
        if(userCurrencyConfig.useDatabase){
            const result = await this.botClient.dbClient.query('INSERT INTO currencies(guild_id, json_data) VALUES($1, $2) ON CONFLICT (guild_id) DO UPDATE SET json_data = EXCLUDED.json_data', [guildId, currencyInfo]);
            if(result && cacheDataInVariable){ this.currencyInfo[guildId] = currencyInfo; }
            return result;
        } else {
            this.currencyInfo[guildId] = currencyInfo;
            try {
                this.botClient.fs.writeFileSync(this.botClient.curDir+currencyFile, JSON.stringify(this.currencyInfo));
            } catch(error) {
                try {
                    this.currencyInfo = JSON.parse(this.botClient.fs.readFileSync(botClient.curDir+currencyFile));
                } catch(error) {
                    this.botClient.log.call(null, error);
                }
                this.botClient.log.call(null, error);
                return false;
            }
            return true;
        }
    }

    async canUpdate(currency){
        let currencyInfo = await this.getCurrencyInfo(currency.guildId);
        return (currencyInfo && (currency.name in currencyInfo) && currencyInfo[currency.name].updaters.includes(currency.userId));
    }

    async addGuildToCurrencyInfo(guildId){
        if(userCurrencyConfig.useDatabase){
            await this.botClient.dbClient.query('INSERT INTO currencies(guild_id, json_data) VALUES($1, $2) ON CONFLICT (guild_id) DO NOTHING;', [guildId, {}]);
        } else {
            this.currencyInfo[guildId] = {};
        }
    }

    async addGuildToWallet(guildId){
        if(userCurrencyConfig.useDatabase){
            await this.botClient.dbClient.query('INSERT INTO wallets(guild_id, json_data) VALUES($1, $2) ON CONFLICT (guild_id) DO NOTHING;', [guildId, {}]);
        } else {
            this.currencyInfo[guildId] = {};
        }
    }

    async getCurrencyInfo(guildId){
        if(userCurrencyConfig.useDatabase){
            if(cacheDataInVariable && (guildId in this.currencyInfo)){ return this.currencyInfo[guildId]; }
            const { rows } = await this.botClient.dbClient.query(`SELECT * FROM currencies WHERE guild_id = $1;`, [guildId]);
            if(!rows.length){
                this.addGuildToCurrencyInfo(guildId);
                return {};
            }
            if(cacheDataInVariable){ this.currencyInfo[guildId] = rows[0].json_data; }
            return rows[0].json_data;
        } else {
            if(guildId in this.currencyInfo){ return this.currencyInfo[guildId]; }
            this.addGuildToCurrencyInfo(guildId);
            return {};
            
        }
    }

    async getWallets(guildId){
        if(userCurrencyConfig.useDatabase){
            if(cacheDataInVariable && (guildId in this.wallets)){ return this.wallets[guildId]; }
            const { rows } = await this.botClient.dbClient.query(`SELECT * FROM wallets WHERE guild_id = $1;`, [guildId]);
            if(!rows.length){
                this.addGuildToWallet(guildId);
                return {};
            }
            if(cacheDataInVariable){ this.wallets[guildId] = rows[0].json_data; }
            return rows[0].json_data;
        } else {
            if(guildId in this.wallets){ return this.wallets[guildId]; }
            this.addGuildToWallet(guildId);
            return {};
        }
    }

    async addCurrencyName(currency){
        let currencyInfo = await this.getCurrencyInfo(currency.guildId);
        currencyInfo[currency.name] = {
            "prefix": "",
            "postfix": "",
            "maxDecimals": 0,
            "minimumBet": 1,
            "maximumBet": 10,
            "rates": {},
            "currencyMultipliers": {},
            "updaters": []
	};
        return this.saveCurrencyInfo(currency.guildId, currencyInfo);
    }

    async removeCurrencyName(currency){
        let currencyInfo = await this.getCurrencyInfo(currency.guildId);
        delete currencyInfo[currency.name];
        return this.saveCurrencyInfo(currency.guildId, currencyInfo);
    }

    async setPrefix(currency, prefix){
        let currencyInfo = await this.getCurrencyInfo(currency.guildId);
        currencyInfo[currency.name].prefix = prefix;
        return this.saveCurrencyInfo(currency.guildId, currencyInfo);
    }

    async setPostfix(currency, postfix){
        let currencyInfo = await this.getCurrencyInfo(currency.guildId);
        currencyInfo[currency.name].postfix = postfix;
        return this.saveCurrencyInfo(currency.guildId, currencyInfo);
    }

    async setDecimals(currency, decimals){
        let currencyInfo = await this.getCurrencyInfo(currency.guildId);
        currencyInfo[currency.name].maxDecimals = decimals;
        return this.saveCurrencyInfo(currency.guildId, currencyInfo);
    }

    async setMinimumBet(currency, newMinimumBet){
        let currencyInfo = await this.getCurrencyInfo(currency.guildId);
        currencyInfo[currency.name].minimumBet = newMinimumBet;
        return this.saveCurrencyInfo(currency.guildId, currencyInfo);
    }

    async setMaximumBet(currency, newMaximumBet){
        let currencyInfo = await this.getCurrencyInfo(currency.guildId);
        currencyInfo[currency.name].maximumBet = newMaximumBet;
        return this.saveCurrencyInfo(currency.guildId, currencyInfo);
    }

    async setRate(fromCurrency, toCurrency, rate){
        let currencyInfo = await this.getCurrencyInfo(fromCurrency.guildId);
        if (rate == 0) {
            delete currencyInfo[fromCurrency.name].rates[toCurrency.name];
        } else {
            currencyInfo[fromCurrency.name].rates[toCurrency.name] = rate;
        }
        return this.saveCurrencyInfo(fromCurrency.guildId, currencyInfo);
    }

    async getRate(fromCurrency, toCurrency){
        let currencyInfo = await this.getCurrencyInfo(fromCurrency.guildId);
        if(toCurrency.name in currencyInfo[fromCurrency.name].rates){
            return currencyInfo[fromCurrency.name].rates[toCurrency.name];
        } else {
            return null;
        }
    }

    async addMultiplier(currency, newMultiplierName, newMultiplierAmount){
        let currencyInfo = await this.getCurrencyInfo(currency.guildId);
        currencyInfo[currency.name].currencyMultipliers[newMultiplierName] = newMultiplierAmount;
        return this.saveCurrencyInfo(currency.guildId, currencyInfo);
    }

    async removeMultiplier(currency, multiplierName){
        let currencyInfo = await this.getCurrencyInfo(currency.guildId);
        delete currencyInfo[currency.name].currencyMultipliers[multiplierName];
        return this.saveCurrencyInfo(currency.guildId, currencyInfo);
    }

    async setPrivate(message, enablePrivacy){
        let wallets = await this.getWallets(message.guild.id);
        if(!(message.author.id in wallets)){ wallets[message.author.id] = {"currencies": {}, "private": false, "seed": ""}; }
        wallets[message.author.id].private = enablePrivacy;
        return this.saveWalletInfo(message.guild.id, wallets);
    }

    async setSeed(message, seed){
        let wallets = await this.getWallets(message.guild.id);
        if(!(message.author.id in wallets)){ wallets[message.author.id] = {"currencies": {}, "private": false, "seed": ""}; }
        wallets[message.author.id].seed = seed;
        return this.saveWalletInfo(message.guild.id, wallets);
    }

    async getSeed(message){
        let wallets = await this.getWallets(message.guild.id);
        if(!(message.author.id in wallets)){
            return "";
        } else {
            return wallets[message.author.id].seed;
        }
    }

    async addUpdater(currency){
        let currencyInfo = await this.getCurrencyInfo(currency.guildId);
        currencyInfo[currency.name].updaters.push(currency.userId);
        return this.saveCurrencyInfo(currency.guildId, currencyInfo);
    }

    async removeUpdater(currency){
        let currencyInfo = await this.getCurrencyInfo(currency.guildId);
        let index = currencyInfo[currency.name].updaters.indexOf(currency.userId);
        if (index > -1) {
            currencyInfo[currency.name].updaters.splice(index, 1);
        } else {
            return false;
        }
        return this.saveCurrencyInfo(currency.guildId, currencyInfo);
    }
}

module.exports = CurrencyHandler;