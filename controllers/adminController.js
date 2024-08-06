const User =  require("../models/userModel");

 const bcrypt =  require('bcrypt');
 const mongoose = require('mongoose')
//  const multer = require('multer');



// Configure multer for file uploads
// const storage = multer.diskStorage({
//   destination: function(req, file, cb) {
//     cb(null, path.join(__dirname, '../public/admin-assets/imgs/items'));
//   },
//   filename: function(req, file, cb) {
//     cb(null, Date.now() + '-' + file.originalname);
//   }
// });
// const upload = multer({ storage: storage });




const loadLogin = async(req,res)=>{
try{
  console.log("1")

    res.render('admin/login');
} catch (error){
    console.log(error.mesage); 
}
}

const verifyLogin = async(req,res)=>{
try{
  const Email = req.body.email;
  const password = req.body.password;
 console.log(req.body,"body admin");

  const userData = await User.findOne({email:Email});
  if(userData){
  console.log(userData)
     
  const passwordMatch = await bcrypt.compare(password,userData.password);
 
 
  if(passwordMatch){
console.log("cool,password matched")
    if(userData.is_admin===0){
        res.render('admin/login',{message:"Email and password is incorrect"})
    }else {
     req.session.admin_id= userData._id;
    res.redirect("/admin/home");

  }

 }
 else{
    res.render('admin/login',{message:"Email and password is incorrect"});
 }  

  }else{
    res.render('admin/login',{message:"Email and password is incorrect"});
  }

}catch(error){
    console.log(error.message);
    res.render('admin/login',{message:"an error occured,please try again later"})
}


}


 


const loadDashboard = async(req,res)=>{
 try {

  const userData =  await  User.findById(req.session.admin_id);
  console.log(userData)
    res.render('admin/adminHome', {user:userData})
 

}catch(error){
    console.log(error.message);
}
}
const loaduserList = async(req,res)=>{
  console.log("load userlist success");
    try{
       const user = await User.find()
      res.render("admin/userList",{user })
    }
    catch(error){
      console.error(error)
      res.status(500).send('Internal server error on userlist ')
    }
}


const ToggleblockUser = async (req,res)=>{
  try{
    console.log("userrr kityyyyyyyyyyyyyyyyyyyyy")
    const userId= req.query.userid
    console.log(userId);
    const users = await User.findOne({_id:userId}); 

    if (!users) {
      return res.status(404).json({ success: false, error: 'user not found' });
  }
    users.is_Active =!users.is_Active
    await users.save()

    res.redirect("/admin/userList")
  } catch(error){
    console.error('Error in ToggleblockProduct:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};





const logout = async(req,res)=>{

try{
   req.session.admin_id=null;
   req.session.destroy();
   res.redirect('/admin');

}catch(error){
    console.log(error.message);
}
}

// const adminDashboard = async (req,res)=>{

//  try{
//    const usersData = await User.find({is_admin:0});
//    res.render('dashboard',{users:usersData});
 
//  }catch(error){
//     console.log(error.message);
//  }
// };

 module.exports = {
    loadLogin,
    verifyLogin,
    loadDashboard,
    logout,
    loaduserList,
    ToggleblockUser
    // adminDashboard,
   
 }