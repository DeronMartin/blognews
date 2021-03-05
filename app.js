const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const session = require("express-session")
const NewsAPI = require("newsapi");
const multer = require("multer");
const upload = multer();
const User = require("./models/user.model");

//Express App
const app = express();

//Connect to MongoDB
const dbURI = "mongodb+srv://dev:tester1234@blognews.ngiwo.mongodb.net/blognews?retryWrites=true&w=majority";
mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true})
    .then((result) => {
        console.log("Connected to DB!");
        app.listen(3000);
    }) .catch ((err) => {
        console.log(err);
    });

//Set View Engine to EJS
app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({ extended: true }));

//app.use(upload.array()); 
app.use(express.static('public'));

app.use(cookieParser());

const newsapi = new NewsAPI("fd4339ddfb1748f9909cf7dc8a82f574");

var news;
newsapi.v2.everything({
    sources: 'bbc-news,the-verge',
    language: 'en',
    sortBy: 'relevancy',
    page: 1,
    pageSize: 10
  }).then(response => {
    //console.log(response);
    news = response;
  });

app.use(session({
    key: 'user_sid',
    secret: 'blognewssite',
    resave: false,
    saveUninitialized: false,
    cookie: {
        expires: 600000
    }
}));

app.use((req, res, next) => {
    if (req.cookies.user_sid && !req.session.user) {
        res.clearCookie('user_sid');        
    }
    next();
});

var sessionChecker = (req, res, next) => {
    if (req.session.user && req.cookies.user_sid) {
        res.redirect('/dashboard');
    } else {
        next();
    }    
};

//Routing
app.get('/', sessionChecker, (req, res) => {
    if (req.session.user && req.cookies.user_sid) {
        var sess = req.session.user;
        res.render("dashboard", { title: "Dashboard", sess });
    } else {
        res.redirect('/login');
    }
});

app.get("/signup", sessionChecker, (req, res) => {
    var sess = req.session.user;
    res.render("signup", { title: "Sign Up", sess });
});

app.get("/login", sessionChecker, (req, res) => {
    var sess = req.session.user;
    res.render("login", { title: "Login", sess });
});

app.post("/adduser", function(req, res){
    User.findOne({email: req.body.email})
        .then((result) => {
            if (result != null) {
                res.send("Duplicate found");
            } else {
                const user = new User({
                    name: req.body.name,
                    email: req.body.email,
                    password: req.body.password
                });
            user.save()
                .then(() => {
                    req.session.user = {name: req.body.name, email: req.body.email, password: req.body.password};
                    res.redirect("/dashboard");
                }) .catch((err) => {
                    console.log(err);
                    res.redirect("/signup");
                });
            }
        }) .catch((err) => {
            console.log(err);
        });
});

app.post("/loginauth", sessionChecker, (req, res) => {
    User.findOne({email: req.body.email})
        .then((result) => {
            if (result == null) {
                res.redirect("/login");
            } else {
                if (req.body.password == result.password) {
                    req.session.user = {name: result.name, email: result.email, password: result.password};
                    res.redirect("/dashboard")
                } else {
                    res.redirect("/login");
                }
            }
        }) .catch((err) => {
            console.log(err);
        })
});

app.get('/dashboard', (req, res) => {
    if (req.session.user && req.cookies.user_sid) {
        var sess = req.session.user;
        res.render("dashboard", { title: "Dashboard" , articles: news.articles, sess });
    } else {
        res.redirect('/login');
    }
});

app.get('/logout', (req, res) => {
    if (req.session.user && req.cookies.user_sid) {
        res.clearCookie('user_sid');
        res.redirect('/');
    } else {
        res.redirect('/login');
    }
});