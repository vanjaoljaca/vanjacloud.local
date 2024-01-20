import { execPromise } from "./execPromise";

export async function initTTS() {
  const r = await execPromise('pip3 install TTS')
  console.log(r);
}

export async function createTTS(voiceWavPath: string, text: string): Promise<string> {
  const outputPath = 'temp/output.wav';

  const r2 = await execPromise(`python3 util/tts.py "${outputPath}" "${voiceWavPath}" "${text}"`)
  console.log(r2);
  // exec(`python3 util/tts.py "${outputPath}" "${voiceWavPath}" "${text}"`, (error, stdout, stderr) => {
  //   if (error) {
  //     console.error(`Error: ${error.message}`);
  //     reject(error);
  //     return;
  //   }
  //   if (stderr) {
  //     console.error(`Stderr: ${stderr}`);
  //     reject(stderr);
  //     return;
  //   }
  //   console.log(stdout);
  //   resolve(outputPath);
  // });
  return outputPath;
}

