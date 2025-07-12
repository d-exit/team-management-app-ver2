// components/VenueBookingPage.tsx
// This component will handle searching for venues and booking them.
import React, { useState } from 'react';
import { Venue, Team } from '../types';

interface VenueBookingPageProps {
  venues: Venue[];
  teams: Team[]; // For identifying which team is booking
}

const prefectures = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
  '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
  '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
  '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'
];


const VenueBookingPage: React.FC<VenueBookingPageProps> = ({ venues, teams }) => {
  const [selectedPrefecture, setSelectedPrefecture] = useState<string>('');
  const [availableDate, setAvailableDate] = useState<string>('');
  const [filteredVenues, setFilteredVenues] = useState<Venue[]>(venues);
  const [showBookingForm, setShowBookingForm] = useState<Venue | null>(null);
  // Assuming our team is team-1 for booking for now
  const bookingTeam = teams.find(t => t.id === 'team-1'); 

  const handleSearch = () => {
    let results = venues;
    if (selectedPrefecture) {
      results = results.filter(v => v.prefecture === selectedPrefecture);
    }
    if (availableDate) {
      results = results.filter(v => v.availableDates.includes(availableDate));
    }
    setFilteredVenues(results);
  };
  
  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would submit to a backend.
    alert(`会場「${showBookingForm?.name}」の予約リクエストを行いました。(仮)`);
    setShowBookingForm(null);
  };


  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-semibold text-sky-300">会場予約</h2>

      {/* Search Filters */}
      <div className="bg-slate-800 p-6 rounded-xl shadow-xl space-y-4 md:space-y-0 md:flex md:gap-4 items-end">
        <div>
          <label htmlFor="prefecture" className="block text-sm font-medium text-slate-300 mb-1">都道府県</label>
          <select 
            id="prefecture" 
            value={selectedPrefecture} 
            onChange={(e) => setSelectedPrefecture(e.target.value)}
            className="w-full md:w-auto bg-slate-700 border border-slate-600 text-white rounded-md p-2 focus:ring-sky-500 focus:border-sky-500"
          >
            <option value="">すべて</option>
            {prefectures.map(pref => <option key={pref} value={pref}>{pref}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="availableDate" className="block text-sm font-medium text-slate-300 mb-1">空き日程</label>
          <input 
            type="date" 
            id="availableDate" 
            value={availableDate} 
            onChange={(e) => setAvailableDate(e.target.value)}
            className="w-full md:w-auto bg-slate-700 border border-slate-600 text-white rounded-md p-2 focus:ring-sky-500 focus:border-sky-500"
          />
        </div>
        <button 
          onClick={handleSearch}
          className="w-full md:w-auto bg-sky-500 hover:bg-sky-600 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition duration-150"
        >
          検索
        </button>
      </div>

      {/* Venue List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVenues.length > 0 ? filteredVenues.map(venue => (
          <div key={venue.id} className="bg-slate-800 rounded-xl shadow-2xl overflow-hidden">
            {venue.imageUrl && <img src={venue.imageUrl} alt={venue.name} className="w-full h-48 object-cover"/>}
            <div className="p-6">
              <h3 className="text-xl font-bold text-sky-400 mb-2">{venue.name}</h3>
              <p className="text-sm text-slate-400 mb-1">{venue.prefecture}{venue.city ? `, ${venue.city}` : ''}</p>
              <p className="text-sm text-slate-400 mb-1">{venue.address}</p>
              {venue.capacity && <p className="text-sm text-slate-400 mb-1">収容人数: {venue.capacity}人</p>}
              {venue.pricePerHour && <p className="text-sm text-slate-400 mb-3">料金: ¥{venue.pricePerHour.toLocaleString()}/時間</p>}
              <button 
                onClick={() => setShowBookingForm(venue)}
                className="mt-4 w-full bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition"
              >
                予約申込へ
              </button>
            </div>
          </div>
        )) : <p className="text-slate-400 md:col-span-3 text-center py-8">該当する会場が見つかりませんでした。</p>}
      </div>

      {/* Booking Form Modal (Simplified) */}
      {showBookingForm && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 p-8 rounded-xl shadow-2xl w-full max-w-lg space-y-6">
            <h3 className="text-2xl font-semibold text-sky-400">予約申込: {showBookingForm.name}</h3>
            <form onSubmit={handleBookingSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">チーム名</label>
                <input type="text" value={bookingTeam?.name || '自チーム'} readOnly className="w-full bg-slate-700 border-slate-600 text-slate-400 rounded-md p-2"/>
              </div>
              <div>
                <label htmlFor="booking_date" className="block text-sm font-medium text-slate-300 mb-1">希望日</label>
                <input type="date" id="booking_date" required className="w-full bg-slate-700 border border-slate-600 text-white rounded-md p-2"/>
              </div>
               <div>
                <label htmlFor="booking_time" className="block text-sm font-medium text-slate-300 mb-1">希望時間</label>
                <input type="time" id="booking_time" required className="w-full bg-slate-700 border border-slate-600 text-white rounded-md p-2"/>
              </div>
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-slate-300 mb-1">備考</label>
                <textarea id="notes" rows={3} className="w-full bg-slate-700 border border-slate-600 text-white rounded-md p-2" placeholder="特記事項があれば入力してください"></textarea>
              </div>
              <p className="text-xs text-slate-500">決済フローは現在スタブです。このフォームは予約リクエストとして扱われます。</p>
              <div className="flex gap-4 pt-2">
                <button type="button" onClick={() => setShowBookingForm(null)} className="w-1/2 bg-slate-600 hover:bg-slate-500 text-white font-semibold py-2 px-4 rounded-lg transition">キャンセル</button>
                <button type="submit" className="w-1/2 bg-sky-500 hover:bg-sky-600 text-white font-semibold py-2 px-4 rounded-lg transition">予約リクエスト送信</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default VenueBookingPage;