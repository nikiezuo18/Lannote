
import React, { useState, useEffect, useRef } from 'react';
import { VocabCard } from '../types';
import { X, Volume2, Mic, Play, Square, Loader2, Sparkles, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { generateVocabExplanation, generateVocabImage, generateVocabAudio, decodeBase64, decodeAudioData } from '../services/geminiService';

interface VocabDetailModalProps {
  card: VocabCard;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<VocabCard>) => void;
}

export const VocabDetailModal: React.FC<VocabDetailModalProps> = ({ card, onClose, onUpdate }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Practice State
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Refs for Audio Playback
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadDetails = async () => {
      // If we already have details, don't fetch (except maybe audio if missing)
      if (card.details?.explanation && card.details?.imageUrl && card.details?.audioBase64) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        let newExplanation = card.details?.explanation;
        let newImage = card.details?.imageUrl ? { data: card.details.imageUrl, mimeType: card.details.imageMimeType || 'image/png' } : undefined;
        let newAudio = card.details?.audioBase64;

        const promises: Promise<any>[] = [];

        if (!newExplanation) {
           promises.push(generateVocabExplanation(card.term, card.definition, card.language).then(res => newExplanation = res));
        }
        if (!newImage) {
           promises.push(generateVocabImage(card.term, card.definition, card.language).then(res => newImage = res));
        }
        if (!newAudio) {
           promises.push(generateVocabAudio(card.term).then(res => newAudio = res));
        }

        await Promise.all(promises);

        if (isMounted) {
            onUpdate(card.id, {
                details: {
                    ...card.details,
                    explanation: newExplanation,
                    imageUrl: newImage?.data,
                    imageMimeType: newImage?.mimeType,
                    audioBase64: newAudio
                }
            });
        }

      } catch (err) {
        console.error("Failed to load details", err);
        if (isMounted) setError("Failed to generate some content. Please try again.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadDetails();

    return () => {
        isMounted = false;
        // Cleanup recording on unmount
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
    };
  }, [card.id]); 

  const playTTS = async () => {
    if (!card.details?.audioBase64) return;

    try {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') {
            await ctx.resume();
        }

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
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        // Use browser default or safe fallback
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        try {
            const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
            const audioUrl = URL.createObjectURL(audioBlob);
            setRecordedAudio(audioUrl);
        } catch (e) {
            console.error("Blob creation failed", e);
            setError("Failed to process recording.");
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setError("Microphone access denied. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      // Stop tracks
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const playRecording = () => {
    if (recordedAudio) {
      const audio = new Audio(recordedAudio);
      audio.play().catch(e => {
          console.error("Playback failed", e);
          setError("Playback failed. Format not supported?");
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-md max-h-[90vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl relative">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-100 bg-stone-50/50">
            <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider">Word Details</h3>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-stone-200 transition-colors text-stone-500">
                <X size={20} />
            </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Header Section */}
            <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-3">
                    <h2 className="text-4xl font-bold text-stone-800">{card.term}</h2>
                    <button 
                        onClick={playTTS} 
                        disabled={!card.details?.audioBase64}
                        className="p-3 bg-sage-100 text-sage-700 rounded-full hover:bg-sage-200 active:scale-95 transition-all disabled:opacity-50"
                        title="Listen to pronunciation"
                    >
                        <Volume2 size={24} />
                    </button>
                </div>
                <p className="text-xl text-stone-600 font-medium">{card.definition}</p>
                <span className="inline-block text-xs font-semibold text-sage-600 bg-sage-50 px-2 py-1 rounded-md">
                    {card.category}
                </span>
            </div>

            {error && (
                <div className="p-3 bg-rose-50 text-rose-600 text-sm rounded-xl flex items-center gap-2">
                    <AlertCircle size={16} />
                    {error}
                </div>
            )}

            {/* AI Generated Content */}
            <div className="space-y-4">
                {/* Explanation */}
                <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100">
                    <div className="flex items-center gap-2 mb-2 text-stone-400 text-xs font-bold uppercase tracking-wider">
                        <Sparkles size={12} />
                        <span>Explanation</span>
                    </div>
                    {isLoading && !card.details?.explanation ? (
                        <div className="flex items-center gap-2 text-stone-400 text-sm h-10">
                            <Loader2 size={16} className="animate-spin" /> Generating insight...
                        </div>
                    ) : (
                        <p className="text-stone-700 text-sm leading-relaxed">
                            {card.details?.explanation || "No explanation available."}
                        </p>
                    )}
                </div>

                {/* Visual */}
                <div className="aspect-video bg-stone-100 rounded-2xl overflow-hidden border border-stone-100 flex items-center justify-center relative">
                    {isLoading && !card.details?.imageUrl ? (
                        <div className="flex flex-col items-center gap-2 text-stone-400">
                             <Loader2 size={24} className="animate-spin" />
                             <span className="text-xs">Creating visual...</span>
                        </div>
                    ) : card.details?.imageUrl ? (
                        <img 
                            src={`data:${card.details.imageMimeType || 'image/png'};base64,${card.details.imageUrl}`} 
                            alt={card.definition} 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                setError("Failed to load image.");
                            }}
                        />
                    ) : (
                        <div className="text-stone-300">
                            <ImageIcon size={32} />
                        </div>
                    )}
                </div>
            </div>

            {/* Practice Section */}
            <div className="space-y-3 pt-2">
                <h4 className="font-semibold text-stone-800 flex items-center gap-2">
                    <Mic size={18} className="text-sage-500" />
                    Speaking Practice
                </h4>
                <div className="grid grid-cols-2 gap-3">
                    <button 
                         onMouseDown={startRecording}
                         onMouseUp={stopRecording}
                         onMouseLeave={stopRecording}
                         onTouchStart={startRecording}
                         onTouchEnd={stopRecording}
                         className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all active:scale-95 select-none ${
                            isRecording 
                                ? 'bg-rose-50 border-rose-200 text-rose-600' 
                                : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                         }`}
                    >
                        {isRecording ? <Square size={24} /> : <Mic size={24} />}
                        <span className="text-xs font-medium">
                            {isRecording ? 'Release to Stop' : 'Hold to Record'}
                        </span>
                    </button>

                    <button 
                        onClick={playRecording}
                        disabled={!recordedAudio}
                        className="p-4 rounded-xl border border-stone-200 bg-white text-stone-600 flex flex-col items-center gap-2 transition-all hover:bg-stone-50 disabled:opacity-50 disabled:bg-stone-100 disabled:cursor-not-allowed"
                    >
                        <Play size={24} />
                        <span className="text-xs font-medium">My Recording</span>
                    </button>
                </div>
            </div>

        </div>

      </div>
    </div>
  );
};
