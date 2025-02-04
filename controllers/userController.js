const mongoose = require('mongoose'); 
const { ObjectId } = require('mongodb');
const  User = require('../models/userModel');
const Address= require('../models/addressModel');
const bcrypt = require('bcryptjs');
const products = require('../models/productModel')
const category = require('../models/categoryModel');
const Cart = require('../models/cartModel');
const Orders = require('../models/orderModel');
const Wishlist = require('../models/wishlistModel');
const Wallet = require('../models/walletModel');

const OTP = require('../models/userOtpVerification');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const { truncate } = require('fs/promises');

require('dotenv').config();



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
  const numericOTP = parseInt(otp, 16) % 1000000; 
  return numericOTP.toString().padStart(6, '0'); 
};


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

const homewithoutLogin = async (req, res) => {

try {
  let searchQuery = req.query.search || ""; 
  let page = parseInt(req.query.page) || 1; 
    let limit = 8; 
    let skip = (page - 1) * limit;
    let userData = req.session.user_id ||null;

  const productFilter = searchQuery
    ? {
        is_Active: true,
        $or: [
          { productName: { $regex: searchQuery, $options: 'i' } },
          { productDescription: { $regex: searchQuery, $options: 'i' } }
        ]
      }
    : { is_Active: true }; 

    const newArrival = await products
    .find({ is_Active: true })
    .sort({ date: -1 })
    .limit(5);

  
    const productData = await products.find(productFilter)
    .populate('productCategory')
    .sort({ _id: 1 })
    .skip((page-1) * limit)
    .limit(limit); 
  // console.log('the rpoducts are : ')
  //   for(let i=0;i<productData.length;i++){
  //     console.log(productData[i].productName)
  //   }

    const totalProducts = await products.countDocuments(productFilter);
    const totalPages = Math.ceil(totalProducts / limit); 

    const categories = await category.find({ is_Active: true });
    const noProductsFound = productData.length === 0;

//     console.log('Current Page:', page);
// console.log('Total Pages:', totalPages);
// console.log('Products on this page:', productData.length);

    res.render('users/homePage', {
      user:userData ||null,
      product: productData,
      newArrivals:newArrival,
      category: categories,
      noProductsFound,
      currentPage: page,
      totalPages,
      searchQuery
    });

} catch (error) {
  console.error(error);
  res.status(500).send('Internal Server Error');
}  

};


const loadHome = async (req, res) => {
  try {
    const userid = req.session.user_id;
    let searchQuery = req.query.search || ""; 
    let page = parseInt(req.query.page) || 1; 
    let limit = 8; 
    let skip = (page - 1) * limit;

    const productFilter = searchQuery
      ? {
          is_Active: true,
          $or: [
            { productName: { $regex: searchQuery, $options: 'i' } },
            { productDescription: { $regex: searchQuery, $options: 'i' } }
          ]
        }
      : { is_Active: true }; 


    const productData = await products.find(productFilter)
      .populate('productCategory')
      .sort({ _id: 1 })
      .skip(skip)
      .limit(limit); 

      const newArrival = await products
      .find({ is_Active: true })
      .sort({ date: -1 })
      .limit(5);

    const totalProducts = await products.countDocuments(productFilter);
    const totalPages = Math.ceil(totalProducts / limit); 

    const userData = await User.findById(userid);
    console.log(userData);
    const categories = await category.find({ is_Active: true });

    const noProductsFound = productData.length === 0;

    if (userData || !userid) {
      res.render('users/homePage', {
        user: userData ||null,
        category: categories,
        product: productData,
        newArrivals:newArrival,
        noProductsFound,
        currentPage: page,
        totalPages, 
        searchQuery 
      });
    } 
  } catch (error) {
    console.log(error.message);
    res.status(500).send('Internal Server Error');
  }
};



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
        if (existingUser.is_Verified) {
          return res.render('./users/registration', { message: 'Email already exists.' });
        } else {
          
          const otp = generateOTP();
          const otpExpires = Date.now() + 5 * 60 * 1000;
  
          await OTP.findOneAndUpdate(
            { userId: existingUser._id },
            { otp, otpExpires },
            { upsert: true }
          );
  
          sendOTP(email, otp);
  
          return res.render('./users/verify-otp', {
            email,
            message: 'OTP re-sent. Please verify your email.'
          });
        }
      }

          const passwordHash = await securePassword(password);

          const newUser = new User({
             name,
             email,
             mobile,
              password: passwordHash,
              is_admin:0,
              is_Verified: false,
              
          }); 

          const userData = await newUser.save();
         
          if(userData){

            //Generate and save Otp
            const otp = generateOTP();
            const otpExpires = Date.now() + 5 * 60 * 1000; 
            console.log("this is the otp ",otp);
            
            const newOTP = new OTP({
                userId: userData._id,
                otp,
                otpExpires
            });

            await newOTP.save();
            sendOTP(req.body.email, otp);

              res.render('./users/verify-otp',{
                email : req.body.email, 
                message:'OTP Send to your email'});
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

const loadLogin = async (req, res) => {
  try {
    const message = req.query.message || '';  
    res.render('users/login', { message });
  } catch (error) {
    console.log(error.message);
  }
};

const verifyLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const userData = await User.findOne({ email });

    if (userData) {
      const passwordMatch = await bcrypt.compare(password, userData.password);
      
      if (userData.is_Active === false) {
        res.render('users/login', { message: "Your account is blocked." });
      } else if (!userData.is_Verified) {
        res.render('users/login', { message: "Please verify your email before logging in." });
      } else if (passwordMatch) {
        req.session.user_id = userData._id;
        req.session.userData = userData;

        console.log(userData.name);
        
        // Pagination and search logic
        let searchQuery = req.query.search || ""; 
        let page = parseInt(req.query.page) || 1; 
        let limit = 8; 
        let skip = (page - 1) * limit;

        const productFilter = searchQuery
          ? {
              is_Active: true,
              $or: [
                { productName: { $regex: searchQuery, $options: 'i' } },
                { productDescription: { $regex: searchQuery, $options: 'i' } }
              ]
            }
          : { is_Active: true }; 

        const productData = await products.find(productFilter)
          .populate('productCategory')
          .sort({ date: -1 })
          .skip(skip)
          .limit(limit);

        const totalProducts = await products.countDocuments(productFilter); // Total products count
        const totalPages = Math.ceil(totalProducts / limit); // Calculate total pages

        const categories = await category.find({ is_Active: true });

        const noProductsFound = productData.length === 0;

        const newArrival = await products
    .find({ is_Active: true })
    .sort({ date: -1 })
    .limit(5);
        

        
        res.render('users/homePage', {
          user: userData,
          product: productData,
          category: categories,
          newArrivals:newArrival,
          noProductsFound,
          currentPage: page,
          totalPages, 
          searchQuery  
        });

      } else {
        res.render('users/login', { message: "Your password is wrong." });
      }
    } else {
      res.render('users/login', { message: "Email and password are incorrect." });
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).send('Internal Server Error');
  }
};



const userLogout = async(req,res)=>{
try {
     delete req.session.user_id;
     delete req.session.userData; 
     res.redirect('/loadLogin');

}
catch(error){
  console.log(error.message);

}
}

// New OTP verification methods
const loadVerifyOTP = async (req, res) => {
  let message = req.query.message ||'';
  try {
      res.render('users/verify-otp', { 
        email: req.query.email,
      message:message });

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
      user.is_Verified = true;
      await user.save();

      return res.json({ success: true, message: 'OTP verified successfully. You can now log in.' });
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

    const otp = generateOTP();
    const otpExpires = Date.now() + 5 * 60 * 1000; 

    await OTP.findOneAndUpdate(
      { userId: user._id },
      { otp, otpExpires },
      { upsert: true, new: true }
    );
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
      return res.render('users/newPassword',
         { email: req.session.email });
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
      res.redirect('/loadLogin');
     }
    }
     else {
      return res.render('users/resetPassword', { message: 'Passwords do not match' });
    
  }
}catch(error){
    console.error(error)
  }
};



const loadshopPage = async (req, res) => {
  try {

    let searchQuery = req.query.search || "";
    let page = parseInt(req.query.page) || 1; 
    const limit = 8; 

    const userId=req.session.user_id ||null;
const userData=await User.findById(userId)
// console.log('userdata from shop page:', userData)

const productFilter = searchQuery
    ? {
        is_Active: true,
        $or: [
          { productName: { $regex: searchQuery, $options: 'i' } },
          { productDescription: { $regex: searchQuery, $options: 'i' } }
        ]
      }
    : { is_Active: true }; 

    const productData = await products.find(productFilter)
    .populate('productCategory')
      .skip((page - 1) * limit)
      .limit(limit);
      console.log(productData.length);

      // for(let i=0;i<productData.length;i++){
      //   console.log(productData[i].productName)
      // }

      const totalProducts = await products.countDocuments(productFilter);
      const totalPages = Math.ceil(totalProducts / limit);

    const categories = await category.find({is_Active: true});
    const noProductsFound = productData.length === 0;
 
    

    res.render('users/productShop', {
      user: userData || null,
      product: productData,
      category: categories,
      noProductsFound,
      totalPages,
      currentPage: page,
      searchQuery
    });
  } catch (error) {
    console.error('Error loading shop page:', error);
    res.status(500).send('Internal Server Error');
  }
};



const productdetailPage = async(req,res)=>{
  try{
    
    const id = req.query.id; 
      const userId= req.session.user_id
      const userData= await User.findById(userId);
      console.log('userdata in productdetailpage:', userData)
      const categories = await category.find({is_Active: true});

      const productData = await products.findOne({ _id: id, is_Active: true })
      .populate('productCategory');     


   if(productData){
    res.render('users/productDetail',
      {product:productData,
      user:userData,
      category:categories
    })
   }
  }catch(error){
    console.error(error)
  }
}


const userProfile = async (req, res) => {

  try {
    const userId = req.session.user_id;
    const userData = await User.findById(userId);
    const addressData = await Address.find({ userId });
    const cartData = await Cart.findOne({ userId });
    const cartLength = cartData ? cartData.product.length : 0;

    const page = parseInt(req.query.page) || 1; 
    const limit = 8; 
    const skip = (page - 1) * limit;
    const totalOrders = await Orders.countDocuments({ userId });
    const totalPages = Math.ceil(totalOrders / limit);



    const orders = await Orders.find({ userId })
    .populate('product.productId')
    .sort({ orderDate: -1 })
    .skip(skip)
    .limit(limit);


    let wallet = await Wallet.findOne({ userId });

    if (!wallet) {
        wallet = new Wallet({ userId, balance: 0 ,currency:"INR"});
        await wallet.save();
    }

    if (req.xhr) {
      // If AJAX request, send only orders data
      return res.json({ orders, currentPage: page, totalPages });
    }

    res.render('users/userProfile', {
      user: userData,
      wallet,
      addresses: addressData,
      cart: cartLength,
      order : orders,
      currentPage: page,
      totalPages: totalPages
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
};



const allCategory = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const categories = await category.find();
    let loginData = null; 
    if (userId) {
      loginData = await User.findById(userId); 
    }

    
    let page = parseInt(req.query.page) || 1; 
    let limit = 8; 
    let skip = (page - 1) * limit; 

    
    const totalProducts = await products.countDocuments({ is_Active: true });

    const product = await products.find({ is_Active: true })
      .populate("productCategory")
      .skip(skip)
      .limit(limit)
      .exec();

    const totalPages = Math.ceil(totalProducts / limit); 

    const newArrival = await products
    .find({ is_Active: true })
    .sort({ date: -1 })
    .limit(5);

    res.render("users/homePage", {
      loginData,
      product,
      category: categories,
      currentPage: page,
      totalPages, 
      newArrivals:newArrival
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).send('Server Error');
  }
};


const filterbyCategory = async (req, res) => {
  try {
    const categoryId = req.query.categoryId;
    const searchQuery = req.query.search || ""; // Get search query
    const userId = req.session.user_id;
    const categories = await category.find();
    let loginData = null;

    if (userId) {
      loginData = await User.findById(userId);
    }

    if (!categoryId) {
      return res.status(400).json({ error: "Category ID is required" });
    }

    let page = parseInt(req.query.page) || 1;
    let limit = 8;
    let skip = (page - 1) * limit;

    // Initialize the filter object
    let filter = { 
      is_Active: true,  
      productCategory: categoryId 
    };

    if (searchQuery) {
      filter.$or = [
        { productName: { $regex: searchQuery, $options: "i" } },
        { productDescription: { $regex: searchQuery, $options: "i" } }
      ];
    }

    const totalProducts = await products.countDocuments(filter);
    const product = await products.find(filter)
      .populate("productCategory")
      .skip(skip)
      .limit(limit)
      .exec();

    const newArrival = await products
      .find({ is_Active: true })
      .sort({ date: -1 })
      .limit(5);

    const totalPages = Math.ceil(totalProducts / limit);

    // Explicitly pass a "noProducts" flag if no products are found
    res.render("users/homePage", {
        user: loginData,
      product,
      newArrivals: newArrival,
      category: categories,
      currentPage: page,
      totalPages,
      noProducts: product.length === 0,  
      selectedCategory: categoryId,     
      searchQuery                         
    });

  } catch (error) {
    console.log(error.message);
    res.status(500).send("Server Error");
  }
};


const addAddress = async (req, res) => {
  try {
    const userId = req.session.user_id;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID not found in session' });
    }

    const { name, mobile, houseName, city, state, pincode } = req.body;

    if (!name || !mobile || !houseName || !city || !state || !pincode) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    if (!/^[a-zA-Z\s]+$/.test(name)) {
      return res.status(400).json({ success: false, message: 'Name should not contain numbers or special characters' });
    }

    if (!/^\d{10}$/.test(mobile)) {
      return res.status(400).json({ success: false, message: 'Mobile number must be exactly 10 digits' });
    }

    if (!/^[a-zA-Z\s]+$/.test(state) || !/^[a-zA-Z\s]+$/.test(city)) {
      return res.status(400).json({ success: false, message: 'State and City should not contain numbers' });
    }

    if (!/^\d{6}$/.test(pincode)) {
      return res.status(400).json({ success: false, message: 'Pin code must be exactly 6 digits' });
    }

    const address = new Address({
      userId,
      name,
      mobile,
      houseName,
      city,
      state,
      pincode,
    });

    await address.save();
    
    res.json({ success: true, message: "Address saved successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to save the address." });
  }
};

   



const loadEditAddress = async (req, res) => {
  try {

    const userId=req.session.user_id;
    const userData=await User.findById(userId)

      const addressId = req.query.id; 
      const address = await Address.findById(addressId); 
      
      if (address) {
          res.render('users/editAddress', {
            user:userData,
             addresses: address });
      } else {
          res.status(404).send('Address not found');
      }
  } catch (error) {
      res.status(500).send('Server Error');
  }
};




const updateAddress = async (req, res) => {
  try {
      const { name, mobile, houseName, city, state, pincode } = req.body;
      const userId = req.session.user_id;
      const updated = await Address.findByIdAndUpdate({ _id: req.query.id }, { $set: { name, mobile, houseName, city, state, pincode } });
      await updated.save();
      res.redirect('/userProfile');
  } catch (error) {
      console.error(error);
  }
};




const removeAddress = async (req, res) => {
  try {
      const { addressId } = req.body;
      const deletedAddress = await Address.findOneAndDelete({ _id: addressId });
      res.status(200).json({ message: 'Address removed successfully' });
  } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' }); 
  }
};

const loadAddAddress = async (req, res) => {
  try {
      res.render('addAddress');
  } catch (error) {
      console.error(error);
  }
};

const changePassword = async (req, res) => {
  try {
      const userId = req.session.user_id;
      const { currentPwd, newPwd, confirmPwd } = req.body;

      if (!userId) {
          return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      if (!currentPwd || !newPwd || !confirmPwd) {
          console.log('Missing fields:', { currentPwd, newPwd, confirmPwd }); // Log missing fields
          return res.status(400).json({ success: false, message: 'All password fields are required.' });
      }

      if (newPwd !== confirmPwd) {
          return res.status(400).json({ success: false, message: 'New password and confirm password do not match.' });
      }

      const user = await User.findById(userId);

      if (!user) {
          return res.status(404).json({ success: false, message: 'User not found' });
      }

      const isMatch = await bcrypt.compare(currentPwd, user.password);
      if (!isMatch) {
          return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
      }

      const hashedNewPassword = await bcrypt.hash(newPwd, 10);
      user.password = hashedNewPassword;
      await user.save();

      res.json({ success: true, message: 'Password changed successfully.' });
  } catch (error) {
      console.error('Error changing password:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};



const updateUserProfile = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const { name, email, mobile } = req.body;

    if (!userId) {
      return res.status(401).send('Unauthorized');
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).send('User not found');
    }
    user.name = name;
    user.email = email;
    user.mobile = mobile;

    await user.save();

    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).send('Internal Server Error');
  }
};


const sortProducts = async (req, res) => {
  try {
  
    const searchQuery = req.query.search || '';
    const categoryId = req.query.categoryId || ''; 
    const sortType = req.query.sort || 'lowtoHigh'; 
    const categories = await category.find();

    const userId = req.session.user_id;
    let loginData = null;
    if (userId) {
      loginData = await User.findById(userId);
    }
console.log('login data is: ', loginData);
    let page = parseInt(req.query.page) || 1;
    const limit = 8;

  
    let filter = { is_Active: true };

    if (searchQuery) {
      filter.$or = [
        { productName: { $regex: searchQuery, $options: "i" } },
        { productDescription: { $regex: searchQuery, $options: "i" } }
      ];
    }

    if (categoryId) {
      filter.productCategory = categoryId;  
    }
    let productData = await products.find(filter).populate('productCategory');

    productData.forEach(product => {
      if (product.productCategory && product.productCategory.OfferisActive) {
        product.effectivePrice = product.offerPrice;
      } else {
        product.effectivePrice = product.productPrice;
      }
    });

    switch (sortType) {
      case 'lowtoHigh':
        productData.sort((a, b) => a.effectivePrice - b.effectivePrice);
        break;
      case 'hightoLow':
        productData.sort((a, b) => b.effectivePrice - a.effectivePrice);
        break;
      case 'AtoZ':
        productData.sort((a, b) => a.productName.localeCompare(b.productName));
        break;
      case 'ZtoA':
        productData.sort((a, b) => b.productName.localeCompare(a.productName));
        break;
      default:
        break;
    }

    // Pagination logic
    const totalPages = Math.ceil(productData.length / limit);
    const paginatedProducts = productData.slice((page - 1) * limit, page * limit);

    const newArrival = await products
      .find({ is_Active: true })
      .sort({ date: -1 })
      .limit(5);

    // Render the view with sorted and filtered products
    res.render('users/homePage', {
      product: paginatedProducts,
      user:loginData || null,
      newArrivals: newArrival,
      category: categories,
      totalPages,
      currentPage: page,
      searchQuery,
      selectedCategory: categoryId,  // Pass the selected category ID
      sortType
    });

  } catch (error) {
    console.error('Error in sorting:', error);
    res.status(500).send('Internal Server Error');
  }
};


const sortShop = async (req, res) => {
  try {
  
    const searchQuery = req.query.search || '';
    const categoryId = req.query.categoryId || ''; 
    const sortType = req.query.sort || 'lowtoHigh'; 
    const categories = await category.find();

    const userId = req.session.user_id;
    let loginData = null;
    if (userId) {
      loginData = await User.findById(userId);
    }
console.log('login data is: ', loginData);
    let page = parseInt(req.query.page) || 1;
    const limit = 8;

  
    let filter = { is_Active: true };

    if (searchQuery) {
      filter.$or = [
        { productName: { $regex: searchQuery, $options: "i" } },
        { productDescription: { $regex: searchQuery, $options: "i" } }
      ];
    }

    if (categoryId) {
      filter.productCategory = categoryId;  
    }
    let productData = await products.find(filter).populate('productCategory');

    productData.forEach(product => {
      if (product.productCategory && product.productCategory.OfferisActive) {
        product.effectivePrice = product.offerPrice;
      } else {
        product.effectivePrice = product.productPrice;
      }
    });

    switch (sortType) {
      case 'lowtoHigh':
        productData.sort((a, b) => a.effectivePrice - b.effectivePrice);
        break;
      case 'hightoLow':
        productData.sort((a, b) => b.effectivePrice - a.effectivePrice);
        break;
      case 'AtoZ':
        productData.sort((a, b) => a.productName.localeCompare(b.productName));
        break;
      case 'ZtoA':
        productData.sort((a, b) => b.productName.localeCompare(a.productName));
        break;
      default:
        break;
    }

    // Pagination logic
    const totalPages = Math.ceil(productData.length / limit);
    const paginatedProducts = productData.slice((page - 1) * limit, page * limit);

  

    // Render the view with sorted and filtered products
    res.render('users/productShop', {
      product: paginatedProducts,
      user:loginData || null,
      category: categories,
      totalPages,
      currentPage: page,
      searchQuery,
      selectedCategory: categoryId,  // Pass the selected category ID
      sortType
    });

  } catch (error) {
    console.error('Error in sorting:', error);
    res.status(500).send('Internal Server Error');
  }
};



const loadWishlist = async (req, res) => {
  try {
      const userId = req.session.user_id;
      if (!userId) {
        console.log("ththtg");
        
          return res.redirect('/loadLogin');
      }

      const userData = await User.findById(userId);
      const wishlist = await Wishlist.findOne({ userId })
          .populate('product.productId', 'images productName productPrice offerPrice countStock');

      const wishlistLength = wishlist ? wishlist.product.length : 0;


      res.render("users/wishlist", { 
          wishlist, 
          user: userData, 
          wishlistLength 
      });
  } catch (error) {
      console.error('Error loading wishlist:', error.message);
      res.status(500).send('Internal Server Error');
  }
};



const addtoWishlist = async (req, res) => {
  try {
      const userId = req.session.user_id;
      const productId = req.body.productId;

      if (!productId) {
          return res.status(400).json({ error: 'ProductId is required' });
      }
      let wishlist = await Wishlist.findOne({ userId: userId });

      if (!wishlist) {
          wishlist = new Wishlist({
              userId: userId,
              product: [{ productId: productId, quantity: 1 }]
          });
          await wishlist.save();
          return res.json({ success: true, message: 'Product added to wishlist' });
      } else {
          let productExists = false;
          for (let i = 0; i < wishlist.product.length; i++) {
              if (wishlist.product[i].productId.toString() === productId) {
                  productExists = true;
                  break;
              }
          }
          if (productExists) {
              return res.json({ success: false, message: 'Product is already in wishlist' });
          }

          wishlist.product.push({ productId: productId, quantity: 1 });
          await wishlist.save();
          return res.json({ success: true, message: 'Product added to wishlist' });
      }

  } catch (error) {
      console.error(error.message);
      res.status(500).json({ error: 'Server error' });
  }
};

const removeWishlist = async(req, res) => {
  try {
      const productId = req.body.id; 
      const userId = req.session.user_id;

      let wishlist = await Wishlist.findOne({ userId });
      if (!wishlist) {
          console.log("Wishlist not found");
          return res.status(404).json({ success: false, message: 'Wishlist not found' }); 
      }

      const productIndex = wishlist.product.findIndex(item => item.productId.toString() === productId);
      if (productIndex !== -1) {
          wishlist.product.splice(productIndex, 1);
          await wishlist.save();
          return res.status(200).json({ success: true, message: 'Product removed from the wishlist' }); 
      } else {
          return res.status(404).json({ success: false, message: 'Product not found in the wishlist' });
      }
  } catch (error) {
      console.error(error.message);
      return res.status(500).json({ success: false, message: 'An error occurred' });
  }
};

const aboutUs = async (req,res)=>{
  try{
      const userId = req.session.user_id;
      const userData = await User.findById(userId);
      if(userData){
        res.render('users/aboutUs',{
          user:userData
        });
      } else {
        res.render('users/login')
      }
   } catch(error){
    console.error(error.message);
   }
}


// const googleAuth = async(req,res)=>{
//   try{ 
//     const googleUser = req.user;
//     console.log("Google User Profile:", googleUser);

//     const email = googleUser.emails[0].value;
//     const user = await User.findOne({ email });

//     console.log("Email:", email);
// console.log("User Found in DB:", user);

//     if (!user) {
//         return res.redirect('/register');
//     }
//     req.session.user = user;
//     res.redirect('/home');

//   } catch(error){
//     console.error('Error during Google authentication:', error.message);
//     res.status(500).send('Internal Server Error');
//   }
// }

const googleAuth = async (req, res) => {
  try {
      const googleUser = req.user;
      console.log("Google User Profile:", googleUser);

      const email = googleUser.emails[0].value;
      let user = await User.findOne({ email });

      console.log("Email:", email);
      console.log("User Found in DB:", user);

      if (!user) {
          // Optionally create the user if they don't exist
          console.log("User not found, creating a new user.");
          user = new User({
              name: googleUser.displayName,
              email: email,
              googleId: googleUser.id,
              is_Active: true,
          });
          await user.save();
      }

      req.session.user_id = user._id;
      console.log("Session User Set:", req.session.user);
      return res.status(200).redirect('/home');
  } catch (error) {
      console.error('Error during Google authentication:', error.message);
      res.status(500).send('Internal Server Error');
  }
};

module.exports = {
      loadHome,
    loadRegister,
    loadLogin,
    verifyLogin,
    insertUser,
    

    loadVerifyOTP,
    verifyOTP,
    resendOTP,

    loadForgotPassword,
    postForgotPassword,
    newOtp,
    verifyNewOtp,
    verifyPassword,
    userLogout,

    loadshopPage,
    productdetailPage,
    filterbyCategory,
    allCategory,

   userProfile,
   addAddress,
   loadEditAddress,
   updateAddress,
   removeAddress,
   loadAddAddress,
   changePassword,

   updateUserProfile,

   homewithoutLogin,
   sortProducts,
   sortShop,

   loadWishlist,
   addtoWishlist,
   removeWishlist,

   aboutUs,
   googleAuth
  
}
   
   
