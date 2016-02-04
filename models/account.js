var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var passportLocalMongoose = require('passport-local-mongoose');

var Account = new Schema({
    username: String,
    password: String,
    submissions: [{type: Schema.Type.ObjectID, ref: 'Submission'}],
    comments: [{type: Schema.Type.ObjectID, ref: 'Comment'}]
});

Account.plugin(passportLocalMongoose);

module.exports = mongoose.model('Account', Account);
