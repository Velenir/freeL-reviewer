var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var passportLocalMongoose = require('passport-local-mongoose');


var Account = new Schema({
    username: String,
    password: String,
    submissions: [{type: Schema.Types.ObjectId, ref: 'Submission'}],
    comments: [{type: Schema.Types.ObjectId, ref: 'Comment'}],
    hasReviewed: [{type: Schema.Types.ObjectId, ref: 'Submission'}]
});

Account.plugin(passportLocalMongoose);

module.exports = mongoose.model('Account', Account);
