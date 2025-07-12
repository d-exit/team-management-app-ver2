// components/TournamentGuidelinesPage.tsx
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Match, TournamentInfoFormData, Team, MatchType, MatchStatus, ChatThread, ChatMessage } from '../types';
import { prepareTournamentPDFContent } from '../utils/pdfGenerator';
import { deepClone } from '../utils/deepClone';
import { formatGuidelineForChat } from '../utils/guidelineFormatter';

// Initial state for the form, ensures all fields are defined.
const initialFormData: TournamentInfoFormData = {
  eventName: '',
  organizerInfo: { organizationName: '', contactPersonName: '' },
  eventDateTime: { eventDate: '', startTime: '', endTime: '', entryTime: '' },
  venueInfo: { facilityName: '', address: '' },
  participantEligibility: { gradeLevel: '', ageLimit: '' },
  participatingTeams: '',
  courtInfo: { size: '', numberOfCourts: '' },
  matchFormat: { playersPerTeam: '', goalSpecifications: '' },
  refereeSystem: '',
  competitionRules: '',
  matchSchedule: { ceremonyInfo: '', waterBreakInfo: '' },
  ballInfo: '',
  rankingMethod: { pointsRule: '', tieBreakerRule: '', leagueSystemDescription: '' },
  awards: { winner: '', runnerUp: '', thirdPlace: '', individualAwards: '' },
  participationFee: { amount: '', paymentMethod: '', paymentNotes: '' },
  generalNotes: { parkingInfo: '', spectatorArea: '', cancellationPolicy: '' },
  contactInfo: { personName: '', phoneNumber: '' },
};

const DRAFT_STORAGE_KEY = 'tournamentGuidelinesDraft';

// Reusable input component for consistency
const FormInput: React.FC<{ label: string; name: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void; type?: 'text' | 'date' | 'time' | 'textarea'; placeholder?: string; rows?: number }> = 
({ label, name, value, onChange, type = 'text', placeholder = '', rows = 3 }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
        {type === 'textarea' ? (
            <textarea id={name} name={name} value={value} onChange={onChange} placeholder={placeholder} rows={rows} className="w-full bg-slate-700 border border-slate-600 text-white rounded-md p-2 focus:ring-sky-500 focus:border-sky-500" />
        ) : (
            <input type={type} id={name} name={name} value={value} onChange={onChange} placeholder={placeholder} className="w-full bg-slate-700 border border-slate-600 text-white rounded-md p-2 focus:ring-sky-500 focus:border-sky-500" />
        )}
    </div>
);

interface TournamentGuidelinesPageProps {
    allMatches: Match[];
    selectedMatchId: string | null;
    managedTeam: Team;
    onSaveGuidelineAsNewMatch: (newMatch: Match) => void;
    onUpdateGuidelineForMatch: (matchId: string, guidelineData: TournamentInfoFormData) => void;
    chatThreads: ChatThread[];
    onSendMessage: (threadId: string, message: ChatMessage) => void;
    teams: Team[];
}

const TournamentGuidelinesPage: React.FC<TournamentGuidelinesPageProps> = ({ 
    allMatches, 
    selectedMatchId,
    managedTeam, 
    onSaveGuidelineAsNewMatch,
    onUpdateGuidelineForMatch,
    chatThreads, 
    onSendMessage, 
    teams 
}) => {
    const [formData, setFormData] = useState<TournamentInfoFormData>(initialFormData);
    const [showPreview, setShowPreview] = useState(false);
    const [previewSrcDoc, setPreviewSrcDoc] = useState('');
    const [previewKey, setPreviewKey] = useState(0);
    const [showShareModal, setShowShareModal] = useState(false);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const isEditMode = !!selectedMatchId;

    const pastGuidelines = useMemo(() => {
        return allMatches
            .filter(m => m.detailedTournamentInfo && m.detailedTournamentInfo.eventName)
            .map(m => ({ id: m.id, name: m.detailedTournamentInfo!.eventName }));
    }, [allMatches]);
    
    useEffect(() => {
        const matchToEdit = selectedMatchId ? allMatches.find(m => m.id === selectedMatchId) : null;
        if (matchToEdit) {
            if (matchToEdit.detailedTournamentInfo) {
                setFormData(deepClone(matchToEdit.detailedTournamentInfo));
            } else {
                const newGuideline = deepClone(initialFormData);
                newGuideline.eventName = matchToEdit.location || '';
                newGuideline.eventDateTime.eventDate = matchToEdit.date;
                newGuideline.eventDateTime.startTime = matchToEdit.time;
                setFormData(newGuideline);
            }
        } else {
            const savedDraftString = localStorage.getItem(DRAFT_STORAGE_KEY);
            if (savedDraftString) {
                try {
                    const savedDraft = JSON.parse(savedDraftString);
                    setFormData({ ...initialFormData, ...savedDraft });
                } catch (error) {
                    console.error("Failed to parse tournament guidelines draft:", error);
                    localStorage.removeItem(DRAFT_STORAGE_KEY);
                }
            } else {
                 setFormData(initialFormData);
            }
        }
    }, [selectedMatchId, allMatches]);

    useEffect(() => {
        if (!isEditMode) {
            localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(formData));
        }
    }, [formData, isEditMode]);

    const handleCopyGuideline = (matchId: string) => {
        if (!matchId) {
            setFormData(initialFormData);
            return;
        }
        const matchToCopy = allMatches.find(m => m.id === matchId);
        if (matchToCopy?.detailedTournamentInfo) {
            const copiedData = deepClone(matchToCopy.detailedTournamentInfo);
            const sanitizedData = { ...initialFormData, ...copiedData };
            setFormData(sanitizedData);
            alert(`「${sanitizedData.eventName}」の要項をコピーしました。`);
        }
    };
    
    const handleSave = () => {
        if (!formData.eventName.trim()) {
            alert('「大会名」は必須です。');
            return;
        }
        
        if (isEditMode) {
            onUpdateGuidelineForMatch(selectedMatchId, formData);
        } else {
            const newMatch: Match = {
                id: `match-${Date.now()}`,
                type: MatchType.TOURNAMENT,
                status: MatchStatus.PREPARATION,
                ourTeamId: managedTeam.id,
                date: formData.eventDateTime.eventDate || new Date().toISOString().split('T')[0],
                time: formData.eventDateTime.startTime || '09:00',
                location: formData.eventName,
                detailedTournamentInfo: formData,
            };
            onSaveGuidelineAsNewMatch(newMatch);
        }
    };

    const handleSimpleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    }, []);

    const handleNestedChange = useCallback(
      (parentKey: keyof TournamentInfoFormData, childKey: string, value: string) => {
        setFormData(prev => {
          const parentObject = prev[parentKey] as Record<string, any>;
          return { ...prev, [parentKey]: { ...parentObject, [childKey]: value } };
        });
      },[]);

    const handleGeneratePreview = () => {
        if (!formData.eventName.trim()) {
            alert('「大会名」は必須です。');
            return;
        }
        const { html, styles } = prepareTournamentPDFContent(formData);
        const fullHtml = `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><title>大会要項プレビュー</title><style>${styles}</style></head><body>${html}</body></html>`;
        setPreviewSrcDoc(fullHtml);
        setPreviewKey(prevKey => prevKey + 1);
        setShowPreview(true);
    };
    
    const handlePrintFromPreview = () => {
        const iframe = iframeRef.current;
        if (iframe && iframe.contentWindow) {
            iframe.contentWindow.focus(); 
            iframe.contentWindow.print();
        } else {
            alert('プレビューの印刷に失敗しました。');
        }
    };

    const handleClosePreview = () => {
        setShowPreview(false);
        setPreviewSrcDoc('');
    };
    
    const handleResetForm = () => {
        if (window.confirm('フォームをリセットしますか？入力内容は失われます。')) {
            setFormData(initialFormData);
            if (!isEditMode) {
                localStorage.removeItem(DRAFT_STORAGE_KEY);
            }
        }
    };

    const handleShareGuidelineToChat = (threadId: string) => {
        const guidelineText = formatGuidelineForChat(formData);
        const message: ChatMessage = {
            id: `msg-${Date.now()}`,
            threadId: threadId,
            senderId: managedTeam.id,
            senderName: managedTeam.name,
            text: guidelineText,
            timestamp: new Date()
        };
        onSendMessage(threadId, message);
        alert('チャットに要項の概要を共有しました。');
        setShowShareModal(false);
    };
    
    const renderSection = (title: string, children: React.ReactNode) => (
        <fieldset className="bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg border border-slate-700">
            <legend className="text-lg sm:text-xl font-semibold text-sky-400 px-2">{title}</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                {children}
            </div>
        </fieldset>
    );

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <h2 className="text-3xl font-semibold text-sky-300">{isEditMode ? '大会要項編集' : '大会要項作成'}</h2>
                <div className="flex gap-4">
                    <button onClick={handleResetForm} className="bg-slate-600 hover:bg-slate-500 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition">リセット</button>
                    <button onClick={handleSave} className="bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition">{isEditMode ? '更新' : '保存'}</button>
                    <button onClick={() => setShowShareModal(true)} className="bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition">チャットで共有</button>
                    <button onClick={handleGeneratePreview} className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition">PDFプレビュー</button>
                </div>
            </div>

            <div className="bg-slate-800 p-4 rounded-xl">
                <label htmlFor="copy-guideline" className="block text-sm font-medium text-slate-300 mb-1">過去の要項をコピーして作成</label>
                <select id="copy-guideline" onChange={(e) => handleCopyGuideline(e.target.value)} className="w-full bg-slate-700 border border-slate-600 text-white rounded-md p-2 focus:ring-sky-500 focus:border-sky-500" disabled={isEditMode}>
                    <option value="">新規作成</option>
                    {pastGuidelines.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
                {isEditMode && <p className="text-xs text-yellow-400 mt-1">編集中はコピー機能を使用できません。</p>}
            </div>

            <div className="space-y-6">
                {renderSection('大会基本情報', <>
                    <FormInput label="大会名" name="eventName" value={formData.eventName} onChange={handleSimpleChange} />
                    <FormInput label="主催団体名" name="organizationName" value={formData.organizerInfo.organizationName} onChange={e => handleNestedChange('organizerInfo', e.target.name, e.target.value)} />
                    <FormInput label="主催担当者名" name="contactPersonName" value={formData.organizerInfo.contactPersonName} onChange={e => handleNestedChange('organizerInfo', e.target.name, e.target.value)} />
                    <FormInput label="参加チーム（改行区切り）" name="participatingTeams" value={formData.participatingTeams} onChange={handleSimpleChange} type="textarea" />
                </>)}

                {renderSection('開催日時', <>
                    <FormInput label="開催日" name="eventDate" value={formData.eventDateTime.eventDate} onChange={e => handleNestedChange('eventDateTime', e.target.name, e.target.value)} type="date" />
                    <FormInput label="開始時刻" name="startTime" value={formData.eventDateTime.startTime} onChange={e => handleNestedChange('eventDateTime', e.target.name, e.target.value)} type="time" />
                    <FormInput label="終了時刻" name="endTime" value={formData.eventDateTime.endTime} onChange={e => handleNestedChange('eventDateTime', e.target.name, e.target.value)} type="time" />
                    <FormInput label="入場・受付時刻" name="entryTime" value={formData.eventDateTime.entryTime} onChange={e => handleNestedChange('eventDateTime', e.target.name, e.target.value)} type="time" />
                </>)}
                
                {renderSection('会場・コート情報', <>
                    <FormInput label="施設名" name="facilityName" value={formData.venueInfo.facilityName} onChange={e => handleNestedChange('venueInfo', e.target.name, e.target.value)} />
                    <FormInput label="住所" name="address" value={formData.venueInfo.address} onChange={e => handleNestedChange('venueInfo', e.target.name, e.target.value)} />
                    <FormInput label="コートサイズ" name="size" value={formData.courtInfo.size} onChange={e => handleNestedChange('courtInfo', e.target.name, e.target.value)} />
                    <FormInput label="コート面数" name="numberOfCourts" value={formData.courtInfo.numberOfCourts} onChange={e => handleNestedChange('courtInfo', e.target.name, e.target.value)} />
                </>)}

                {renderSection('競技関連', <>
                    <FormInput label="参加資格 (学年など)" name="gradeLevel" value={formData.participantEligibility.gradeLevel} onChange={e => handleNestedChange('participantEligibility', e.target.name, e.target.value)} />
                    <FormInput label="参加資格 (年齢制限など)" name="ageLimit" value={formData.participantEligibility.ageLimit} onChange={e => handleNestedChange('participantEligibility', e.target.name, e.target.value)} />
                    <FormInput label="審判形式" name="refereeSystem" value={formData.refereeSystem} onChange={handleSimpleChange} />
                    <FormInput label="使用ボール" name="ballInfo" value={formData.ballInfo} onChange={handleSimpleChange} />
                    <FormInput label="競技規則" name="competitionRules" value={formData.competitionRules} onChange={handleSimpleChange} type="textarea" />
                </>)}

                {renderSection('試合形式', <>
                    <FormInput label="試合人数" name="playersPerTeam" value={formData.matchFormat.playersPerTeam} onChange={e => handleNestedChange('matchFormat', e.target.name, e.target.value)} />
                    <FormInput label="ゴール規格" name="goalSpecifications" value={formData.matchFormat.goalSpecifications} onChange={e => handleNestedChange('matchFormat', e.target.name, e.target.value)} />
                    <FormInput label="開会式/閉会式情報" name="ceremonyInfo" value={formData.matchSchedule.ceremonyInfo} onChange={e => handleNestedChange('matchSchedule', e.target.name, e.target.value)} />
                    <FormInput label="飲水タイム情報" name="waterBreakInfo" value={formData.matchSchedule.waterBreakInfo} onChange={e => handleNestedChange('matchSchedule', e.target.name, e.target.value)} />
                </>)}

                {renderSection('順位決定・表彰', <>
                    <FormInput label="勝ち点ルール" name="pointsRule" value={formData.rankingMethod.pointsRule} onChange={e => handleNestedChange('rankingMethod', e.target.name, e.target.value)} placeholder="例: 勝3, 分1, 敗0"/>
                    <FormInput label="順位決定方法 (タイブレーク)" name="tieBreakerRule" value={formData.rankingMethod.tieBreakerRule} onChange={e => handleNestedChange('rankingMethod', e.target.name, e.target.value)} placeholder="例: 1.得失点差 2.総得点..."/>
                    <FormInput label="リーグ方式詳細" name="leagueSystemDescription" value={formData.rankingMethod.leagueSystemDescription} onChange={e => handleNestedChange('rankingMethod', e.target.name, e.target.value)} type="textarea" />
                    <FormInput label="優勝賞品" name="winner" value={formData.awards.winner} onChange={e => handleNestedChange('awards', e.target.name, e.target.value)} />
                    <FormInput label="準優勝賞品" name="runnerUp" value={formData.awards.runnerUp} onChange={e => handleNestedChange('awards', e.target.name, e.target.value)} />
                    <FormInput label="3位賞品" name="thirdPlace" value={formData.awards.thirdPlace} onChange={e => handleNestedChange('awards', e.target.name, e.target.value)} />
                    <FormInput label="個人賞" name="individualAwards" value={formData.awards.individualAwards} onChange={e => handleNestedChange('awards', e.target.name, e.target.value)} />
                </>)}
                
                {renderSection('参加費', <>
                    <FormInput label="金額" name="amount" value={formData.participationFee.amount} onChange={e => handleNestedChange('participationFee', e.target.name, e.target.value)} />
                    <FormInput label="支払方法" name="paymentMethod" value={formData.participationFee.paymentMethod} onChange={e => handleNestedChange('participationFee', e.target.name, e.target.value)} />
                    <FormInput label="支払に関する備考" name="paymentNotes" value={formData.participationFee.paymentNotes} onChange={e => handleNestedChange('participationFee', e.target.name, e.target.value)} type="textarea" />
                </>)}

                {renderSection('注意事項・連絡先', <>
                    <FormInput label="駐車場情報" name="parkingInfo" value={formData.generalNotes.parkingInfo} onChange={e => handleNestedChange('generalNotes', e.target.name, e.target.value)} />
                    <FormInput label="観戦エリア情報" name="spectatorArea" value={formData.generalNotes.spectatorArea} onChange={e => handleNestedChange('generalNotes', e.target.name, e.target.value)} />
                    <FormInput label="キャンセル規定" name="cancellationPolicy" value={formData.generalNotes.cancellationPolicy} onChange={e => handleNestedChange('generalNotes', e.target.name, e.target.value)} />
                    <FormInput label="緊急連絡先担当者" name="personName" value={formData.contactInfo.personName} onChange={e => handleNestedChange('contactInfo', e.target.name, e.target.value)} />
                    <FormInput label="緊急連絡先電話番号" name="phoneNumber" value={formData.contactInfo.phoneNumber} onChange={e => handleNestedChange('contactInfo', e.target.name, e.target.value)} />
                </>)}
            </div>

            {/* Preview Modal: Uses srcDoc for reliability */}
            {showPreview && (
                <div className="fixed inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center p-4 z-50">
                    <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-4xl h-[95vh] flex flex-col">
                        <div className="p-3 border-b border-slate-700 flex justify-between items-center flex-shrink-0">
                             <h3 className="text-lg font-semibold text-sky-300">プレビュー</h3>
                             <div className="flex gap-3">
                                <button onClick={handlePrintFromPreview} className="bg-sky-500 hover:bg-sky-600 text-white font-semibold py-1.5 px-4 rounded-lg transition">印刷</button>
                                <button onClick={handleClosePreview} className="bg-slate-600 hover:bg-slate-500 text-white font-semibold py-1.5 px-4 rounded-lg transition">閉じる</button>
                             </div>
                        </div>
                        <div className="flex-grow p-2 bg-slate-900 overflow-hidden">
                             <iframe
                                key={previewKey}
                                ref={iframeRef}
                                title="大会要項プレビュー"
                                className="w-full h-full border-0 bg-white"
                                srcDoc={previewSrcDoc}
                             />
                        </div>
                    </div>
                </div>
            )}
            {/* Share Modal */}
            {showShareModal && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
                  <div className="bg-slate-800 p-6 rounded-xl w-full max-w-md max-h-[90vh] flex flex-col">
                    <h3 className="text-2xl text-sky-400 mb-4 flex-shrink-0">チャットで共有</h3>
                    <p className="text-sm text-slate-400 mb-4">どのチャットに「{formData.eventName || 'この大会要項'}」を共有しますか？</p>
                    <div className="overflow-y-auto pr-2 flex-grow space-y-2">
                      {chatThreads.map(thread => (
                        <button key={thread.id} onClick={() => handleShareGuidelineToChat(thread.id)} className="w-full text-left p-3 bg-slate-700 hover:bg-slate-600 rounded-md flex items-center gap-3">
                          <span className="text-slate-200">{thread.isGroupChat ? thread.groupName : thread.participants.find(p=>p.id !== managedTeam.id)?.name}</span>
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-4 pt-4 mt-auto flex-shrink-0 border-t border-slate-700">
                      <button type="button" onClick={() => setShowShareModal(false)} className="w-full bg-slate-600 py-2 rounded-lg">キャンセル</button>
                    </div>
                  </div>
                </div>
            )}
        </div>
    );
};

export default TournamentGuidelinesPage;