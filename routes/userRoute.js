 const express = require("express");
 const user_route = express()
 const session = require ("express-session");
//  const multer = require('multer')
 const path = require("path");
 const auth = require("../middleware/auth")
 const bodyParser = require ('body-parser');
 const userController = require('../controllers/userController');
 const categoryController= require('../controllers/categoryController');
 const cartController = require('../controllers/cartController');
 

 const config = require("../config/config");
const { markAsUntransferable } = require("worker_threads");


user_route.use(bodyParser.json()); 
user_route.use(bodyParser.urlencoded({extended:true})); 
 
 

//   user_route.set('view engine','ejs');
//  user_route.set('views','./views/users');

// user_route.set('views', path.join(__dirname, '../views/admin'));

 // static files middleware
user_route.use(express.static('public'));


//    const storage = multer.diskStorage({
//     destination:function(req,file,cb){
//        cb(null,path.join(__dirname,'../public/userImages'));
//     },
//     filename:function(req,file,cb){
//         const name = Date.now()+'-'+file.originalname;
//          cb(null,name);
//     }
     
//    })

// const upload = multer({storage:storage});


user_route.get('/',userController.homewithoutLogin)


user_route.get('/register',auth.isLogout,userController.loadRegister); 
 user_route.post('/register',userController.insertUser);

user_route.get('/',auth.isLogout,userController.loginLoad);
user_route.get('/login',auth.isLogout,userController.loginLoad);
user_route.post('/login',userController.verifyLogin);
user_route.get('/home',auth.isBlocked,userController.loadHome);
user_route.get('/logout',auth.isLogin,userController.userLogout);


user_route.get('/userProfile',auth.isLogin,auth.isBlocked,userController.userProfile)



// New routes for OTP verification
user_route.get('/otp', userController.loadVerifyOTP); // Render OTP verification page
user_route.post('/verify-otp', userController.verifyOTP);  

//resned OTP again athinulla route..// 
user_route.post('/resend-otp', userController.resendOTP);



// Forgot Password routes
user_route.get('/forgot-password',auth.isLogout, userController.loadForgotPassword);
user_route.post('/forgot-password',auth.isLogout, userController.postForgotPassword);
user_route.get('/newOtp',auth.isLogout,userController.newOtp);
user_route.post('/newOtp', auth.isLogout,userController.verifyNewOtp);
user_route.post('/newPassword',auth.isLogout,userController.verifyPassword)


//----------------------------category-----------//
user_route.get('/filterCategory',auth.isLogin,auth.isBlocked,categoryController.filterCategory)

user_route.get("/users/productShop",auth.isLogin,auth.isBlocked,userController.loadshopPage);
user_route.get('/productDetail',auth.isLogin,auth.isBlocked,userController.productdetailPage);



//---------------------cart------------//

user_route.get('/getCart',auth.isLogin,auth.isBlocked,cartController.getCart);
user_route.post('/addToCart',auth.isLogin,auth.isBlocked,cartController.addToCart);
user_route.post('/updatecart', cartController.updateCart);
user_route.post('/removeFromCart',auth.isLogin,auth.isBlocked,cartController.removeFromCart);



















 


module.exports = user_route;