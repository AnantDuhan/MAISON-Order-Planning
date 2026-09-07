import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

import MetaData from '../layout/MetaData';

const inr = value => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const MembershipAnalytics = () => {
    const [analytics, setAnalytics] = useState(null);

    useEffect(() => {
        axios.get('/api/v1/admin/membership-analytics')
            .then(({ data }) => setAnalytics(data.analytics))
            .catch(error => toast.error(error.response?.data?.message || 'Could not load membership analytics.'));
    }, []);

    const summary = analytics?.summary || {};
    const statuses = analytics?.statusBreakdown || [];
    const plans = analytics?.planBreakdown || [];
    const members = analytics?.recentMembers || [];

    return (
        <div className='editorial-shell py-12'>
            <MetaData title='Membership Analytics · Admin' />
            <div className='mb-10'>
                <p className='eyebrow'>Admin</p>
                <h1 className='heading-display mt-2 text-display'>Memberships</h1>
            </div>

            <div className='grid gap-6 sm:grid-cols-3'>
                <div className='border border-line bg-ink px-7 py-8 text-canvas'>
                    <p className='eyebrow !text-brass-soft'>Members</p>
                    <p className='mt-3 font-display text-4xl'>{summary.total || 0}</p>
                </div>
                <div className='border border-line bg-surface px-7 py-8'>
                    <p className='eyebrow'>Active</p>
                    <p className='mt-3 font-display text-4xl text-ink'>{summary.active || 0}</p>
                </div>
                <div className='border border-line bg-surface px-7 py-8'>
                    <p className='eyebrow'>Monthly Recurring Revenue</p>
                    <p className='mt-3 font-display text-4xl text-ink'>{inr(summary.recurringRevenue)}</p>
                </div>
            </div>

            <div className='mt-10 grid gap-6 lg:grid-cols-2'>
                <section>
                    <p className='eyebrow'>Plan Mix</p>
                    <div className='mt-5 border border-line bg-surface'>
                        {plans.length === 0 && <p className='p-6 font-sans text-sm text-ink-faint'>No memberships yet.</p>}
                        {plans.map(plan => (
                            <div key={plan.planId} className='flex items-center justify-between border-b border-line p-5 last:border-0'>
                                <div>
                                    <p className='font-sans text-sm text-ink'>{plan.planId}</p>
                                    <p className='mt-1 font-sans text-xs text-ink-faint'>{inr(plan.amount)} · {plan.members} members</p>
                                </div>
                                <span className='font-sans text-sm text-brass'>{plan.active} active</span>
                            </div>
                        ))}
                    </div>
                </section>
                <section>
                    <p className='eyebrow'>Status Breakdown</p>
                    <div className='mt-5 border border-line bg-surface'>
                        {statuses.length === 0 && <p className='p-6 font-sans text-sm text-ink-faint'>No membership activity yet.</p>}
                        {statuses.map(status => (
                            <div key={status.status} className='flex items-center justify-between border-b border-line p-5 last:border-0'>
                                <span className='font-sans text-sm text-ink'>{status.status}</span>
                                <span className='font-sans text-sm text-ink-soft'>{status.count}</span>
                            </div>
                        ))}
                    </div>
                </section>
            </div>

            <section className='mt-10'>
                <p className='eyebrow'>Recent Membership Activity</p>
                <div className='mt-5 overflow-x-auto border border-line bg-surface'>
                    <table className='w-full min-w-[620px] text-left'>
                        <thead className='border-b border-line'>
                            <tr>
                                <th className='p-4 eyebrow'>Customer</th>
                                <th className='p-4 eyebrow'>Plan</th>
                                <th className='p-4 eyebrow'>Status</th>
                                <th className='p-4 eyebrow'>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {members.map(member => (
                                <tr key={member._id} className='border-b border-line last:border-0'>
                                    <td className='p-4 font-sans text-sm text-ink'>{member.user?.name || member.user?.email || 'Unknown customer'}</td>
                                    <td className='p-4 font-sans text-sm text-ink-soft'>{member.planId}</td>
                                    <td className='p-4 font-sans text-sm text-ink-soft'>{member.status}</td>
                                    <td className='p-4 font-sans text-sm text-ink'>{inr(member.amount)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
};

export default MembershipAnalytics;
