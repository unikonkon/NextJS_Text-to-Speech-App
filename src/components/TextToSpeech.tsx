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

interface RecordedItem {
  id: string;
  text: string;
  url: string;
  timestamp: number;
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
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null);
  const [rate, setRate] = useState<number>(1.0);
  const [pitch, setPitch] = useState<number>(1.0);
  const [recordings, setRecordings] = useState<RecordedItem[]>([]);

  const synth = useRef<SpeechSynthesis | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const recordingPreparedRef = useRef<boolean>(false);

  useEffect(() => {
    const checkMicrophonePermission = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setHasMicPermission(false);
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setHasMicPermission(true);

        stream.getTracks().forEach(track => track.stop());
      } catch (error) {
        console.error('ไม่สามารถเข้าถึงไมโครโฟนได้:', error);
        setHasMicPermission(false);
      }
    };

    checkMicrophonePermission();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      synth.current = window.speechSynthesis;

      const getVoices = () => {
        const availableVoices = synth.current?.getVoices() || [];

        // กรองเฉพาะเสียงภาษาไทย ภาษาอังกฤษ และภาษาเกาหลี
        const filteredVoices = availableVoices.filter(voice => {
          const lang = voice.lang.toLowerCase();
          return lang.includes('th') || // ภาษาไทย
            lang.includes('en') || // ภาษาอังกฤษ
            lang.includes('ko');   // ภาษาเกาหลี
        });

        setVoices(filteredVoices as Voice[]);

        // Set default voice if voices are available
        if (filteredVoices.length > 0) {
          setSelectedVoice(filteredVoices[0].voiceURI);

          // Check if Thai voice is available
          const thaiVoice = filteredVoices.find(v => v.lang.includes('th'));
          if (thaiVoice) {
            setSelectedVoice(thaiVoice.voiceURI);
            setIsThaiVoice(true);
          }
        }
      };

      getVoices();

      if (synth.current) {
        synth.current.onvoiceschanged = getVoices;
      }

      if (hasMicPermission) {
        prepareRecording();
      }

      return () => {
        if (synth.current) {
          synth.current.cancel();
        }

        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }

        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
      };
    }
  }, [hasMicPermission]);

  const handleTextChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  };

  const handleVoiceChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const voiceURI = e.target.value;
    setSelectedVoice(voiceURI);

    const selectedVoiceObj = voices.find(v => v.voiceURI === voiceURI);
    setIsThaiVoice(selectedVoiceObj?.lang.includes('th') ?? false);
  };

  const handleRateChange = (e: ChangeEvent<HTMLInputElement>) => {
    setRate(parseFloat(e.target.value));
  };

  const handlePitchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPitch(parseFloat(e.target.value));
  };

  const requestMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setHasMicPermission(true);

      stream.getTracks().forEach(track => track.stop());

      await prepareRecording();
      return true;
    } catch (error) {
      console.error('ไม่สามารถเข้าถึงไมโครโฟนได้:', error);
      setHasMicPermission(false);
      return false;
    }
  };

  const prepareRecording = async () => {
    if (recordingPreparedRef.current) return true;

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext )();
      }

      recordingPreparedRef.current = true;
      return true;
    } catch (error) {
      console.error('ไม่สามารถเตรียมการบันทึกเสียงได้:', error);
      return false;
    }
  };

  const startRecording = async () => {
    if (!hasMicPermission) {
      const permissionGranted = await requestMicrophonePermission();
      if (!permissionGranted) {
        alert('ไม่สามารถบันทึกเสียงได้เนื่องจากไม่ได้รับอนุญาตให้ใช้ไมโครโฟน');
        return false;
      }
    }

    if (!recordingPreparedRef.current) {
      const prepared = await prepareRecording();
      if (!prepared) {
        alert('ไม่สามารถเตรียมการบันทึกเสียงได้');
        return false;
      }
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        const newRecording: RecordedItem = {
          id: `rec-${Date.now()}`,
          text: text,
          url: audioUrl,
          timestamp: Date.now()
        };
        
        setRecordings(prev => [newRecording, ...prev]);
        
        stream.getTracks().forEach(track => track.stop());
        setIsRecording(false);
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      return true;

    } catch (error) {
      console.error('Error starting recording:', error);
      alert('ไม่สามารถเริ่มบันทึกเสียงได้: ' + (error as Error).message);
      return false;
    }
  };

  const handleSpeak = async () => {
    if (synth.current && text && !isSpeaking) {
      let recordingStarted = isRecording;

      if (!isRecording) {
        recordingStarted = await startRecording();
      }

      if (!recordingStarted) {
        const speakWithoutRecording = window.confirm('ไม่สามารถบันทึกเสียงได้ คุณต้องการพูดโดยไม่บันทึกหรือไม่?');
        if (!speakWithoutRecording) {
          return;
        }
      }

      let utterance;

      if (isThaiVoice) {
        utterance = convertTextToSpeech({
          text,
          rate,
          pitch,
          lang: voices.find(v => v.voiceURI === selectedVoice)?.lang
        });
      } else {
        utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = rate;
        utterance.pitch = pitch;
      }

      const voice = voices.find(v => v.voiceURI === selectedVoice);
      if (voice) {
        utterance.voice = voice as unknown as SpeechSynthesisVoice;
      }

      setIsSpeaking(true);

      utterance.onend = () => {
        setIsSpeaking(false);

        if (recordingStarted && mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      };

      synth.current.speak(utterance);
    }
  };

  const playRecording = (url: string) => {
    const audio = new Audio(url);
    audio.play();
  };

  const deleteRecording = (id: string) => {
    setRecordings(prev => prev.filter(r => r.id !== id));
  };

  const handleCancel = () => {
    if (synth.current) {
      synth.current.cancel();
      setIsSpeaking(false);

      if (isRecording && mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    }
  };

  return (
    <div className="w-full max-w-8xl bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="mb-4">
            <label htmlFor="textInput" className="block text-md font-medium text-gray-700 dark:text-gray-300 mb-2">
              ข้อความที่ต้องการพูด
            </label>
            <textarea
              id="textInput"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-700 dark:text-white"
              rows={5}
              value={text}
              onChange={handleTextChange}
              placeholder="ป้อนข้อความที่ต้องการพูด...."
              data-testid="text-input"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="voiceSelect" className="block text-md font-medium text-gray-700 dark:text-gray-300 mb-2">
              เลือกเสียง
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
                  {`(${voice.lang}) -->:${voice.name}`}
                </option>
              ))}
            </select>
            {isThaiVoice && (
              <p className="mt-1 text-sm text-green-600">เสียงภาษาไทยถูกตรวจสอบแล้ว - ใช้การตั้งค่าที่เหมาะสม</p>
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
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                ความเร็วในการพูด: 1.0 = ปกติ, &lt;1.0 = ช้าลง, &gt;1.0 = เร็วขึ้น
              </p>
              <div className="flex justify-between mt-2">
                <button 
                  onClick={() => setRate(0.5)} 
                  className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded"
                  title="พูดช้า"
                >
                  ช้า (0.5)
                </button>
                <button 
                  onClick={() => setRate(1.0)} 
                  className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded"
                  title="พูดปกติ"
                >
                  ปกติ (1.0)
                </button>
                <button 
                  onClick={() => setRate(1.5)} 
                  className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded"
                  title="พูดเร็ว"
                >
                  เร็ว (1.5)
                </button>
              </div>
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
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                ระดับเสียง: 1.0 = ปกติ, &lt;1.0 = เสียงต่ำ, &gt;1.0 = เสียงสูง
              </p>
              <div className="flex justify-between mt-2">
                <button 
                  onClick={() => setPitch(0.5)} 
                  className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded"
                  title="เสียงต่ำ"
                >
                  ต่ำ (0.5)
                </button>
                <button 
                  onClick={() => setPitch(1.0)} 
                  className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded"
                  title="เสียงปกติ"
                >
                  ปกติ (1.0)
                </button>
                <button 
                  onClick={() => setPitch(1.5)} 
                  className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded"
                  title="เสียงสูง"
                >
                  สูง (1.5)
                </button>
              </div>
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              ความเร็วเสียงพรีเซ็ต
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button 
                onClick={() => { setRate(0.7); setPitch(0.8); }}
                className="px-3 py-2 bg-indigo-100 text-indigo-800 rounded-md hover:bg-indigo-200 dark:bg-indigo-900 dark:text-indigo-100 dark:hover:bg-indigo-800"
              >
                พูดช้า (ผู้สูงอายุ)
              </button>
              <button 
                onClick={() => { setRate(1.0); setPitch(1.0); }}
                className="px-3 py-2 bg-indigo-100 text-indigo-800 rounded-md hover:bg-indigo-200 dark:bg-indigo-900 dark:text-indigo-100 dark:hover:bg-indigo-800"
              >
                พูดปกติ
              </button>
              <button 
                onClick={() => { setRate(1.3); setPitch(1.1); }}
                className="px-3 py-2 bg-indigo-100 text-indigo-800 rounded-md hover:bg-indigo-200 dark:bg-indigo-900 dark:text-indigo-100 dark:hover:bg-indigo-800"
              >
                พูดเร็ว (ข่าว)
              </button>
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              className={`flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${isSpeaking ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={handleSpeak}
              disabled={isSpeaking || !text}
              data-testid="speak-button"
            >
              {isRecording ? 'Speak & Record' : 'Speak'}
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
            Status: <span data-testid="speaking-status" className={isSpeaking ? 'text-green-500' : 'text-sky-300'}>
              {isSpeaking ? (isRecording ? 'Speaking & Recording' : 'Speaking') : 'Ready'}
            </span>
            {hasMicPermission === false && (
              <p className="text-red-500 mt-1">
                ไม่ได้รับอนุญาตให้ใช้ไมโครโฟน โปรดอนุญาตการใช้ไมโครโฟนในการตั้งค่าเบราว์เซอร์
              </p>
            )}
            {hasMicPermission === true && (
              <p className="text-green-500 mt-1">
                ได้รับอนุญาตให้ใช้ไมโครโฟนแล้ว พร้อมสำหรับการบันทึกเสียง
              </p>
            )}
          </div>

          <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            <p>หมายเหตุ: การบันทึกเสียงจะทำงานโดยการรับสัญญาณจากลำโพงผ่านไมโครโฟน ควรใช้หูฟังเพื่อป้องกันการรบกวน</p>
            <p className="mt-1">เมื่อบันทึกเสียงเสร็จ สามารถฟังหรือดาวน์โหลดได้จากรายการทางด้านขวา</p>
          </div>
        </div>

        <div className="border-t pt-4 md:border-t-0 md:border-l md:pt-0 md:pl-6 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">บันทึกเสียงของคุณ</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">คลิกที่ปุ่ม &quot;เล่นเสียง&quot; เพื่อฟัง หรือ &quot;ดาวน์โหลด&quot; เพื่อบันทึกเสียงไว้ในเครื่อง</p>

          {recordings.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p>ยังไม่มีรายการบันทึกเสียง</p>
              <p className="text-sm mt-2">กดปุ่ม &quot;Speak&quot; เพื่อเริ่มบันทึกเสียง</p>
            </div>
          ) : (
            <ul className="space-y-3 h-full overflow-y-auto pr-2">
              {recordings.map((recording) => (
                <li key={recording.id} className="border rounded-lg p-3 dark:border-gray-700">
                  <div className="flex justify-between items-start mb-2">
                    <div className="max-w-[80%]">
                      <p className="font-medium text-gray-900 dark:text-white">{recording.text}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(recording.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteRecording(recording.id)}
                      className="text-red-500 hover:text-red-700"
                      title="ลบรายการนี้"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex items-center">
                    <button
                      onClick={() => playRecording(recording.url)}
                      className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-md hover:bg-indigo-200 dark:bg-indigo-800 dark:text-indigo-100 dark:hover:bg-indigo-700 text-sm flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                      </svg>
                      เล่นเสียง
                    </button>
                    <a
                      href={recording.url}
                      download={`speech-${recording.timestamp}.wav`}
                      className="ml-2 px-3 py-1 bg-green-100 text-green-800 rounded-md hover:bg-green-200 dark:bg-green-800 dark:text-green-100 dark:hover:bg-green-700 text-sm flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                      ดาวน์โหลด
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default TextToSpeech; 