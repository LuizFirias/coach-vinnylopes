import React from 'react';

interface MenuItem {
  name: string;
  icon: string;
}

const menuItems: MenuItem[] = [
  { name: 'TREINOS', icon: '🏋️' },
  { name: 'PLANO ALIMENTAR', icon: '🍎' },
  { name: 'MEDIDAS', icon: '📏' },
  { name: 'FOTOS', icon: '📸' },
  { name: 'PARCEIROS', icon: '🤝' },
  { name: 'MINI LOJA', icon: '🛒' },
  { name: 'RANKING', icon: '🏆' },
];

export default function Sidebar() {
  return (
    <div className="w-64 h-screen bg-coach-gray border-r border-coach-gold/20 flex flex-col">
      <div className="p-8 flex flex-col items-center">
        <h1 className="text-coach-gold font-bold text-xl tracking-tight">VINNY LOPES</h1>
        <p className="text-gray-500 text-[10px] tracking-[0.4em] font-light -mt-1">COACH</p>
      </div>
      
      <nav className="flex-1 px-4">
        {menuItems.map((item) => (
          <button 
            key={item.name} 
            className="w-full flex items-center gap-4 px-4 py-3 text-gray-400 hover:text-coach-gold hover:bg-white/5 rounded-lg transition-all mb-2 group"
          >
            <span className="group-hover:scale-110 transition-transform">{item.icon}</span>
            <span className="text-xs font-semibold tracking-wide">{item.name}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}