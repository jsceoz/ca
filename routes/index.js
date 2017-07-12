var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Expressssssdassa' });
});

router.get('/h', function (req, res) {
    res.render('helloworld', { title: 'hello world'})
})
module.exports = router;
