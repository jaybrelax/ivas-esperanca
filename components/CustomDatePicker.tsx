import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CustomDatePickerProps {
  value: string;
  onChange: (value: string) => void;
}

export function CustomDatePicker({ value, onChange }: CustomDatePickerProps) {
  const [currentDate, setCurrentDate] = useState(() => {
    return value ? new Date(value + 'T12:00:00') : new Date();
  });
  
  const selectedDate = value ? new Date(value + 'T12:00:00') : null;

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleDaySelect = (day: number) => {
    const selected = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const offset = selected.getTimezoneOffset()
    selected.setMinutes(selected.getMinutes() - offset)
    const formatted = selected.toISOString().split('T')[0];
    onChange(formatted);
  };

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const daysOfWeek = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  return (
    <div className="bg-[#0b1220]/70 p-4 border border-indigo-500/20 rounded-xl shadow-lg w-full max-w-sm mx-auto">
      <div className="flex justify-between items-center mb-4">
        <button
          type="button"
          onClick={prevMonth}
          className="p-1.5 hover:bg-white/10 rounded-lg text-indigo-300 transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="font-bold text-white text-sm uppercase tracking-wide">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </div>
        <button
          type="button"
          onClick={nextMonth}
          className="p-1.5 hover:bg-white/10 rounded-lg text-indigo-300 transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>
      
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {daysOfWeek.map((day, idx) => (
          <div key={idx} className="text-[10px] font-black text-indigo-400/60 uppercase">
            {day}
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-1 text-center">
        {Array.from({ length: firstDay }).map((_, idx) => (
          <div key={`empty-${idx}`} className="h-8" />
        ))}
        {Array.from({ length: daysInMonth }).map((_, idx) => {
          const dayNumber = idx + 1;
          const isSelected = selectedDate?.getDate() === dayNumber &&
                             selectedDate?.getMonth() === currentDate.getMonth() &&
                             selectedDate?.getFullYear() === currentDate.getFullYear();
                             
          const isToday = new Date().getDate() === dayNumber &&
                          new Date().getMonth() === currentDate.getMonth() &&
                          new Date().getFullYear() === currentDate.getFullYear();
                          
          return (
            <button
              key={dayNumber}
              type="button"
              onClick={() => handleDaySelect(dayNumber)}
              className={`h-8 w-full rounded-md text-xs font-medium flex items-center justify-center transition-all cursor-pointer ${
                isSelected 
                  ? 'bg-indigo-500 text-white shadow-[0_0_10px_rgba(99,102,241,0.5)] scale-110 relative z-10' 
                  : isToday
                  ? 'bg-white/10 text-white border border-white/20 hover:bg-white/20'
                  : 'text-indigo-100/70 hover:bg-indigo-500/20 hover:text-white'
              }`}
            >
              {dayNumber}
            </button>
          );
        })}
      </div>
    </div>
  );
}
