import React from 'react';
import { classNames } from '~/utils/classNames';

export const DatabasePanel = () => {
    return (
        <div className="h-full w-full flex flex-col items-center justify-center bg-nortex-elements-background-depth-2">
            <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 text-emerald-500">
                    <div className="i-ph:lightning-fill text-6xl" />
                </div>
                <button className="px-4 py-2 bg-nortex-elements-item-backgroundAccent hover:bg-nortex-elements-item-backgroundActive text-nortex-elements-item-contentAccent rounded-md font-medium transition-colors border border-nortex-elements-borderColor">
                    Set up database
                </button>
            </div>
        </div>
    );
};
