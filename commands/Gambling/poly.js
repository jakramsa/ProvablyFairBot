const baseRollCommand = require('./war.js');
let command = Object.assign({}, baseRollCommand);
command.name = 'poly';
command.maxPoints = 990;
command.maxDamage = 470;
command.description = 'Poly battle against the bot.';
delete command.aliases;

module.exports = command;