
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ParserPage } from './pages/ParserPage';
import { LibraryPage } from './pages/LibraryPage';
import { StudyPage } from './pages/StudyPage';
import { SettingsPage } from './pages/SettingsPage';
import { VocabDetailPage } from './pages/VocabDetailPage';
import { VocabCard, TargetLanguage } from './types';
import { Globe2 } from 'lucide-react';

const SEED_DATA: VocabCard[] = [
  {
    id: '1',
    term: '안녕하세요',
    definition: 'Hello / Good morning',
    category: 'Greetings',
    language: 'Korean',
    dateAdded: new Date().toISOString(),
  },
  {
    id: '2',
    term: '맛있어요',
    definition: 'It is delicious',
    category: 'Food',
    language: 'Korean',
    dateAdded: new Date().toISOString(),
  },
  {
    id: '3',
    term: '猫',
    definition: 'Cat',
    category: 'Animals',
    language: 'Japanese',
    dateAdded: new Date().toISOString(),
  }
];

const App: React.FC = () => {
  const [vocabList, setVocabList] = useState<VocabCard[]>(() => {
    const saved = localStorage.getItem('hanji_vocab');
    if (saved) {
        // Migration check for old data structure
        const parsed = JSON.parse(saved);
        if (parsed.length > 0 && parsed[0].korean) {
            return parsed.map((p: any) => ({
                ...p,
                term: p.korean || p.term,
                definition: p.english || p.definition,
                language: p.language || 'Korean' // Default to Korean for migrated data
            }));
        }
        return parsed;
    }
    return SEED_DATA;
  });

  const [targetLanguage, setTargetLanguage] = useState<TargetLanguage | null>(() => {
    return localStorage.getItem('lanote_target_lang') as TargetLanguage | null;
  });

  useEffect(() => {
    const safeToSave = vocabList.map(item => ({
        ...item,
        details: item.details ? {
            explanation: item.details.explanation,
            sampleConversation: item.details.sampleConversation,
            grammar: item.details.grammar,
            imageUrl: undefined,
            imageMimeType: undefined,
            audioBase64: undefined
        } : undefined
    }));
    localStorage.setItem('hanji_vocab', JSON.stringify(safeToSave));
  }, [vocabList]);

  useEffect(() => {
    if (targetLanguage) {
      localStorage.setItem('lanote_target_lang', targetLanguage);
    }
  }, [targetLanguage]);

  const addVocabItems = (items: Omit<VocabCard, 'id' | 'dateAdded' | 'language'>[]) => {
    if (!targetLanguage) return;
    const newItems = items.map(item => ({
      ...item,
      id: crypto.randomUUID(),
      dateAdded: new Date().toISOString(),
      language: targetLanguage
    }));
    setVocabList(prev => [...newItems, ...prev]);
  };

  const deleteVocabItem = (id: string) => {
    setVocabList(prev => prev.filter(item => item.id !== id));
  };

  const updateVocabItem = (id: string, updates: Partial<VocabCard>) => {
    setVocabList(prev => prev.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  };

  const resetData = () => {
    setVocabList(SEED_DATA);
    setTargetLanguage(null);
    localStorage.removeItem('lanote_target_lang');
  };

  // Language Selection Screen
  if (!targetLanguage) {
    return (
      <div className="h-screen bg-paper-50 flex flex-col items-center justify-center p-8 max-w-md mx-auto shadow-2xl relative overflow-hidden border-x border-paper-200">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-ink-500 via-ink-400 to-sticker-500"></div>
        
        <div className="mb-12 text-center space-y-4">
            <div className="w-20 h-20 bg-ink-500 rounded-full flex items-center justify-center text-white font-bold text-4xl shadow-xl shadow-ink-500/30 mx-auto rotate-12">
                <span className="mb-2">L</span>
            </div>
            <h1 className="text-4xl font-black text-ink-900 tracking-tight">Lanote</h1>
            <p className="text-ink-500 font-medium text-lg">Your doodle language companion.</p>
        </div>

        <div className="w-full space-y-4">
            <p className="text-center text-ink-400 font-bold uppercase tracking-widest text-xs mb-6">What are you studying?</p>
            
            <button 
                onClick={() => setTargetLanguage('Korean')}
                className="w-full bg-white border-2 border-paper-200 p-6 rounded-3xl flex items-center gap-6 shadow-sm hover:border-ink-500 hover:shadow-md transition-all active:scale-[0.98] group"
            >
                <span className="text-4xl shadow-sm rounded-full bg-paper-50 border border-paper-100 p-2 group-hover:scale-110 transition-transform">🇰🇷</span>
                <div className="text-left">
                    <h3 className="text-xl font-black text-ink-900 group-hover:text-ink-600 transition-colors">Korean</h3>
                    <p className="text-ink-400 text-sm font-medium">Hangul & Conversation</p>
                </div>
            </button>

            <button 
                onClick={() => setTargetLanguage('Japanese')}
                className="w-full bg-white border-2 border-paper-200 p-6 rounded-3xl flex items-center gap-6 shadow-sm hover:border-sticker-500 hover:shadow-md transition-all active:scale-[0.98] group"
            >
                <span className="text-4xl shadow-sm rounded-full bg-paper-50 border border-paper-100 p-2 group-hover:scale-110 transition-transform">🇯🇵</span>
                <div className="text-left">
                    <h3 className="text-xl font-black text-ink-900 group-hover:text-sticker-600 transition-colors">Japanese</h3>
                    <p className="text-ink-400 text-sm font-medium">Kanji & Hiragana</p>
                </div>
            </button>
        </div>
      </div>
    );
  }

  // Main App
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout targetLanguage={targetLanguage} onSwitchLanguage={() => setTargetLanguage(null)} />}>
          <Route index element={<Navigate to="/parser" replace />} />
          <Route 
            path="parser" 
            element={
                <ParserPage 
                    onSave={addVocabItems} 
                    existingVocab={vocabList.filter(v => v.language === targetLanguage)}
                    targetLanguage={targetLanguage} 
                />
            } 
          />
          <Route 
            path="library" 
            element={
                <LibraryPage 
                    vocabList={vocabList.filter(v => v.language === targetLanguage)} 
                    onDelete={deleteVocabItem} 
                />
            } 
          />
          <Route 
            path="library/:id"
            element={
                <VocabDetailPage 
                    vocabList={vocabList} 
                    onUpdate={updateVocabItem} 
                    targetLanguage={targetLanguage}
                />
            }
          />
          <Route 
            path="study" 
            element={
                <StudyPage 
                    vocabList={vocabList.filter(v => v.language === targetLanguage)} 
                    onUpdate={updateVocabItem} 
                />
            } 
          />
          <Route 
            path="settings" 
            element={<SettingsPage onReset={resetData} />} 
          />
        </Route>
      </Routes>
    </HashRouter>
  );
};

export default App;
