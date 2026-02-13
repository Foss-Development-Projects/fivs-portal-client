import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { User, UserRole } from '@/types';
import ErrorPage from '../pages/ErrorPage';

interface GuardProps {
    user: User | null;
}

export const AuthGuard: React.FC<GuardProps> = ({ user }) => {
    if (!user) {
        return <ErrorPage type="401" />;
    }
    return <Outlet />;
};

export const AdminGuard: React.FC<GuardProps> = ({ user }) => {
    // Note: Usually nested inside AuthGuard, so user should exist.
    // But if used independently, we can double check or just check role.
    if (!user) {
        return <Navigate to="/" replace />;
    }

    if (user.role !== UserRole.ADMIN) {
        return <ErrorPage type="403" />;
    }

    return <Outlet />;
};
