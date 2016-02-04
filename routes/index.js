var express = require('express');
var router = express.Router();
var mongodb = require('mongodb');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

// GET post assignment page
router.get('/week:id/post', function(req, res, next) {
  res.render('post', { title: 'Submit your assignment', week: req.params.id });
});

// GET edit assignment page
router.get('/week:id/edit', function(req, res, next) {
  res.render('post', { title: 'Edit your assignment', week: req.params.id, toEdit: true });
});

module.exports = router;
