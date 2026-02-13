import React from 'react';
import { useNavigate } from 'react-router-dom';

interface ErrorPageProps {
    type: '404' | '403' | '401';
}

const ErrorPage: React.FC<ErrorPageProps> = ({ type }) => {
    const navigate = useNavigate();

    const config = {
        '404': {
            code: '404',
            title: 'Page Not Found',
            message: "The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.",
            icon: 'travel_explore'
        },
        '403': {
            code: '403',
            title: 'Forbidden',
            message: "You are logged in but do not have permission to access this resource.",
            icon: 'gpp_bad'
        },
        '401': {
            code: '401',
            title: 'Authentication Required',
            message: "You must be logged in to access this page.",
            icon: 'lock'
        }
    };

    const { code, title, message, icon } = config[type];

    return (
        <div className="min-h-screen flex items-center justify-center p-6">
            <div className="text-center space-y-8 animate-fadeIn max-w-lg mx-auto">

                {/* Abstract Background Elements */}
                <div className="relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-green-500/10 dark:bg-green-500/5 rounded-full blur-3xl animate-pulse"></div>

                    <div className="relative z-10 w-32 h-32 mx-auto bg-gradient-to-tr from-green-50 to-white dark:from-gray-800 dark:to-gray-700 rounded-[2.5rem] shadow-xl border border-white/50 dark:border-gray-600 flex items-center justify-center transform hover:scale-105 transition-transform duration-500">
                        <span className="material-icons-outlined text-6xl text-[#2E7D32]">{icon}</span>
                    </div>
                </div>

                <div className="space-y-4">
                    <h1 className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#2E7D32] to-green-600 tracking-tighter filter drop-shadow-sm">
                        {code}
                    </h1>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white uppercase tracking-wider">
                        {title}
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 font-medium leading-relaxed max-w-md mx-auto">
                        {message}
                    </p>
                </div>

                <div className="pt-8 flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                        onClick={() => navigate(-1)}
                        className="px-8 py-4 rounded-2xl bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-black text-xs uppercase tracking-[0.2em] shadow-lg hover:shadow-xl hover:-translate-y-1 border border-gray-100 dark:border-gray-700 transition-all flex items-center justify-center gap-2"
                    >
                        <span className="material-icons-outlined text-base">arrow_back</span>
                        Go Back
                    </button>

                    <button
                        onClick={() => navigate('/')}
                        className="px-8 py-4 rounded-2xl bg-[#2E7D32] text-white font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-green-200 dark:shadow-none hover:shadow-xl hover:-translate-y-1 hover:bg-green-700 transition-all flex items-center justify-center gap-2"
                    >
                        <span className="material-icons-outlined text-base">home</span>
                        Go Home
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ErrorPage;
