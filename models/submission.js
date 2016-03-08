var mongoose = require('mongoose');
var Schema = mongoose.Schema;

function NumberArray(key, options) {
  mongoose.SchemaType.call(this, key, options, 'NumberArray');
}
NumberArray.prototype = Object.create(mongoose.SchemaType.prototype);

// `cast()` takes a parameter that can be anything. You need to
// validate the provided `val` and throw a `CastError` if you
// can't convert it.
NumberArray.prototype.cast = function(val) {

    var res = Array.from(val, el => {
      var n = Number(el);
      if(isNaN(n)) throw new mongoose.SchemaType.CastError('NumberArray', val + ' contains not a number');
      return n;
    });
    console.log(val, '=>', res);
    return res;
};

// Don't forget to add `NumberArray` to the type registry
mongoose.Schema.Types.NumberArray = NumberArray;

function getReviewed(revN) {
  // getting actual value
  // will be set upon saving the document
  return this.reviews.length >= this.reviewsRequired;
}

var Review = new Schema({
  author: {id: {type: Schema.Types.ObjectId, ref: 'Account'}, username: String},
  scores: [NumberArray],
  comment: {type: String, trim: true}
});


var Submission = new Schema({
    course: {type: Number, ref: 'Course', required: true},
    week: {type: {obj:{type: Schema.Types.ObjectId, ref: 'Week'}, number: Number}, required: true},
    user: {type: {userId: {type: Schema.Types.ObjectId, ref: 'Account', index: true}, username: String}, required: true},
    title: {type: String, required: true, trim: true},
    submission: {type: String, required: true, trim: true},
    userComment: {type: String, trim: true},
    reviewsRequired: Number,
    reviews: [Review],
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
  console.log('INSIDE updatedReviewed');
  return this.isReviewed = this.reviews.length >= this.reviewsRequired;
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

// inserts or updates Submission with {course: week.course, 'week.number': week.weekN} (unique index)
// also resets isReviewed and reviews
Submission.statics.upsertSub = function (userId, username, week, formBody, cb) {
  return this.findOneAndUpdate({'user.userId': userId, course: week.course, 'week.number': week.weekN}, {'week.obj': week.weekId, title: formBody.title, submission: formBody.submission, userComment: formBody.comments, reviewsRequired: week.reviewsRequired, isReviewed: false, reviews: [], $setOnInsert: {'user.username': username}}, {new: true, upsert: true}, cb);
};

Submission.statics.addSub = function (userId, username, week, formBody, cb) {

  // remove old submission if there is one
  // removal is better than updating existing because other users keep track of old submission in their hasReviewed
  var removalPromise = this.remove({'user.userId': userId, course: week.course, 'week.number': week.weekN}).exec();

  // this is actually a Model, so new this({}) works correctly
  var sub = new this({course: week.course, week: {number: week.weekN, obj: week.weekId}, user: {userId: userId, username: username}, title: formBody.title, submission: formBody.submission, userComment: formBody.comments, reviewsRequired: week.reviewsRequired, isReviewed: false});

  return removalPromise.then(function () {
    return sub.save();
  }).onResolve(cb);
};


// updates Submission with a new review
Submission.statics.addReview = function (subId, author, reviewBody, cb) {
  // var scores = reviewBody.scores.map(function (nestedArr) {
  //   return nestedArr.map(function (strEl) {return parseInt(strEl, 10);});
  // });
  // console.log("converted scores:", scores);
  var review = {author: author, scores: reviewBody.scores, comment: reviewBody.comment};

  return this.findByIdAndUpdate(subId, {$push: {reviews: review}}, {new: true}, cb);
};

Submission.pre('save', function(next) {
  // console.log('SAVING Submission:', this);
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

    next();
  });
});

Submission.post('save', function(doc){
  // console.log("SAVED Submission", doc);
  // console.log("This value:", this);
  mongoose.model('Week').update({_id: doc.week.obj}, {$addToSet: {submissions: doc._id}}, function(err, raw){
    if (err) return console.log('Week Update Error', err);
    console.log('The raw response from Mongo was ', raw);
  });
});

Submission.post('findOneAndUpdate', function(doc){
  // console.log("Found and Updated Submission", doc);
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


// toObject is called when receiving document from database
// toJSON is called when retrieving from serialized data storage (as in req.session.sub = sub => session gets saved => session gets retrieved already stringified)
// toObject and toJSON destroy virtuals and methods/statics by default, (can preserve virtuals with {getters: true, setters: true})
// toJSON always destroys functions
// toObject can get functions back in transform

Submission.set('toObject', { getters: true});//, transform: function (doc, ret, options) {
//   ret.updatedReviewed = Submission.methods.updatedReviewed;
// } });
Submission.set('toJSON', { getters: true});
// specify the transform schema option
if (!Submission.options.toObject) Submission.options.toObject = {};
Submission.options.toObject.transform = function (doc, ret, options) {
  console.log('toObject');
  ret.updatedReviewed = Submission.methods.updatedReviewed;
  ret.Objected = true;
};

if (!Submission.options.toJSON) Submission.options.toJSON = {};
Submission.options.toJSON.transform = function (doc, ret, options) {
  console.log('toJSON');
  ret.updatedReviewed = Submission.methods.updatedReviewed;
  ret.FUNC = function (arguments) {console.log('FUNC');}
  ret.JSONed = true;
};

module.exports = mongoose.model('Submission', Submission);
