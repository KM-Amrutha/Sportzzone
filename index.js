const express = require("express");
const app= express();
const path=require("path")
const session = require('express-session');
const nocache= require('nocache')
const bodyParser = require('body-parser')
const mongoose = require('mongoose');
const dotenv = require('dotenv')


//load environmental variables..
dotenv.config();

//import config file here
const config = require("./config/config");


//connnect to mongoDb
mongoose.connect('mongodb://127.0.0.1:27017/user_management__system',{
  // useNewUrlParser: true,
  // useUnifiedTopology: true
});




//view engine setup
app.set('view engine','ejs')
app.set('views', path.join(__dirname, 'views'));

//body parser middleware

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended:true}))


//nocache middleware
app.use(nocache())
app.use(express.static(path.join(__dirname, "public") ));

// Session setup
app.use(session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: true
}));


//for user routes------------------

const userRoute = require('./routes/userRoute');
app.use('/',userRoute);

//for admin routes------------------

const adminRoute = require('./routes/adminRoute');
app.use('/admin',adminRoute);


// errorcontroller.errorpage 

app.use("*", (req, res, next) => {
  
  res.status(404).render("users/404");
});

app.use((err,req,res,next)=>{
  console.log(err.stack)
  res.status(500).send("internal server error")
})

// app.use(express.static(path.join(__dirname,"public")))

// app.use('/upload',express.static(path.join('public/assets/images')))



// app.post('/registration',function(req,res){
//   res.render("registration")
// })

// app.post('/registration',function(req,res){
//   res.send(req.body)
// })
   const port=2002
   
  app.listen(port,function(){
    console.log(`http://localhost:${port}`);
  });

  