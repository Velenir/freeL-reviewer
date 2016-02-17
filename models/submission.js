var mongoose = require('mongoose');
var Schema = mongoose.Schema;

function getReviewsN(revN) {
  // getting actual value
  // will be set upon saving the document
  return this.reviews.length >= reviewsRequired;
}


var Submission = new Schema({
    course: {type: Number, ref: 'Course', required: true},
    week: {type: {obj:{type: Schema.Types.ObjectId, ref: 'Week'}, number: Number}, required: true},
    submission: {type: String, required: true, trim: true},
    userComment: {type: String, trim: true},
    reviewsRequired: {type: Number, get: getReviewsN},
    reviews: [{
      author: {id: {type: Schema.Types.ObjectId, ref: 'Account'}, username: String},
      scores: [Number],
      comment: {type: String, trim: true}
    }],
    isReviewed: {type: Boolean, index: true}
  }, {timestamps: true});

// Submission.index({course: 1, 'week.number': 1});

// mongoose.model('Week').findOne({_id: '56b76e77faa0e9ba7a201218'}, function(err, week){
//     console.log("Week:", week);
// });

// sub.reviewed is true if sub has received reviewsRequired number of reviews
// Submission.virtual('reviewed').get(function(){
//   return this.reviews.length === reviewsRequired;
// });

Submission.methods.updateIsReviewed = function () {
  return this.isReviewed = this.reviews.length >= this.reviewsRequired;
};


Submission.statics.updateReviewedStates = function (courseId, weekN) {
  var self = this;

  // if weekN was not provided assume courseId to be week._id
  var condition = weekN ? {course: courseId, number: weekN} : {_id: courseId};

  var promise = mongoose.model('Week').findOne(condition, 'reviewsRequired').exec();
  return promise.then(function(week){
    if(!week) throw new Error('no week found');

    var revN = week.reviewsRequired;
    return self.update({course: week.course, 'week.number': week.number, ['reviews.'+revN]: {$exists: true}}, {isReviewed: true}, {multi: true}).exec()
  }).catch(function(err){
    console.log('Error updating ReviewdStates:', err);
  });
};

Submission.pre('save', function(next) {
  console.log('SAVING Submission:', this);
  if(this.reviewsRequired) {
    this.updateIsReviewed();
    return next();
  }


  this.populate({path: 'week.obj', model: 'Week'}, function(err, doc){
    if(err) return console.log('Submission Population Error', err);

    doc.reviewsRequired = doc.week.obj.reviewsRequired;

    doc.updateIsReviewed();

    // TODO consider how to better set these: through post form or here
    // I say HERE
    // doc.course = doc.week.obj.course;
    // doc.week.number = doc.week.obj.number;
    next();
  });
  // next();
});

Submission.post('save', function(doc){
  console.log("SAVED Submission", doc);
  console.log("This value:", this);
  mongoose.model('Week').update({_id: doc.week.obj}, {$addToSet: {submissions: doc._id}}, function(err, raw){
    if (err) return console.log('Week Update Error', err);
    console.log('The raw response from Mongo was ', raw);
  });
});

// var SubmissionModel = mongoose.model('Submission', Submission);
// var sb1 = new SubmissionModel({course: 0, week:{obj : '56b76e77faa0e9ba7a201218', number: 1}, submission: 'Example Submission', userComment: 'USER COMMENT'});
// sb1.save();

// module.exports = SubmissionModel;

module.exports = mongoose.model('Submission', Submission);
