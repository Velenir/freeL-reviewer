var mongoose = require('mongoose');
var Schema = mongoose.Schema;

if(!requiredTimes) var requiredTimes = 0;
console.log('requiredTimes:', ++requiredTimes);

function updateSubmissions(revN) {
    console.log("This VAL in setter:", this);
    console.log('revN =', revN);
    console.log('revModified =', this.revModified);
    this.revModified = true;
    return revN;
}

var Week = new Schema({
    number: {type: Number, required: true},
    tasks: [[String]],
    posts: {type: Number, default: 0},  //remove field?
    toReview: {type: Number, default: 0},   //remove field? and insteand get via Submission.count()
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

    console.log('RESULT:', result);
    console.log('THIS:', this);
    console.log('SAME:', result===this);    //true

    this.updateSubRevs();
});

// Week.post('update', function(result){
//     console.log('Week was updated:', result);
//     console.log('contains revModified', result.revModified);
// });

Week.post('findOne', function(result){
    console.log('Week was found:', result);
    console.log('contains revModified', result.revModified);
});


// mongoose.connection.once('open', function () {
//     WScheme.findOne({}, '-submissions', function (err, res) {
//         console.log('FOUND', res);
//     });
// });
var WScheme = mongoose.model('Week', Week);
// var w1 = new WScheme({number: 3, course: 7, reviewsRequired: 5, submissions: ["56c2306160a6232a1cc74dc4"]});
// w1.reviewsRequired = 6;
// w1.save(function(err){
//     console.log("Saving Error:", err);
// });
//
// // var w2 = new WScheme({number:78, course: 7, submissions: ["56c37097b050c0cb26a03499"]});
// // w2.reviewsRequired = 1;
//
//
module.exports = WScheme;
// module.exports = mongoose.model('Week', Week);
