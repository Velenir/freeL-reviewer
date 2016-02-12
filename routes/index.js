var express = require('express');

//require passport
var passport = require('passport');
var Account = require('../models/account');
var Week = require('../models/week');
var Course = require('../models/course');

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
  if(req.user){
    return res.redirect('/');
  }
  next();
}


/* GET home page. */
router.get('/', function (req, res) {
    // Course.find({}).populate('weeks').exec

    Course.getCoursesWithWeeks('-_id -tasks', function(err, courses){
      if(err) {
        console.log("Population Error:", err);
        res.render('index', { user : req.user });
      }
      console.log("courses found:", courses);
      if(courses.length > 0)
        console.log("weeks in 1st course:", courses[0].weeks);
      res.render('index', { user : req.user, courses: courses });
    });
    // res.render('index', { user : req.user });
});

// when accessing /register or /login when already logged in rediret to '/'
router.all(['/register', '/login', '/login_register'], alreadyLoggedIn);

// Get register page
router.get('/register', function(req, res) {
    res.render('register', { });
});

// On Register form submission
router.post('/register', function(req, res) {
    Account.register(new Account({ username : req.body.username }), req.body.password, function(err, account) {
        if (err) {
          console.log("Register Error: "+ err);
          return res.render(req.body.redirectedFrom ? "login_register" : "register", {registerInfo: err});
        }

        passport.authenticate('local')(req, res, function () {
          if(req.body.redirectedFrom)
          // redirect back from whence user came
            res.redirect(req.body.redirectedFrom);
          else
            res.redirect('/');
        });
    });
});



// Get Login page
router.get('/login', function(req, res) {
    res.render('login', { user : req.user, info: 'An error' });
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
    //  if authentication failed
    if (!user) {
      console.log("User null; " + info);
      return res.render(req.body.redirectedFrom ? "login_register" : 'login', {loginInfo: info});
    }
    //  if authentication succeeded establish a user session
    req.logIn(user, function(err) {
      if (err) { return next(err); }
      // redirect back from whence user came
      if(req.body.redirectedFrom) return res.redirect(req.body.redirectedFrom);

      return res.redirect('/');
    //   return res.redirect('/users/' + user.username);
    });
  })(req, res, next);
});

// Logout
router.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
});

router.get('/login_register', function(req, res){

  // console.log(req.session);
  res.render('login_register', {redirectedFrom: req.session.redirectedFrom, loginInfo: "Some important info", registerInfo: "Equally important info"});

  delete req.session.redirectedFrom;
  // console.log(req.session);
});


// TODO should be moved to the start of '/week*' route
// routes other than above only accessible to logged-in users
// router.all('/*', requireAuthorization);

// GET post assignment page
// router.get('/week:id/post', function(req, res, next) {
//   res.render('post', { title: 'Submit your assignment', week: req.params.id });
// });
//
// // GET edit assignment page
// router.get('/week:id/edit', function(req, res, next) {
//   res.render('post', { title: 'Edit your assignment', week: req.params.id, toEdit: true });
// });

// -- TODO

module.exports = router;
