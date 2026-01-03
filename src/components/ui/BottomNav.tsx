import React from 'react';
import { Home, Image as ImageIcon, Compass } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStore } from '../../store/useStore';
import { cn } from '../../utils/cn';
import { soundManager } from '../../utils/SoundManager';

export const BottomNav: React.FC = () => {
    const { activeTab, setActiveTab } = useStore();

    const navItems = [
        { id: 'home', label: 'Início', icon: Home },
        { id: 'gallery', label: 'Galeria', icon: ImageIcon },
        { id: 'explore', label: 'Explorar', icon: Compass },
    ] as const;

    const handleTabChange = (tabId: 'home' | 'gallery' | 'explore') => {
        if (tabId !== activeTab) {
            soundManager.playClick();
            setActiveTab(tabId);
        }
    };

    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1, duration: 0.8 }}
                className="flex items-center gap-1.5 p-1.5 bg-white/95 backdrop-blur-3xl border border-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)]"
            >
                {navItems.map((item) => {
                    const isActive = activeTab === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => handleTabChange(item.id)}
                            className={cn(
                                "relative px-5 py-2.5 rounded-[1.5rem] flex items-center gap-2.5 transition-all duration-500",
                                isActive ? "text-emerald-800" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                            )}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="activeTabLight"
                                    className="absolute inset-0 bg-emerald-50 rounded-[1.5rem] border border-emerald-100"
                                    transition={{ type: "spring", bounce: 0.25, duration: 0.6 }}
                                />
                            )}

                            <item.icon
                                size={18}
                                className={cn("relative z-10 transition-transform duration-500", isActive && "scale-110")}
                                strokeWidth={isActive ? 2.5 : 2}
                            />

                            <motion.span
                                className="relative z-10 text-[10px] font-black uppercase tracking-[0.15em] origin-left"
                                animate={{
                                    width: isActive ? "auto" : 0,
                                    opacity: isActive ? 1 : 0,
                                    marginLeft: isActive ? 0 : -4
                                }}
                            >
                                {item.label}
                            </motion.span>
                        </button>
                    );
                })}
            </motion.div>
        </div>
    );
};
