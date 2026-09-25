import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import React, { Fragment, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import { clearErrors, deleteUser, getAllUsers } from '../../actions/userAction';
import { DELETE_USER_RESET } from '../../constants/userConstants';
import MetaData from '../layout/MetaData';
import AdminPage from './shared/AdminPage';
import AdminTable from './shared/AdminTable';

const UsersList = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const { error, users } = useSelector(state => state.allUsers);
    const { error: deleteError, isDeleted, message } = useSelector(state => state.profile);

    const deleteUserHandler = id => dispatch(deleteUser(id));

    useEffect(() => {
        if (error) {
            toast.error(error);
            dispatch(clearErrors());
        }
        if (deleteError) {
            toast.error(deleteError);
            dispatch(clearErrors());
        }
        if (isDeleted) {
            toast.success(message);
            navigate('/admin/users');
            dispatch({ type: DELETE_USER_RESET });
        }
        dispatch(getAllUsers());
    }, [dispatch, error, deleteError, navigate, isDeleted, message]);

    const rows = (users || []).map(item => ({
        id: item._id,
        email: item.email,
        name: item.name,
        role: item.role,
    }));

    const columns = [
        { key: 'id', label: 'User ID', width: '1.4fr' },
        { key: 'name', label: 'Name', width: '1fr' },
        { key: 'email', label: 'Email', width: '1.6fr' },
        {
            key: 'role',
            label: 'Role',
            width: '0.7fr',
            tone: row => (row.role === 'admin' ? 'text-success' : 'text-ink-soft'),
        },
        {
            key: 'actions',
            label: 'Actions',
            align: 'right',
            width: '0.7fr',
            render: row => (
                <span className='inline-flex items-center gap-4'>
                    <Link to={`/admin/user/${row.id}`} className='text-ink-soft hover:text-brass' title='Edit'>
                        <EditIcon fontSize='small' />
                    </Link>
                    <button
                        onClick={() => deleteUserHandler(row.id)}
                        className='text-ink-soft hover:text-danger'
                        title='Delete'
                    >
                        <DeleteIcon fontSize='small' />
                    </button>
                </span>
            ),
        },
    ];

    return (
        <Fragment>
            <MetaData title='All Users · Admin' />
            <AdminPage title='All Users'>
                <AdminTable columns={columns} rows={rows} emptyMessage='No users found.' />
            </AdminPage>
        </Fragment>
    );
};

export default UsersList;
