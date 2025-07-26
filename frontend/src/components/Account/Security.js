import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import { toast } from 'react-toastify';
import { loadUser } from '../../actions/userAction'; 

const Security = () => {
    const dispatch = useDispatch();
    const { user } = useSelector(state => state.user);

    const [qrCode, setQrCode] = useState('');
    const [otp, setOtp] = useState('');
    const [showVerification, setShowVerification] = useState(false);

    const handleEnable2FA = async () => {
        const { data } = await axios.get('/api/v1/2fa/setup');
        setQrCode(data.qrCodeUrl);
        setShowVerification(true);
    };

    const handleVerify2FA = async () => {
        try {
            await axios.post('/api/v1/2fa/verify', { token: otp });
            toast.success("2FA Enabled Successfully!");
            setShowVerification(false);
            dispatch(loadUser());
        } catch (error) {
            toast.error(error.response.data.message);
        }
    };

    const handleDisable2FA = async () => {
        try {
            await axios.post('/api/v1/2fa/disable');
            toast.success("2FA Disabled Successfully!");
            dispatch(loadUser());
        } catch (error) {
            toast.error(error.response.data.message);
        }
    };

    return (
        <div>
            <h2>Two-Factor Authentication</h2>
            {user && user.twoFactorAuth && user.twoFactorAuth.enabled ? (
                <div>
                    <p>2FA is currently <strong>Enabled</strong>.</p>
                    <button onClick={handleDisable2FA}>Disable 2FA</button>
                </div>
            ) : (
                <div>
                    <p>2FA is currently <strong>Disabled</strong>.</p>
                    <button onClick={handleEnable2FA}>Enable 2FA</button>
                </div>
            )}

            {showVerification && (
                <div>
                    <h3>Scan this QR Code</h3>
                    <p>Scan the image below with your authenticator app (e.g., Google Authenticator, Authy).</p>
                    <img src={qrCode} alt="2FA QR Code" />
                    <input 
                        type="text" 
                        placeholder="Enter 6-digit code" 
                        value={otp} 
                        onChange={e => setOtp(e.target.value)} 
                    />
                    <button onClick={handleVerify2FA}>Verify & Enable</button>
                </div>
            )}
        </div>
    );
};

export default Security;