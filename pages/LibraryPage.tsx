
import React, { useState, useMemo } from 'react';
import { VocabCard } from '../types';
import { Search, X, ChevronRight, Cat } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface LibraryPageProps {
  vocabList: VocabCard[];
  onDelete: (id: string) => void;
  onUpdate?: (id: string, updates: Partial<VocabCard>) => void;
}

export const LibraryPage: React.FC<LibraryPageProps> = ({ vocabList, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const navigate = useNavigate();

  const categories = useMemo(() => {
    const cats = new Set(vocabList.map(v => v.category));
    return ['All', ...Array.from(cats)];
  }, [vocabList]);

  const filteredList = useMemo(() => {
    return vocabList.filter(item => {
      const matchesSearch = 
        item.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.definition.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [vocabList, searchTerm, selectedCategory]);

  return (
    <div className="space-y-6 pb-20 p-6 relative animate-fade-in bg-paper-50 min-h-full">
      {/* Sticky Header */}
      <div className="sticky top-0 bg-paper-50/95 backdrop-blur-sm z-20 -mt-6 -mx-6 px-6 pt-6 pb-4 space-y-4 shadow-sm">
        {/* Search Bar */}
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-300 group-focus-within:text-ink-500 transition-colors" size={20} />
          <input
            type="text"
            placeholder="Search words..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3.5 bg-white border-2 border-paper-200 rounded-2xl focus:outline-none focus:border-ink-300 text-ink-800 shadow-sm font-medium placeholder:text-paper-400"
          />
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-5 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all border-2 active:scale-95 ${
                selectedCategory === cat
                  ? 'bg-ink-500 text-white border-ink-500 shadow-lg shadow-ink-500/20'
                  : 'bg-white text-ink-400 border-paper-200 hover:border-ink-200 hover:text-ink-600'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="space-y-4">
        {filteredList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-ink-300 space-y-4">
            <Cat size={48} strokeWidth={1.5} />
            <p className="font-medium">No doodles found here.</p>
          </div>
        ) : (
          filteredList.map(item => (
            <div 
                key={item.id} 
                onClick={() => navigate(`/library/${item.id}`)}
                className="bg-white p-5 rounded-3xl border-2 border-paper-200 shadow-sm flex justify-between items-center group cursor-pointer hover:border-ink-200 transition-all active:scale-[0.99]"
            >
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-2 mb-1.5">
                    <h3 className="text-xl font-bold text-ink-900 truncate">{item.term}</h3>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-ink-500 bg-ink-50 px-2 py-1 rounded-lg shrink-0">
                        {item.category}
                    </span>
                </div>
                <p className="text-ink-500 truncate text-sm font-medium">{item.definition}</p>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(item.id);
                    }}
                    className="p-2 text-paper-300 hover:text-sticker-500 hover:bg-sticker-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
                >
                    <X size={20} />
                </button>
                <ChevronRight size={20} className="text-paper-300 group-hover:text-ink-300 transition-colors" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
