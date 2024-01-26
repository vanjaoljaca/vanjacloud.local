import { execPromise } from "./execPromise";

export async function initTTS() {
  return await execPromise('pip3 install TTS')
}

export async function createTTS(voiceWavPath: string, text: string): Promise<string> {
  const outputPath = 'temp/output.wav';

  return await execPromise(`python3 util/tts.py "${outputPath}" "${voiceWavPath}" "${text}"`)
}

