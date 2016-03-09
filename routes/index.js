var express = require('express');

//require passport
var passport = require('passport');
var Account = require('../models/account');
var Week = require('../models/week');
var Course = require('../models/course');
var Submission = require('../models/submission');

var router = express.Router();

// // if not logged in go to '/login_register'
// function requireAuthorization(req, res, next) {
//   console.log("IN requireAuthorization");
//   if(req.user){
//     return next();
//     console.log("GOING NEXT");
//   }
//
//   console.log("REDIRECTING");
//   // remember from where was redirected
//   req.session.redirectedFrom = req.url;
//   console.log("ORIGINAL URL", req.originalUrl);
//   console.log("URL", req.url);
//   res.redirect('/login_register');
//
//   // res.render('login_register', {ops :{redirectedFrom: req.baseUrl + req.originalUrl, requrl: req.url, originalUrl: req.originalUrl, baseUrl: req.baseUrl, reqPath: req.path}, info: "Some Info"});
// }

// if already logged in don't go to /register or /login
function alreadyLoggedIn(req, res, next) {
  console.log("In ALREADy loggedIn");
  if (req.user) {
    return res.redirect('/');
  }
  next();
}

function takeHashedData(session, hashedKey) {
  if(!session.hashedData) return undefined;

  var data = session.hashedData[hashedKey];
  session.hashedData[hashedKey] = undefined;

  console.log('Got', data, 'for hashedKey', hashedKey);

  return data;
}

/* GET home page. */
router.get('/', function(req, res, next) {
  var courseFindPromise = Course.find({}).exec().catch(function(err) {
    console.log('Courses find error:', err);
    throw err;
  });

  // Course.find({}, function (err, courses) {
  //   if(err) {
  //     console.log("Courses Error:", err);
  //     return res.render('index', { user : req.user });
  //   }
  //   console.log("courses found:", courses);
  //   if(courses.length > 0)
  //     console.log("weeks in 1st course:", courses[0].weeks);
  //     return res.render('index', { user : req.user, courses: courses });
  // });
  //

  var subsNotForReview = [];
  if(req.user) {
    if(req.user.submissions) subsNotForReview = subsNotForReview.concat(req.user.submissions);
    if(req.user.hasReviewed) subsNotForReview = subsNotForReview.concat(req.user.hasReviewed);
  }
  console.log("not for review:", subsNotForReview);

  var aggrPromise = Submission.aggregate({
    "$group": {
      "_id": "$week.obj",
      "number": {
        "$first": "$week.number"
      },
      "countAll": {
        "$sum": 1
      },
      "countReviewed": {
        "$sum": {
          "$cond": {
            "if": "$isReviewed",
            "then": 1,
            "else": 0
          }
        }
      },
      "availableForReview": {
        "$sum": {
          "$cond": {
            "if": {"$or": ["$isReviewed", {"$setIsSubset": [["$_id"], subsNotForReview]}]},
            "then": 0,
            "else": 1
          }
        }
      }
    }
  }).exec().then(function(result) {
    // console.log('Promised aggr result:', result);
    var mappedResult = new Map();
    for (var i = 0; i < result.length; ++i) {
      mappedResult.set(result[i]._id, result[i]);
    }

    // console.log('mappedResult:', mappedResult);
    return mappedResult;

  }, function(err) {
    console.log('Aggregation error:', err);
    throw err;
  });

  Promise.all([courseFindPromise, aggrPromise]).then(function(results) {
    // console.log('Courses found:', results[0]);
    // console.log("weeks in 1st course:", results[0][0].weeks);
    // console.log('weeks mapped:', results[1]);
    return res.render('index', {
      user: req.user,
      courses: results[0],
      weeksMap: results[1]
    });
  }, function(err) {
    console.log('Caught error:', err);
    next(err);
  });

  // Course.find({}).populate('weeks', '-_id -tasks').exec().then(function (courses) {
  //   console.log("Courses promise fulfilled");
  //   throw new Error('faux error');
  //   return res.render('index', { user : req.user, courses: courses });
  // }, function (err) {
  //   console.log("Courses promise rejected");
  //   next(err);
  // });
});

// when accessing /register or /login when already logged in rediret to '/'
router.all(['/register', '/login', '/login_register'], alreadyLoggedIn);

// Get register page
router.get('/register', function(req, res) {
  res.render('register', {});
});

// On Register form submission
router.post('/register', function(req, res) {
  var redirectedFrom = req.body.redirectedFrom;

  Account.register(new Account({
    username: req.body.username
  }), req.body.password, function(err, account) {

    if (err) {
      console.log("Register Error: " + err);
      // return res.render(req.body.redirectedFrom ? "login_register" : "register", {
      //   registerInfo: err
      // });
      if(redirectedFrom) return res.render('login_register', {registerInfo: err.message, redirectedFrom: redirectedFrom});
      else return res.render('register', {registerInfo: err.message});
    }

    passport.authenticate('local')(req, res, function() {
      if (redirectedFrom)
      // redirect back from whence user came
        res.redirect(redirectedFrom);
      else
        res.redirect('/');
    });
  });
});



// Get Login page
router.get('/login', function(req, res) {
  res.render('login', {});
});

// On Login form submission
router.post('/login', function(req, res, next) {
  // try to authenticate
  passport.authenticate('local', function(err, user, info) {
    //   propagate any exceptions
    if (err) {
      console.log("Login Error");
      return next(err);
    }

    var redirectedFrom = req.body.redirectedFrom;

    //  if authentication failed
    if (!user) {
      console.log("User null; " + info);
      console.log(info);
      if(redirectedFrom) return res.render('login_register', {loginInfo: info, redirectedFrom: redirectedFrom});
      else return res.render('login', {loginInfo: info.message});
      // return res.render(req.body.redirectedFrom ? "login_register" : 'login', {
      //   loginInfo: info
      // });
    }
    //  if authentication succeeded establish a user session
    req.logIn(user, function(err) {
      if (err) {
        return next(err);
      }
      // redirect back from whence user came
      if (redirectedFrom) return res.redirect(redirectedFrom);

      return res.redirect('/');
      //   return res.redirect('/users/' + user.username);
    });
  })(req, res, next);
});

// Logout
router.get('/logout', function(req, res) {
  req.logout();

  // NOTE destroy user specific session; gets recreated on next request
  req.session.destroy();
  res.redirect('/');
});

router.get('/login_register', function(req, res) {

  // console.log(req.session);
  var redirectedFrom = req.session.redirectedFrom;

  // need to unset session fields before render, because session.save() is called on HTTP request
  // otherwise user will be redirected even if route is accessed directly
  req.session.redirectedFrom = undefined;
  res.render('login_register', {
    redirectedFrom: redirectedFrom
  });


  // console.log(req.session);
});


// On Submission form submission
router.post('/addsubmission', function(req, res, next) {

  var currentWeek = req.session.currentWeek;
  console.log('IN /ADDSUBMISSION');
  console.log('currentWeek:', currentWeek);
  if (!currentWeek) {
    console.log('No currentWeek in user session');
    return next(new Error('No currentWeek in user session'));
  }

  // DONE:20 get course and weekN from hashedData, not currentWeek
  var week = takeHashedData(req.session, req.body.hk);
  if (!week) {
    console.log('No corresponding week in user session');
    return next(new Error('No corresponding week in user session'));
  }

  Submission.addSub(req.user._id, req.user.username, week, req.body, function(err, doc) {
    if (err) return next(err);

    currentWeek.mySub = doc;

    // add new sub._id to user's submissions and save if actually modified
    req.user.submissions.addToSet(doc._id);
    if (req.user.isModified('submissions')) {
      console.log('Added new sub to user');
      req.user.save(function(err) {
        if (err) {
          console.log('Error adding sub_id to user:', err);
          return next(err);
        }

        res.redirect('/course/' + currentWeek.course + '/week' + currentWeek.weekN + '/post');
      });
    } else {
      console.log("Updated a user's sub");
      // go to view the submission
      res.redirect('/course/' + currentWeek.course + '/week' + currentWeek.weekN + '/post');
    }
  })

  // var sub = new Submission(course: currentWeek.course, week: {obj: currentWeek.week, number: currentWeek.weekN}, title: req.body.title, submission: req.body.submission, userComment: req.body.comments, reviewsRequired: currentWeek.reviewsRequired);
  // sub.save(function(err, doc){
  //   if(err) return next(err);
  //   // go to view the submission
  //   res.redirect('/course/' + currentWeek.course + '/week' + currentWeek.weekN +'/' + doc._id);
  // });
});


// On Review form submission
router.post('/addreview', function(req, res, next) {

  console.log(req.body);

  // DONE:30 get submission based on req.body key from req.session.reviewingSubs object
  var sub = takeHashedData(req.session, req.body.hk);
  // reset reviewed sub
  req.session.reviewingSub = undefined;
  var author = {id: req.user._id, username: req.user.username};

  Submission.addReview(sub.subId, author, req.body, function (err, doc) {
    if(err) {
      console.log('Error adding review:', err);
      return next(err);
    }

    req.user.hasReviewed.push(doc._id);
    req.user.save(function(err) {
      if (err) {
        console.log('Error adding sub_id to user:', err);
        return next(err);
      }

      // res.json(doc);
      // NOTE redirect works properly with doc.course
      res.redirect('/course/' + doc.course + '/week' + doc.week.number + '/review');
    });
  });


});

module.exports = router;
