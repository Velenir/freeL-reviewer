var mongoose = require('mongoose');
var Schema = mongoose.Schema;

if(!requiredTimes) var requiredTimes = 0;
console.log('requiredTimes:', ++requiredTimes);


var validate = {
	validator: function(val) {
		return /^\s*(https?|ftp):\/\/[^\s/$.?#].[^\s]*\s*$/.test(val);
	},
	message: '{VALUE} is not a valid URL'
};

function updateSubmissions(revN) {
	console.log("This VAL in setter:", this);
	console.log('revN =', revN);
	console.log('revModified =', this.revModified);
	this.revModified = true;
	return revN;
}

var Week = new Schema({
	number: {type: Number, required: true},
	tasks: [{title: String, helpText: String, criteria: [String]}],
	topic: {type: String, required: true, trim: true},
	url: {type: String, required: true, trim: true, validate: validate},
	course: {type: Number, ref: 'Course', required: true},
	reviewsRequired: {type: Number, default: 3, set: updateSubmissions},
	submissions: [{type: Schema.Types.ObjectId, ref: 'Submission'}]
});

Week.index({course: 1, number: 1}, {unique: true});

Week.methods.updateSubRevs = function (cb) {
	if(!cb) {
		cb = function(err, raw){
			if(err) console.log('Error updating reviewsRequired for Submissions in Week', this._id);
			console.log('raw response:', raw);
		};
	}
	this.revModified = false;
	if(this.submissions.length > 0){
		this.model('Submission').update({_id: {$in: this.submissions}}, {reviewsRequired: this.reviewsRequired}, {multi: true}, cb);
	}
};

Week.post('save', function(){
	if(!this.revModified) return;

		// console.log('RESULT:', result);
		// console.log('THIS:', this);
		// console.log('SAME:', result===this);		//true

	this.updateSubRevs();
});

// Week.post('update', function(result){
//		 console.log('Week was updated:', result);
//		 console.log('contains revModified', result.revModified);
// });

// Week.post('findOne', function(result){
//		 console.log('Week was found:', result);
// });


module.exports = mongoose.model('Week', Week);
