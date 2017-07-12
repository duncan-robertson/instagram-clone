/*#NodeJS server
 *A simple server to serve the Instagram clone website
 *
--------------------------------- Server configuration ----------------------------------
 *
 *1. Adds external modules from node_modules
 */
 
var dbUrl = 'mongodb://instaadmin1:webadmin123@ds119682.mlab.com:19682/instagramdb';
var http = require('http');
var path = require('path');
var express = require('express');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var validate = require('./js/validate.js');
var registration = require('./js/registration.js');

// 2. Adds schemas from models
var Post = require('./models/Post.js');
var User = require('./models/User.js');

//session
var session = require('express-session');  
const mongoSession = require('connect-mongodb-session')(session);
const passport = require('passport');
const userAuth = require('./js/userAuth.js');


//create a sessions collection as well


// 3. Establishes connection to the MongoDB 
mongoose.connect('mongodb://instaadmin1:webadmin123@ds119682.mlab.com:19682/instagramdb', {useMongoClient: true});


// 4. Creates a new instance of NodeJS router and server
var router = express();
var server = http.createServer(router);

// 5. Tells the router where to find static files
router.use(express.static(path.resolve(__dirname, 'client')));

// 6. Tells the router to parse JSON data and put it into req.body
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({
  extended: true
}));

// 7. Misc module settings
validate.userSchema = User;
mongoose.Promise = global.Promise;
registration.validator = validate;

var mongoSessionStore = new mongoSession({
    uri: dbUrl,
    collection: 'sessions'
});

//add session support
router.use(session({
  secret: process.env.SESSION_SECRET || 'mySecretKey', 
  store: mongoSessionStore,
  resave: true,
  saveUninitialized: false
}));

router.use(passport.initialize());
router.use(passport.session());
userAuth.init(passport);

/*
-------------------------------- Processes requests from client ------------------------------
*/

/*
 *I. Root access redirection
*/
 
router.get('/', function(req, res){
  console.log('client requests root');
  res.sendfile(path.join(__dirname, 'client/views','loginAndRegistration.html'));
});

router.get('/forgotPassword.html', function(req, res){
  console.log('client requests root');
  res.sendfile(path.join(__dirname, 'client/views','forgotPassword.html'));
});


router.get('/index',userAuth.isAuthenticated, function(req, res){
  console.log('client requests root');
  res.sendfile(path.join(__dirname, 'client/views','index.html'));
});


/* I. Index.html
 *    1. Load user profile
*/

router.post('/getUserProfile', (req, res) => {
  var currentUser = req.session.passport.user;
  console.log(currentUser);
  User.findById(currentUser)
  .then((user) => {
    res.json(user);
  });
});


//  2. Load top profiles
router.post('/getTopProfiles', function(req, res){
   User.find().sort({followersCount : -1}).limit(2)
  .then((profiles) => {
    res.json(profiles);
  });
});

//  3. Load top posts
router.post('/getPostsContent', function(req, res){
   Post.find({ "userId" : req.body.id}).limit(4)
  .then((postsContent) => {
    res.json(postsContent);
  });
});


/* Client getRequest
 *   
 */


/* II. loginAndRegistration.html
 *   
 */


//tell the router how to handle a post request from the signin page
router.post('/signin', function(req, res, next) {
    console.log("Client Request Login");
    //tell passport to attempt to authenticate the login
    passport.authenticate('login', function(err, user, info) {
    //callback returns here
    if (err){
      //if error, say error
      res.json({isValid: false, message: 'internal error'});
    } else if (!user) {
      //if no user, say invalid login
      res.json({isValid: false, message: 'try again'});
    } else {
      //log this user in
      req.logIn(user, function(err){
        if (!err)
          //send a message to the client to say so
          res.json({isValid: true, message: 'welcome ' + user.email});
      });
    }
  })(req, res, next);
});


router.post('/register', registration.validate, (req, res, next) => {
  var response = {};
  
  if(!req.valid) {
    response.success = false;
    response.failures = req.failures;
    res.json(response);
  } else {
    passport.authenticate('signup', (err, user) => {
      if(!err && user) {
        console.log('User ' + user.userName + ' created');
        console.log(user);
        response.success = true;
        
      } else {
        console.log(user.userName + ' could not be created');
        response.success = false;
        response.failures.push({field: 'none', reason: 'Registration failed, try again later'});
      }
      

      res.json(response);
    })(req, res, next);
  }
});


 
/* III. ForgotPassword.html
 *    1. 
 */

/*---------------------------------------------------------------------------------------
 *Starts server
 */
server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function(){
  var addr = server.address();
  console.log("NodeJS server listening at", addr.address + ":" + addr.port);
});
