import amanga from './amanga';
import {Parser as manhuaguiParser} from './lib/manhuagui';

export * from './types';

// export default amanga;

// for cjs
module.exports = amanga;

module.exports.default = amanga;
module.exports.manhuaguiParser = manhuaguiParser;
