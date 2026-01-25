
import React, { useState } from 'react';
import { useGlobalState } from '@/context';

const AdminBanners: React.FC = () => {
  const { banners, updateBanner, darkMode } = useGlobalState();
  const banner = banners[0] || { id: 'B1', title: '', imageUrl: '', endDate: new Date().toISOString() };

  const [formData, setFormData] = useState({
    title: banner.title,
    imageUrl: banner.imageUrl,
    endDate: banner.endDate.split('.')[0]
  });

  const [isSaved, setIsSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateBanner(banner.id, {
      title: formData.title,
      imageUrl: formData.imageUrl,
      endDate: new Date(formData.endDate).toISOString()
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white tracking-tight">Banner & Promotion Management</h2>
        <p className="text-gray-500 dark:text-gray-400">Update the hero banner and countdown timer shown to all partners.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-black text-gray-800 dark:text-white mb-6 uppercase tracking-widest">Promotion Details</h3>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-2">Banner Title</label>
              <input
                type="text"
                required
                className="w-full px-5 py-4 rounded-2xl border-2 border-gray-50 dark:border-gray-700 dark:bg-gray-700 dark:text-white focus:border-[#2E7D32] outline-none transition-all font-bold"
                placeholder="e.g. Grand Diwali Offer - 2x Commission!"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-2">Background Image URL</label>
              <input
                type="url"
                required
                className="w-full px-5 py-4 rounded-2xl border-2 border-gray-50 dark:border-gray-700 dark:bg-gray-700 dark:text-white focus:border-[#2E7D32] outline-none transition-all font-bold"
                placeholder="https://images.unsplash.com/..."
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              />
              <p className="mt-2 text-[10px] text-gray-400 font-medium italic">Recommended size: 1200x400px</p>
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-2">Countdown End Date & Time</label>
              <input
                type="datetime-local"
                required
                className="w-full px-5 py-4 rounded-2xl border-2 border-gray-50 dark:border-gray-700 dark:bg-gray-700 dark:text-white focus:border-[#2E7D32] outline-none transition-all font-bold"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              />
            </div>

            <div className="pt-4">
              <button
                type="submit"
                className={`w-full py-4 rounded-2xl font-black text-white shadow-xl transition-all flex items-center justify-center space-x-2 ${isSaved ? 'bg-blue-500' : 'bg-[#2E7D32] hover:bg-[#256628]'
                  }`}
              >
                <span className="material-icons-outlined">
                  {isSaved ? 'check_circle' : 'save'}
                </span>
                <span>{isSaved ? 'Banner Updated Successfully' : 'Update Live Banner'}</span>
              </button>
            </div>
          </form>
        </div>

        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Real-time Preview</h3>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-sm opacity-80 pointer-events-none scale-95 origin-top">
            <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#2E7D32] to-[#0a310c] text-white p-6 shadow-xl">
              <div className="relative z-10">
                <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[8px] font-black uppercase tracking-widest">Promotion Preview</span>
                <h2 className="text-2xl font-black mt-4 mb-2 tracking-tighter">{formData.title || 'Enter Title...'}</h2>
                <div className="bg-white/10 backdrop-blur-xl p-4 rounded-2xl border border-white/20 mt-4 text-center">
                  <div className="flex space-x-3 justify-center">
                    {['00', '00', '00', '00'].map((v, i) => (
                      <div key={i} className="flex flex-col">
                        <span className="text-xl font-black tracking-tighter">{v}</span>
                        <span className="text-[6px] font-black uppercase opacity-60">
                          {['Days', 'Hrs', 'Min', 'Sec'][i]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {formData.imageUrl && (
                <img src={formData.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminBanners;
