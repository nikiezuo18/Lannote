

import React, { useState, useEffect, useRef } from 'react';
import { VocabCard } from '../types';
import { Layers, RotateCw, CheckCircle2, AlertCircle, Hand, ArrowLeft, Trophy, Sparkles, AlertTriangle } from 'lucide-react';

interface StudyPageProps {
  vocabList: VocabCard[];
  onUpdate: (id: string, updates: Partial<VocabCard>) => void;
}

export const StudyPage: React.FC<StudyPageProps> = ({ vocabList, onUpdate }) => {
  const [mode, setMode] = useState<'dashboard' | 'session'>('dashboard');
  const [activeCards, setActiveCards] = useState<VocabCard[]>([]);
  const [sessionTitle, setSessionTitle] = useState('');

  // Stats
  const masteredCount = vocabList.filter(v => v.studyState?.status === 'mastered').length;
  const newCount = vocabList.filter(v => !v.studyState || v.studyState.status === 'new').length;
  const errorCount = vocabList.filter(v => v.category === 'Errors').length;

  const startSession = (type: 'all' | 'new' | 'error') => {
    let cards: VocabCard[] = [];
    let title = '';

    switch (type) {
      case 'all':
        cards = [...vocabList];
        title = 'All Words';
        break;
      case 'new':
        cards = vocabList.filter(v => !v.studyState || v.studyState.status === 'new');
        title = 'New Words';
        break;
      case 'error':
        cards = vocabList.filter(v => v.category === 'Errors');
        title = 'Mistakes';
        break;
    }

    if (cards.length === 0) {
        alert(`No cards found for "${title}"`);
        return;
    }

    // Shuffle
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setActiveCards(shuffled);
    setSessionTitle(title);
    setMode('session');
  };

  if (mode === 'dashboard') {
    return (
      <div className="flex flex-col h-full p-6 space-y-6 animate-fade-in bg-paper-50">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-ink-900">Study Mode</h2>
          <p className="text-ink-500 font-medium">Choose a deck to start practicing.</p>
        </div>

        <div className="flex-1 flex flex-col gap-5">
          {/* Card 1: All */}
          <button 
            onClick={() => startSession('all')}
            className="flex-1 bg-ink-500 rounded-[2rem] p-8 text-left shadow-lg shadow-ink-500/30 hover:bg-ink-600 transition-all active:scale-[0.98] flex flex-col justify-between group relative overflow-hidden"
          >
            <div className="absolute right-0 top-0 p-32 bg-white/10 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
            <div className="relative z-10">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-white mb-6 backdrop-blur-sm">
                 <Layers size={28} />
              </div>
              <h3 className="text-3xl font-bold text-white mb-2">All Doodles</h3>
              <p className="text-ink-100 font-medium">Total Collection</p>
            </div>
            <div className="relative z-10 flex items-center gap-3 text-white/90 text-sm font-bold">
               <span className="bg-white/20 px-3 py-1.5 rounded-xl backdrop-blur-sm">
                  {vocabList.length} cards
               </span>
               {masteredCount > 0 && (
                   <span className="flex items-center gap-1 text-emerald-200">
                      <Trophy size={14} /> {masteredCount} mastered
                   </span>
               )}
            </div>
          </button>

          {/* Card 2: New */}
          <button 
            onClick={() => startSession('new')}
            className="flex-1 bg-white border-2 border-paper-200 rounded-[2rem] p-6 text-left shadow-sm hover:border-ink-200 transition-all active:scale-[0.98] flex flex-col justify-between group"
          >
            <div>
              <div className="w-12 h-12 bg-ink-50 text-ink-500 rounded-2xl flex items-center justify-center mb-4">
                 <Sparkles size={24} />
              </div>
              <h3 className="text-2xl font-bold text-ink-900 mb-1">New Words</h3>
              <p className="text-ink-400 font-medium text-sm">Added from last sync</p>
            </div>
            <div className="flex items-center gap-2">
               <span className="bg-ink-50 text-ink-600 px-3 py-1.5 rounded-xl text-xs font-bold">
                  {newCount} cards
               </span>
            </div>
          </button>

          {/* Card 3: Errors */}
          <button 
            onClick={() => startSession('error')}
            className="flex-1 bg-sticker-50 border-2 border-sticker-100 rounded-[2rem] p-6 text-left shadow-sm hover:bg-sticker-100/50 transition-all active:scale-[0.98] flex flex-col justify-between group"
          >
            <div>
              <div className="w-12 h-12 bg-sticker-100 text-sticker-500 rounded-2xl flex items-center justify-center mb-4">
                 <AlertTriangle size={24} />
              </div>
              <h3 className="text-2xl font-bold text-sticker-900 mb-1">Mistakes</h3>
              <p className="text-sticker-600/80 font-medium text-sm">Words to review</p>
            </div>
            <div className="flex items-center gap-2">
               <span className="bg-white text-sticker-600 border border-sticker-200 px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm">
                  {errorCount} cards
               </span>
            </div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <FlashcardSession 
      cards={activeCards} 
      title={sessionTitle}
      onExit={() => setMode('dashboard')} 
      onUpdate={onUpdate} 
    />
  );
};

interface FlashcardSessionProps {
  cards: VocabCard[];
  title: string;
  onExit: () => void;
  onUpdate: (id: string, updates: Partial<VocabCard>) => void;
}

const FlashcardSession: React.FC<FlashcardSessionProps> = ({ cards, title, onExit, onUpdate }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [feedback, setFeedback] = useState<'none' | 'correct' | 'wrong'>('none');
  const [showSwipeHint, setShowSwipeHint] = useState(true);

  // Swipe State
  const touchStartRef = useRef<number | null>(null);
  const touchEndRef = useRef<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setShowSwipeHint(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const currentCard = cards[currentIndex];

  const handleNext = () => {
    setIsFlipped(false);
    setFeedback('none');
    setTimeout(() => {
      if (currentIndex < cards.length - 1) {
          setCurrentIndex(prev => prev + 1);
      } else {
          // End of session
          alert("Session Complete!");
          onExit();
      }
    }, 200);
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
        setIsFlipped(false);
        setFeedback('none');
        setTimeout(() => {
            setCurrentIndex(prev => prev - 1);
        }, 200);
    }
  };

  const handleCorrect = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFeedback('correct');
    
    onUpdate(currentCard.id, {
        studyState: {
            status: 'mastered',
            reviewCount: (currentCard.studyState?.reviewCount || 0) + 1,
            lastReviewed: new Date().toISOString()
        }
    });

    setTimeout(handleNext, 1200);
  };

  const handleIncorrect = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFeedback('wrong');

    const updates: Partial<VocabCard> = {
        category: 'Errors',
        studyState: {
            status: 'learning',
            reviewCount: (currentCard.studyState?.reviewCount || 0) + 1,
            lastReviewed: new Date().toISOString()
        }
    };
    onUpdate(currentCard.id, updates);

    setTimeout(handleNext, 1500);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchEndRef.current = null;
    touchStartRef.current = e.targetTouches[0].clientX;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    touchEndRef.current = e.targetTouches[0].clientX;
  };

  const onTouchEnd = () => {
    if (!touchStartRef.current || !touchEndRef.current) return;
    const distance = touchStartRef.current - touchEndRef.current;
    
    if (distance > 50) handleNext();
    if (distance < -50) handlePrev();
  };

  if (!currentCard) return null;

  return (
    <div 
        className="h-full flex flex-col justify-between pb-10 p-4 overflow-hidden relative bg-paper-50 animate-fade-in"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4 z-20">
          <button onClick={onExit} className="p-3 -ml-2 text-ink-400 hover:bg-paper-200 rounded-full transition-colors">
              <ArrowLeft size={24} />
          </button>
          <span className="text-sm font-black text-ink-300 uppercase tracking-widest">{title}</span>
          <div className="w-8" /> {/* Spacer */}
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-paper-200 h-2 rounded-full mb-6 overflow-hidden">
          <div 
             className="bg-ink-500 h-full transition-all duration-300 ease-out rounded-full" 
             style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
          />
      </div>

      {/* Top Bar Info */}
      <div className="flex items-center justify-between text-ink-400 text-xs px-2 font-bold uppercase tracking-wider mb-2">
        <span>{currentIndex + 1} / {cards.length}</span>
        <span className={`${currentCard.category === 'Errors' ? 'text-sticker-500' : 'text-ink-400'}`}>
            {currentCard.category}
        </span>
      </div>

      {/* Main Card Area */}
      <div className="flex-1 flex items-center justify-center perspective-[1200px] relative z-10 py-2">
        
        {/* Visual Stack Effect */}
        <div className="absolute w-[85%] aspect-[4/5] max-h-[400px] bg-white border-2 border-paper-200 rounded-[2.5rem] shadow-sm transform translate-y-3 scale-95 opacity-50 -z-10" />
        
        {/* The Active Card */}
        <div 
          className="relative w-full aspect-[4/5] max-h-[420px] cursor-pointer group transition-transform duration-500 [transform-style:preserve-3d]"
          style={{ transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
          onClick={() => setIsFlipped(!isFlipped)}
        >
            {/* Front Side (Definition) */}
            <div className="absolute inset-0 w-full h-full bg-white border-2 border-paper-200 rounded-[2.5rem] shadow-xl flex flex-col items-center justify-center p-8 [backface-visibility:hidden]">
              <span className="text-ink-300 text-xs uppercase tracking-widest mb-8 font-black">Meaning</span>
              <h2 className="text-4xl font-black text-ink-900 text-center leading-tight break-words w-full select-none">
                {currentCard.definition}
              </h2>
              <div className="absolute bottom-10 text-ink-300 text-xs flex items-center gap-2 animate-pulse font-bold uppercase tracking-wide">
                <RotateCw size={16} /> Tap to flip
              </div>
            </div>

            {/* Back Side (Term/Language) */}
            <div className="absolute inset-0 w-full h-full bg-ink-600 border-2 border-ink-600 rounded-[2.5rem] shadow-xl flex flex-col items-center justify-center p-8 [backface-visibility:hidden] [transform:rotateY(180deg)] text-white relative overflow-hidden">
                
                {/* Feedback Overlays */}
                {feedback === 'correct' && (
                    <div className="absolute inset-0 bg-emerald-500/95 z-20 flex flex-col items-center justify-center text-white animate-fade-in">
                        <CheckCircle2 size={72} className="mb-4 text-emerald-100" />
                        <h3 className="text-3xl font-black tracking-tight">Nice!</h3>
                    </div>
                )}
                {feedback === 'wrong' && (
                    <div className="absolute inset-0 bg-sticker-500/95 z-20 flex flex-col items-center justify-center text-white animate-fade-in text-center p-6">
                        <AlertCircle size={72} className="mb-4 text-sticker-100" />
                        <h3 className="text-2xl font-black mb-2">Review needed</h3>
                        <p className="text-sm font-medium opacity-90">Marked for later practice.</p>
                    </div>
                )}

                <span className="text-ink-300 text-xs uppercase tracking-widest mb-8 font-black">Answer</span>
                <h2 className="text-5xl font-black text-white text-center leading-tight break-words w-full mb-24 select-none">
                    {currentCard.term}
                </h2>
                
                {/* Controls */}
                {feedback === 'none' && (
                    <div className="absolute bottom-8 w-full px-6 flex gap-3 z-10">
                        <button 
                            onClick={handleIncorrect}
                            className="flex-1 py-4 bg-ink-800/40 hover:bg-sticker-500/80 text-white border border-white/10 hover:border-sticker-400 rounded-2xl text-sm font-bold transition-all active:scale-95 backdrop-blur-sm"
                        >
                            Missed it
                        </button>
                        <button 
                            onClick={handleCorrect}
                            className="flex-1 py-4 bg-white text-ink-600 hover:bg-emerald-50 hover:text-emerald-600 rounded-2xl text-sm font-bold shadow-lg transition-all active:scale-95"
                        >
                            Got it!
                        </button>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* Swipe Hint */}
      <div className="h-8 flex items-center justify-center relative mt-4">
         {showSwipeHint && (
             <div className="absolute -top-12 bg-ink-800 text-white text-[10px] px-4 py-2 rounded-full flex items-center gap-2 animate-bounce shadow-lg z-20 font-bold uppercase tracking-wide">
                <Hand size={14} /> Swipe left/right
             </div>
         )}
         <div className="w-full flex justify-between px-8 text-paper-300">
             <span className="text-xs flex items-center gap-1 opacity-50 font-bold"><ArrowLeft size={12} /> Prev</span>
             <span className="text-xs flex items-center gap-1 opacity-50 font-bold">Next <ArrowLeft size={12} className="rotate-180" /></span>
         </div>
      </div>
    </div>
  );
};
