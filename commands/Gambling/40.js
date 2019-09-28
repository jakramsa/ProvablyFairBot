const baseRollCommand = require('./50.js');
let command = Object.assign({}, baseRollCommand);
command.name = '40';
command.multiplier = 1.5;
command.description = `Bet that a roll will be above ${command.name}`;

module.exports = command;