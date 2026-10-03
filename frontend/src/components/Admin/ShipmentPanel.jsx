import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

import TrackingTimeline from '../Order/TrackingTimeline';

const EVENT_STATUSES = ['In transit', 'Out for delivery', 'Delivery attempted', 'Delayed', 'Delivered', 'Returning to sender'];

const inputClass = 'w-full border border-line bg-transparent px-3 py-2 font-sans text-sm text-ink outline-none focus:border-brass';

/** Courier fields shown when an admin marks an order Shipped. */
export const ShipFields = ({ value, onChange }) => (
    <div className='mt-5 grid gap-3 sm:grid-cols-3'>
        <input
            className={inputClass}
            placeholder='Courier (e.g. Delhivery)'
            value={value.courier}
            onChange={e => onChange({ ...value, courier: e.target.value })}
        />
        <input
            className={inputClass}
            placeholder='AWB / tracking number'
            value={value.awb}
            onChange={e => onChange({ ...value, awb: e.target.value })}
        />
        <input
            className={inputClass}
            placeholder='Tracking URL (optional)'
            value={value.trackingUrl}
            onChange={e => onChange({ ...value, trackingUrl: e.target.value })}
        />
    </div>
);

/** Admin: tracking timeline, add an event, fix courier details, packing slip. */
const ShipmentPanel = ({ order, onChanged }) => {
    const [event, setEvent] = useState({ status: 'In transit', location: '', note: '' });
    const [editing, setEditing] = useState(false);
    const [details, setDetails] = useState({
        courier: order.shipment?.courier || '',
        awb: order.shipment?.awb || '',
        trackingUrl: order.shipment?.trackingUrl || '',
    });
    const [busy, setBusy] = useState(false);

    const shipped = ['Shipped', 'Delivered'].includes(order.orderStatus);

    const addEvent = async () => {
        setBusy(true);
        try {
            const { data } = await axios.post(`/api/v1/admin/order/${order._id}/tracking`, event);
            toast.success(data.added ? `Added: ${event.status}` : 'That event was already recorded');
            setEvent({ status: 'In transit', location: '', note: '' });
            onChanged?.();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Could not add the event');
        } finally {
            setBusy(false);
        }
    };

    const saveDetails = async () => {
        setBusy(true);
        try {
            await axios.patch(`/api/v1/admin/order/${order._id}/shipment`, details);
            toast.success('Courier details updated');
            setEditing(false);
            onChanged?.();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Could not update');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className='mt-10 space-y-6'>
            <div className='flex flex-wrap items-center justify-between gap-3'>
                <p className='eyebrow'>Shipment</p>
                <div className='flex gap-4'>
                    <a
                        href={`/api/v1/admin/order/${order._id}/packing-slip`}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='font-sans text-[0.68rem] uppercase tracking-luxe text-brass hover:opacity-70'
                    >
                        Packing slip ↗
                    </a>
                    {shipped && (
                        <button onClick={() => setEditing(e => !e)} className='font-sans text-[0.68rem] uppercase tracking-luxe text-ink-soft hover:text-ink'>
                            {editing ? 'Cancel' : 'Edit courier'}
                        </button>
                    )}
                </div>
            </div>

            {editing && (
                <div className='border border-line bg-surface p-6'>
                    <ShipFields value={details} onChange={setDetails} />
                    <button onClick={saveDetails} disabled={busy} className='btn-solid mt-4 disabled:opacity-40'>Save</button>
                </div>
            )}

            <TrackingTimeline shipment={order.shipment} />

            {order.orderStatus === 'Shipped' && (
                <div className='border border-line bg-surface p-6'>
                    <p className='eyebrow'>Add tracking event</p>
                    <p className='mt-2 font-sans text-xs text-ink-faint'>
                        Out for delivery, failed attempts and delays email the customer. “Delivered” completes the order.
                    </p>
                    <div className='mt-4 grid gap-3 sm:grid-cols-3'>
                        <select className={inputClass} value={event.status} onChange={e => setEvent({ ...event, status: e.target.value })}>
                            {EVENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <input className={inputClass} placeholder='Location' value={event.location} onChange={e => setEvent({ ...event, location: e.target.value })} />
                        <input className={inputClass} placeholder='Note (optional)' value={event.note} onChange={e => setEvent({ ...event, note: e.target.value })} />
                    </div>
                    <button onClick={addEvent} disabled={busy} className='btn-solid mt-4 disabled:opacity-40'>Add event</button>
                </div>
            )}
        </div>
    );
};

export default ShipmentPanel;
