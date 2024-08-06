const User= require('../models/userModel')



const isLogin = async(req,res,next)=>{
  try {
    if(req.session.user_id){
      next(); 
    } 
    else{
    res.redirect('/login')
    }
  }catch(error){
    console.log(error.message);
  }
}

const isLogout = async(req,res,next)=>{
    try{
        if(req.session.user_id){
            res.redirect('/home');
        }else{
          next();
        }
    }catch(error){
      console.log(error.message);
    }
  }
  const isBlocked = async(req,res,next)=>{
    try {
        const user =await User.findById(req.session.user_id);
        if(user.is_Active== false){
            res.redirect('/logout');
        }else{
            next()
        }
    } catch (error) {
        console.log(error.message);
    }
}

  module.exports = {
    isLogin,
    isLogout,
    isBlocked
  }