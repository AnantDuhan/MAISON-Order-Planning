import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import React, { Fragment, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import { clearErrors, deleteOrder, getAllOrders } from '../../actions/orderAction';
import { DELETE_ORDER_RESET } from '../../constants/orderConstants';
import MetaData from '../layout/MetaData';
import AdminPage from './shared/AdminPage';
import AdminTable from './shared/AdminTable';

const refundTone = status =>
    status === 'Approved' || status === 'Refunded'
        ? 'text-success'
        : ['Initiated', 'Pending', 'Rejected', 'Processing'].includes(status)
        ? 'text-danger'
        : 'text-ink-soft';

const OrderList = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const { error, orders } = useSelector(state => state.allOrders);
    const { error: deleteError, isDeleted } = useSelector(state => state.order);

    const deleteOrderHandler = id => dispatch(deleteOrder(id));

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

    const rows = (orders || []).map(item => ({
        id: item._id,
        name: item.orderItems?.[0]?.name || '—',
        itemsQty: item.orderItems?.length || 0,
        amount: item.totalPrice,
        status: item.orderStatus,
        refundStatus: item.refundStatus,
    }));

    const columns = [
        { key: 'id', label: 'Order ID', width: '1.4fr' },
        { key: 'name', label: 'Product', width: '1.2fr' },
        {
            key: 'status',
            label: 'Status',
            width: '0.8fr',
            tone: row => (row.status === 'Delivered' ? 'text-success' : 'text-danger'),
        },
        {
            key: 'refundStatus',
            label: 'Refund',
            width: '0.8fr',
            tone: row => refundTone(row.refundStatus),
            render: row => row.refundStatus || '—',
        },
        { key: 'itemsQty', label: 'Items', align: 'center', width: '0.5fr' },
        {
            key: 'amount',
            label: 'Amount',
            align: 'right',
            width: '0.8fr',
            render: row => `₹${row.amount}`,
        },
        {
            key: 'actions',
            label: 'Actions',
            align: 'right',
            width: '0.7fr',
            render: row => (
                <span className='inline-flex items-center gap-4'>
                    <Link to={`/admin/order/${row.id}`} className='text-ink-soft hover:text-brass' title='Process'>
                        <EditIcon fontSize='small' />
                    </Link>
                    <button
                        onClick={() => deleteOrderHandler(row.id)}
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
            <MetaData title='All Orders · Admin' />
            <AdminPage title='All Orders'>
                <AdminTable columns={columns} rows={rows} emptyMessage='No orders yet.' />
            </AdminPage>
        </Fragment>
    );
};

export default OrderList;
