var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var passportLocalMongoose = require('passport-local-mongoose');


var Account = new Schema({
    username: String,
    password: {type: String, minlength: 7},
    submissions: [{type: Schema.Types.ObjectId, ref: 'Submission'}],
    comments: [{type: Schema.Types.ObjectId, ref: 'Comment'}],
    hasReviewed: [{type: Schema.Types.ObjectId, ref: 'Submission'}]
});


// NOTE passport-local-mongoose doesn't save password field, only hash,
// so it doesn't respect minlength (or anything else for that matter) in mongoose scheme for password field
// solution -- supply custom passwordValidator in plugin options
function passwordValidator(password, cb) {
    var err = Account.path('password').doValidateSync(password);
    // console.log("Validation error:", err);
    // don't actually display password in the message
    if(err) err.message = err.message.replace("(`" + password + "`)", '');

    cb(err);
}

Account.plugin(passportLocalMongoose, {passwordValidator: passwordValidator});

module.exports = mongoose.model('Account', Account);
