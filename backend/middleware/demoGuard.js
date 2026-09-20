const demoGuard = (operation) => {
  return (req, res, next) => {
    if (req.user?.isDemo) {
      const blockedOps = {
        "place-order": {
          status: 403,
          message: "Demo accounts cannot place real orders. This is a demonstration account.",
        },
        "submit-review": {
          status: 403,
          message: "Demo accounts cannot submit reviews.",
        },
        "change-email": {
          status: 403,
          message: "Demo accounts cannot change email.",
        },
        "change-password": {
          status: 403,
          message: "Demo accounts cannot change password.",
        },
        "delete-account": {
          status: 403,
          message: "Demo accounts cannot delete accounts.",
        },
        "real-payment": {
          status: 403,
          message: "Demo mode — payments are disabled.",
        },
      };

      if (blockedOps[operation]) {
        const { status, message } = blockedOps[operation];
        return res.status(status).json({
          success: false,
          isDemoUser: true,
          message,
        });
      }
    }
    next();
  };
};

module.exports = demoGuard;
