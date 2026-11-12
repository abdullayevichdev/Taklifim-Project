import React from 'react';
import { ScheduleItem, Language } from '../../types';
import { Clock } from 'lucide-react';

interface SharedScheduleProps {
  schedule: ScheduleItem[];
  language?: Language;
  primaryColor?: string;
  isDarkTheme?: boolean;
  headingFont?: string;
}

export const SharedSchedule: React.FC<SharedScheduleProps> = ({
  schedule,
  language = 'uz',
  primaryColor = '#B48B47',
  isDarkTheme = false,
  headingFont = 'Playfair Display',
}) => {
  if (!schedule || schedule.length === 0) return null;

  const titles = {
    uz: { section: 'Kun tartibi', subtitle: 'Tantanamizning rejalashtirilgan dasturi' },
    ru: { section: 'Программа дня', subtitle: 'Расписание свадебного торжества' },
    en: { section: 'Order of Events', subtitle: 'Celebration program & timeline' },
  }[language] || { section: 'Kun tartibi', subtitle: 'Tantanamizning rejalashtirilgan dasturi' };

  return (
    <div className="space-y-4 text-center">
      <div>
        <span className="text-[11px] uppercase tracking-widest font-bold" style={{ color: primaryColor }}>
          {titles.section}
        </span>
        <h3 className={`text-xl sm:text-2xl font-bold mt-1 ${isDarkTheme ? 'text-white' : 'text-[#231E1B]'}`} style={{ fontFamily: headingFont }}>
          {titles.subtitle}
        </h3>
      </div>

      <div className="space-y-2.5 max-w-md mx-auto text-left">
        {schedule.map((item, idx) => {
          const title = typeof item.title === 'string' ? item.title : (item.title as any)[language] || item.title.uz;
          const desc = item.description ? (typeof item.description === 'string' ? item.description : (item.description as any)[language] || item.description?.uz) : '';

          return (
            <div
              key={item.id || idx}
              className={`p-3.5 rounded-2xl flex items-center gap-3.5 border transition-all ${
                isDarkTheme
                  ? 'bg-white/5 border-white/10 text-white'
                  : 'bg-white/80 border-black/5 text-[#231E1B] shadow-xs'
              }`}
            >
              <div
                className="px-2.5 py-1 rounded-xl text-xs font-mono font-bold shrink-0 flex items-center gap-1 shadow-xs"
                style={{
                  backgroundColor: isDarkTheme ? `${primaryColor}25` : `${primaryColor}15`,
                  color: primaryColor,
                  border: `1px solid ${primaryColor}35`,
                }}
              >
                <Clock className="w-3 h-3" />
                <span>{item.time}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs sm:text-sm font-bold truncate">{title}</div>
                {desc && (
                  <div className={`text-[11px] truncate ${isDarkTheme ? 'text-white/60' : 'text-[#7A6A63]'}`}>
                    {desc}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
