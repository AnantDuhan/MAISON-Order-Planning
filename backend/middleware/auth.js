const jwt = require('jsonwebtoken');
const User = require('../models/user');
const { promisify } = require('util');

exports.isAuthUser = async (req, res, next) => {
   const { token } = req.cookies;
   if (!token) {
      return res.status(401).json({
         success: false,
          message: 'Please Login to access this resource'
      });
   }
   const decodedToken = await promisify(jwt.verify)(
       token,
       process.env.JWT_SECRET_KEY
   );

   req.user = await User.findById(decodedToken.id);

   next();
};

exports.authRoles = (...roles) => {
   return (req, res, next) => {
      if (!roles.includes(req.user.role)) {
         return res.status(403).json({
             success: false,
             message: `Role: ${req.user.role} is not allowed to access the resource`
         });
      }
      next();
   };
};
