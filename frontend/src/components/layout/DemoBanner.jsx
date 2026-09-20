import React from 'react';
import { useSelector } from 'react-redux';

const DemoBanner = () => {
    const { user } = useSelector((state) => state.user);

    if (!user?.isDemo) return null;

    return (
        <div className="border-b border-indigo-400/30 bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-700 text-white shadow-md">
            <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
                <div className="flex flex-col items-center justify-center gap-2 text-center sm:flex-row sm:gap-4">
                    <span className="inline-flex shrink-0 items-center rounded-full border border-white/30 bg-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm sm:text-xs">
                        🎭 Demo Mode
                    </span>

                    <p className="m-0 text-xs font-medium leading-relaxed sm:text-sm">
                        You're exploring a shared demonstration account.
                        Payments and destructive actions are disabled.
                    </p>
                </div>

                <div className="mt-1.5 text-center">
                    <span className="text-[10px] font-normal text-white/90 sm:text-xs">
                        This is a read-only experience. Explore MAISON and its
                        features freely.
                    </span>
                </div>
            </div>
        </div>
    );
};

export default DemoBanner;
