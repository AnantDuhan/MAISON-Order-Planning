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

            toast.success('Welcome to the MAISON demo.', {
                position: 'top-right',
                autoClose: 3000
            });

            navigate('/admin/dashboard');
        } catch (error) {
            console.error('Demo login error:', error);

            toast.error(
                error.response?.data?.message ||
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
            aria-label="Explore MAISON demo"
            title="Explore MAISON using the demo account"
            className="
                group
                inline-flex w-full items-center justify-center gap-2
                border border-brass
                bg-transparent
                px-6 py-3
                font-sans text-[0.72rem] font-semibold
                uppercase tracking-luxe
                text-brass
                transition-all duration-300 ease-luxe

                hover:bg-brass
                hover:text-white

                focus:outline-none
                focus:ring-1
                focus:ring-brass
                focus:ring-offset-2
                focus:ring-offset-white

                disabled:cursor-not-allowed
                disabled:opacity-50
            "
        >
            {isLoading ? (
                <>
                    <span
                        className="
                            h-3.5 w-3.5
                            animate-spin
                            rounded-full
                            border
                            border-brass/30
                            border-t-brass
                        "
                        aria-hidden="true"
                    />
                    <span>Opening Demo</span>
                </>
            ) : (
                <>
                    <span
                        className="
                            text-[0.65rem]
                            transition-transform
                            duration-300
                            group-hover:translate-x-0.5
                        "
                        aria-hidden="true"
                    >
                        ◇
                    </span>

                    <span>Explore Demo</span>

                    <span
                        className="
                            text-[0.65rem]
                            transition-transform
                            duration-300
                            group-hover:translate-x-0.5
                        "
                        aria-hidden="true"
                    >
                        →
                    </span>
                </>
            )}
        </button>
    );
};

export default TryDemoButton;