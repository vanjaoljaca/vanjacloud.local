import { generateVideo, Scene } from './handlers/VideoGenerator';
import fs from 'fs';
import * as dotenv from 'dotenv';
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

import SearchPastHandler from './handlers/searchpast';
async function testSearchPast() {
    const handler = new SearchPastHandler();
    await handler.run();
}


console.log('-- STARTING --')

// testStorypipe();
// testDailypage();

// testAutoCommitter();
// testTts();
// testImageGEn();
// testHttp();

testSearchPast();