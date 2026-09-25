import MailOutlineIcon from '@mui/icons-material/MailOutline';
import PersonIcon from '@mui/icons-material/Person';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import React, { Fragment, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';

import { clearErrors, getUserDetails, updateUser } from '../../actions/userAction';
import { UPDATE_USER_RESET } from '../../constants/userConstants';
import Loader from '../layout/Loader/Loader';
import MetaData from '../layout/MetaData';
import AdminPage from './shared/AdminPage';

const UpdateUser = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { id } = useParams();

    const { loading, error, user } = useSelector(state => state.userDetails);
    const { loading: updateLoading, error: updateError, isUpdated } =
        useSelector(state => state.profile);

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('');

    useEffect(() => {
        if (user && user._id !== id) {
            dispatch(getUserDetails(id));
        } else if (user) {
            setName(user.name);
            setEmail(user.email);
            setRole(user.role);
        }
        if (error) {
            toast.error(error);
            dispatch(clearErrors());
        }
        if (updateError) {
            toast.error(updateError);
            dispatch(clearErrors());
        }
        if (isUpdated) {
            toast.success('User Updated Successfully');
            navigate('/admin/users');
            dispatch({ type: UPDATE_USER_RESET });
        }
    }, [dispatch, error, navigate, isUpdated, updateError, user, id]);

    const updateUserSubmitHandler = e => {
        e.preventDefault();
        const myForm = new FormData();
        myForm.set('name', name);
        myForm.set('email', email);
        myForm.set('role', role);
        dispatch(updateUser(id, myForm));
    };

    return (
        <Fragment>
            <MetaData title='Update User · Admin' />
            <AdminPage title='Update User'>
                {loading ? (
                    <Loader />
                ) : (
                    <form
                        className='mx-auto max-w-lg border border-line bg-surface p-8 sm:p-10'
                        onSubmit={updateUserSubmitHandler}
                    >
                        <div className='flex flex-col gap-6'>
                            <div className='field-row'>
                                <PersonIcon />
                                <input
                                    type='text'
                                    placeholder='Name'
                                    required
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                />
                            </div>
                            <div className='field-row'>
                                <MailOutlineIcon />
                                <input
                                    type='email'
                                    placeholder='Email'
                                    required
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                />
                            </div>
                            <div className='field-row'>
                                <VerifiedUserIcon />
                                <select value={role} onChange={e => setRole(e.target.value)}>
                                    <option value=''>Choose Role</option>
                                    <option value='admin'>Admin</option>
                                    <option value='user'>User</option>
                                </select>
                            </div>

                            <button
                                type='submit'
                                disabled={updateLoading || role === ''}
                                className='btn-solid w-full disabled:opacity-40'
                            >
                                {updateLoading ? 'Updating…' : 'Update User'}
                            </button>
                        </div>
                    </form>
                )}
            </AdminPage>
        </Fragment>
    );
};

export default UpdateUser;
