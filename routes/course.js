var express = require('express');
var router = express.Router();


var Week = require('../models/week');
var Submission = require('../models/submission');

var hash = require('object-hash');

// if not logged in go to '/login_register'
function requireAuthorization(req, res, next) {
	console.log("IN requireAuthorization");
	if(req.user){
		return next();
	}

	console.log("REDIRECTING");
	// remember from where was redirected
	req.session.redirectedFrom = req.originalUrl;
	console.log("ORIGINAL URL", req.originalUrl);
	console.log("URL", req.url);
	res.redirect('/login_register');
}


function addHashedData(session, data) {
	if(!session.hashedData) {
		session.hashedData = {};
	}

	// console.log('hashing', data);
	var hashedKey = hash(data);
	session.hashedData[hashedKey] = data;
	return hashedKey;
}

function addSubToHashedData(session, sub) {
	return addHashedData(session, {subId: sub._id.toString(), course: sub.course, weekN: sub.week.number});
}

function addWeekToHashedData(session, currentWeek) {
	return addHashedData(session, {weekId: currentWeek.id.toString(), course: currentWeek.course, weekN: currentWeek.weekN, reviewsRequired: currentWeek.reviewsRequired});
}

function currentWeekIsSame(currentWeek, params) {
	// == instead of === because course is int and id is String
	return currentWeek && currentWeek.course == params.id && currentWeek.weekN == params.n && currentWeek.id && currentWeek.tasks && currentWeek.topic && currentWeek.url;
}

function constructCurrentWeek(week) {
	return {id: week._id, course: week.course, weekN: week.number, reviewsRequired: week.reviewsRequired, tasks: week.tasks, topic: week.topic, url: week.url};
}

/* GET courses listing */
// router.get('/', function(req, res, next) {
//	 res.send('respond with a resource');
// });

// routes other than above only accessible to logged-in users
router.all('/*', requireAuthorization);

/* GET course by id (whic is also its number) */
router.get('/:id(\\d+)', function(req, res, next) {
	res.send('respond with a COURSE resource');
});

/* GET courses week by week's number */
router.get('/:id(\\d+)/week:n(\\d+)', function(req, res, next) {
	res.send('respond with a Week ' + req.params.n +' resource');
});

function populateCurrentWeek(req, res, next) {
	console.log('req.params:', req.params);
	var currentWeek = req.session.currentWeek;
	// if currentWeek already filled with id and is the same skip reassigning
	// provided we can rely on weeks collection having unique {course, number} fileds
	if(currentWeekIsSame(currentWeek, req.params)){
		// reviewingSub is available so that user doesn't change revieing submission on simple reload
		console.log('currentWeek checks, going next');

		return next();
	}

	console.log('currentWeek wrong, filling now');

	var condition = {course: req.params.id, number: req.params.n};

	Week.findOne(condition, '-submissions', function(err, week){
		if(err) {
			console.log('Error getting week:',err);
			return res.status(406).send('Error getting week:',err);
		}

		if(!week) {
			console.log('No week found');
			return res.status(406).send('No such week');
		}

		// inject week data into req.session to make use of in post form call
		req.session.currentWeek = constructCurrentWeek(week);
		console.log('currentWeek filled, going next');
		next();
	});
}

router.get('/:id(\\d+)/week:n(\\d+)/:act(?:post|review)', populateCurrentWeek);


// DONE:40 put currentWeek getters into middleware for both /post and /review
// GET post assignment page
router.get('/:id(\\d+)/week:n(\\d+)/post', function(req, res, next) {
	var currentWeek = req.session.currentWeek;

	// mySub only available from redirect after /addsubmission or /review?sub=,
	// in case of direct link to /post should reload in case of new reviews (hence mySub reset to undefined)
	if(currentWeek.mySub) {
		req.submission = currentWeek.mySub;
		currentWeek.mySub = undefined;
		// console.log('had mySub with:', req.submission);
		// console.log('had updatedReviewed method:', req.submission.updatedReviewed);
		// console.log('calculatedReviewed:', req.submission.calculatedReviewed);
		return next();
	}

	console.log('STAGE 1.5');

	Submission.findOne({course: +req.params.id, 'week.number': +req.params.n, 'user.userId': req.user._id}, function (err, sub) {
		if(err) return next(err);

		req.submission = sub;
		if(sub) console.log('found sub for user', req.user._id);
		else console.log('no sub found for user', req.user._id, 'in week', req.params.n, 'in course', req.params.id);
		next();
	});

}, function (req, res) {
	console.log('STAGE 2');
	console.log('rendering with sub:', req.submission);
	console.log('and currentWeek:', req.session.currentWeek);
	// console.log('has updatedReviewed method:', req.submission.updatedReviewed);
	// console.log('calculatedReviewed:', req.submission.calculatedReviewed);
	var sub = req.submission;

	var hashedKey = addWeekToHashedData(req.session, req.session.currentWeek);

	// NOTE sub.updatedReviewed gets stripped during JSON.stringify() of on req.session save => load
	res.render('post', { title: sub ? Submission.schema.methods.updatedReviewed.call(sub) ? 'Your assignment has been reviewed' : 'Edit your assignment' : 'Submit your assignment', user: req.user, submission: sub, week: req.session.currentWeek, hashedKey: hashedKey});
});


// GET just submitted submission overview page
router.get('/:id(\\d+)/week:n(\\d+)/review', function(req, res, next) {
	// Check that the user has already made a submission for this week,
	// otherwise don't allow to see others' submissions
	console.log('STAGE PRE_REVIEW');
	Submission.findOne({course: +req.params.id, 'week.number': +req.params.n, 'user.userId': req.user._id}, '_id', function (err, sub) {
		if(err) return next(err);

		// if user doesn't have a previous submission for this course and week
		if(!sub) {
			return res.render('nothingtoreview', {user: req.user, reason: 'HAS YET TO SUBMIT', week: req.session.currentWeek});
		}
		// otherwise proceed
		next();
	});

},

function(req, res, next) {
	if(req.query.sub){
		console.log('STAGE 0');

		// submission with given _id must belong to a proper week and course from the url
		Submission.findOne({_id: req.query.sub, course: +req.params.id, 'week.number': +req.params.n}).populate({path: 'week.obj', select: '-submissions', model: 'Week'}).exec(function (err, sub) {
			if(err) return next(err);

			if(!sub) return next(new Error("No submission found."));

			// in case there was a change in weeks collection
			// console.log('In /review?sub=	sub:', sub);
			// console.log('sub.week:', sub.week);
			// console.log('sub.week.obj:', sub.week.obj);
			var subReviewed = sub.updatedReviewedFromWeek();

			var week = sub.week.obj;
			// to skip extra lookup after redirect
			var currentWeek = req.session.currentWeek = constructCurrentWeek(week);

			// if same user, don't let him review his assignment
			if(sub.user.userId.toString() === req.user._id.toString()) {
				// console.log('Redirecting to /post', ':: has updatedReviewed method:', sub.updatedReviewed);
				console.log("passing sub:", sub);
				currentWeek.mySub = sub;
				return res.redirect(`/course/${week.course}/week${week.number}/post`);
			}

			// console.log('subid', sub._id, sub.id);
			// console.log('hasReviewed', req.user.hasReviewed, '\\nfirst el:', req.user.hasReviewed[0]);
			// console.log('reviewed by user', req.user.hasReviewed.indexOf(sub._id) !== -1);

			if(subReviewed || req.user.hasReviewed.indexOf(sub._id) !== -1) {
				return res.render('nothingtoreview', {user: req.user, reason: 'ALREADY REVIEWED', week: currentWeek});
			}

			// WARNING don't set req.session.reviewingSub here; it should be only applicable to normal /review submissions
			console.log('going to sub._id:', req.params.subid);

			var hashedKey = addSubToHashedData(req.session, sub);
			res.render('review', { title: 'Review assignment', user: req.user, submission: sub, week: currentWeek, hashedKey: hashedKey});
		});
		return;
	}
	next();
},


function (req,res, next) {
	var reviewingSub = req.session.reviewingSub, currentWeek = req.session.currentWeek;
	if(reviewingSub && reviewingSub.course == req.params.id && reviewingSub.week.number == req.params.n && reviewingSub.week.obj.toString() === currentWeek.id.toString()) {
		console.log('STAGE 1.1');

		return next();
	} else {
		var subsNotForReview = [];
		if(req.user) {
			if(req.user.submissions) subsNotForReview = subsNotForReview.concat(req.user.submissions);
			if(req.user.hasReviewed) subsNotForReview = subsNotForReview.concat(req.user.hasReviewed);
		}

		console.log('STAGE 1.2');
		console.log('notForReview', subsNotForReview);

		Submission.aggregate([
			{"$match" : {"course": +req.params.id, 'week.number': +req.params.n, "isReviewed": false, "_id": {"$nin": subsNotForReview}}},
			{"$project" : {"course" : 1, "week" : 1, "title" : 1,	"submission": 1, "userComment": 1, "reviewsRequired" : 1, "reviewsN" : {"$size" : "$reviews"}}},
			{"$sort" : {"reviewsN" : -1}},
			{"$limit" : 5},
			{"$sample" : {"size" : 1}}],
			function (err, subs) {
				if(err) {
					console.log("Error aggregating submissions for review");
					next(err);
				}

				var sub = subs[0];
				console.log("Aggregated sub:", sub);

				req.session.reviewingSub = sub;
				next();
			});
	}
},
function (req, res) {

	var sub = req.session.reviewingSub;

	if(sub) {
		console.log('STAGE 2');

		var hashedKey = addSubToHashedData(req.session, sub);

		res.render('review', { title: 'Review assignment', user: req.user, submission: req.session.reviewingSub, week: req.session.currentWeek, hashedKey: hashedKey});
	} else{
		// DONE:10 create nothingtoreview.jade view
		res.render('nothingtoreview', {user: req.user, reason: 'NO SUBMISSIONS FOUND', week: req.session.currentWeek});
	}
});


module.exports = router;
