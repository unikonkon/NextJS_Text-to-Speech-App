'use client';
import TextToSpeech from '../components/TextToSpeech';
import IappTextToSpeech from '../components/IappTextToSpeech';
import { useState } from 'react';
import './bgbubble.css';

export default function Home() {
  const [activeTab, setActiveTab] = useState('tts');

  return (
    <main className="containerbg flex min-h-screen flex-col items-center justify-center p-8 bg-gray-800">

      <h1 className="text-gray-800 text-3xl font-bold mb-2">Text to Speech App</h1>

      <div role="tablist" className="tabs tabs-box tabs-border mb-6 ">
        <a
          role="tab"
          className={`tab ${activeTab === 'tts' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('tts')}
        >
          Web Speech 
        </a>
        <a
          role="tab"
          className={`tab ${activeTab === 'iapp' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('iapp')}
        >
          IAPP API
        </a>
      </div>

      {activeTab === 'tts' ? <TextToSpeech /> : <IappTextToSpeech />}
    </main>
  );
}
