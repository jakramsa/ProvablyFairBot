const baseRollCommand = require('./under.js');
let command = Object.assign({}, baseRollCommand);
command.name = 'over';
command.description = 'Bet that a roll will be over 50.';

module.exports = command;