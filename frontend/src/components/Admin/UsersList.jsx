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
import ConfirmDelete from './shared/ConfirmDelete';

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
        // Avatars are stored as a URL string ('/Profile.png' until a photo is added).
        avatar: [item.avatar?.url, item.avatar].find(v => typeof v === 'string' && v && v !== '/Profile.png') || null,
        joinedAt: item.createdAt,
        verified: Boolean(item.isEmailVerified),
        twoFactor: Boolean(item.twoFactorAuth?.enabled),
    }));

    const joined = value => (value
        ? `Joined ${new Date(value).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`
        : '');

    // Phones and tablets: who they are, how to reach them, and their role.
    const renderCard = row => (
        <div className='flex gap-4 py-5'>
            <span className='flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface font-display text-lg text-ink-soft'>
                {row.avatar
                    ? <img src={row.avatar} alt='' loading='lazy' decoding='async' className='h-full w-full object-cover' />
                    : (row.name || row.email || '?').trim().charAt(0).toUpperCase()}
            </span>
            <div className='min-w-0 flex-1'>
                <div className='flex items-start justify-between gap-3'>
                    <p className='min-w-0 truncate font-sans text-sm font-medium text-ink'>{row.name || '—'}</p>
                    <span className={`shrink-0 border px-1.5 py-0.5 font-sans text-[0.6rem] uppercase tracking-luxe ${row.role === 'admin' ? 'border-success/40 bg-success/10 text-success' : 'border-line text-ink-soft'}`}>
                        {row.role}
                    </span>
                </div>
                <a href={`mailto:${row.email}`} title={row.email} className='mt-0.5 block truncate font-sans text-sm text-ink-soft hover:text-brass'>{row.email}</a>
                {row.joinedAt && <p className='mt-1 font-sans text-xs text-ink-faint'>{joined(row.joinedAt)}</p>}
                <div className='mt-3 flex flex-wrap items-center gap-2'>
                    <Link
                        to={`/admin/user/${row.id}`}
                        className='inline-flex min-h-[40px] items-center gap-1.5 border border-line px-3 font-sans text-[0.68rem] uppercase tracking-luxe text-ink transition-colors hover:border-brass hover:text-brass'
                    >
                        <EditIcon sx={{ fontSize: 16 }} />
                        Edit
                    </Link>
                    <ConfirmDelete variant='button' what={row.email} onConfirm={() => deleteUserHandler(row.id)} />
                </div>
            </div>
        </div>
    );

    const columns = [
        {
            key: 'name',
            label: 'Customer',
            width: '1.6fr',
            render: row => (
                <span className='flex min-w-0 items-center gap-3'>
                    <span className='grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full border border-line bg-surface font-display text-sm text-ink-soft'>
                        {row.avatar ? <img src={row.avatar} alt='' className='h-full w-full object-cover' /> : (row.name || '?').charAt(0).toUpperCase()}
                    </span>
                    <span className='min-w-0'>
                        <span className='block truncate text-ink'>{row.name}</span>
                        <span className='block truncate text-xs text-ink-faint'>{row.email}</span>
                    </span>
                </span>
            ),
        },
        {
            key: 'joinedAt',
            label: 'Joined',
            width: '0.8fr',
            render: row => (row.joinedAt ? new Date(row.joinedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'),
        },
        {
            key: 'security',
            label: 'Email · 2FA',
            width: '0.9fr',
            render: row => (
                <span className='text-xs'>
                    <span className={row.verified ? 'text-success' : 'text-ink-faint'}>{row.verified ? 'Verified' : 'Unverified'}</span>
                    <span className='text-line'> · </span>
                    <span className={row.twoFactor ? 'text-success' : 'text-ink-faint'}>{row.twoFactor ? '2FA on' : '2FA off'}</span>
                </span>
            ),
        },
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
                    <ConfirmDelete what={row.email} onConfirm={() => deleteUserHandler(row.id)} />
                </span>
            ),
        },
    ];

    return (
        <Fragment>
            <MetaData title='All Users · Admin' noIndex />
            <AdminPage title='All Users'>
                <AdminTable columns={columns} rows={rows} renderCard={renderCard} emptyMessage='No users found.' />
            </AdminPage>
        </Fragment>
    );
};

export default UsersList;
