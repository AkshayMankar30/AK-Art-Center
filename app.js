require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const request = require("request");
const https = require("https");
const {
    url
} = require("inspector");
const multer = require('multer');
// const upload = multer({ dest: 'uploads/' });
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

var fs = require('fs');
var path = require('path');

var storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads')
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now())
    }
});

var upload = multer({
    storage: storage,
});

//////////////////////// express as a APP declaration ////////////
const app = express();

app.use(bodyParser.urlencoded({
    extended: true
}));
app.set("view engine", 'ejs');
app.use(express.static("public"));

app.use(session({
    secret: "This is my art secret",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

//database connection
const DB_Url = "mongodb+srv://admin-akshay:" + process.env.DB_PASSWORD + "@cluster0.dtuth.mongodb.net/AKartCenter"
mongoose.connect(DB_Url, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

/////////////////////////////////////// Schema declaration section///////////////////////////////////////
//Post Schema
const postSchema = new mongoose.Schema({
    artistName: String,
    img: {
        data: Buffer,
        contentType: String
    },
    description: String
});

//User login schema
const userSchema = new mongoose.Schema({
    username: String,
    email: String,
    password: Number,
    googleId: String
});


/////////////passport plugin/////////////////////////////////
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

////////////////////////model initialization section///////////////////////////////////////
// postSchema model
const Post = mongoose.model('Post', postSchema);

//userSchema model
const User = mongoose.model('User', userSchema);

///////////////////////////////////////configuring Strategy/////////////////////
/////////////local strategy////////////
passport.use(User.createStrategy());

//serialization
passport.serializeUser(function (user, done) {
    done(null, user.id);
});

passport.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
        done(err, user);
    });
});


///////////google strategy/////////
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/callback"
},
    function (accessToken, refreshToken, profile, cb) {
        User.findOrCreate({ googleId: profile.id }, function (err, user) {
            return cb(err, user);
        });
    }
));


//coding start
app.route("/")
    .get(function (req, res) {
        // res.sendFile(__dirname + "/gallery.html")

        Post.find(function (err, posts) {
            res.render("home", {
                postsEJS: posts
            });
            // console.log(posts);
        });
    })

    .post(function (req, res) {
        const userEmail = req.body.email;

        const data = {
            members: [{
                email_address: userEmail,
                status: "subscribed",
            }]
        };

        const jsonData = JSON.stringify(data);
        const url = "https://us1.api.mailchimp.com/3.0/lists/" + process.env.LIST_ID;
        const options = {
            method: "POST",
            auth: "akshay:" + process.env.API_KEY
        }
        const request = https.request(url, options, function (response) {

            if (response.statusCode == 200) {

                response.on("data", function (data) {
                    // console.log(JSON.parse(data));
                    const resData = JSON.parse(data);
                    if (resData.error_count != 0) {
                        const errorDetail = resData.errors[0].error_code;
                        if (errorDetail === "ERROR_CONTACT_EXISTS") {
                            res.sendFile(__dirname + "/public/Already-Exist.html");
                        } else if (errorDetail === "ERROR_GENERIC") {
                            res.render('error', { errorEJS: resData.errors[0].error });
                        }
                    } else {
                        res.sendFile(__dirname + "/public/success.html");
                    }
                })
            } else {
                console.log(response.statusCode);
                res.sendFile(__dirname + "/public/failure.html");
            }
        })
        request.write(jsonData);
        request.end();
    });

/////////////////////////////// google authentication routes //////////////////////
app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile'] }));

app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    function (req, res) {
        // Successful authentication, redirect home.
        res.redirect('/compose');
    });



app.route("/compose")
    .get(function (req, res) {
        if (req.isAuthenticated()) {
            res.render('compose', {
                testEJS: "EJS is working"
            });
        } else {
            res.redirect('/login');
        }
    })
    .post(upload.single('image'), function (req, res, next) {
        const data = req.body;
        const post = new Post({
            artistName: data.artistName,
            img: {
                data: fs.readFileSync(path.join(__dirname + '/uploads/' + req.file.filename)),
                contentType: req.file.mimetype
            },
            description: data.description
        });
        // posts.push(post);
        post.save(function (err) {
            if (err) {
                console.log(err);
            } else {
                res.redirect("/");
            }
        });
    });

app.route("/login")
    .get(function (req, res) {
        res.sendFile(__dirname + '/public/login.html');
    })

    .post(function (req, res) {
        // console.log(req.body);
    });

app.post('/signUp', function (req, res) {
    User.register({
        username: req.body.username,
        email: req.body.email
    }, req.body.password, function (err, user) {
        if (err) {
            console.log(err);
        } else {
            passport.authenticate('local')(req, res, function () {
                res.redirect('/');
            });
        }
    });
});

app.route('/gallery')
    .get((req, res) => {
        res.render('gallery');
    });

app.post('/failure', (req, res) => res.redirect('/'));

app.listen(process.env.PORT || 3000, function () {
    console.log("Server is running on port 3000");
})



