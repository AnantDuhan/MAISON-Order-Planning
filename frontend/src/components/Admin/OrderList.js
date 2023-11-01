import { Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, MenuItem, Select, Typography } from '@material-ui/core';
import { DataGrid } from '@material-ui/data-grid';
import DeleteIcon from '@material-ui/icons/Delete';
import EditIcon from '@material-ui/icons/Edit';
import React, { Fragment, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import { clearErrors, deleteOrder, getAllOrders, updateRefundStatus } from '../../actions/orderAction';
import { DELETE_ORDER_RESET } from '../../constants/orderConstants';
import MetaData from '../layout/MetaData';

import './ProductList.css';

const OrderList = ({ orderId, refundId, refundStatus }) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const [openDialog, setOpenDialog] = useState(false);
    const [selectedRefundStatus, setSelectedRefundStatus] = useState('');
    const [clickedOrder, setClickedOrder] = useState(null);

    const { error, orders } = useSelector(state => state.allOrders);
    // const { order } = useSelector(state => state.orderDetails);

    const { error: deleteError, isDeleted } = useSelector(state => state.order);

    const deleteOrderHandler = id => {
        dispatch(deleteOrder(id));
    };

    const handleRefundClick = refundStatus => {
        dispatch(updateRefundStatus(orderId, refundId, refundStatus));
        handleCloseDialog();
    };

    const handleOpenDialog = order => {
        setOpenDialog(true);
        setSelectedRefundStatus(order.refundStatus);
        setClickedOrder(order);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
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
            toast.success('Order Deleted Successfully');
            navigate('/admin/orders');
            dispatch({ type: DELETE_ORDER_RESET });
        }

        dispatch(getAllOrders());
    }, [dispatch, error, deleteError, navigate, isDeleted]);

    const columns = [
        { field: 'id', headerName: 'Order ID', minWidth: 160, flex: 0.6 },
        {
            field: 'name',
            headerName: 'Product Name',
            minWidth: 150,
            flex: 0.5
        },

        {
            field: 'status',
            headerName: 'Status',
            minWidth: 120,
            flex: 0.5,
            cellClassName: params => {
                return params.getValue(params.id, 'status') === 'Delivered'
                    ? 'greenColor'
                    : 'redColor';
            }
        },
        {
            field: 'refundStatus',
            headerName: 'Refund Status',
            minWidth: 100,
            flex: 0.45, // Equal minWidth and flex
            cellClassName: params => {
                const status = params.row.refundStatus;
                return status === 'Approved' || status === 'Refunded'
                    ? 'greenColor'
                    : status === 'Initiated' ||
                      status === 'Pending' ||
                      status === 'Rejected' ||
                      status === 'Processing'
                    ? 'redColor'
                    : '';
            }
        },
        {
            field: 'itemsQty',
            headerName: 'Items Qty',
            type: 'number',
            minWidth: 120,
            flex: 0.4
        },

        {
            field: 'amount',
            headerName: 'Amount',
            type: 'number',
            minWidth: 120,
            flex: 0.4
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
                        <Link
                            to={`/admin/order/${params.getValue(
                                params.id,
                                'id'
                            )}`}
                        >
                            <EditIcon className='editIcon' />
                        </Link>

                        <Button
                            onClick={() =>
                                deleteOrderHandler(
                                    params.getValue(params.id, 'id')
                                )
                            }
                        >
                            <DeleteIcon className='deleteIcon' />
                        </Button>
                    </Fragment>
                );
            }
        },
    ];

    const rows = [];

    orders &&
        orders.forEach(item => {
            rows.push({
                id: item._id,
                name: item.orderItems[0].name,
                itemsQty: item.orderItems.length,
                amount: item.totalPrice,
                status: item.orderStatus,
                refundStatus: item.refundStatus,
                isReturned: item.isReturned
            });
        });

    return (
        <Fragment>
            <MetaData title={`ALL ORDERS - Admin`} />

            {/* <div className='dashboard'> */}
            {/* <Sidebar /> */}
            <div className='productListContainer'>
                <h1 id='productListHeading'>ALL ORDERS</h1>

                <DataGrid
                    rows={rows}
                    columns={columns}
                    pageSize={10}
                    rowsPerPageOptions={[10, 20, 30]}
                    // disableSelectionOnClick
                    className='productListTable'
                    autoHeight
                />

                <Dialog
                    open={openDialog}
                    onClose={handleCloseDialog}
                    maxWidth='sm'
                    fullWidth
                >
                    <DialogTitle>Change Refund Status</DialogTitle>
                    <DialogContent>
                        <Typography>Order Details:</Typography>
                        {orders && orders.orderItems ? (
                            <div>
                                <Typography>
                                    Order ID: {orders[0].id}
                                </Typography>
                                {/* Display product images and details */}
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                >
                                    {orders[0].orderItems.map(item => (
                                        <div
                                            key={item._id}
                                            style={{ marginRight: '20px' }}
                                        >
                                            <img
                                                src={item.image} // Assuming you have an 'image' property in each order item
                                                alt='Product'
                                                style={{
                                                    width: '100px',
                                                    height: '100px',
                                                    objectFit: 'cover'
                                                }}
                                            />
                                            <Typography>{item.name}</Typography>
                                            <Typography>
                                                Quantity: {item.quantity}
                                            </Typography>
                                        </div>
                                    ))}
                                </div>
                                <Typography>
                                    Amount: {orders[0].totalPrice}
                                </Typography>
                                {/* Add more details if needed */}
                            </div>
                        ) : (
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center'
                                }}
                            >
                                <div className='loader'></div>{' '}
                            </div>
                        )}
                        <Typography>Select Refund Status:</Typography>
                        <FormControl fullWidth>
                            {/* <InputLabel>Refund Status</InputLabel> */}
                            <Select
                                value={selectedRefundStatus}
                                onChange={event =>
                                    setSelectedRefundStatus(event.target.value)
                                }
                            >
                                <MenuItem value='Initiated'>Initiated</MenuItem>
                                <MenuItem value='Pending'>Pending</MenuItem>
                                <MenuItem value='Approved'>Approved</MenuItem>
                                <MenuItem value='Refunded'>Refunded</MenuItem>
                                {/* Add other refund statuses */}
                            </Select>
                        </FormControl>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseDialog} color='secondary'>
                            Cancel
                        </Button>
                        <Button
                            onClick={() =>
                                handleRefundClick(selectedRefundStatus)
                            }
                            color='secondary'
                        >
                            Save
                        </Button>
                    </DialogActions>
                </Dialog>
            </div>
            {/* </div> */}
        </Fragment>
    );
};

export default OrderList;
