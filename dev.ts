import { generateVideo, Scene } from './handlers/VideoGenerator';
import fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config(); // Load .env file, must be before vanjacloud.shared

import autocommitter from './handlers/autocommit';

async function testSongThing() {
  const filePath = './data/test.json';

  let subs;

  const data = fs.readFileSync(filePath, 'utf8');
  subs = JSON.parse(data);

  type milliseconds = number
  type seconds = number
  interface Segment {
    "id": number,
    "seek": milliseconds,
    "start": seconds,
    "end": seconds,
    "text": string,
    "tokens": number[],
    "words": Word[]
  }

  interface Word {
    "start": seconds,
    "end": seconds,
    "word": string,
  }

  const introScene = {
    text: 'Hello world!',
    duration: subs.segments[0].start,
    background: './data/imgs/img1.png'
  };

  const scenes = subs.segments.flatMap((sub: Segment) => sub.words)
    .map((w: Word) => ({
      text: w.word,
      duration: w.end - w.start,
      background: './data/imgs/img1.png'
    }));

  scenes.unshift(introScene);

  console.log(scenes.length, 'scenes generated')

  generateVideo(scenes, './data/test.mp4').then(() => console.log('Video generated successfully.'))
    .catch((error) => console.error('Failed to generate video:', error));
}

async function testAutoCommitter() {
  const autocommitHandler = await autocommitter();

  setTimeout(() => {
    autocommitHandler(); //clean up
  }, 10000);
}

testAutoCommitter();