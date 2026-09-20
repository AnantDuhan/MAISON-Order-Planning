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

   req.auth = decodedToken;
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

      // Admin API access must be backed by a session created after a TOTP
      // challenge. This is enforced here so it protects every admin route,
      // rather than relying on the client-side dashboard guard.
      if (req.user.role === 'admin' && !req.auth?.mfaVerified && !req.user.isDemo) {
         return res.status(403).json({
            success: false,
            message: 'Two-factor authentication is required for admin access'
         });
      }

      if(req.user.role === 'admin' && req.user.isDemo && !['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
         return res.status(403).json({
            success: false,
            demoMode: true,
            message: "Demo admin account are read-only"
         });
      }

      next();
   };
};
