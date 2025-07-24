import { Button } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import React, { Fragment, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import { clearErrors, deleteUser, getAllUsers } from '../../actions/userAction';
import { DELETE_USER_RESET } from '../../constants/userConstants';
import MetaData from '../layout/MetaData';

// import SideBar from './Sidebar';

import './ProductList.css';

const UsersList = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const { error, users } = useSelector(state => state.allUsers);

    const {
        error: deleteError,
        isDeleted,
        message
    } = useSelector(state => state.profile);

    const deleteUserHandler = id => {
        dispatch(deleteUser(id));
    };

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

    const columns = [
        { field: 'id', headerName: 'User ID', minWidth: 180, flex: 0.8 },

        {
            field: 'email',
            headerName: 'Email',
            minWidth: 200,
            flex: 1
        },
        {
            field: 'name',
            headerName: 'Name',
            minWidth: 150,
            flex: 0.5
        },

        {
            field: 'role',
            headerName: 'Role',
            type: 'number',
            minWidth: 150,
            flex: 0.3,
            cellClassName: params => {
                return params.getValue(params.id, 'role') === 'admin'
                    ? 'greenColor'
                    : 'redColor';
            }
        },

        {
            field: 'actions',
            flex: 0.3,
            headerName: 'Actions',
            minWidth: 150,
            type: 'number',
            sortable: false,
            renderCell: params => {
                return (
                    <Fragment>
                        <div className='actions'>
                            <Link
                                to={`/admin/user/${params.getValue(
                                    params.id,
                                    'id'
                                )}`}
                            >
                                <EditIcon className='editIcon' />
                            </Link>

                            <Button
                                onClick={() =>
                                    deleteUserHandler(
                                        params.getValue(params.id, 'id')
                                    )
                                }
                            >
                                <DeleteIcon className='deleteIcon' />
                            </Button>
                        </div>
                    </Fragment>
                );
            }
        }
    ];

    const rows = [];

    users &&
        users.forEach(item => {
            rows.push({
                id: item._id,
                role: item.role,
                email: item.email,
                name: item.name
            });
        });

    return (
        <Fragment>
            <MetaData title={`ALL USERS - Admin`} />

            {/* <div className='dashboard'>
                <SideBar /> */}
                <div className='productListContainer'>
                    <h1 id='productListHeading'>ALL USERS</h1>

                    <DataGrid
                        rows={rows}
                        columns={columns}
                        pageSize={10}
                        disableSelectionOnClick
                        className='productListTable'
                        autoHeight
                    />
                </div>
            {/* </div> */}
        </Fragment>
    );
};

export default UsersList;
