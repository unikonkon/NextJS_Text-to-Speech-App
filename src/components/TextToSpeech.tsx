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
        audioContextRef.current = new (window.AudioContext)();
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
    <div className="card w-full bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">Web Speech API Text-to-Speech</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="form-control w-full mb-4 flex flex-col">
              <label className="label">
                <span className="label-text pb-1">ข้อความที่ต้องการพูด</span>
              </label>
              <textarea
                className="textarea textarea-bordered h-32 w-full"
                value={text}
                onChange={handleTextChange}
                placeholder="ป้อนข้อความที่ต้องการพูด...."
                data-testid="text-input"
              ></textarea>
            </div>

            <div className="form-control w-full mb-4">
              <label className="label">
                <span className="label-text">เลือกเสียง</span>
              </label>
              <select
                className="select select-bordered w-full"
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
                <label className="label">
                  <span className="label-text-alt text-success">เสียงภาษาไทยถูกตรวจสอบแล้ว - ใช้การตั้งค่าที่เหมาะสม</span>
                </label>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Rate: {rate.toFixed(1)}</span>
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="2"
                  step="0.1"
                  value={rate}
                  onChange={handleRateChange}
                  className="range range-primary my-1"
                  data-testid="rate-input"
                />
                <div className="label">
                  <span className="label-text-alt">ความเร็วในการพูด</span>
                  <span className="label-text-alt">1.0 = ปกติ</span>
                </div>
                <div className="flex justify-between mt-2">
                  <button
                    onClick={() => setRate(0.5)}
                    className="btn btn-xs"
                    title="พูดช้า"
                  >
                    ช้า (0.5)
                  </button>
                  <button
                    onClick={() => setRate(1.0)}
                    className="btn btn-xs"
                    title="พูดปกติ"
                  >
                    ปกติ (1.0)
                  </button>
                  <button
                    onClick={() => setRate(1.5)}
                    className="btn btn-xs"
                    title="พูดเร็ว"
                  >
                    เร็ว (1.5)
                  </button>
                </div>
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Pitch: {pitch.toFixed(1)}</span>
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="2"
                  step="0.1"
                  value={pitch}
                  onChange={handlePitchChange}
                  className="range range-secondary my-1"
                  data-testid="pitch-input"
                />
                <div className="label">
                  <span className="label-text-alt">ระดับเสียง</span>
                  <span className="label-text-alt">1.0 = ปกติ</span>
                </div>
                <div className="flex justify-between mt-2">
                  <button
                    onClick={() => setPitch(0.5)}
                    className="btn btn-xs"
                    title="เสียงต่ำ"
                  >
                    ต่ำ (0.5)
                  </button>
                  <button
                    onClick={() => setPitch(1.0)}
                    className="btn btn-xs"
                    title="เสียงปกติ"
                  >
                    ปกติ (1.0)
                  </button>
                  <button
                    onClick={() => setPitch(1.5)}
                    className="btn btn-xs"
                    title="เสียงสูง"
                  >
                    สูง (1.5)
                  </button>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="label">
                <span className="label-text">ความเร็วเสียงพรีเซ็ต</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => { setRate(0.7); setPitch(0.8); }}
                  className="btn btn-outline"
                >
                  พูดช้า (ผู้สูงอายุ)
                </button>
                <button
                  onClick={() => { setRate(1.0); setPitch(1.0); }}
                  className="btn btn-outline"
                >
                  พูดปกติ
                </button>
                <button
                  onClick={() => { setRate(1.3); setPitch(1.1); }}
                  className="btn btn-outline"
                >
                  พูดเร็ว (ข่าว)
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                className={`btn btn-primary flex-1 ${isSpeaking ? 'btn-disabled' : ''}`}
                onClick={handleSpeak}
                disabled={isSpeaking || !text}
                data-testid="speak-button"
              >
                {isRecording ? 'Speak & Record' : 'Speak'}
              </button>

              <button
                className={`btn btn-error flex-1 ${!isSpeaking ? 'btn-disabled' : ''}`}
                onClick={handleCancel}
                disabled={!isSpeaking}
                data-testid="cancel-button"
              >
                Cancel
              </button>
            </div>

            <div className="mt-4 text-center">
              <div className="badge gap-2">
                {isSpeaking ? (
                  <span className="text-success">
                    {isRecording ? 'Speaking & Recording' : 'Speaking'}
                  </span>
                ) : (
                  <span className="text-info">Ready</span>
                )}
              </div>
              {hasMicPermission === false && (
                <div className="alert alert-error mt-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span>ไม่ได้รับอนุญาตให้ใช้ไมโครโฟน โปรดอนุญาตการใช้ไมโครโฟนในการตั้งค่าเบราว์เซอร์</span>
                </div>
              )}
              {hasMicPermission === true && (
                <div className="alert alert-success mt-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span>ได้รับอนุญาตให้ใช้ไมโครโฟนแล้ว พร้อมสำหรับการบันทึกเสียง</span>
                </div>
              )}
            </div>

            <div className="mt-4 text-xs opacity-70">
              <p>หมายเหตุ: การบันทึกเสียงจะทำงานโดยการรับสัญญาณจากลำโพงผ่านไมโครโฟน ควรใช้หูฟังเพื่อป้องกันการรบกวน</p>
              <p className="mt-1">เมื่อบันทึกเสียงเสร็จ สามารถฟังหรือดาวน์โหลดได้จากรายการทางด้านขวา</p>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-medium mb-3">บันทึกเสียงของคุณ</h3>
            <p className="text-sm opacity-70 mb-3">คลิกที่ปุ่ม &quot;เล่นเสียง&quot; เพื่อฟัง หรือ &quot;ดาวน์โหลด&quot; เพื่อบันทึกเสียงไว้ในเครื่อง</p>

            {recordings.length === 0 ? (
              <div className="text-center py-8 opacity-70">
                <div className="alert">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-info shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  <div>
                    <h3 className="font-bold">ยังไม่มีรายการบันทึกเสียง</h3>
                    <div className="text-xs">กดปุ่ม &quot;Speak&quot; เพื่อเริ่มบันทึกเสียง</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                {recordings.map((recording) => (
                  <div key={recording.id} className="card bg-base-200">
                    <div className="card-body p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="max-w-[80%]">
                          <p className="font-medium">{recording.text}</p>
                          <div className="flex items-center mt-1">
                            <span className="text-xs opacity-70">
                              {new Date(recording.timestamp).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => deleteRecording(recording.id)}
                          className="btn btn-circle btn-xs btn-error"
                          title="ลบรายการนี้"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                      <div className="card-actions justify-start mt-2">
                        <button
                          onClick={() => playRecording(recording.url)}
                          className="btn btn-sm btn-info"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                          </svg>
                          เล่นเสียง
                        </button>
                        <a
                          href={recording.url}
                          download={`speech-${recording.timestamp}.wav`}
                          className="btn btn-sm btn-success"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                          ดาวน์โหลด
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TextToSpeech; 