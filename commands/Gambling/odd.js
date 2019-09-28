const baseRollCommand = require('./even.js');
let command = Object.assign({}, baseRollCommand);
command.name = 'odd';
command.description = 'Bet that a roll will be odd.';

module.exports = command;