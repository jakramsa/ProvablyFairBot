const baseRollCommand = require('./50.js');
let command = Object.assign({}, baseRollCommand);
command.name = '95';
command.multiplier = 10;
command.description = `Bet that a roll will be above ${command.name}`;

module.exports = command;