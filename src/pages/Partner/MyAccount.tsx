
import React, { useState } from 'react';
import { useGlobalState } from '@/context';

const MyAccount: React.FC = () => {
    const { currentUser, updateUser, showAlert } = useGlobalState();

    const [formData, setFormData] = useState({
        name: currentUser?.name || '',
        email: currentUser?.email || '',
        mobile: currentUser?.mobile || '',
        password: '',
        confirmPassword: ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;

        if (formData.password && formData.password !== formData.confirmPassword) {
            showAlert('Password Mismatch', 'New password and confirmation do not match.', 'warning');
            return;
        }

        setIsSubmitting(true);
        try {
            const updates: any = {
                name: formData.name,
                email: formData.email,
                mobile: formData.mobile
            };

            if (formData.password) {
                updates.password = formData.password;
            }

            await updateUser(currentUser.id, updates);
            showAlert('Profile Updated', 'Your account information has been updated successfully.', 'success');
            setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
        } catch (err: any) {
            showAlert('Update Failed', err.message || 'Failed to update profile.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white tracking-tight">Account Settings</h2>
                <p className="text-gray-500 dark:text-gray-400">Manage your partner profile and security credentials.</p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-5 py-4 rounded-2xl border-2 border-gray-50 dark:border-gray-700 dark:bg-gray-700 dark:text-white focus:border-[#2E7D32] outline-none transition-all font-bold"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
                            <input
                                type="email"
                                required
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full px-5 py-4 rounded-2xl border-2 border-gray-50 dark:border-gray-700 dark:bg-gray-700 dark:text-white focus:border-[#2E7D32] outline-none transition-all font-bold"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Mobile Number</label>
                        <input
                            type="tel"
                            required
                            value={formData.mobile}
                            onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                            className="w-full px-5 py-4 rounded-2xl border-2 border-gray-50 dark:border-gray-700 dark:bg-gray-700 dark:text-white focus:border-[#2E7D32] outline-none transition-all font-bold"
                        />
                    </div>

                    <div className="pt-6 border-t dark:border-gray-700 mt-6">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6">Security Update (Optional)</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">New Password</label>
                                <input
                                    type="password"
                                    placeholder="Leave blank to keep current"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full px-5 py-4 rounded-2xl border-2 border-gray-50 dark:border-gray-700 dark:bg-gray-700 dark:text-white focus:border-[#2E7D32] outline-none transition-all font-bold"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Confirm Password</label>
                                <input
                                    type="password"
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    className="w-full px-5 py-4 rounded-2xl border-2 border-gray-50 dark:border-gray-700 dark:bg-gray-700 dark:text-white focus:border-[#2E7D32] outline-none transition-all font-bold"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-8">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-4 bg-[#2E7D32] hover:bg-[#256628] text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-green-200 dark:shadow-none transition-all active:scale-[0.98] disabled:opacity-50"
                        >
                            {isSubmitting ? 'Processing Update...' : 'Update Account Information'}
                        </button>
                    </div>
                </form>
            </div>

            <div className="p-8 bg-blue-50 dark:bg-blue-900/10 rounded-[2.5rem] border border-blue-100 dark:border-blue-900/30 flex items-start space-x-6">
                <span className="material-icons-outlined text-blue-600 text-3xl">shield</span>
                <div className="space-y-2">
                    <p className="text-[11px] font-black text-blue-600 uppercase tracking-widest">Security Note</p>
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-300 leading-relaxed">
                        Updating your email or password will not log you out of your current session. Ensure you are using a strong, unique password for your account.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default MyAccount;
