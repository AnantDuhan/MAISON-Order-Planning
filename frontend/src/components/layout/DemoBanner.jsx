import React from 'react';
import { useSelector } from 'react-redux';

const DemoBanner = () => {
    const { user } = useSelector((state) => state.user);

    if (!user?.isDemo) return null;

    return (
        <div className="border-b border-brass/30 bg-[#faf8f4] text-ink">
            <div className="mx-auto flex min-h-10 max-w-7xl items-center justify-center px-4 py-2.5 sm:px-6 lg:px-8">
                <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center">
                    {/* Demo label */}
                    <span className="inline-flex items-center gap-1.5 font-sans text-[0.62rem] font-semibold uppercase tracking-luxe text-brass">
                        <span
                            className="h-1.5 w-1.5 rounded-full bg-brass"
                            aria-hidden="true"
                        />
                        Demo
                    </span>

                    {/* Divider */}
                    <span
                        className="hidden h-3 w-px bg-line sm:block"
                        aria-hidden="true"
                    />

                    {/* Message */}
                    <span className="font-sans text-[0.68rem] tracking-wide text-ink-soft sm:text-[0.72rem]">
                        You're exploring a shared MAISON demonstration account.
                    </span>

                    {/* Read-only indicator */}
                    <span className="font-sans text-[0.62rem] uppercase tracking-luxe text-ink-faint">
                        Read-only
                    </span>
                </div>
            </div>
        </div>
    );
};

export default DemoBanner;
