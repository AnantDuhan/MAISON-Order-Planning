import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const when = value => new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * Devices where the user chose "don't ask for a 2FA code". Removing one means
 * that device asks for a code again at the next sign-in.
 */
const TrustedDevices = () => {
    const [data, setData] = useState(null);
    const [busy, setBusy] = useState(false);

    const load = useCallback(() => {
        axios.get('/api/v1/2fa/trusted-devices')
            .then(({ data: body }) => setData(body))
            .catch(() => setData({ devices: [] }));
    }, []);
    useEffect(load, [load]);

    const revoke = async id => {
        setBusy(true);
        try {
            await axios.delete(id ? `/api/v1/2fa/trusted-devices/${id}` : '/api/v1/2fa/trusted-devices');
            toast.success(id ? 'That device will ask for a code again.' : 'Every device will ask for a code again.');
            load();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Could not update trusted devices');
        } finally {
            setBusy(false);
        }
    };

    if (!data) return null;
    const devices = data.devices || [];

    return (
        <div className="mt-8 border-t border-line pt-6">
            <p className="font-sans text-sm font-medium text-ink">Ask for a code</p>
            {devices.length === 0 ? (
                <p className="mt-2 font-sans text-sm text-ink-soft">
                    Every time you sign in, on every device. To skip it on a device you trust, choose
                    “Don’t ask again on this device” when you next enter a code.
                </p>
            ) : (
                <>
                    <p className="mt-2 font-sans text-sm text-ink-soft">
                        Every time, except on these devices (for {data.trustDays || 30} days from when you chose it):
                    </p>
                    <ul className="mt-4 divide-y divide-line border-y border-line">
                        {devices.map(device => (
                            <li key={device._id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                                <div>
                                    <p className="font-sans text-sm text-ink">
                                        {device.label}
                                        {device.current && (
                                            <span className="ml-2 font-sans text-[0.65rem] uppercase tracking-luxe text-brass">This device</span>
                                        )}
                                    </p>
                                    <p className="font-sans text-xs text-ink-faint">
                                        Last used {when(device.lastUsedAt)} · until {when(device.expiresAt)}
                                    </p>
                                </div>
                                <button
                                    onClick={() => revoke(device._id)}
                                    disabled={busy}
                                    className="font-sans text-[0.68rem] uppercase tracking-luxe text-ink-soft hover:text-danger disabled:opacity-40"
                                >
                                    Ask again
                                </button>
                            </li>
                        ))}
                    </ul>
                    {devices.length > 1 && (
                        <button onClick={() => revoke(null)} disabled={busy} className="btn-outline mt-4 disabled:opacity-40">
                            Ask on every device
                        </button>
                    )}
                </>
            )}
        </div>
    );
};

export default TrustedDevices;
