const session = require('express-session');
const User = require('../models/userModel');

const isLogin = async (req, res, next) => {
    try {
        if (req.session.admin_id) {
            console.log('Session Admin ID:', req.session.admin_id);
            next();
        } else {
            console.log('No Admin ID in session, redirecting to login');
            res.redirect('/admin');
        }
    } catch (error) {
        console.log('Error in isLogin middleware:', error.message);
        res.redirect('/admin');
    }
};

const isLogout = async (req, res, next) => {
    try {
        if (req.session.admin_id) {
            console.log('Admin is logged in, redirecting to home');
            res.redirect('/admin/home');
        } else {
            next();
        }
    } catch (error) {
        console.log('Error in isLogout middleware:', error.message);
        res.redirect('/admin');
    }
};

module.exports = {
    isLogin,
    isLogout
};
