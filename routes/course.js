var express = require('express');
var router = express.Router();

var Week = require('../models/week');
// var Submission = require('../models/submission');

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

  // res.render('login_register', {ops :{redirectedFrom: req.baseUrl + req.originalUrl, requrl: req.url, originalUrl: req.originalUrl, baseUrl: req.baseUrl, reqPath: req.path}, info: "Some Info"});
}

/* GET courses listing */
// router.get('/', function(req, res, next) {
//   res.send('respond with a resource');
// });

// routes other than above only accessible to logged-in users
router.all('/*', requireAuthorization);

/* GET course by id (whic is also its number) */
router.get('/:id', function(req, res, next) {
  res.send('respond with a COURSE resource');
});

/* GET courses week by week's number */
router.get('/:id/week:n', function(req, res, next) {
  res.send('respond with a Week ' + req.params.n +' resource');
});

//                      method param uses /(?:post|edit) custom expression to capture; default would have been ([^\/]+)
router.get('/:id/week:n/:method(?:post|edit)', function(req, res ,next){
  console.log("path-to-reg");

  console.log("Caught params: id %d, n %d", req.params.id, req.params.n);
  console.log(req.params);

  var currentWeek = req.session.currentWeek;
  // if currentWeek already filled with id and is the same skip reassigning
  // provided we can rely on weeks collection having unique {course, number} fileds
  if(currentWeek && currentWeek.course === req.params.id && currentWeek.weekN === req.params.n && currentWeek.id)
    return next();

  Week.findOne({course: req.params.id, number: req.params.n}, '_id', function(err, week){
    if(err) {
      console.log('Error getting week:',err);
      return res.status(406).send('Error getting week:',err);
    }

    if(!week) {
      console.log('No week found');
      return res.status(406).send('No such week');
    }
    // inject week data into req.session to make use of in post form call
    req.session.currentWeek = {id: week._id, course: week.course, weekN: week.number, reviewsRequired: week.reviewsRequired};

    next();
  });
  // next();
});

//        req.params == regex.exec(url).slice(1)    matches get fed to req.params with 0, 1, 2... for keys
// router.get(/^\/([^\\/]+?)\/week([^\\/]+?)\/(?:post|edit)(?:\/(?=$))?$/i, function(req, rs ,next){
//
//   console.log("Caught params: id %d, n %d", req.params[0], req.params[1]);
//   console.log(req.params);
//   next();
//
//
// });

// router.param('id', function(req, res, next, id){
//   console.log('ONE param: id %d', id);
//   next();
// });

// GET post assignment page
router.get('/:id/week:n/post', function(req, res, next) {
  res.render('post', { title: 'Submit your assignment',course: req.params.id, week: req.params.n, user: req.user, weekId: req.session.weekId });
});

// GET edit assignment page
router.get('/:id/week:n/edit', function(req, res, next) {
  res.render('post', { title: 'Edit your assignment', week: req.params.n, editing: true, user: req.user });
});

// GET just submitted submission overview page
router.get('/:id/week:n/:subid(\\w{24})', function(req, res, next) {
  console.log('going to sub._id:', req.params.subid);
  res.render('post', { title: 'Edit your assignment', week: req.params.n, editing: true, user: req.user });
});


module.exports = router;
