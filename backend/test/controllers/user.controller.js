const User = require('../../models/user');

async function forgotPassword(req, res, next) {
    const user = await User.findOne(req.body.email);

    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found'
        });
    }

    console.log(user);

    // get reset password token
    const resetToken = user.getResetPasswordToken();

    await user.save({ validateBeforeSave: false });

    const resetPasswordURL = `${process.env.FRONTEND_URL}/password/reset/${resetToken}`;

    try {
        await sendEmail({
            email: user.email,
            subject: `Password Recovery - Ecommerce`,
            html: `Your password reset token is:- \n\n ${resetPasswordURL} \n\n If you have not requested this email then, please ignore it.`
        });

        res.status(200).json({
            success: true,
            message: `Email sent to ${user.email} successfully.`
        });

        return `Email sent to ${user.email} successfully.`;
    } catch (error) {
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        await user.save({ validateBeforeSave: false });

        res.status(500).json({
            success: false,
            message: error.message
        });

        return 'Failed to reset password';
    }
};

module.exports = {
    forgotPassword
}
