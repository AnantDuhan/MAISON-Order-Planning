const jwt = require('jsonwebtoken');
const User = require('../models/user');

const unauthorized = (res, message = 'Please Login to access this resource') =>
   res.status(401).json({ success: false, message });

// Verify the session cookie and load the user. Returns null when the request
// is not a valid, fully-authenticated session.
const resolveSession = async token => {
   if (!token) return null;

   let decoded;
   try {
      decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
   } catch {
      return null;
   }

   // A 2FA "pending" token only proves the password step. It must never be
   // accepted as a session, otherwise 2FA can be skipped by putting it in the
   // cookie.
   if (decoded.twoFactorPending) return null;

   const user = await User.findById(decoded.id);
   if (!user) return null;

   // Sessions issued before the last password change are revoked.
   if (user.passwordChangedAt && decoded.iat * 1000 < user.passwordChangedAt.getTime() - 1000) {
      return null;
   }

   return { decoded, user };
};

exports.resolveSession = resolveSession;

exports.isAuthUser = async (req, res, next) => {
   const session = await resolveSession(req.cookies?.token);
   if (!session) return unauthorized(res);

   req.auth = session.decoded;
   req.user = session.user;
   next();
};

// Like isAuthUser, but lets anonymous requests through with req.user unset.
exports.optionalAuth = async (req, res, next) => {
   const session = await resolveSession(req.cookies?.token);
   if (session) {
      req.auth = session.decoded;
      req.user = session.user;
   }
   next();
};

exports.authRoles = (...roles) => {
   return (req, res, next) => {
      if (!req.user) return unauthorized(res);

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
