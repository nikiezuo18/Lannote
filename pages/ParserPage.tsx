
import React, { useState, useEffect } from 'react';
import { parseNotesWithGemini } from '../services/geminiService';
import { ParsedVocabItem, VocabCard, DocSource, TargetLanguage } from '../types';
import { Button } from '../components/Button';
import { 
  Sparkles, 
  Trash2, 
  CheckCircle2, 
  Link as LinkIcon, 
  FileText, 
  Type, 
  Upload, 
  RefreshCw,
  Plus,
  AlertCircle,
  Info
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ParserPageProps {
  onSave: (items: ParsedVocabItem[]) => void;
  existingVocab: VocabCard[];
  targetLanguage: TargetLanguage;
}

type InputMode = 'link' | 'text' | 'file';

export const ParserPage: React.FC<ParserPageProps> = ({ onSave, existingVocab, targetLanguage }) => {
  const [mode, setMode] = useState<InputMode>('link');
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedItems, setParsedItems] = useState<ParsedVocabItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Doc Source State
  const [docSources, setDocSources] = useState<DocSource[]>(() => {
    const saved = localStorage.getItem('hanji_docs');
    return saved ? JSON.parse(saved) : [];
  });
  const [newDocUrl, setNewDocUrl] = useState('');
  const [newDocName, setNewDocName] = useState('');
  const [isAddingDoc, setIsAddingDoc] = useState(false);
  const [syncingDocId, setSyncingDocId] = useState<string | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    localStorage.setItem('hanji_docs', JSON.stringify(docSources));
  }, [docSources]);

  const processText = async (text: string, sourceId?: string) => {
    if (!text.trim()) return;
    
    setIsProcessing(true);
    setError(null);
    try {
      const results = await parseNotesWithGemini(text, targetLanguage);
      
      // If syncing from a source, filter out duplicates
      if (sourceId) {
        const uniqueResults = results.filter(newItem => 
          !existingVocab.some(existing => existing.term === newItem.term)
        );
        
        if (uniqueResults.length === 0) {
          setError("Sync complete! No new vocabulary words found.");
          setParsedItems([]);
        } else {
          setParsedItems(uniqueResults);
          // Update sync date
          setDocSources(prev => prev.map(d => 
            d.id === sourceId ? { ...d, lastSynced: new Date().toISOString() } : d
          ));
        }
      } else {
        // Direct input
        if (results.length === 0) {
            setError(`No ${targetLanguage} vocabulary or translations found. Try adding more context.`);
            setParsedItems([]);
        } else {
            setParsedItems(results);
        }
      }
    } catch (err) {
      console.error(err);
      setError("Failed to process notes. Please try again.");
    } finally {
      setIsProcessing(false);
      setSyncingDocId(null);
    }
  };

  const handleSaveToLibrary = () => {
    if (parsedItems.length === 0) return;
    onSave(parsedItems);
    setParsedItems([]);
    setInput('');
    navigate('/library');
  };

  const handleRemoveItem = (index: number) => {
    setParsedItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (index: number, field: keyof ParsedVocabItem, value: string) => {
    setParsedItems(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  // --- Sync Logic ---
  const handleSyncDoc = async (doc: DocSource) => {
    setSyncingDocId(doc.id);
    setError(null);
    setIsProcessing(true);

    try {
      let fetchUrl = doc.url;
      const googleDocMatch = doc.url.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (googleDocMatch && googleDocMatch[1]) {
        fetchUrl = `https://docs.google.com/document/d/${googleDocMatch[1]}/export?format=txt`;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(fetchUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.ok) {
        const text = await response.text();
        if (text.toLowerCase().includes('<!doctype html>') && (text.includes('Google') || text.includes('Sign in'))) {
            throw new Error("Auth required");
        }
        if (text.trim()) {
            await processText(text, doc.id);
            return;
        }
      }
      throw new Error("Fetch failed");
    } catch (e: any) {
      console.log("Connect failed:", e);
      setIsProcessing(false);
      
      if (doc.url.includes('docs.google.com')) {
         setError(`Could not access Google Doc. Please use "File > Share > Publish to web" and use the Link provided there.`);
      } else {
         setError(`Could not connect to "${doc.name}". Please ensure the link is publicly accessible.`);
      }
    }
  };

  // --- Google Doc/Link Logic ---
  const handleAddDoc = () => {
    if (!newDocName || !newDocUrl) return;
    
    let urlToSave = newDocUrl;
    if (!urlToSave.startsWith('http')) {
        urlToSave = 'https://' + urlToSave;
    }

    const newDoc: DocSource = {
      id: crypto.randomUUID(),
      name: newDocName,
      url: urlToSave,
      lastSynced: null
    };
    setDocSources([...docSources, newDoc]);
    setNewDocName('');
    setNewDocUrl('');
    setIsAddingDoc(false);

    handleSyncDoc(newDoc);
  };

  const handleDeleteDoc = (id: string) => {
    setDocSources(prev => prev.filter(d => d.id !== id));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setInput(text);
      processText(text);
    };
    reader.readAsText(file);
  };

  // --- Render Parsed Results ---
  if (parsedItems.length > 0) {
    return (
      <div className="flex flex-col min-h-full animate-fade-in bg-paper-50">
        <div className="p-4 flex-1 space-y-4">
            <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold text-ink-900">Review Doodles</h2>
            <span className="text-xs font-bold text-white bg-sticker-500 px-3 py-1 rounded-full shadow-md shadow-sticker-200">
                {parsedItems.length} found
            </span>
            </div>

            <div className="space-y-3 pb-4">
            {parsedItems.map((item, idx) => (
                <div key={idx} className="bg-white p-5 rounded-3xl border-2 border-paper-200 shadow-sm group relative hover:border-ink-200 transition-colors">
                <button 
                    onClick={() => handleRemoveItem(idx)}
                    className="absolute top-3 right-3 text-paper-400 hover:text-sticker-500 p-2"
                >
                    <Trash2 size={18} />
                </button>
                
                <div className="grid gap-2">
                    <label className="text-[10px] font-bold text-ink-300 uppercase">Term ({targetLanguage})</label>
                    <input
                    type="text"
                    value={item.term}
                    onChange={(e) => handleUpdateItem(idx, 'term', e.target.value)}
                    className="font-bold text-xl text-ink-900 bg-transparent border-none p-0 focus:ring-0 placeholder-ink-200"
                    placeholder={targetLanguage}
                    />
                    <label className="text-[10px] font-bold text-ink-300 uppercase mt-1">Definition</label>
                    <input
                    type="text"
                    value={item.definition}
                    onChange={(e) => handleUpdateItem(idx, 'definition', e.target.value)}
                    className="text-ink-600 bg-transparent border-none p-0 focus:ring-0 text-base placeholder-ink-200"
                    placeholder="Meaning"
                    />
                    <input
                    type="text"
                    value={item.category}
                    onChange={(e) => handleUpdateItem(idx, 'category', e.target.value)}
                    className="text-xs font-bold text-ink-500 bg-ink-50 rounded-lg px-2 py-1 w-fit border-none focus:ring-0 uppercase tracking-wide mt-2"
                    placeholder="CATEGORY"
                    />
                </div>
                </div>
            ))}
            </div>
        </div>

        <div className="sticky bottom-0 p-4 bg-paper-50/90 backdrop-blur-md border-t border-paper-200 z-10">
          <div className="flex gap-3">
             <Button variant="secondary" onClick={() => setParsedItems([])} className="flex-1">
                Discard
             </Button>
             <Button onClick={handleSaveToLibrary} className="flex-1">
                Save All
                <CheckCircle2 size={20} />
             </Button>
          </div>
        </div>
      </div>
    );
  }

  // --- Main Input UI ---
  return (
    <div className="flex flex-col h-full space-y-6 p-6">
      <div className="space-y-1">
        <h2 className="text-3xl font-black text-ink-900">Add Notes</h2>
        <p className="text-ink-500 font-medium">Convert {targetLanguage} notes into flashcards.</p>
      </div>

      {/* Tabs */}
      <div className="flex p-1.5 bg-paper-200 rounded-2xl gap-1">
        <button
          onClick={() => { setMode('link'); setSyncingDocId(null); setError(null); }}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
            mode === 'link' ? 'bg-white text-ink-600 shadow-sm ring-1 ring-black/5' : 'text-ink-400 hover:text-ink-600'
          }`}
        >
          <LinkIcon size={18} /> Links
        </button>
        <button
          onClick={() => { setMode('text'); setSyncingDocId(null); setError(null); }}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
            mode === 'text' ? 'bg-white text-ink-600 shadow-sm ring-1 ring-black/5' : 'text-ink-400 hover:text-ink-600'
          }`}
        >
          <Type size={18} /> Text
        </button>
        <button
          onClick={() => { setMode('file'); setSyncingDocId(null); setError(null); }}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
            mode === 'file' ? 'bg-white text-ink-600 shadow-sm ring-1 ring-black/5' : 'text-ink-400 hover:text-ink-600'
          }`}
        >
          <Upload size={18} /> File
        </button>
      </div>

      {error && (
        <div className="p-4 bg-sticker-50 text-sticker-700 text-sm font-medium rounded-2xl border border-sticker-200 flex items-start gap-3 animate-fade-in">
          <AlertCircle size={20} className="mt-0.5 shrink-0" />
          <span className="flex-1 leading-relaxed">{error}</span>
        </div>
      )}

      {/* Mode Content */}
      <div className="flex-1 flex flex-col relative">
        
        {/* MODE 1: Links (Google Docs) */}
        {mode === 'link' && (
          <div className="space-y-4 animate-fade-in flex-1 flex flex-col">
            {docSources.length === 0 && !isAddingDoc && (
              <div className="flex-1 flex flex-col items-center justify-center border-4 border-dashed border-paper-200 rounded-3xl p-8 text-center">
                <div className="w-16 h-16 bg-paper-100 rounded-full flex items-center justify-center text-ink-300 mb-4">
                    <LinkIcon size={32} />
                </div>
                <p className="text-ink-400 font-medium mb-6">No links added yet.</p>
                <Button variant="secondary" onClick={() => setIsAddingDoc(true)}>
                  <Plus size={18} /> Link New Doc
                </Button>
              </div>
            )}

            {isAddingDoc && (
              <div className="bg-white p-5 rounded-3xl border-2 border-paper-200 shadow-sm space-y-4">
                <div className="space-y-3">
                    <label className="text-xs font-bold text-ink-400 uppercase tracking-wider ml-1">Document Info</label>
                    <input
                    type="text"
                    placeholder="Link Nickname (e.g. 'Class Notes')"
                    className="w-full px-4 py-3 bg-paper-50 border-2 border-paper-200 rounded-xl focus:outline-none focus:border-ink-300 focus:bg-white transition-colors"
                    value={newDocName}
                    onChange={e => setNewDocName(e.target.value)}
                    />
                    <input
                    type="url"
                    placeholder="https://docs.google.com/..."
                    className="w-full px-4 py-3 bg-paper-50 border-2 border-paper-200 rounded-xl focus:outline-none focus:border-ink-300 focus:bg-white transition-colors"
                    value={newDocUrl}
                    onChange={e => setNewDocUrl(e.target.value)}
                    />
                </div>
                
                {newDocUrl.includes('docs.google.com') && (
                    <div className="flex items-start gap-2 p-3 bg-ink-50 text-ink-700 text-xs font-medium rounded-xl leading-relaxed">
                        <Info size={16} className="mt-0.5 shrink-0" />
                        <p>For Google Docs, please use <strong>File &gt; Share &gt; Publish to web</strong> and paste the link from there.</p>
                    </div>
                )}

                <div className="flex gap-2 justify-end pt-2">
                  <Button variant="ghost" onClick={() => setIsAddingDoc(false)}>Cancel</Button>
                  <Button 
                    onClick={handleAddDoc} 
                    disabled={!newDocName || !newDocUrl || isProcessing}
                    isLoading={isProcessing}
                  >
                    Connect
                  </Button>
                </div>
              </div>
            )}

            {docSources.length > 0 && !isAddingDoc && (
               <div className="space-y-3">
                 <Button variant="secondary" onClick={() => setIsAddingDoc(true)} className="w-full py-2 text-sm">
                    <Plus size={18} /> Link New Doc
                 </Button>
                 {docSources.map(doc => (
                   <div key={doc.id} className="bg-white p-4 rounded-3xl border-2 border-paper-200 shadow-sm flex items-center justify-between group hover:border-ink-100 transition-all">
                     <div className="flex-1 min-w-0 mr-3">
                       <div className="flex items-center gap-3 mb-1">
                         <div className="p-2 bg-ink-50 text-ink-500 rounded-xl">
                           <FileText size={20} />
                         </div>
                         <h3 className="font-bold text-ink-900 truncate">{doc.name}</h3>
                       </div>
                       <p className="text-xs text-ink-400 truncate flex items-center gap-1 pl-1">
                         {doc.lastSynced ? `Synced: ${new Date(doc.lastSynced).toLocaleDateString()}` : 'Never synced'}
                       </p>
                     </div>
                     <div className="flex gap-2">
                        <button 
                          onClick={() => handleSyncDoc(doc)}
                          className={`p-2.5 rounded-xl transition-all flex items-center gap-2 text-xs font-bold border-2 ${
                              isProcessing && syncingDocId === doc.id
                                ? 'bg-ink-50 text-ink-600 border-ink-100'
                                : 'text-ink-600 bg-white border-paper-200 hover:bg-paper-50 hover:border-ink-200'
                          }`}
                          disabled={isProcessing}
                        >
                          <RefreshCw size={16} className={isProcessing && syncingDocId === doc.id ? "animate-spin" : ""} /> 
                          {isProcessing && syncingDocId === doc.id ? 'Connecting...' : 'Sync'}
                        </button>
                        <button 
                          onClick={() => handleDeleteDoc(doc.id)}
                          className="p-2.5 text-paper-400 hover:text-sticker-500 hover:bg-sticker-50 rounded-xl transition-colors"
                        >
                          <Trash2 size={20} />
                        </button>
                     </div>
                   </div>
                 ))}
               </div>
            )}
          </div>
        )}

        {/* MODE 2: Text Paste */}
        {mode === 'text' && (
          <div className="flex flex-col h-full animate-fade-in">
             <div className="relative flex-1">
               <textarea
                 className="w-full h-64 md:h-full p-5 rounded-3xl bg-white border-2 border-paper-200 resize-none focus:outline-none focus:border-ink-300 text-ink-800 leading-relaxed placeholder:text-paper-400 shadow-inner"
                 placeholder={`Paste your messy ${targetLanguage} notes here... (e.g. "Apple, School, Friend")`}
                 value={input}
                 onChange={(e) => setInput(e.target.value)}
               />
             </div>
             <div className="mt-4">
              <Button 
                onClick={() => processText(input)} 
                disabled={!input.trim() || isProcessing}
                className="w-full"
              >
                {isProcessing ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white/80 border-t-transparent rounded-full animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    Process Notes
                    <Sparkles size={20} />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* MODE 3: File Upload */}
        {mode === 'file' && (
          <div className="flex-1 flex flex-col items-center justify-center border-4 border-dashed border-paper-200 rounded-3xl bg-paper-50 animate-fade-in gap-6">
             <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-ink-400 shadow-sm">
                <Upload size={36} />
             </div>
             <div className="text-center space-y-2">
               <h3 className="font-bold text-ink-900 text-lg">Upload Notes File</h3>
               <p className="text-ink-400 text-sm">Supports .txt, .md, .csv</p>
             </div>
             <input
               type="file"
               accept=".txt,.md,.csv"
               className="hidden"
               id="file-upload"
               onChange={handleFileUpload}
             />
             <label
               htmlFor="file-upload"
               className="cursor-pointer bg-white text-ink-600 hover:bg-ink-50 border-2 border-paper-200 hover:border-ink-200 px-6 py-3 rounded-2xl font-bold shadow-sm transition-all active:scale-95 flex items-center gap-2"
             >
               Choose File
             </label>
          </div>
        )}

      </div>
    </div>
  );
};
