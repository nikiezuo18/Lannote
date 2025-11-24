
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { VocabCard, TargetLanguage } from '../types';
import { 
    ArrowLeft, Volume2, Mic, Play, Square, Loader2, 
    Sparkles, Image as ImageIcon, AlertCircle, MessageCircle, BookOpen, PenTool 
} from 'lucide-react';
import { 
    generateVocabExplanation, 
    generateVocabImage, 
    generateVocabAudio, 
    generateSampleConversation,
    generateGrammarDetails,
    decodeBase64, 
    decodeAudioData 
} from '../services/geminiService';

interface VocabDetailPageProps {
  vocabList: VocabCard[];
  onUpdate: (id: string, updates: Partial<VocabCard>) => void;
  targetLanguage: TargetLanguage;
}

export const VocabDetailPage: React.FC<VocabDetailPageProps> = ({ vocabList, onUpdate, targetLanguage }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const card = vocabList.find(v => v.id === id);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Practice State
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!card) return;
    
    let isMounted = true;
    const loadDetails = async () => {
      // Check if we have all rich details
      const hasContent = card.details?.explanation && 
                         card.details?.imageUrl && 
                         card.details?.audioBase64 &&
                         card.details?.sampleConversation;
      
      if (hasContent && card.details?.grammar !== undefined) return;

      setIsLoading(true);
      setError(null);

      try {
        let newExplanation = card.details?.explanation;
        let newImage = card.details?.imageUrl ? { data: card.details.imageUrl, mimeType: card.details.imageMimeType || 'image/png' } : undefined;
        let newAudio = card.details?.audioBase64;
        let newConversation = card.details?.sampleConversation;
        let newGrammar = card.details?.grammar;

        const promises: Promise<any>[] = [];

        if (!newExplanation) {
           promises.push(generateVocabExplanation(card.term, card.definition, targetLanguage).then(res => newExplanation = res));
        }
        if (!newImage) {
           promises.push(generateVocabImage(card.term, card.definition, targetLanguage).then(res => newImage = res));
        }
        if (!newAudio) {
           promises.push(generateVocabAudio(card.term).then(res => newAudio = res));
        }
        if (!newConversation) {
            promises.push(generateSampleConversation(card.term, card.definition, targetLanguage).then(res => newConversation = res));
        }
        if (!newGrammar) {
            promises.push(generateGrammarDetails(card.term, card.definition, targetLanguage).then(res => newGrammar = res));
        }

        await Promise.all(promises);

        if (isMounted) {
            onUpdate(card.id, {
                details: {
                    ...card.details,
                    explanation: newExplanation,
                    imageUrl: newImage?.data,
                    imageMimeType: newImage?.mimeType,
                    audioBase64: newAudio,
                    sampleConversation: newConversation,
                    grammar: newGrammar
                }
            });
        }

      } catch (err) {
        console.error("Failed to load details", err);
        if (isMounted) setError("Failed to generate some content. Please check your connection.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadDetails();

    return () => {
        isMounted = false;
        if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
    };
  }, [card?.id, targetLanguage]); 

  // Redirect if invalid ID
  if (!card) {
      return (
          <div className="flex flex-col items-center justify-center h-full space-y-4">
              <p>Word not found.</p>
              <button onClick={() => navigate('/library')} className="text-ink-600 underline font-bold">Back to Library</button>
          </div>
      );
  }

  const playTTS = async () => {
    if (!card.details?.audioBase64) return;
    try {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') await ctx.resume();

        const bytes = decodeBase64(card.details.audioBase64);
        const buffer = await decodeAudioData(bytes, ctx);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
    } catch (e) {
        console.error("Error playing audio", e);
        setError("Could not play audio.");
    }
  };

  const startRecording = async () => {
    setError(null);
    setRecordedAudio(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
      };

      mediaRecorder.onstop = () => {
        try {
            if (audioChunksRef.current.length === 0) {
                return;
            }
            const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
            const audioUrl = URL.createObjectURL(audioBlob);
            setRecordedAudio(audioUrl);
        } catch (e) {
            console.error("Blob creation failed", e);
            setError("Failed to process recording.");
        }
      };

      mediaRecorder.start(200);
      setIsRecording(true);
    } catch (err) {
      console.error("Mic error:", err);
      setError("Microphone access denied. Please allow permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const playRecording = () => {
    if (recordedAudio) {
      const audio = new Audio(recordedAudio);
      audio.onerror = (e) => {
          console.error("Playback error details:", e);
          setError("Playback failed. Audio format might not be supported.");
      };
      audio.play().catch(e => {
          console.error("Play catch:", e);
          setError("Playback failed.");
      });
    }
  };

  return (
    <div className="flex flex-col min-h-full bg-paper-50 animate-fade-in relative pb-10">
        {/* Sticky Nav */}
        <div className="sticky top-0 z-20 bg-paper-50/90 backdrop-blur-md border-b border-paper-200 px-4 py-3 flex items-center gap-3">
            <button 
                onClick={() => navigate('/library')} 
                className="p-3 -ml-2 rounded-full hover:bg-white text-ink-500 transition-colors"
            >
                <ArrowLeft size={24} />
            </button>
            <h1 className="font-bold text-ink-900 text-lg line-clamp-1">{card.term}</h1>
        </div>

        <div className="p-6 space-y-8 max-w-2xl mx-auto w-full">
            
            {/* Hero Section */}
            <div className="flex flex-col items-center gap-6 py-6">
                <div className="w-24 h-24 bg-white rounded-3xl border-2 border-paper-200 shadow-sm flex items-center justify-center mb-2 transform rotate-3">
                    <button 
                        onClick={playTTS}
                        disabled={!card.details?.audioBase64}
                        className="w-full h-full flex items-center justify-center text-ink-500 hover:text-ink-600 active:scale-95 transition-all disabled:opacity-50"
                        title="Listen to pronunciation"
                    >
                        <Volume2 size={40} />
                    </button>
                </div>
                <div className="text-center space-y-2">
                    <h2 className="text-5xl font-black text-ink-900">{card.term}</h2>
                    <p className="text-2xl text-ink-500 font-bold">{card.definition}</p>
                    <div className="pt-3">
                        <span className="px-4 py-1.5 bg-ink-100 text-ink-600 text-xs font-black uppercase tracking-widest rounded-xl">
                            {card.category}
                        </span>
                    </div>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-sticker-50 text-sticker-600 text-sm font-medium rounded-2xl flex items-center gap-2 border border-sticker-200">
                    <AlertCircle size={20} />
                    {error}
                </div>
            )}

            {/* Content Grid */}
            <div className="grid gap-8">
                
                {/* 1. Visual */}
                <div className="aspect-[4/3] w-full bg-white rounded-[2rem] border-2 border-paper-200 overflow-hidden flex items-center justify-center relative shadow-sm">
                    {isLoading && !card.details?.imageUrl ? (
                        <div className="flex flex-col items-center gap-3 text-ink-300">
                             <Loader2 size={32} className="animate-spin" />
                             <span className="text-xs font-bold uppercase tracking-wide">Doodling...</span>
                        </div>
                    ) : card.details?.imageUrl ? (
                        <div className="p-8 w-full h-full flex items-center justify-center">
                            <img 
                                src={`data:${card.details.imageMimeType || 'image/png'};base64,${card.details.imageUrl}`} 
                                alt={card.definition} 
                                className="w-full h-full object-contain mix-blend-multiply opacity-90"
                            />
                        </div>
                    ) : (
                        <ImageIcon size={40} className="text-paper-300" />
                    )}
                </div>

                {/* 2. Explanation */}
                <section className="space-y-4">
                    <h3 className="font-black text-ink-300 flex items-center gap-2 text-sm uppercase tracking-widest">
                        <Sparkles size={18} className="text-sticker-500" />
                        Quick Note
                    </h3>
                    <div className="bg-white p-6 rounded-[2rem] border-2 border-paper-200 text-ink-800 leading-relaxed font-medium shadow-sm">
                         {isLoading && !card.details?.explanation ? (
                             <div className="space-y-3 opacity-50">
                                 <div className="h-4 bg-paper-200 rounded w-3/4 animate-pulse" />
                                 <div className="h-4 bg-paper-200 rounded w-1/2 animate-pulse" />
                             </div>
                         ) : (
                             card.details?.explanation || "Explanation unavailable."
                         )}
                    </div>
                </section>

                {/* 3. Grammar (Dynamic) */}
                {card.details?.grammar && card.details.grammar.length > 0 && (
                    <section className="space-y-4 animate-fade-in">
                        <h3 className="font-black text-ink-300 flex items-center gap-2 text-sm uppercase tracking-widest">
                            <PenTool size={18} className="text-ink-500" />
                            Forms
                        </h3>
                        <div className="grid gap-4 sm:grid-cols-2">
                            {card.details.grammar.map((item, idx) => (
                                <div key={idx} className="bg-white border-2 border-paper-200 rounded-3xl p-5 flex flex-col justify-between hover:border-ink-200 transition-colors shadow-sm">
                                    <div className="mb-3">
                                        <div className="text-[10px] font-black text-ink-400 uppercase tracking-widest mb-2">
                                            {item.tense}
                                        </div>
                                        <div className="font-black text-xl text-ink-900">
                                            {item.conjugation}
                                        </div>
                                    </div>
                                    <div className="text-sm text-ink-500 font-medium border-t-2 border-paper-100 pt-3 mt-1">
                                        "{item.example}"
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* 4. Conversation */}
                <section className="space-y-4">
                    <h3 className="font-black text-ink-300 flex items-center gap-2 text-sm uppercase tracking-widest">
                        <MessageCircle size={18} className="text-ink-400" />
                        Dialogue
                    </h3>
                    <div className="space-y-4">
                        {isLoading && !card.details?.sampleConversation ? (
                            <div className="space-y-4">
                                <div className="p-4 bg-white rounded-2xl rounded-tl-none w-4/5 animate-pulse h-16 border-2 border-paper-100" />
                                <div className="p-4 bg-ink-50 rounded-2xl rounded-tr-none w-4/5 ml-auto animate-pulse h-16 border-2 border-ink-100" />
                            </div>
                        ) : (
                            card.details?.sampleConversation?.map((line, idx) => (
                                <div 
                                    key={idx} 
                                    className={`flex flex-col max-w-[85%] ${idx % 2 === 0 ? 'mr-auto items-start' : 'ml-auto items-end'}`}
                                >
                                    <div className={`px-5 py-4 rounded-3xl text-sm border-2 shadow-sm ${
                                        idx % 2 === 0 
                                            ? 'bg-white border-paper-200 text-ink-900 rounded-tl-none' 
                                            : 'bg-ink-50 border-ink-100 text-ink-900 rounded-tr-none'
                                    }`}>
                                        <p className="font-bold mb-1.5 text-base">{line.term}</p>
                                        <p className="text-ink-500 font-medium text-xs">{line.definition}</p>
                                    </div>
                                    <span className="text-[10px] font-bold text-ink-300 mt-2 px-2 uppercase tracking-wide">
                                        {line.speaker}
                                    </span>
                                </div>
                            ))
                        )}
                        {!isLoading && !card.details?.sampleConversation && (
                            <div className="p-8 text-center text-ink-300 bg-white rounded-[2rem] border-2 border-paper-200 border-dashed font-bold">
                                No conversation generated.
                            </div>
                        )}
                    </div>
                </section>

                {/* 5. Practice */}
                <section className="space-y-4">
                     <h3 className="font-black text-ink-300 flex items-center gap-2 text-sm uppercase tracking-widest">
                        <Mic size={18} className="text-sticker-500" />
                        Speak
                    </h3>
                    <div className="bg-white rounded-[2rem] border-2 border-paper-200 p-2 flex items-center gap-2 shadow-sm">
                        <button 
                             onMouseDown={startRecording}
                             onMouseUp={stopRecording}
                             onMouseLeave={stopRecording}
                             onTouchStart={startRecording}
                             onTouchEnd={stopRecording}
                             className={`flex-1 py-6 rounded-3xl flex flex-col items-center justify-center gap-3 transition-all select-none ${
                                isRecording 
                                    ? 'bg-sticker-50 text-sticker-600 ring-2 ring-sticker-200' 
                                    : 'hover:bg-paper-50 text-ink-600'
                             }`}
                        >
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                                isRecording ? 'bg-sticker-100 scale-110' : 'bg-paper-100'
                            }`}>
                                {isRecording ? <Square size={24} fill="currentColor" /> : <Mic size={24} />}
                            </div>
                            <span className="text-xs font-black uppercase tracking-wide">
                                {isRecording ? 'Release' : 'Hold to Record'}
                            </span>
                        </button>
                        
                        <div className="w-0.5 h-16 bg-paper-100" />

                        <button 
                            onClick={playRecording}
                            disabled={!recordedAudio}
                            className="flex-1 py-6 rounded-3xl flex flex-col items-center justify-center gap-3 transition-all hover:bg-paper-50 text-ink-600 disabled:opacity-40 disabled:hover:bg-transparent"
                        >
                            <div className="w-12 h-12 rounded-full bg-paper-100 flex items-center justify-center">
                                <Play size={24} className={recordedAudio ? "ml-1" : ""} />
                            </div>
                            <span className="text-xs font-black uppercase tracking-wide">Playback</span>
                        </button>
                    </div>
                </section>
            </div>
        </div>
    </div>
  );
};
