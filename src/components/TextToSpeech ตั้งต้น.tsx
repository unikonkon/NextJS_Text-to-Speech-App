'use client';

import { useState, useEffect, useRef, ChangeEvent } from 'react';

interface Voice {
  name: string;
  lang: string;
  voiceURI: string;
}

interface SpeechOptions {
  text: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  lang?: string;
}

// Helper function to convert text to speech with Thai voice
const convertTextToSpeech = (options: SpeechOptions): SpeechSynthesisUtterance => {
  const utterance = new SpeechSynthesisUtterance(options.text);
  
  // Set default parameters optimized for Thai language
  utterance.rate = options.rate ?? 1.0;  // Speed of speech
  utterance.pitch = options.pitch ?? 1.0; // Pitch of voice
  utterance.volume = options.volume ?? 1.0; // Volume (0 to 1)
  utterance.lang = options.lang ?? 'th-TH'; // Thai language code
  
  return utterance;
};

const TextToSpeech = () => {
  const [text, setText] = useState<string>('');
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isThaiVoice, setIsThaiVoice] = useState<boolean>(false);
  const [rate, setRate] = useState<number>(1.0);
  const [pitch, setPitch] = useState<number>(1.0);
  const synth = useRef<SpeechSynthesis | null>(null);

  // Initialize speechSynthesis
  useEffect(() => {
    if (typeof window !== 'undefined') {
      synth.current = window.speechSynthesis;
      
      // Function to get and set available voices
      const getVoices = () => {
        const availableVoices = synth.current?.getVoices() || [];
        setVoices(availableVoices as Voice[]);
        
        // Set default voice if voices are available
        if (availableVoices.length > 0) {
          setSelectedVoice(availableVoices[0].voiceURI);
          
          // Check if Thai voice is available
          const thaiVoice = availableVoices.find(v => v.lang.includes('th'));
          if (thaiVoice) {
            setSelectedVoice(thaiVoice.voiceURI);
            setIsThaiVoice(true);
          }
        }
      };

      // Get voices on initial load
      getVoices();

      // Chrome needs a bit of time to load voices, so we listen for the voiceschanged event
      if (synth.current) {
        synth.current.onvoiceschanged = getVoices;
      }

      // Clean up
      return () => {
        if (synth.current) {
          synth.current.cancel();
        }
      };
    }
  }, []);

  // Handle text input change
  const handleTextChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  };

  // Handle voice selection change
  const handleVoiceChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const voiceURI = e.target.value;
    setSelectedVoice(voiceURI);
    
    // Check if selected voice is Thai
    const selectedVoiceObj = voices.find(v => v.voiceURI === voiceURI);
    setIsThaiVoice(selectedVoiceObj?.lang.includes('th') ?? false);
  };

  // Handle rate change
  const handleRateChange = (e: ChangeEvent<HTMLInputElement>) => {
    setRate(parseFloat(e.target.value));
  };

  // Handle pitch change
  const handlePitchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPitch(parseFloat(e.target.value));
  };

  // Handle speak button click
  const handleSpeak = () => {
    if (synth.current && text && !isSpeaking) {
      let utterance;
      
      // Use the Thai-optimized function if a Thai voice is selected
      if (isThaiVoice) {
        utterance = convertTextToSpeech({
          text,
          rate,
          pitch,
          lang: voices.find(v => v.voiceURI === selectedVoice)?.lang
        });
      } else {
        // Create a regular utterance
        utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = rate;
        utterance.pitch = pitch;
      }
      
      // Set the selected voice
      const voice = voices.find(v => v.voiceURI === selectedVoice);
      if (voice) {
        utterance.voice = voice as unknown as SpeechSynthesisVoice;
      }
      
      // Set speaking state
      setIsSpeaking(true);
      
      // Handle utterance end
      utterance.onend = () => {
        setIsSpeaking(false);
      };
      
      // Speak
      synth.current.speak(utterance);
    }
  };

  // Handle cancel button click
  const handleCancel = () => {
    if (synth.current) {
      synth.current.cancel();
      setIsSpeaking(false);
    }
  };

  return (
    <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
      <div className="mb-4">
        <label htmlFor="textInput" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Enter text to speak
        </label>
        <textarea
          id="textInput"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-700 dark:text-white"
          rows={5}
          value={text}
          onChange={handleTextChange}
          placeholder="Type something here..."
          data-testid="text-input"
        />
      </div>
      
      <div className="mb-4">
        <label htmlFor="voiceSelect" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Select Voice
        </label>
        <select
          id="voiceSelect"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-700 dark:text-white"
          value={selectedVoice}
          onChange={handleVoiceChange}
          data-testid="voice-select"
        >
          {voices.map((voice) => (
            <option key={voice.voiceURI} value={voice.voiceURI}>
              {`${voice.name} (${voice.lang})`}
            </option>
          ))}
        </select>
        {isThaiVoice && (
          <p className="mt-1 text-sm text-green-600">Thai voice detected - using optimized settings</p>
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label htmlFor="rateInput" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Rate: {rate.toFixed(1)}
          </label>
          <input
            id="rateInput"
            type="range"
            min="0.1"
            max="2"
            step="0.1"
            value={rate}
            onChange={handleRateChange}
            className="w-full"
            data-testid="rate-input"
          />
        </div>
        <div>
          <label htmlFor="pitchInput" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Pitch: {pitch.toFixed(1)}
          </label>
          <input
            id="pitchInput"
            type="range"
            min="0.1"
            max="2"
            step="0.1"
            value={pitch}
            onChange={handlePitchChange}
            className="w-full"
            data-testid="pitch-input"
          />
        </div>
      </div>
      
      <div className="flex space-x-3">
        <button
          className={`flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${isSpeaking ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={handleSpeak}
          disabled={isSpeaking || !text}
          data-testid="speak-button"
        >
          Speak
        </button>
        
        <button
          className={`flex-1 px-4 py-2 bg-red-600 text-white rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${!isSpeaking ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={handleCancel}
          disabled={!isSpeaking}
          data-testid="cancel-button"
        >
          Cancel
        </button>
      </div>
      
      <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
        Speaking status: <span data-testid="speaking-status" className={isSpeaking ? 'text-green-500' : 'text-red-500'}>
          {isSpeaking ? 'Speaking' : 'Not speaking'}
        </span>
      </div>
    </div>
  );
};

export default TextToSpeech; 