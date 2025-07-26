import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';

const ValidateTFA = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const [token, setToken] = useState('');
    const userId = location.state?.userId; // Get userId passed from login page

    useEffect(() => {
        if (!userId) {
            toast.error("Invalid state. Please try logging in again.");
            navigate('/login');
        }
    }, [userId, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const { data } = await axios.post('/api/v1/2fa/validate', { userId, token });
            // On success, backend sends the final JWT
            localStorage.setItem('authToken', data.token); // Or however you store your token
            navigate('/account'); // Redirect to a protected route
        } catch (error) {
            toast.error(error.response.data.message);
        }
    };

    return (
        <div>
            <h2>Enter Authentication Code</h2>
            <form onSubmit={handleSubmit}>
                <input 
                    type="text" 
                    placeholder="6-digit code" 
                    value={token} 
                    onChange={e => setToken(e.target.value)} 
                />
                <button type="submit">Verify</button>
            </form>
        </div>
    );
};

export default ValidateTFA;