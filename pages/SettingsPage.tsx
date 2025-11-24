import React from 'react';
import { Button } from '../components/Button';
import { Trash2, AlertTriangle, Info, Cat } from 'lucide-react';

interface SettingsPageProps {
  onReset: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onReset }) => {
  const handleReset = () => {
    if (window.confirm("Are you sure you want to delete all your vocabulary cards? This cannot be undone.")) {
      onReset();
    }
  };

  return (
    <div className="space-y-8 animate-fade-in p-6">
      <div>
        <h2 className="text-3xl font-black text-ink-900 mb-2">Config</h2>
        <p className="text-ink-500 font-medium">Manage your doodle data.</p>
      </div>

      <div className="bg-white p-6 rounded-3xl border-2 border-paper-200 shadow-sm space-y-4">
        <div className="flex items-center gap-3 text-ink-800 font-bold border-b-2 border-paper-100 pb-4">
          <Cat size={24} className="text-ink-500" />
          <h3>About Lanote</h3>
        </div>
        <p className="text-sm text-ink-600 leading-relaxed font-medium">
          Lanote is a playful tool that turns your raw language notes into blue-ink style flashcards using Gemini AI. 
          It's designed to feel like a sketchbook for your brain.
        </p>
      </div>

      <div className="bg-sticker-50 p-6 rounded-3xl border-2 border-sticker-100 space-y-4">
        <div className="flex items-center gap-3 text-sticker-700 font-bold border-b-2 border-sticker-200 pb-4">
          <AlertTriangle size={24} />
          <h3>Danger Zone</h3>
        </div>
        <p className="text-sm text-sticker-600 font-medium">
          Resetting will delete all your saved vocabulary words and restore the sample data.
        </p>
        <Button variant="danger" onClick={handleReset} className="w-full justify-center">
          <Trash2 size={18} />
          Reset All Data
        </Button>
      </div>
    </div>
  );
};