const { ObjectId } = require('mongodb');
const  User = require('../models/userModel');
const bcrypt = require('bcrypt');
const products = require('../models/productModel')
const category = require('../models/categoryModel')

const OTP = require('../models/userOtpVerification');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

require('dotenv').config();


console.log('EMAIL_USER:', process.env.EMAIL_USER); 
console.log('EMAIL_PASS:', process.env.EMAIL_PASS  ? 'Loaded' : 'Not Loaded');


const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
  }
 
});


 //to generate OTP
const generateOTP = () => {
  const otp = crypto.randomBytes(3).toString('hex');
  const numericOTP = parseInt(otp, 16) % 1000000; // Ensures a 6-digit number
  return numericOTP.toString().padStart(6, '0'); // Pads with leading zeros if necessary
};



// send OTP email
const sendOTP = (email, otp) => {

  const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your OTP Code',
      text: `Your OTP code is ${otp}`
      
  };
  

  transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
          return console.log('error sending Otp',error);
      }
      console.log('Email sent: ' + info.response);
  });
};

//secure password HASHING
const securePassword = async (password) => {
  try {
      const passwordHash = await bcrypt.hash(password, 10);
      return passwordHash;
  } catch (error) {
      console.log(error.message);
  }
};

const homewithoutLogin = async (req,res)=>{
  try {
    const productData = await products.find({})
    console.log(productData);
    res.render('users/homePage', {product:productData})
  } catch (error) {
    console.error(error)
    
  }
}

const loadHome = async(req,res)=>{
  try{
 const userid= req.session.user_id
 const productData = await products.find()
 console.log(productData,"in server pro");
 const userData = await User.findById(userid)


 if(userData){
 res.render('users/homePage',{user:userData,product:productData});
 }
  } 
  catch(error){
 console.log(error.messge);
  }
 }




//Registration
const loadRegister = async(req,res )=>{
try{
    res.render('./users/registration')
} catch(error){
    console.log(error.message);
}
}

const insertUser = async(req,res)=>{
    try{ 
      const { email, name, mobile, password } = req.body;

      const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.render('./users/registration', { message: 'Email already exists.' });
        }

          const passwordHash = await securePassword(password);

          const user = new User({
             name,
             email,
             mobile,
              password: passwordHash,
              is_admin:0,
              
          }); 

          const userData = await user.save();
         
          if(userData){

            //Generate and save Otp
            const otp = generateOTP();
            const otpExpires = Date.now() + 5 * 60 * 1000; // OTP expires in 5 minutes
            console.log("this is the otp ",otp);
            
            const newOTP = new OTP({
                userId: userData._id,
                otp,
                otpExpires
            });

            await newOTP.save();

            // Send OTP via email
            sendOTP(req.body.email, otp);

              res.render('./users/verify-otp',{email : req.body.email, message:'OTP Send to your email'});
          }
          else{
            res.render('./users/registration',{message:"your registration has been failed"});

          }
 
    }
    catch(error){
        console.log(error.message);
    }
}
///-------------login User methods started----------///

const loginLoad = async(req,res)=>{
  try {

    res.render('users/login');

  } catch(error){
    console.log(error.message);
  }
}


const verifyLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const userData = await User.findOne({ email });
        console.log("User Data: ", userData);
       

        if (userData) {
            const passwordMatch = await bcrypt.compare(password, userData.password);
            if(userData.is_Active==false)
              {
                res.render('users/login', { message: "Your account is blocked." });
              }
            else if (passwordMatch) {
                console.log("Password matches");
                req.session.user_id = userData._id;
                req.session.userData = userData; 
                res.redirect('/home');
            } else {
                res.render('users/login', { message: "Your password is wrong." });
            }
            
        } else {
            res.render('users/login', { message: "Email and password is incorrect" });
        }
    } catch (error) {
        console.log(error.message);
    }
};


const userLogout = async(req,res)=>{
try {
     delete req.session.user_id;
     delete req.session.userData; 
     res.redirect('/login');

}
catch(error){
  console.log(error.message);

}
}

// New OTP verification methods
const loadVerifyOTP = async (req, res) => {
  try {
      res.render('users/verify-otp', { email: req.query.email });
  } catch (error) {
      console.log(error.message);
  }
};

const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;

  try {
    let user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let otpData = await OTP.findOne({ userId: user._id, otp, otpExpires: { $gt: Date.now() } });

    if (otpData) {
      res.render('users/login');
    } else {
      return res.json({ success: false, message: 'Invalid OTP or OTP expired' });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};


const resendOTP = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({message:"user not found"})
    }

    // Generate a new OTP
    const otp = generateOTP();
    const otpExpires = Date.now() + 5 * 60 * 1000; // Expires in 5 minutes

    // Update or create the OTP record
    await OTP.findOneAndUpdate(
      { userId: user._id },
      { otp, otpExpires },
      { upsert: true, new: true }
    );
    // Send the OTP
    sendOTP(email, otp);

    res.json( { email, message: "OTP has been resent." });
  } catch (error) {
    console.error(error);
    res.status(500).json( { message: 'Server error', email });
  }
};


  
  











// New functions for forgot password and reset password
const loadForgotPassword = async (req, res) => {
  try {
    res.render('users/forgot-password');
  } catch (error) {
    console.log(error.message);
  }
};

const postForgotPassword=async(req,res)=>{
  try {


      const verifyEmail= await User.findOne({email:req.body.email})
      
      if(verifyEmail){

          req.session.email=req.body.email
         res.redirect("/newOtp")

      }else{

        res.render("users/forgot-password", { message: "User not Found" });
      }
      
  } catch (error) {
      console.log(error.message)
      
  }
}
const newOtp= async(req,res)=>{
  try {
    const userData=await User.findOne({email:req.session.email})

    
    // =================   OTP  generation  =========================//

    var randomotp = Math.floor(1000 + Math.random() * 9000).toString();
  
    req.session.passwordOtp=randomotp
   
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: req.session.email,
        subject: `Hello ${userData.name}`,
        text: `Your verification OTP is ${randomotp}`
        
        
     };
     console.log(randomotp)

     transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log('Error sending email: ' + error);
        } else {
            console.log('Email sent: ' + info.response);
        }
     });
     res.render("users/resetOtp",{randomotp})

    
} catch (error) {
    console.log(error.message)
    
}
}

const verifyNewOtp = async (req, res) => {
  try {
    let userOtp = req.body.newOtp;
    if (userOtp === req.session.passwordOtp) {
      return res.render('users/newPassword', { email: req.session.email });
    } else {
      res.render('users/resetOtp', { message: "Invalid OTP" });
    }
  } catch (error) {
    console.log(error.message);
  }
};


const verifyPassword = async(req,res)=>{
  try{
    if (req.body.newPassword === req.body.confirmPassword) {
      const newpass = req.body.newPassword;
      const userData = await User.findOne({ email: req.session.email });
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(newpass, saltRounds);

      userData.password = hashedPassword;
      await userData.save();
     if(userData){
      res.redirect('/login');
     }
    }
     else {
      return res.render('users/resetPassword', { message: 'Passwords do not match' });
    
  }
}catch(error){
    console.error(error)
  }
}










const loadshopPage = async (req, res) => {
  try {
    const productData = await products.find({})
    const categories= await category.find({})
    console.log(productData);
    res.render('users/productShop', {product:productData, category:categories})
  } catch (error) {
    console.error('Error loading shop page:', error);
    res.status(500).send('Internal Server Error');
  }
};

const productdetailPage = async(req,res)=>{
  try{
    const id= req.query.id
    console.log(id,"yjuyjuy req ");
      const userId= req.session.userId
      const loginData= await User.findById(userId)

     const productData = await products.findById(id)
console.log(productData);
   if(productData){
    res.render('users/productDetail',{product:productData,loginData})
   }
  }catch(error){
    console.error(error)
  }
}
      

      
   






module.exports = {
      loadHome,
    loadRegister,
    loginLoad,
    verifyLogin,
    insertUser,
    // userData,

    loadVerifyOTP,
    verifyOTP,
    resendOTP,

    loadForgotPassword,
    postForgotPassword,
    newOtp,
    verifyNewOtp,
    verifyPassword,
    

    userLogout,
    homewithoutLogin,
   loadshopPage,
   productdetailPage,


}