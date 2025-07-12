// components/SchedulePage.tsx
// This component will manage and display team schedules, including a calendar view.
import React, { useState, useMemo, useCallback } from 'react';
import { ScheduleEvent, ScheduleEventType } from '../types';

interface SchedulePageProps {
  events: ScheduleEvent[];
  teamId: string; // ID of the team whose schedule is being viewed/managed
  onUpdateEvents: React.Dispatch<React.SetStateAction<ScheduleEvent[]>>;
}

const getDaysInMonth = (year: number, month: number) : Date[] => {
  const date = new Date(year, month, 1);
  const days: Date[] = [];
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
};

const getDayName = (dayIndex: number) => ['日', '月', '火', '水', '木', '金', '土'][dayIndex];

const initialEventFormState : Omit<ScheduleEvent, 'id' | 'teamId'> = {
    title: '',
    type: ScheduleEventType.PRACTICE,
    date: new Date().toISOString().split('T')[0],
    startTime: '10:00',
    endTime: '12:00',
    location: '',
    description: '',
};

const SchedulePage: React.FC<SchedulePageProps> = ({ events, teamId, onUpdateEvents }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<ScheduleEvent | null>(null);
  const [eventFormData, setEventFormData] = useState<Omit<ScheduleEvent, 'id' | 'teamId'>>(initialEventFormState);
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const daysInMonth = useMemo(() => getDaysInMonth(year, month), [year, month]);
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 (Sun) - 6 (Sat)

  const eventsByDate = useMemo(() => {
    return events.reduce((acc, event) => {
      const dateKey = event.date;
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(event);
      return acc;
    }, {} as Record<string, ScheduleEvent[]>);
  }, [events]);
  
  const handleOpenAddModal = () => {
    setEventToEdit(null);
    setEventFormData(initialEventFormState);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (event: ScheduleEvent) => {
    setEventToEdit(event);
    setEventFormData({
        title: event.title,
        type: event.type,
        date: event.date,
        startTime: event.startTime,
        endTime: event.endTime,
        location: event.location,
        description: event.description
    });
    setIsModalOpen(true);
  };
  
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEventToEdit(null);
  };

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const handleToday = () => setCurrentDate(new Date());
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEventFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateEvents(prevEvents => {
      let newEvents: ScheduleEvent[];
      if (eventToEdit) { // Editing existing event
        const updatedEvent = { ...eventToEdit, ...eventFormData };
        newEvents = prevEvents.map(ev => ev.id === eventToEdit.id ? updatedEvent : ev);
      } else { // Adding new event
        const fullNewEvent: ScheduleEvent = {
          ...eventFormData,
          id: `event-${Date.now()}`,
          teamId: teamId,
        };
        newEvents = [...prevEvents, fullNewEvent];
      }
      // Sort the new array and return it for the state update
      return newEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.startTime.localeCompare(b.startTime));
    });
    handleCloseModal();
  };
  
  const handleDeleteEvent = (eventId: string) => {
    if(window.confirm('この予定を本当に削除しますか？')) {
        onUpdateEvents(prevEvents => prevEvents.filter(e => e.id !== eventId));
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-semibold text-sky-300">スケジュール</h2>
         <button
            onClick={handleOpenAddModal}
            className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-semibold py-2 px-6 rounded-lg shadow-md hover:shadow-lg transition"
        >
            予定を追加
        </button>
      </div>

      {/* Add/Edit Event Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSaveEvent} className="bg-slate-800 p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-lg space-y-4">
            <h3 className="text-2xl font-semibold text-sky-400 mb-3">{eventToEdit ? '予定の編集' : '新しい予定を追加'}</h3>
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-slate-300 mb-1">タイトル</label>
              <input type="text" name="title" id="title" value={eventFormData.title} onChange={handleInputChange} required className="w-full bg-slate-700 border border-slate-600 text-white rounded-md p-2"/>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor="type" className="block text-sm font-medium text-slate-300 mb-1">種類</label>
                    <select name="type" id="type" value={eventFormData.type} onChange={handleInputChange} className="w-full bg-slate-700 border border-slate-600 text-white rounded-md p-2">
                        {Object.values(ScheduleEventType).map(type => <option key={type} value={type}>{type}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="date" className="block text-sm font-medium text-slate-300 mb-1">日付</label>
                    <input type="date" name="date" id="date" value={eventFormData.date} onChange={handleInputChange} required className="w-full bg-slate-700 border border-slate-600 text-white rounded-md p-2"/>
                </div>
                 <div>
                    <label htmlFor="startTime" className="block text-sm font-medium text-slate-300 mb-1">開始時刻</label>
                    <input type="time" name="startTime" id="startTime" value={eventFormData.startTime} onChange={handleInputChange} required className="w-full bg-slate-700 border border-slate-600 text-white rounded-md p-2"/>
                </div>
                 <div>
                    <label htmlFor="endTime" className="block text-sm font-medium text-slate-300 mb-1">終了時刻</label>
                    <input type="time" name="endTime" id="endTime" value={eventFormData.endTime} onChange={handleInputChange} required className="w-full bg-slate-700 border border-slate-600 text-white rounded-md p-2"/>
                </div>
            </div>
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-slate-300 mb-1">場所</label>
              <input type="text" name="location" id="location" value={eventFormData.location} onChange={handleInputChange} className="w-full bg-slate-700 border border-slate-600 text-white rounded-md p-2"/>
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-slate-300 mb-1">詳細</label>
              <textarea name="description" id="description" value={eventFormData.description} onChange={handleInputChange} rows={3} className="w-full bg-slate-700 border border-slate-600 text-white rounded-md p-2"></textarea>
            </div>
            <div className="flex gap-4 pt-2">
                <button type="button" onClick={handleCloseModal} className="w-1/2 bg-slate-600 hover:bg-slate-500 text-white font-semibold py-2 px-4 rounded-lg transition">キャンセル</button>
                <button type="submit" className="w-1/2 bg-sky-500 hover:bg-sky-600 text-white font-semibold py-2 px-4 rounded-lg transition">{eventToEdit ? '保存' : '追加'}</button>
            </div>
          </form>
        </div>
      )}


      {/* Calendar Controls */}
      <div className="flex justify-between items-center bg-slate-800 p-4 rounded-xl shadow-xl">
        <button onClick={handlePrevMonth} className="px-4 py-2 bg-sky-600 hover:bg-sky-700 rounded-md">&lt; 前の月</button>
        <h3 className="text-xl font-semibold text-sky-300">{year}年 {month + 1}月</h3>
        <button onClick={handleToday} className="px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded-md">今日</button>
        <button onClick={handleNextMonth} className="px-4 py-2 bg-sky-600 hover:bg-sky-700 rounded-md">次の月 &gt;</button>
      </div>

      {/* Calendar Grid */}
      <div className="bg-slate-800 p-1 sm:p-2 rounded-xl shadow-xl overflow-x-auto">
        <div className="grid grid-cols-7 gap-px">
          {['日', '月', '火', '水', '木', '金', '土'].map(day => (
            <div key={day} className="text-center font-semibold text-sky-400 py-2 text-xs sm:text-sm">{day}</div>
          ))}
          {Array(firstDayOfMonth).fill(null).map((_, i) => <div key={`empty-${i}`} className="border border-slate-700 h-20 sm:h-28"></div>)}
          {daysInMonth.map(day => {
            const dayKey = day.toISOString().split('T')[0];
            const dayEvents = eventsByDate[dayKey] || [];
            const isToday = dayKey === new Date().toISOString().split('T')[0];
            return (
              <div key={dayKey} className={`border border-slate-700 p-1.5 sm:p-2 h-24 sm:h-32 overflow-y-auto ${isToday ? 'bg-sky-900/50' : ''}`}>
                <div className={`text-xs sm:text-sm font-medium ${isToday ? 'text-sky-300 font-bold' : 'text-slate-300'}`}>{day.getDate()}</div>
                <div className="mt-1 space-y-1">
                  {dayEvents.map(event => (
                    <div key={event.id} className={`p-1 rounded text-xs truncate ${
                        event.type === ScheduleEventType.MATCH ? 'bg-red-500/70 hover:bg-red-400/70' :
                        event.type === ScheduleEventType.PRACTICE ? 'bg-green-500/70 hover:bg-green-400/70' :
                        event.type === ScheduleEventType.MEETING ? 'bg-yellow-500/70 hover:bg-yellow-400/70' :
                        'bg-purple-500/70 hover:bg-purple-400/70'
                    } text-white`} title={`${event.title} (${event.startTime}-${event.endTime})`}>
                      {event.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Event List View for the month */}
      <div className="mt-8">
        <h3 className="text-2xl font-semibold text-sky-300 mb-4">{year}年 {month + 1}月の予定一覧</h3>
        {events.filter(e => new Date(e.date).getFullYear() === year && new Date(e.date).getMonth() === month).length > 0 ? (
            <ul className="space-y-3">
                {events
                    .filter(e => new Date(e.date).getFullYear() === year && new Date(e.date).getMonth() === month)
                    .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.startTime.localeCompare(b.startTime))
                    .map(event => (
                    <li key={event.id} className="bg-slate-800 p-4 rounded-lg shadow-lg flex justify-between items-center">
                        <div>
                            <p className="font-semibold text-sky-400 text-lg">{new Date(event.date).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })} ({getDayName(new Date(event.date).getDay())}) - {event.title} <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-sky-300">{event.type}</span></p>
                            <p className="text-sm text-slate-300">{event.startTime} - {event.endTime} {event.location && ` @ ${event.location}`}</p>
                            {event.description && <p className="text-sm text-slate-400 mt-1 whitespace-pre-line">{event.description}</p>}
                        </div>
                        <div className="flex gap-2 flex-shrink-0 ml-4">
                            <button onClick={() => handleOpenEditModal(event)} className="bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-1 px-3 text-xs rounded-md transition">編集</button>
                            <button onClick={() => handleDeleteEvent(event.id)} className="bg-red-600 hover:bg-red-700 text-white font-medium py-1 px-3 text-xs rounded-md transition">削除</button>
                        </div>
                    </li>
                ))}
            </ul>
        ) : (
            <p className="text-slate-400">この月の予定はありません。</p>
        )}
      </div>

    </div>
  );
};

export default SchedulePage;