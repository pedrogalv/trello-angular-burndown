// server.js

// set up ========================
var express  = require('express');
var app      = express();                               // create our app w/ express
var mongoose = require('mongoose');                     // mongoose for mongodb
var morgan = require('morgan');             // log requests to the console (express4)
var bodyParser = require('body-parser');    // pull information from HTML POST (express4)
var methodOverride = require('method-override'); // simulate DELETE and PUT (express4)
var env = process.env; //OPENSHIFT Enviroments
// configuration =================

// connect to mongoDB database on mongolab
mongoose.connect('mongodb://<YOUR MONGODB URL HERE>');

// define model =================
var Prefs = mongoose.model('Prefs', {
    boardId : String,
    startDate : String,
    endDate : String,
    hoursByDay : String
});


// Enviroment folder ===========================================================
var enviromentFolder = env.NODE_ENV === 'development' ? 'app' : 'dist';

app.use(express.static(__dirname + '/'+enviromentFolder+'/public'));                 // set the static files location /public/img will be /img for users
//app.use('/bower_components',  express.static(__dirname + '/app/public/bower_components')););
app.use(morgan('dev'));                                         // log every request to the console
app.use(bodyParser.urlencoded({'extended':'true'}));            // parse application/x-www-form-urlencoded
app.use(bodyParser.json());                                     // parse application/json
app.use(bodyParser.json({ type: 'application/vnd.api+json' })); // parse application/vnd.api+json as json
app.use(methodOverride());

// routes ======================================================================

// api ---------------------------------------------------------------------
app.get('/api/prefs/:boardId', function(req, res) {

    // use mongoose to get all todos in the database
   Prefs.findOne({ 'boardId': req.params.boardId }, function (err, pref) {
      if (err) res.send(err);
      res.json(pref);
    });
});

// create todo and send back all todos after creation
app.post('/api/prefs', function(req, res) {

    var query = {'boardId':req.body.boardId};
    
    Prefs.findOneAndUpdate(query, req.body, {upsert:true}, function(err, pref){
        if (err) res.send(err)
        
           Prefs.findOne({ 'boardId': req.body.boardId }, function (err, pref) {
              if (err) res.send(err);
              res.json(pref);
            });
    });

});

// application -------------------------------------------------------------
app.get('*', function(req, res) {
    res.sendfile('./'+enviromentFolder+'/public/index.html'); // load the single view file (angular will handle the page changes on the front-end)
});



// listen (start app with node server.js) ======================================
app.listen(env.NODE_PORT || 8088, env.NODE_IP || 'localhost');
console.log("App listening on port " + (env.NODE_PORT || 8088));