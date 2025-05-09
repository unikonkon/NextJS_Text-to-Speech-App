'use client';

import { useState, useEffect, useRef, ChangeEvent } from 'react';
import axios from 'axios';

interface RecordedItem {
    id: string;
    text: string;
    url: string;
    timestamp: number;
    voiceType: string;
}

type VoiceType = 'kaitom' | 'cee';

const IappTextToSpeech = () => {
    const [text, setText] = useState<string>('');
    const [apiKey, setApiKey] = useState<string>('demo');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [recordings, setRecordings] = useState<RecordedItem[]>([]);
    const [selectedVoice, setSelectedVoice] = useState<VoiceType>('kaitom');

    const handleTextChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
        setText(e.target.value);
    };

    const handleApiKeyChange = (e: ChangeEvent<HTMLInputElement>) => {
        setApiKey(e.target.value);
    };

    const handleVoiceChange = (voice: VoiceType) => {
        setSelectedVoice(voice);
    };

    const getApiUrl = () => {
        return `https://api.iapp.co.th/thai-tts-${selectedVoice}/tts`;
    };

    const convertTextToSpeech = async () => {
        if (!text) return;

        setIsLoading(true);

        try {
            const config = {
                method: "get",
                url: getApiUrl(),
                params: {
                    text: text,
                },
                headers: {
                    apikey: apiKey
                },
                responseType: 'arraybuffer' as 'arraybuffer'
            };

            const response = await axios(config);

            // Create a blob from the response data
            const audioBlob = new Blob([response.data], { type: 'audio/mp3' });
            const audioUrl = URL.createObjectURL(audioBlob);

            // Add new recording to the list
            const newRecording: RecordedItem = {
                id: `rec-${Date.now()}`,
                text: text,
                url: audioUrl,
                timestamp: Date.now(),
                voiceType: selectedVoice
            };

            setRecordings(prev => [newRecording, ...prev]);

        } catch (error) {
            console.error('Error converting text to speech:', error);
            alert('ไม่สามารถแปลงข้อความเป็นเสียงได้ โปรดตรวจสอบ API key หรือการเชื่อมต่ออินเทอร์เน็ต');
        } finally {
            setIsLoading(false);
        }
    };

    const playRecording = (url: string) => {
        const audio = new Audio(url);
        audio.play();
    };

    const deleteRecording = (id: string) => {
        setRecordings(prev => prev.filter(r => r.id !== id));
    };

    return (
        <div className="card w-full bg-base-100 shadow-xl">
            <div className="card-body">
                <h2 className="card-title">iApp Thai Text-to-Speech</h2>
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
                                <span className="label-text">API Key (iApp)</span>
                            </label>
                            <input
                                type="text"
                                className="input input-bordered w-full"
                                value={apiKey}
                                onChange={handleApiKeyChange}
                                placeholder="Enter your iApp API key"
                                data-testid="api-key-input"
                            />
                            <label className="label">
                                <span className="label-text-alt">ค่าเริ่มต้นคือ 'demo' สำหรับการทดสอบ สำหรับการใช้งานจริงให้ลงทะเบียนที่ iApp</span>
                            </label>
                        </div>

                        <div className="form-control w-full mb-4">
                            <label className="label">
                                <span className="label-text">เลือกเสียง</span>
                            </label>
                            <div className="btn-group w-full py-1">
                                <button
                                    onClick={() => handleVoiceChange('kaitom')}
                                    className={`btn flex-1 mr-2 ${selectedVoice === 'kaitom' ? 'btn-primary' : 'btn-outline'}`}
                                >
                                    <div className="text-center flex">
                                        <div>Kaitom</div>
                                        <div className="text-xs mt-1 pl-1">เสียงผู้หญิง (ไก่ตัม)</div>
                                    </div>
                                </button>
                                <button
                                    onClick={() => handleVoiceChange('cee')}
                                    className={`btn flex-1 ${selectedVoice === 'cee' ? 'btn-accent' : 'btn-outline'}`}
                                >
                                    <div className="text-center flex">
                                        <div>Cee</div>
                                        <div className="text-xs mt-1 pl-1">เสียงผู้หญิง (ซี)</div>
                                    </div>
                                </button>
                            </div>
                            <label className="label">
                                <span className="label-text-alt">API URL: {getApiUrl()}</span>
                            </label>
                        </div>

                        <button
                            className={`btn btn-primary w-full ${isLoading ? 'btn-disabled' : ''}`}
                            onClick={convertTextToSpeech}
                            disabled={isLoading || !text}
                            data-testid="speak-button"
                        >
                            {isLoading ? (
                                <>
                                    <span className="loading loading-spinner"></span>
                                    กำลังประมวลผล...
                                </>
                            ) : 'แปลงข้อความเป็นเสียง'}
                        </button>

                        <div className="mt-4 text-center">
                            <div className="badge gap-2">
                                {isLoading ? (
                                    <span className="text-success">กำลังเชื่อมต่อกับ API...</span>
                                ) : (
                                    <span className="text-info">พร้อมใช้งาน</span>
                                )}
                            </div>
                        </div>

                        <div className="mt-4 text-xs opacity-70">
                            <p>หมายเหตุ: บริการนี้ใช้ API จาก iApp.co.th สำหรับการแปลงข้อความเป็นเสียงภาษาไทย</p>
                            <p className="mt-1">API key ทดลองใช้งานได้จำกัด โปรดลงทะเบียนสำหรับการใช้งานจริง</p>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-lg font-medium mb-3">ข้อความที่แปลงเป็นเสียงแล้ว</h3>
                        <p className="text-sm opacity-70 mb-3">คลิกที่ปุ่ม "เล่นเสียง" เพื่อฟัง หรือ "ดาวน์โหลด" เพื่อบันทึกเสียงไว้ในเครื่อง</p>

                        {recordings.length === 0 ? (
                            <div className="text-center py-8 opacity-70">
                                <div className="alert">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-info shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                    <div>
                                        <h3 className="font-bold">ยังไม่มีรายการบันทึกเสียง</h3>
                                        <div className="text-xs">กดปุ่ม "แปลงข้อความเป็นเสียง" เพื่อเริ่มการแปลง</div>
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
                                                        <span className="text-xs opacity-70 mr-2">
                                                            {new Date(recording.timestamp).toLocaleString()}
                                                        </span>
                                                        <span className={`badge ${recording.voiceType === 'kaitom'
                                                                ? 'badge-primary'
                                                                : 'badge-accent'
                                                            }`}>
                                                            {recording.voiceType === 'kaitom' ? 'ไก่ตัม' : 'ซี'}
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
                                                    download={`iapp-${recording.voiceType}-${recording.timestamp}.mp3`}
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

export default IappTextToSpeech;
