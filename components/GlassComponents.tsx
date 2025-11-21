
import React, { InputHTMLAttributes, ButtonHTMLAttributes, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`glass rounded-2xl p-6 ${className}`}>
    {children}
  </div>
);

export const Button: React.FC<ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'success' }> = ({ 
  children, variant = 'primary', className = '', ...props 
}) => {
  const variants = {
    primary: 'bg-white/20 hover:bg-white/30 text-white border-white/40 shadow-lg shadow-white/5',
    secondary: 'bg-black/20 hover:bg-black/30 text-white/90 border-transparent',
    danger: 'bg-red-500/30 hover:bg-red-500/50 text-white border-red-400/50',
    success: 'bg-green-500/30 hover:bg-green-500/50 text-white border-green-400/50',
  };
  return (
    <button 
      className={`px-4 py-2 rounded-xl border backdrop-blur-sm transition-all duration-200 font-medium active:scale-95 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export const Input: React.FC<InputHTMLAttributes<HTMLInputElement> & { label?: string }> = ({ label, className = '', ...props }) => (
  <div className="mb-4">
    {label && <label className="block text-white/80 text-sm font-medium mb-1 ml-1">{label}</label>}
    <input 
      className={`w-full px-4 py-3 rounded-xl glass-input text-white placeholder-white/50 focus:ring-2 focus:ring-white/20 transition-all ${className}`}
      style={{ colorScheme: 'dark' }}
      {...props} 
    />
  </div>
);

export const Badge: React.FC<{ children: React.ReactNode; color?: 'red' | 'green' | 'blue' | 'yellow' }> = ({ children, color = 'blue' }) => {
  const colors = {
    red: 'bg-red-500/20 text-red-100 border-red-500/30',
    green: 'bg-green-500/20 text-green-100 border-green-500/30',
    blue: 'bg-blue-500/20 text-blue-100 border-blue-500/30',
    yellow: 'bg-yellow-500/20 text-yellow-100 border-yellow-500/30',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs border font-medium ${colors[color]}`}>
      {children}
    </span>
  );
};

// --- Portal Helper Component ---
const Portal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    if (typeof document === 'undefined') return null;
    return createPortal(children, document.body);
};

// --- Custom Glass Select ---
export interface SelectOption {
  label: string;
  value: string | number;
}

interface SelectProps {
  label?: string;
  value: string | number;
  onChange: (e: { target: { value: any } }) => void; 
  options: SelectOption[];
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export const Select: React.FC<SelectProps> = ({ label, value, onChange, options, className = '', placeholder = 'Select...', disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    const updatePosition = () => {
        if (isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setCoords({ top: rect.bottom + window.scrollY, left: rect.left + window.scrollX, width: rect.width });
        }
    };
    
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    
    return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
         // Also check if clicking inside the portal content (which is tricky without ref to portal content directly, but simplistic approach works for now if we rely on z-index/focus)
         // Actually, easier to just close on any click outside the trigger.
         // We add a backdrop for the portal to handle 'click outside' logic properly.
      }
    };
    // document.addEventListener('mousedown', handleClickOutside);
    // return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (optionValue: string | number) => {
    onChange({ target: { value: optionValue } });
    setIsOpen(false);
  };

  const selectedOption = options.find(opt => String(opt.value) === String(value));

  return (
    <div className={`mb-4 relative ${className}`} ref={containerRef}>
      {label && <label className="block text-white/80 text-sm font-medium mb-1 ml-1">{label}</label>}
      
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full px-4 py-3 rounded-xl glass-input flex items-center justify-between transition-all group
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-white/20'}
        `}
      >
        <span className={`font-medium truncate ${selectedOption ? 'text-white' : 'text-white/50'}`}>
            {selectedOption ? selectedOption.label : placeholder}
        </span>
        <i className={`fas fa-chevron-down text-white/60 text-xs transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}></i>
      </div>

      {isOpen && !disabled && (
        <Portal>
             {/* Invisible backdrop to close on click outside */}
             <div className="fixed inset-0 z-[9998]" onClick={() => setIsOpen(false)}></div>
             <div 
                className="absolute z-[9999] animate-slide-down"
                style={{ top: coords.top + 8, left: coords.left, width: coords.width }}
             >
                <div className="bg-gray-900/95 backdrop-blur-2xl border border-white/30 rounded-2xl p-2 shadow-2xl shadow-black/50 max-h-60 overflow-y-auto custom-scrollbar">
                    {options.length === 0 ? (
                        <div className="px-4 py-3 text-white/50 text-sm text-center">No options</div>
                    ) : (
                        options.map((opt) => {
                            const isSelected = String(opt.value) === String(value);
                            return (
                                <div 
                                    key={opt.value}
                                    onClick={() => handleSelect(opt.value)}
                                    className={`
                                        px-4 py-3 rounded-xl text-sm cursor-pointer transition-all duration-200 mb-1 last:mb-0 flex items-center justify-between
                                        ${isSelected 
                                            ? 'bg-white/25 border border-white/40 text-white font-bold shadow-lg' 
                                            : 'text-white/80 hover:bg-white/15 hover:text-white'
                                        }
                                    `}
                                >
                                    <span>{opt.label}</span>
                                    {isSelected && <i className="fas fa-check text-blue-300 text-xs"></i>}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </Portal>
      )}
    </div>
  );
};

// --- Custom Glass Date Picker ---
const daysOfWeek = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

interface GlassDatePickerProps {
  label?: string;
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  className?: string;
}

export const GlassDatePicker: React.FC<GlassDatePickerProps> = ({ label, value, onChange, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const dateValue = value ? new Date(value + 'T00:00:00') : new Date();
  const [viewDate, setViewDate] = useState(dateValue);

  useEffect(() => {
      if (isOpen && containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          // Simple collision detection for bottom edge
          const dropdownHeight = 350; 
          const spaceBelow = window.innerHeight - rect.bottom;
          let top = rect.bottom + window.scrollY;
          if (spaceBelow < dropdownHeight) {
               top = rect.top + window.scrollY - dropdownHeight - 10; // Flip up
          }
          setCoords({ top, left: rect.left + window.scrollX });
      }
  }, [isOpen]);

  useEffect(() => {
    if (value) {
       const newDate = new Date(value + 'T00:00:00');
       if(newDate.getMonth() !== viewDate.getMonth() || newDate.getFullYear() !== viewDate.getFullYear()) {
           setViewDate(newDate);
       }
    }
  }, [value]);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleDateClick = (day: number) => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onChange(dateStr);
    setIsOpen(false);
  };

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const blanks = Array(firstDayOfMonth).fill(null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className={`mb-4 relative ${className}`} ref={containerRef}>
      {label && <label className="block text-white/80 text-sm font-medium mb-1 ml-1">{label}</label>}
      
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 rounded-xl glass-input flex items-center justify-between cursor-pointer hover:bg-white/20 transition-all group"
      >
        <span className={`font-medium ${value ? 'text-white' : 'text-white/50'}`}>
            {value || 'Select Date'}
        </span>
        <i className={`fas fa-chevron-down text-white/60 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}></i>
      </div>

      {isOpen && (
        <Portal>
            <div className="fixed inset-0 z-[9998]" onClick={() => setIsOpen(false)}></div>
            <div 
                className="absolute z-[9999] animate-slide-down"
                style={{ top: coords.top + 8, left: coords.left }}
            >
                <div className="bg-gray-900/95 backdrop-blur-2xl border border-white/30 rounded-3xl p-4 shadow-2xl shadow-black/50 w-[300px]">
                    <div className="flex justify-between items-center mb-4 px-2">
                        <button onClick={handlePrevMonth} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/15 text-white transition-colors">
                            <i className="fas fa-chevron-left text-xs"></i>
                        </button>
                        <span className="text-white font-bold text-lg">{months[month]} {year}</span>
                        <button onClick={handleNextMonth} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/15 text-white transition-colors">
                            <i className="fas fa-chevron-right text-xs"></i>
                        </button>
                    </div>

                    <div className="grid grid-cols-7 mb-2 text-center">
                        {daysOfWeek.map(d => (
                            <span key={d} className="text-white/50 text-xs font-semibold uppercase">{d}</span>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                        {blanks.map((_, i) => <div key={`blank-${i}`} />)}
                        {days.map(day => {
                            const isSelected = value === `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();

                            return (
                                <div 
                                    key={day}
                                    onClick={() => handleDateClick(day)}
                                    className={`
                                        h-9 w-9 flex items-center justify-center rounded-xl text-sm cursor-pointer transition-all duration-200 relative
                                        ${isSelected 
                                            ? 'bg-white/25 border border-white/40 text-white font-bold shadow-lg' 
                                            : 'text-white/90 hover:bg-white/15 hover:scale-110'
                                        }
                                        ${isToday && !isSelected ? 'border border-white/20 bg-white/5' : ''}
                                    `}
                                >
                                    {day}
                                    {isToday && !isSelected && (
                                        <div className="absolute bottom-1 w-1 h-1 bg-blue-400 rounded-full"></div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </Portal>
      )}
    </div>
  );
};
