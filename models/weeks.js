var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var Week = new Schema({
    number: {type: Number, required: true},
    tasks: [[String]],
    posts: {type: Number, default: 0},
    toReview: {type: Number, default: 0}
    course: {type: Schema.Types.ObjectId, ref: 'Course'}
});

module.exports = mongoose.model('Week', Week);
