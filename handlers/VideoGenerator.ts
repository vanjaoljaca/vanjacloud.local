import { exec } from 'child_process';
import { promisify } from 'util';
import { unlink, mkdir } from 'fs/promises';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream';

const execAsync = promisify(exec);

export interface Scene {
  background: string;
  text: string;
  duration: number; // Duration in seconds
}

async function runFFmpegCommand(command: string) {
  try {
    await execAsync(command);
  } catch (error: any) {
    console.error(`Error executing FFmpeg command: ${error}`);
    throw error;
  }
}

async function ensureTempFolderExists() {
  try {
    await mkdir('temp');
  } catch (error: any) {
    if (error.code !== 'EEXIST') {
      console.error(`Error creating temp folder: ${error}`);
      throw error;
    }
  }
}

export async function generateVideo(scenes: Scene[], soundFile: string) {
  await ensureTempFolderExists();

  for (const [index, scene] of scenes.entries()) {
    const command = `ffmpeg -loop 1 -i "${scene.background}" -vf "drawtext=text='${scene.text}':fontcolor=black:fontsize=48:x=(w-text_w)/2:y=(h-text_h)/2" -t ${scene.duration} -c:v libx264 -pix_fmt yuv420p -y temp/segment${index}.mp4`;
    await runFFmpegCommand(command);
  }

  const fileList = scenes.map((_, index) => `file 'segment${index}.mp4'`).join('\n');
  await promisify(require('fs').writeFile)('temp/filelist.txt', fileList);

  await runFFmpegCommand(`ffmpeg -f concat -safe 0 -i temp/filelist.txt -c copy -y temp/output_no_sound.mp4`);

  await runFFmpegCommand(`ffmpeg -i temp/output_no_sound.mp4 -i "${soundFile}" -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 -y output.mp4`);

  // Clean up intermediate files
  for (const [index, _] of scenes.entries()) {
    await unlink(`temp/segment${index}.mp4`);
  }
  await unlink('temp/filelist.txt');
  await unlink('temp/output_no_sound.mp4');
}
