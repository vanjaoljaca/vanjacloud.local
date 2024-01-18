console.log('Starting...')

const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const Speaker = require('speaker');
const { exec } = require('child_process');
const srtparsejs = require('srtparsejs');
const util = require('util')

function convertToRaw(inputFile, outputFile) {
  return new Promise<void>((resolve, reject) => {
    ffmpeg(inputFile)
      .output(outputFile)
      .audioCodec('pcm_s16le')
      .audioChannels(2)
      .audioFrequency(44100)
      .on('end', function () {
        console.log('Conversion Done');
        resolve();
      })
      .on('error', function (err) {
        console.log('error: ', +err);
        reject(err);
      })
      .run();
  });
}

function loadFileIntoMemory(file: string) {
  return new Promise<Buffer>((resolve, reject) => {
    fs.readFile(file, function (err: any, data: Buffer) {
      if (err) {
        console.error('Error loading file into memory:', err);
        reject(err);
        return;
      }
      // Use the 'data' buffer here
      console.log('File loaded into memory:', data);

      resolve(data);
    });
  });
}

function loadSubtitles(subtitlesFile) {
  return new Promise((resolve, reject) => {
    fs.readFile(subtitlesFile, 'utf8', function (err, data) {
      if (err) {
        console.error('Error loading subtitles:', err);
        reject(err);
        return;
      }
      const subtitles = srtparsejs.parse(data)
      console.log('Subtitles loaded:', subtitles);
      resolve(subtitles);
    });
  });
}

async function whisperProcess(inputFile) {
  console.log('whispering...');
  try {
    const { stdout, stderr } = await util.promisify(exec)(`whisper ${inputFile}`);
    console.log(`whisper output: ${stdout}`);
    console.error(`whisper error: ${stderr}`);
  } catch (error) {
    console.error(`Error executing whisper: ${error}`);
  }
}

async function main() {
  const song = 'test.mp4';
  await convertToRaw(song, 'output.wav');
  const sound = await loadFileIntoMemory('output.wav');

  // await whisperProcess(song);

  const subtitlesFile = './test.srt';
  const subtitles = await loadSubtitles(subtitlesFile);
  console.log('subtitles:', subtitles);

  // Put the sound buffer into the speaker
  const speaker = new Speaker({
    channels: 2,
    bitDepth: 16,
    sampleRate: 44100,
  });

  // Write the first 2 seconds of sound
  const durationInSeconds = 2;
  const samplesPerSecond = 44100;
  const samplesToWrite = durationInSeconds * samplesPerSecond * 10;
  const soundToWrite: Buffer = sound.slice(0, samplesToWrite);
  speaker.write(soundToWrite);

  console.log('waiting speaker close')
  // Wait until the sound finishes playing
  await new Promise<void>((resolve) => {
    speaker.on('close', () => {
      console.log('speaker closed')
      resolve();
    });
  });
  console.log('done waiting speaker close')

  speaker.end();

  console.log('all done')
}

main().catch(err => console.error(err));
