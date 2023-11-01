import React, { Fragment, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
// import Loader from '../layout/Loader/Loader';
import LoadingBar from 'react-top-loading-bar';

import MetaData from '../layout/MetaData';

import './Profile.css';

const Profile = () => {

    const navigate = useNavigate();

    const { user, loading, isAuthenticated } = useSelector(
        (state) => state.user
    );

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
            {loading ? (
                <LoadingBar
                    color='red'
                    progress={progress}
                    onLoaderFinished={onLoaderFinished}
                />
            ) : (
                <Fragment>
                    <MetaData title={`${user.name}'s Profile`} />
                    <div className='profileContainer'>
                        <div>
                            <h1>My Profile</h1>
                            <img src={user.avatar} alt={user.name} />
                            <Link to='/me/update'>Edit Profile</Link>
                        </div>
                        <div>
                            <div>
                                <h4>Full Name</h4>
                                <p>{user.name}</p>
                            </div>
                            <div>
                                <h4>Email</h4>
                                <p>{user.email}</p>
                            </div>
                            <div>
                                <h4>Joined On</h4>
                                <p>{String(user.createdAt).substring(0, 10)}</p>
                            </div>

                            <div>
                                <Link to='/orders'>My Orders</Link>
                                <Link to='/password/update'>
                                    Change Password
                                </Link>
                            </div>
                        </div>
                    </div>
                </Fragment>
            )}
        </Fragment>
    );
};

export default Profile;
