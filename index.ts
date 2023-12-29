import * as chokidar from 'chokidar';
import * as fs from 'fs';
import * as path from 'path';
import { ChildProcess, exec } from 'child_process';
import * as dotenv from 'dotenv';
dotenv.config(); // Load .env file, must be before vanjacloud.shared

import { ChatGPT } from "vanjacloud.shared.js";
// import Database from 'better-sqlite3';







const prod = process.argv.includes('--prod');
const dev = !prod;
console.log("Current working directory:", process.cwd());

var Queue = require('node-persistent-queue');
var q = new Queue(prod ? './proddb.sqlite' : './devdb.sqlite'); // Path to your SQLite database

console.log("argv", process.argv)


console.log('Running in mode: ' + (dev ? 'dev' : 'prod'));

import vanjacloud, { Thought, Content } from "vanjacloud.shared.js";
import moment from 'moment';
import { mkdirSync, renameSync } from 'fs';
import { statSync, unlinkSync } from 'fs';
const Keys = vanjacloud.Keys;
console.log('keys', Keys)
const ThoughtDB = Thought.ThoughtDB
export const ThoughtType = Thought.ThoughtType

export const thoughtDb = new ThoughtDB(Keys.notion,
    dev ? ThoughtDB.testdbid : ThoughtDB.proddbid);

export const contentDb = new Content.ContentDB(Keys.notion,
    dev ? Content.ContentDB.testdbid : Content.ContentDB.proddbid);


// async function test() {
//     console.log('getting latest')
//     const l = thoughtDb.getLatest(moment.duration(2, 'years'))
//     for await (const t of l) {
//         console.log(t)
//     }
//     console.log('done getting latest')
// }

// test();

async function suggestTags(text: string, options: string[]): Promise<string[] | undefined> {
    console.log('---- suggesting tags ')
    const systemPrompt =
        "Suggest hashtags for the following text, prefer that you select out of these options: " + options.join(', ')
        + "\n Only reply with the hashtags, no other text. It is ok to invent new hash tags if they are a very good fit.\n"
        + "Do not do loose association, direct reference only. Keep the number of hashtags low, below 5. 0 is also ok if nothing fits";
    const chat = new ChatGPT.Client({
        // apiKey: process.env['OPENAI_API_KEY'],
        apiKey: Keys.openai,

        systemPrompt
    })
    const response = await chat.say(text);
    console.log(response)
    console.log(await chat.say("why did you select those specific tags? justify "))
    return response?.split(',');
}

async function suggestSummaryName(text: string) {
    console.log('---- suggesting summary name ')
    const systemPrompt =
        "Suggest a summary name/title for this transcript. It should be a single line, preferably only a few words, and it should be a good summary of the transcript. Short and snappy";
    const chat = new ChatGPT.Client({
        apiKey: Keys.openai,
        systemPrompt
    })
    const response = await chat.say(text);
    console.log(response)
    console.log(await chat.say("why did you select this? justify "))
    return response;
}


const watchFolder = dev ? './dev-watch' : '/Users/vanjaoljaca/content-watch';
const destinationFolder = dev ? './dev-db' : '/Users/vanjaoljaca/Movies/content-db';

console.log({ watchFolder, destinationFolder })

const watcher = chokidar.watch(watchFolder, {
    ignored: [/^\./, '**/.DS_Store',
        //'**/*.!(mp3|mp4|m4a|m4v|mov)'
    ], // Ignore dot files, .DS_Store, and files that are not mp3, mp4, m4a, or m4v
    persistent: true
});

const validExtensions = ['.mp3', '.mp4', '.m4a', '.m4v', '.mov']

q.on('next', async function (i: any) {
    // Access the job details
    console.log('processing', i);


    // Check if the file exists
    if (!fs.existsSync(i.job.filePath)) {
        console.log('File does not exist:', i.job.filePath);
        console.log('Completing job with warning');
    } else if (!validExtensions.includes(path.extname(i.job.filePath))) {
        console.log('ignored extension: ', i.job.filePath)
    } else {
        await processFile(i.job.filePath);
        console.log('done processing', i.id);
    }

    // Once processing is complete, call .done() to remove the job from the queue
    q.done(i.id);
});

q.open().then(() => {
    q.start();
});


watcher
    .on('add', (filePath) => {
        console.log(`File added: ${filePath}`);
        q.add({ filePath });
    });


async function runWhisper(filePath: string) {
    const fileName = path.basename(filePath);
    const command = `whisper "${fileName}"`;

    const fileDirectory = path.dirname(filePath); // Get the directory of the file

    return new Promise((resolve, reject) => {
        exec(command, { cwd: fileDirectory }, (error, stdout, stderr) => {
            if (error) {
                reject({ error, stdout, stderr });
            } else {
                resolve({ error, stdout, stderr });
            }
        });
    });
}


async function processFile(filePath: string) {
    const fileName = path.basename(filePath);
    const destPath = path.join(destinationFolder, fileName);

    // from phone:
    const isAudio = /\.(mp3|m4a)$/i.test(fileName);
    const isVideo = /\.(mp4|m4v)$/i.test(fileName);
    // photobooth:
    const isMovie = /\.(mov)$/i.test(fileName);

    if (isAudio || isVideo) return;

    console.log(`Processing ${fileName} to ${destinationFolder}`);
    await runWhisper(filePath);
    console.log(`Processed ${fileName} to ${destinationFolder}`);

    if (isAudio) {
        const tags = [] as string[]; // todo: use chatgpt
        const transcriptPath = path.join(path.dirname(filePath), path.basename(filePath, path.extname(filePath)) + '.txt');
        const transcript = fs.readFileSync(transcriptPath, 'utf8');
        const t = await suggestTags(transcript, ["humans", "china", "capitalism", "positivity", "fitness"]);
        const s = await suggestSummaryName(transcript)
        // use formatted transcript instead? or ask for formatted re-write, and a summary (1 line, 5 line)
        console.log('suggested tags', t);
        thoughtDb.saveIt2(`${s}\n\n${transcript}`, undefined, tags);
        console.log('transcript', transcript);
    } else if (isVideo) {
        // thoughtDb.saveIt2(filePath, ThoughtType.Video)
        console.log('video');
        const tags = [] as string[]; // todo: use chatgpt
        const transcriptPath = path.join(path.dirname(filePath), path.basename(filePath, path.extname(filePath)) + '.txt');
        const transcript = fs.readFileSync(transcriptPath, 'utf8');
        const t = await suggestTags(transcript, ["humans", "china", "capitalism", "positivity", "fitness"]);
        const s = await suggestSummaryName(transcript)
        // summarise picture, take 1 single image screenshot
        // use formatted transcript instead? or ask for formatted re-write, and a summary (1 line, 5 line)
        contentDb.save(s || 'untitled', t, transcript)
    } else if (isMovie) {
        // Movie on 12-21-23 at 12.53.mov
        // thoughtDb.saveIt2(filePath, ThoughtType.Video)
        console.log('movie');
        const tags = [] as string[]; // todo: use chatgpt
        const transcriptPath = path.join(path.dirname(filePath), path.basename(filePath, path.extname(filePath)) + '.txt');
        const transcript = fs.readFileSync(transcriptPath, 'utf8');
        const t = await suggestTags(transcript, ["humans", "china", "capitalism", "positivity", "fitness"]);
        const s = await suggestSummaryName(transcript)
        // summarise picture, take 1 single image screenshot
        // use formatted transcript instead? or ask for formatted re-write, and a summary (1 line, 5 line)
        contentDb.save(s || 'untitled', t, transcript)
    }

    // todo: i want audio to go into thought db
    // and video goes ..?

    if (isVideo) {
        // sample video name: video_2023-12-13_12-49-6.mp4
        const date = moment(fileName.split('_')[1], 'YYYY-MM-DD_HH-mm-ss');
        console.log('date', date);

        const year = date.format('YYYY');
        const month = date.format('MM');
        const day = date.format('DD');

        const folderPath = path.join(destinationFolder, year, month, day);
        mkdirSync(folderPath, { recursive: true });

        const newDestPath = path.join(folderPath, fileName);
        function isSameSize(filePath: string, newDestPath: string): boolean {
            const fileSize1 = statSync(filePath).size;
            const fileSize2 = statSync(newDestPath).size;
            return fileSize1 === fileSize2;
        }

        if (fs.existsSync(newDestPath) && isSameSize(filePath, newDestPath)) {
            unlinkSync(filePath); // Delete the original file
            console.log(`Skipped renaming ${fileName} and deleted the original file.`);
        } else {
            console.warn(`Warning: File size is different. Cannot rename ${fileName}.`);
        }

        console.log(`Moved ${fileName} to ${newDestPath}`);


    } else if (isAudio) {
        // put it in db as text 
    } else if (isMovie) {
        // sample filename: "Movie on 12-21-23 at 12.53.mov"; 
        const regex = /(\d{2}-\d{2}-\d{2}) at (\d{2}.\d{2})/;
        const match = fileName.match(regex);

        if (!match) {
            console.log('Invalid filename format');
            return;
        }
        const date = moment(match[1], 'MM-DD-YY');
        const time = match[2].replace('.', ':');
        const dateTime = moment(`${date.format('YYYY-MM-DD')} ${time}`, 'YYYY-MM-DD HH:mm');
        console.log('Parsed date and time:', dateTime);


        const year = date.format('YYYY');
        const month = date.format('MM');
        const day = date.format('DD');

        const folderPath = path.join(destinationFolder, year, month, day);
        mkdirSync(folderPath, { recursive: true });

        const newDestPath = path.join(folderPath, fileName);
        function isSameSize(filePath: string, newDestPath: string): boolean {
            const fileSize1 = statSync(filePath).size;
            const fileSize2 = statSync(newDestPath).size;
            return fileSize1 === fileSize2;
        }

        if (fs.existsSync(newDestPath) && isSameSize(filePath, newDestPath)) {
            unlinkSync(filePath); // Delete the original file
            console.log(`Skipped renaming ${fileName} and deleted the original file.`);
        } else {
            console.warn(`Warning: File size is different. Cannot rename ${fileName}.`);
        }

        console.log(`Moved ${fileName} to ${newDestPath}`);


    }
}

