import TextToSpeech from '../components/TextToSpeech';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-bold mb-8">Text to Speech App</h1>
      <TextToSpeech />
    </main>
  );
}
