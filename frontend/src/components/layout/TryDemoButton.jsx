import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { demoLogin } from '../../actions/userAction';

const TryDemoButton = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [isLoading, setIsLoading] = useState(false);

    const handleDemoClick = async () => {
        if (isLoading) return;

        setIsLoading(true);

        try {
            await dispatch(demoLogin());

            toast.success('Welcome to the MAISON demo! 🎭', {
                position: 'top-right',
                autoClose: 3000
            });

            navigate('/products');
        } catch (error) {
            console.error('Demo login error:', error);

            toast.error(
                error.message ||
                'Unable to start demo session. Please try again.',
                {
                    position: 'top-right'
                }
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <button
            type="button"
            onClick={handleDemoClick}
            disabled={isLoading}
            aria-label="Try MAISON demo account"
            title="Explore MAISON without creating an account"
            className="
                inline-flex items-center justify-center gap-2
                rounded-lg
                border-2 border-white
                bg-gradient-to-r from-indigo-600 to-purple-600
                px-6 py-3
                text-sm font-semibold text-white
                shadow-lg shadow-indigo-500/20
                transition-all duration-200
                hover:-translate-y-0.5
                hover:from-purple-600 hover:to-indigo-600
                hover:shadow-xl hover:shadow-indigo-500/30
                focus:outline-none
                focus:ring-2 focus:ring-white/70
                focus:ring-offset-2
                focus:ring-offset-indigo-600
                disabled:cursor-not-allowed
                disabled:opacity-60
                disabled:hover:translate-y-0
                sm:px-7 sm:text-base
            "
        >
            {isLoading ? (
                <>
                    <span
                        className="
                            h-4 w-4
                            animate-spin
                            rounded-full
                            border-2 border-white/30
                            border-t-white
                        "
                        aria-hidden="true"
                    />
                    <span>Loading Demo...</span>
                </>
            ) : (
                <>
                    <span aria-hidden="true">🎭</span>
                    <span>Try Demo</span>
                </>
            )}
        </button>
    );
};

export default TryDemoButton;