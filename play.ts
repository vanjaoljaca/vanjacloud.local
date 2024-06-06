
import { generateVideo, Scene } from './handlers/VideoGenerator';
import fs, { ReadStream } from 'fs';
import * as dotenv from 'dotenv';
import FormData from 'form-data';
dotenv.config(); // Load .env file, must be before vanjacloud.shared
import vanjacloud from "vanjacloud.shared.js";
const keys = vanjacloud.Keys;

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

import { createTTS } from './util/tts';
async function testTts() {
    const path = await createTTS('../vanjacloud.private.js/voices/vanja.wav', 'hey abhi, this is some generated text of my voice');
    console.log('done', path)
}

// from openai import OpenAI
// client = OpenAI()

// response = client.images.generate(


// image_url = response.data[0].url

import OpenAI from 'openai';
const openai = new OpenAI({
    apiKey: keys.openai
});


async function testImageGEn() {
    const r = await openai.images.generate({
        model: "dall-e-3",
        prompt: "a red and purple siamese cat",
        size: "1024x1792",
        quality: "standard",
        n: 1,
    })
    console.log(r.data[0].url)
}

import express from 'express';
import DailyPageHandler from './handlers/dailypage';
async function testHttp() {


    // todo: move this to electron app?
    const app = express();

    app.get('/', (req, res) => {
        const dailyPageHandler = new DailyPageHandler();
        const p = dailyPageHandler.getDailyPage();

        res.send(p);
    })

    app.listen(3000, () => {
        console.log('Listening: http://localhost:3000/')
    })
}


import storypipe from './handlers/storypipe';
async function testStorypipe() {

    const p = await storypipe();
    console.log(p)
}

async function testDailypage() {
    const dailyPageHandler = new DailyPageHandler();
    const p = await dailyPageHandler.getDailyPage();
    console.log(p)
}

// import SearchPastHandler from './handlers/searchpast';
import axios from 'axios';

// async function testSearchPast() {
//     const handler = new SearchPastHandler();
//     await handler.run();
// }


console.log('-- STARTING --')

// testStorypipe();
// testDailypage();

// testAutoCommitter();
// testTts();
// testImageGEn();
// testHttp();

// testSearchPast();


function convertToBlob(readStream: ReadStream): Promise<Blob> {
    // Convert ReadStream to Blob
    // Implementation depends on the environment (e.g., Node.js or browser)
    // Example implementation for Node.js:
    const chunks: Buffer[] = [];
    return new Promise((resolve, reject) => {
        readStream.on('data', (chunk: Buffer) => chunks.push(chunk));
        readStream.on('end', () => resolve(new Blob(chunks)));
        readStream.on('error', reject);
    });
}

async function testLipSync() {

    const payload = {
        // "face_padding_top": 3,
        // "face_padding_bottom": 16,
        // "face_padding_left": 12,
        // "face_padding_right": 6,
        // "text_prompt": "Testing 1 2 3.",
        // "tts_provider": "GOOGLE_TTS",
        // "uberduck_voice_name": "the-rock",
        // "uberduck_speaking_rate": 1,
        // "google_voice_name": "en-GB-Neural2-D",
        // "google_speaking_rate": 0.9,
        // "google_pitch": -2.5,
        // "bark_history_prompt": null,
        // "elevenlabs_voice_name": "Rachel",
        // "elevenlabs_api_key": null,
        // "elevenlabs_voice_id": null,
        // "elevenlabs_model": "eleven_multilingual_v2",
        // "elevenlabs_stability": 0.5,
        // "elevenlabs_similarity_boost": 0.75,
        // "elevenlabs_style": null,
        // "elevenlabs_speaker_boost": null
    };

    async function lipSync(faceFilePath: string, audioFilePath: string) {
        const formData = new FormData();
        formData.append('json', JSON.stringify(payload));
        formData.append('input_face',
            // await convertToBlob(
            fs.createReadStream(faceFilePath)
            // )
            ,
            faceFilePath
        );
        formData.append('input_audio',
            // await convertToBlob(
            fs.createReadStream(audioFilePath)
            // )
            ,
            audioFilePath
        );

        const response = await axios.post("https://api.gooey.ai/v2/Lipsync/form/?run_id=2p1ahnldr6dk&uid=N571AK4NkEcV1Xm6pBqf8ibWIVt2", formData, {
            headers: {
                ...formData.getHeaders(),
                "Authorization": "Bearer " + process.env["GOOEY_API_KEY"]
            },
        });

        console.log(response)

        // if (!response.ok) {
        //     throw new Error(response.status);
        // }

        const result = response.data;
        console.log(response.status, result);

        return result;
    }

    const r = await lipSync('./data/test_face.png', './data/test_snippet.mp3');

    console.log(r)


    // generateVideo(scenes, './data/test.mp4').then(() => console.log('Video generated successfully.'))
    //     .catch((error) => console.error('Failed to generate video:', error));
}

testLipSync();