var mongoose = require('mongoose');
var Schema = mongoose.Schema;

function getReviewed(revN) {
  // getting actual value
  // will be set upon saving the document
  return this.reviews.length >= this.reviewsRequired;
}


var Submission = new Schema({
    course: {type: Number, ref: 'Course', required: true},
    week: {type: {obj:{type: Schema.Types.ObjectId, ref: 'Week'}, number: Number}, required: true},
    user: {type: {userId: {type: Schema.Types.ObjectId, ref: 'Account', index: true}, username: String}, required: true},
    title: {type: String, required: true, trim: true},
    submission: {type: String, required: true, trim: true},
    userComment: {type: String, trim: true},
    reviewsRequired: Number,
    reviews: [{
      author: {id: {type: Schema.Types.ObjectId, ref: 'Account'}, username: String},
      scores: [Number],
      comment: {type: String, trim: true}
    }],
    isReviewed: {type: Boolean, index: true}//, get: getReviewed}
  }, {timestamps: true});

Submission.index({course: 1, 'week.number': 1});

// mongoose.model('Week').findOne({_id: '56b76e77faa0e9ba7a201218'}, function(err, week){
//     console.log("Week:", week);
// });

// sub.reviewed is true if sub has received at least reviewsRequired number of reviews
Submission.virtual('calculatedReviewed').get(function(){
  return this.reviews.length >= this.reviewsRequired;
});

Submission.methods.updatedReviewed = function () {
  console.log('reviews length', this.reviews.length);
  console.log('rev req', this.reviewsRequired);

  console.log('INSIDE modified', this.isModified('isReviewed'));
  var res= this.isReviewed = this.reviews.length >= this.reviewsRequired;
  console.log('INSIDE modified', this.isModified('isReviewed'));
  return res;
};

Submission.methods.updatedReviewedFromWeek = function (week) {
  if(week) {
    this.reviewsRequired = week.reviewsRequired;
  } else if(this.week.obj.reviewsRequired) {
    this.reviewsRequired = this.week.obj.reviewsRequired;
  }
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
    // revN should always be >0, but just in case we'll need submissions not up for review
    var revField = revN > 0 ? 'reviews.'+(revN-1) : 'reviews';
    return self.update({course: week.course, 'week.number': week.number, [revField]: {$exists: true}}, {isReviewed: true, reviewsRequired: revN}, {multi: true}).exec()
  }).catch(function(err){
    console.log('Error updating ReviewdStates:', err);
  });
};

// inserts or updates Submission with {course: currentWeek.course, 'week.number': currenWeek.weekN} (unique index)
// if updates then resets isReviewed and reviews
Submission.statics.upsertSub = function (userId, username, currentWeek, formBody, cb) {
  return this.findOneAndUpdate({'user.userId': userId, course: currentWeek.course, 'week.number': currentWeek.weekN}, {'week.obj': currentWeek.id, title: formBody.title, submission: formBody.submission, userComment: formBody.comments, reviewsRequired: currentWeek.reviewsRequired, $setOnInsert: {'user.username': username, isReviewed: false, reviews: []}}, {new: true, upsert: true}, cb);
};

Submission.pre('save', function(next) {
  console.log('SAVING Submission:', this);
  // if reviewsRequired already set, skip resetting
  if(this.reviewsRequired !== undefined) {
    this.updatedReviewed();
    return next();
  };


  this.populate({path: 'week.obj', model: 'Week'}, function(err, doc){
    if(err) return console.log('Submission Population Error', err);

    // doc === this from outer function

    doc.reviewsRequired = doc.week.obj.reviewsRequired;

    doc.updatedReviewed();

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

Submission.post('findOneAndUpdate', function(doc){
  console.log("Found and Updated Submission", doc);
  // console.log("UPSERTED:", doc.upserted);
  // console.log("This value conditions:", this._conditions);
  mongoose.model('Week').update({_id: doc.week.obj}, {$addToSet: {submissions: doc._id}}, function(err, raw){
    if (err) return console.log('Week Update Error', err);
    console.log('The raw response from Mongo was ', raw);
  });

  //check if submission has enough reviews to be considered reviewed
  //if so, save with new isReviewed value
  doc.updatedReviewed();
  if(doc.isModified('isReviewed')){
    doc.save(function (err) {
      if(err) console.log('Submission save error:', err);
    })
  }
});

// var SubmissionModel = mongoose.model('Submission', Submission);
// var sb1 = new SubmissionModel({course: 0, week:{obj : '56b76e77faa0e9ba7a201218', number: 1}, submission: 'Example Submission', userComment: 'USER COMMENT', reviewsRequired: 3, isReviewed: false, title: "disposable", user: {}});
// sb1.save(function (err, sub) {
//   console.log("err",err);
//   console.log('IS modified', sub.isModified('isReviewed'));
//   sub.reviews.push({}); sub.reviews.push({}); sub.reviews.push({});
//   console.log(sub.updatedReviewed());
//   // sub.isReviewed = false;
//   console.log('IS modified', sub.isModified('isReviewed'));
//   console.log('modified', sub.modifiedPaths());
// });



// module.exports = SubmissionModel;

module.exports = mongoose.model('Submission', Submission);
