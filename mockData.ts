import { Team, TeamLevel, Member, Match, MatchType, MatchStatus, Venue, ScheduleEvent, ScheduleEventType, PastMatchResult, ChatThread, ChatMessage, TournamentInfoFormData } from '../types';

// Members for Team 1
export const mockMembers1: Member[] = [
  { id: 'm1-1', name: '佐藤 太郎', jerseyNumber: 10, position: 'フォワード' },
  { id: 'm1-2', name: '鈴木 一郎', jerseyNumber: 9, position: 'フォワード' },
  { id: 'm1-3', name: '高橋 大輔', jerseyNumber: 8, position: 'ミッドフィールダー' },
  { id: 'm1-4', name: '田中 健太', jerseyNumber: 7, position: 'ミッドフィールダー' },
  { id: 'm1-5', name: '渡辺 翔太', jerseyNumber: 5, position: 'ディフェンダー' },
  { id: 'm1-6', name: '伊藤 翼', jerseyNumber: 4, position: 'ディフェンダー' },
  { id: 'm1-7', name: '山本 航平', jerseyNumber: 1, position: 'ゴールキーパー' },
];

// Members for Team 2
export const mockMembers2: Member[] = [
  { id: 'm2-1', name: '中村 俊介', jerseyNumber: 10, position: 'ミッドフィールダー' },
  { id: 'm2-2', name: '小林 優斗', jerseyNumber: 11, position: 'フォワード' },
  { id: 'm2-3', name: '加藤 亮', jerseyNumber: 6, position: 'ミッドフィールダー' },
];

// Members for Team 3
export const mockMembers3: Member[] = [
    { id: 'm3-1', name: '吉田 拓也', jerseyNumber: 22, position: 'フォワード' },
    { id: 'm3-2', name: '山田 直輝', jerseyNumber: 14, position: 'ミッドフィールダー' },
];

// Members for Team 4
export const mockMembers4: Member[] = [
    { id: 'm4-1', name: '佐々木 勇気', jerseyNumber: 3, position: 'ディフェンダー' },
    { id: 'm4-2', name: '山口 達也', jerseyNumber: 18, position: 'フォワード' },
];

export const mockTeams: Team[] = [
  {
    id: 'team-1',
    name: 'FCスカイウィングス',
    coachName: '山田 太郎',
    websiteUrl: 'https://example.com/skywings',
    logoUrl: 'https://picsum.photos/seed/skywings/200/200',
    level: TeamLevel.INTERMEDIATE,
    rating: 1650,
    rank: 1,
    members: mockMembers1,
    description: '我々は空を翔ける翼のように、フィールドを駆け巡ります。地域最強を目指して日々練習に励んでいます。',
    prefecture: '東京都',
    city: '渋谷区',
    availableSlotsText: '週末のみ空き',
    ageCategory: 'U-12',
  },
  {
    id: 'team-2',
    name: 'オーシャンズFC',
    coachName: '鈴木 次郎',
    logoUrl: 'https://picsum.photos/seed/oceans/200/200',
    level: TeamLevel.ADVANCED,
    rating: 1800,
    rank: 2,
    members: mockMembers2,
    description: '大海のごとき戦略で相手を圧倒する。全国大会出場経験あり。',
    prefecture: '神奈川県',
    city: '横浜市',
    availableSlotsText: '空き',
    ageCategory: 'U-12',
  },
  {
    id: 'team-3',
    name: 'マウンテンキングス',
    coachName: '佐藤 三郎',
    websiteUrl: 'https://example.com/kings',
    logoUrl: 'https://picsum.photos/seed/kings/200/200',
    level: TeamLevel.BEGINNER,
    rating: 1300,
    rank: 5,
    members: mockMembers3,
    description: '初心者歓迎！楽しくサッカーをすることをモットーに活動しています。',
    prefecture: '北海道',
    city: '札幌市',
    availableSlotsText: '空き',
    ageCategory: 'U-10',
  },
  {
    id: 'team-4',
    name: 'デザートライオンズ',
    coachName: '田中 四郎',
    logoUrl: 'https://picsum.photos/seed/lions/200/200',
    level: TeamLevel.INTERMEDIATE,
    rating: 1550,
    rank: 3,
    members: mockMembers4,
    description: '砂漠のライオンのような粘り強さが持ち味。',
    prefecture: '福岡県',
    city: '福岡市',
    availableSlotsText: '×',
    ageCategory: 'U-15',
  },
   {
    id: 'team-5',
    name: 'リバーサイドイーグルス',
    coachName: '高橋 五郎',
    logoUrl: 'https://picsum.photos/seed/eagles/200/200',
    level: TeamLevel.ADVANCED,
    rating: 1900,
    rank: 1,
    members: [],
    description: '川沿いの風のように素早い攻撃を展開する強豪チーム。',
    prefecture: '大阪府',
    city: '大阪市',
    availableSlotsText: '週末のみ空き',
    ageCategory: '一般',
  }
];

export const mockMatches: Match[] = [
  {
    id: 'match-1',
    type: MatchType.LEAGUE,
    status: MatchStatus.FINISHED,
    ourTeamId: 'team-1',
    opponentTeamId: 'team-2',
    opponentTeamName: 'オーシャンズFC',
    date: '2023-10-21',
    time: '14:00',
    location: '市内リーグ 第3節',
    ourScore: 2,
    opponentScore: 1,
    notes: '劇的な逆転勝利！',
  },
  {
    id: 'match-2',
    type: MatchType.TRAINING,
    status: MatchStatus.PREPARATION,
    ourTeamId: 'team-1',
    opponentTeamId: 'team-3',
    opponentTeamName: 'マウンテンキングス',
    date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // One week from now
    time: '10:00',
    location: '練習グラウンドA',
  },
   {
    id: 'match-3',
    type: MatchType.TOURNAMENT,
    status: MatchStatus.IN_PROGRESS,
    ourTeamId: 'team-1',
    date: new Date().toISOString().split('T')[0], // Today
    time: '09:00',
    location: '地域カップ',
    notes: 'トーナメント1回戦',
  }
];

export const mockVenues: Venue[] = [
  {
    id: 'venue-1',
    name: 'スカイフィールド',
    prefecture: '東京都',
    city: '渋谷区',
    address: '渋谷区神南2-1-1',
    availableDates: ['2023-11-15', '2023-11-22'],
    imageUrl: 'https://picsum.photos/seed/venue1/400/300',
    capacity: 200,
    pricePerHour: 15000,
  },
  {
    id: 'venue-2',
    name: 'オーシャンスタジアム',
    prefecture: '神奈川県',
    city: '横浜市',
    address: '横浜市中区日本大通',
    availableDates: ['2023-11-18', '2023-11-19', '2023-11-25'],
    imageUrl: 'https://picsum.photos/seed/venue2/400/300',
    capacity: 1000,
    pricePerHour: 30000,
  },
  {
    id: 'venue-3',
    name: 'グリーンパーク',
    prefecture: '埼玉県',
    city: 'さいたま市',
    address: 'さいたま市緑区美園',
    availableDates: ['2023-11-12', '2023-11-26'],
    imageUrl: 'https://picsum.photos/seed/venue3/400/300',
    capacity: 500,
    pricePerHour: 20000,
  }
];

export const mockScheduleEvents: ScheduleEvent[] = [
  {
    id: 'se-1',
    title: '通常練習',
    type: ScheduleEventType.PRACTICE,
    date: new Date().toISOString().split('T')[0], // Today
    startTime: '16:00',
    endTime: '18:00',
    location: 'ホームグラウンド',
    teamId: 'team-1',
  },
  {
    id: 'se-2',
    title: 'vs オーシャンズFC',
    type: ScheduleEventType.MATCH,
    date: '2023-10-21',
    startTime: '14:00',
    endTime: '16:00',
    location: '市内グラウンド',
    relatedMatchId: 'match-1',
    teamId: 'team-1',
  },
  {
    id: 'se-3',
    title: '月次ミーティング',
    type: ScheduleEventType.MEETING,
    date: new Date(new Date().getFullYear(), new Date().getMonth(), 15).toISOString().split('T')[0], // This month's 15th
    startTime: '19:00',
    endTime: '20:00',
    location: 'クラブハウス',
    description: '次節の戦略について話し合います。',
    teamId: 'team-1',
  },
  {
    id: 'se-4',
    title: '通常練習',
    type: ScheduleEventType.PRACTICE,
    date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 days from now
    startTime: '16:00',
    endTime: '18:00',
    location: 'ホームグラウンド',
    teamId: 'team-1',
  },
];


export const mockPastMatchResults: PastMatchResult[] = [
    { id: 'pr-1', date: '2023-10-21', opponentName: 'オーシャンズFC', ourScore: 2, opponentScore: 1, result: '勝利', scoringMembers: ['佐藤 太郎', '鈴木 一郎'] },
    { id: 'pr-2', date: '2023-10-14', opponentName: 'サンダーボルト', ourScore: 1, opponentScore: 1, result: '引き分け', scoringMembers: ['佐藤 太郎'] },
    { id: 'pr-3', date: '2023-10-07', opponentName: 'FCファイアードラゴン', ourScore: 0, opponentScore: 3, result: '敗北', scoringMembers: [] },
];

export const mockChatThreads: ChatThread[] = [
    {
        id: 'thread-1',
        participants: [
            { id: 'team-1', name: 'FCスカイウィングス', logoUrl: 'https://picsum.photos/seed/skywings/40/40' },
            { id: 'team-2', name: 'オーシャンズFC', logoUrl: 'https://picsum.photos/seed/oceans/40/40' }
        ],
        isGroupChat: false,
        lastMessage: {
            id: 'msg-2',
            threadId: 'thread-1',
            senderId: 'team-2',
            senderName: 'オーシャンズFC',
            text: '了解です！では、来週の土曜10時でお願いします。',
            timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 mins ago
        },
        unreadCount: 1,
    },
    {
        id: 'thread-2',
        participants: [
            { id: 'team-1', name: 'FCスカイウィングス', logoUrl: 'https://picsum.photos/seed/skywings/40/40' },
            { id: 'team-3', name: 'マウンテンキングス', logoUrl: 'https://picsum.photos/seed/kings/40/40' },
            { id: 'team-4', name: 'デザートライオンズ', logoUrl: 'https://picsum.photos/seed/lions/40/40' },
        ],
        isGroupChat: true,
        groupName: 'U-12練習試合グループ',
        lastMessage: {
            id: 'msg-3',
            threadId: 'thread-2',
            senderId: 'team-1',
            senderName: 'FCスカイウィングス',
            text: '皆さん、次の週末の練習試合の件ですが、会場が見つかりました！',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        },
        unreadCount: 0,
    }
];

export const mockChatMessages: Record<string, ChatMessage[]> = {
    'thread-1': [
        {
            id: 'msg-1',
            threadId: 'thread-1',
            senderId: 'team-1',
            senderName: 'FCスカイウィングス',
            text: 'こんにちは！練習試合の件ですが、来週末はいかがでしょうか？',
            timestamp: new Date(Date.now() - 10 * 60 * 1000), // 10 mins ago
        },
        {
            id: 'msg-2',
            threadId: 'thread-1',
            senderId: 'team-2',
            senderName: 'オーシャンズFC',
            text: '了解です！では、来週の土曜10時でお願いします。',
            timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 mins ago
        },
    ],
    'thread-2': [
        {
            id: 'msg-3',
            threadId: 'thread-2',
            senderId: 'team-1',
            senderName: 'FCスカイウィングス',
            text: '皆さん、次の週末の練習試合の件ですが、会場が見つかりました！',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        },
    ]
};