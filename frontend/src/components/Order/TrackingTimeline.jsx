import React from 'react';

const DOT = {
    Delivered: 'bg-success',
    'Delivery attempted': 'bg-danger',
    Delayed: 'bg-danger',
    'Returning to sender': 'bg-danger',
};

const formatWhen = value => new Date(value).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
});

// Customer-facing shipment timeline, newest first.
const TrackingTimeline = ({ shipment }) => {
    if (!shipment || !shipment.events?.length) return null;
    const events = [...shipment.events].sort((a, b) => new Date(b.at) - new Date(a.at));

    return (
        <div className='border border-line bg-surface p-6'>
            <p className='eyebrow'>Tracking</p>
            {shipment.awb && (
                <p className='mt-4 font-sans text-sm text-ink'>
                    {shipment.courier || 'Courier'} · <span className='font-mono text-xs tracking-wider'>{shipment.awb}</span>
                </p>
            )}
            {shipment.trackingUrl && (
                <a
                    href={shipment.trackingUrl}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='mt-2 inline-block font-sans text-[0.68rem] uppercase tracking-luxe text-brass hover:opacity-70'
                >
                    Track on courier site ↗
                </a>
            )}

            <ol className='mt-6 space-y-5 border-l border-line pl-5'>
                {events.map((event, index) => (
                    <li key={`${event.status}-${event.at}-${index}`} className='relative'>
                        <span
                            className={`absolute -left-[1.6rem] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-surface ${index === 0 ? (DOT[event.status] || 'bg-brass') : 'bg-line'}`}
                        />
                        <p className={`font-sans text-sm ${index === 0 ? 'text-ink' : 'text-ink-soft'}`}>{event.status}</p>
                        <p className='font-sans text-xs text-ink-faint'>
                            {formatWhen(event.at)}{event.location ? ` · ${event.location}` : ''}
                        </p>
                        {event.note && index === 0 && (
                            <p className='mt-1 font-sans text-xs text-ink-soft'>{event.note}</p>
                        )}
                    </li>
                ))}
            </ol>
        </div>
    );
};

export default TrackingTimeline;
