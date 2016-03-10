var mongoose = require('mongoose');
var Schema = mongoose.Schema;

if(!requiredTimes) var requiredTimes = 0;
console.log('requiredTimes:', ++requiredTimes);

function URL(key, options) {
  mongoose.SchemaType.call(this, key, options, 'URL');
}
URL.prototype = Object.create(mongoose.SchemaType.prototype);

// `cast()` takes a parameter that can be anything. You need to
// validate the provided `val` and throw a `CastError` if you
// can't convert it.
URL.prototype.cast = function(val) {

    if(!/^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/.test(val)) throw new mongoose.SchemaType.CastError('URL', val + ' is not a valid URL');
    console.log('casting URL:', val);

    return val;
};

// Don't forget to add `URL` to the type registry
mongoose.Schema.Types.URL = URL;


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
    url: {type: URL, required: true, trim: true},
    course: {type: Number, ref: 'Course', required: true},
    reviewsRequired: {type: Number, default: 3, set: updateSubmissions},
    submissions: [{type: Schema.Types.ObjectId, ref: 'Submission'}]
});

Week.index({course: 1, number: 1}, {unique: true});

Week.methods.updateSubRevs = function (cb) {
    if(!cb) {
        cb = function(err, raw){
            if(err) console.log('Error updating reviewsRequired for Submissions in Week', doc_id);
            console.log('raw response:', raw);
        };
    }
    this.revModified = false;
    if(this.submissions.length > 0){
        this.model('Submission').update({_id: {$in: this.submissions}}, {reviewsRequired: this.reviewsRequired}, {multi: true}, cb);
    }
};

Week.post('save', function(result){
    if(!this.revModified) return;

    // console.log('RESULT:', result);
    // console.log('THIS:', this);
    // console.log('SAME:', result===this);    //true

    this.updateSubRevs();
});

// Week.post('update', function(result){
//     console.log('Week was updated:', result);
//     console.log('contains revModified', result.revModified);
// });

// Week.post('findOne', function(result){
//     console.log('Week was found:', result);
// });


module.exports = mongoose.model('Week', Week);
