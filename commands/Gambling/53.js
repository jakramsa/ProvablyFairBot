const baseRollCommand = require('./50.js');
let command = Object.assign({}, baseRollCommand);
command.name = '53';
command.multiplier = 2;
command.description = `Bet that a roll will be above ${command.name}`;

module.exports = command;