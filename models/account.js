var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var passportLocalMongoose = require('passport-local-mongoose');


var Account = new Schema({
	username: String,
	password: {type: String, minlength: [7, '`{PATH}` is shorter than the minimum allowed length ({MINLENGTH}).']},
	submissions: [{type: Schema.Types.ObjectId, ref: 'Submission'}],
	comments: [{type: Schema.Types.ObjectId, ref: 'Comment'}],
	hasReviewed: [{type: Schema.Types.ObjectId, ref: 'Submission'}]
});


// NOTE passport-local-mongoose doesn't save password field, only hash,
// so it doesn't respect minlength (or anything else for that matter) in mongoose scheme for password field
// solution -- supply custom passwordValidator in plugin options
var passwordPath = Account.path('password');
function passwordValidator(password, cb) {
	var err = passwordPath.doValidateSync(password);
	// console.log("Validation error:", err);

	cb(err);
}

Account.plugin(passportLocalMongoose, {passwordValidator: passwordValidator});

module.exports = mongoose.model('Account', Account);
