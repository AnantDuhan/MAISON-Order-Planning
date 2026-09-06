import React, { Fragment, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import LoadingBar from 'react-top-loading-bar';

import MetaData from '../layout/MetaData';

const Profile = () => {
    const navigate = useNavigate();
    const { user, loading, isAuthenticated } = useSelector(state => state.user);

    const [progress, setProgress] = useState(0);
    const onLoaderFinished = () => setProgress(0);

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login');
        }
        setProgress(100);
        setTimeout(() => setProgress(0), 5000);
    }, [navigate, isAuthenticated]);

    return (
        <Fragment>
            <LoadingBar color='#A07C4B' progress={progress} onLoaderFinished={onLoaderFinished} />
            {loading ? (
                <div className='editorial-shell py-32 text-center'>
                    <p className='font-sans text-[0.72rem] uppercase tracking-luxe text-ink-faint'>
                        Loading your profile…
                    </p>
                </div>
            ) : (
                <Fragment>
                    <MetaData title={`${user?.name} · Maison`} />
                    <div className='editorial-shell py-14'>
                        <div className='mb-12 text-center'>
                            <p className='eyebrow'>Your Account</p>
                            <h1 className='heading-display mt-3 text-display'>My Profile</h1>
                        </div>

                        <div className='grid gap-14 lg:grid-cols-[320px_1fr]'>
                            {/* Avatar column */}
                            <div className='flex flex-col items-center'>
                                <div className='overflow-hidden rounded-full border border-line'>
                                    <img
                                        src={user?.avatar?.url || user?.avatar || '/Profile.png'}
                                        alt={user?.name}
                                        className='h-56 w-56 object-cover'
                                    />
                                </div>
                                <Link to='/me/update' className='btn-outline mt-8'>Edit Profile</Link>
                            </div>

                            {/* Details column */}
                            <div className='flex flex-col justify-center'>
                                <div className='space-y-8'>
                                    <div>
                                        <p className='eyebrow'>Full Name</p>
                                        <p className='mt-2 font-display text-2xl text-ink'>{user?.name}</p>
                                    </div>
                                    <div className='rule-luxe' />
                                    <div>
                                        <p className='eyebrow'>Email</p>
                                        <p className='mt-2 font-display text-2xl text-ink'>{user?.email}</p>
                                    </div>
                                    <div className='rule-luxe' />
                                    <div>
                                        <p className='eyebrow'>Joined On</p>
                                        <p className='mt-2 font-display text-2xl text-ink'>
                                            {String(user?.createdAt).substring(0, 10)}
                                        </p>
                                    </div>
                                </div>

                                <div className='mt-12 flex flex-wrap gap-4'>
                                    <Link to='/orders' className='btn-solid'>My Orders</Link>
                                    <Link to='/password/update' className='btn-outline'>Change Password</Link>
                                </div>

                                {user?.role === 'admin' && (
                                    <div className='mt-10 border border-brass/50 bg-surface p-6'>
                                        <p className='eyebrow'>Administrator</p>
                                        <p className='mt-2 font-sans text-sm text-ink-soft'>
                                            You have admin access to this store.
                                        </p>
                                        <Link
                                            to='/admin/dashboard'
                                            className='btn-luxe mt-5 inline-flex bg-brass px-8 py-4 text-white hover:bg-brass-soft'
                                        >
                                            Open Admin Dashboard
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </Fragment>
            )}
        </Fragment>
    );
};

export default Profile;
