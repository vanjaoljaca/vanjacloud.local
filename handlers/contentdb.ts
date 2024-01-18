import * as chokidar from 'chokidar';
import * as fs from 'fs';
import * as path from 'path';
import { ChildProcess, exec } from 'child_process';
import * as dotenv from 'dotenv';

dotenv.config(); // Load .env file, must be before vanjacloud.shared

import vanjacloud, { Thought, Content } from "vanjacloud.shared.js";
import moment from 'moment';
import { mkdirSync, renameSync } from 'fs';
import { statSync, unlinkSync } from 'fs';

import { ChatGPT } from "vanjacloud.shared.js";

export default function initialize(prod: boolean) {


  const reprocess = process.argv.includes('--reprocess');

  const dev = !prod;
  const watchFolder = dev ? './dev-watch' : '/Users/vanjaoljaca/content-watch';
  const destinationFolder = dev ? './dev-db' : '/Users/vanjaoljaca/Movies/content-db';
  console.log({ watchFolder, destinationFolder })


  const CommonHashTags = ["humans", "china", "capitalism", "positivity", "fitness"]



  var Queue = require('node-persistent-queue');
  var q = new Queue(prod ? './proddb.sqlite' : './devdb.sqlite'); // Path to your SQLite database

  console.log("argv", process.argv)

  if (reprocess) {
    var re_q = new Queue(prod ? './proddb_re.sqlite' : './devdb_re.sqlite'); // Path to your SQLite database
    re_q.on('next', async function (i: any) {

      console.log('req processing', i);
      await reprocessFile(i.job.filePath);
      console.log('done reprocessing', i.id);

      re_q.done(i.id);
    });

    re_q.open().then(() => {
      re_q.start();

      function addToQueue(destinationFolder: string, q: any) {
        const addFilesToQueue = (folderPath: string) => {
          const files = fs.readdirSync(folderPath);
          files.forEach((file: string) => {
            const filePath = path.join(folderPath, file);
            const stats = fs.statSync(filePath);
            if (stats.isFile()) {
              q.add({ filePath });
            } else if (stats.isDirectory()) {
              addFilesToQueue(filePath); // Recursively add files from subdirectories
            }
          });
        };

        addFilesToQueue(destinationFolder);
      }

      console.log('reprocessing');
      addToQueue(destinationFolder, re_q);
    });
  }


  console.log('Running in mode: ' + (dev ? 'dev' : 'prod'));


  const Keys = vanjacloud.Keys;
  console.log('keys', Keys)
  const ThoughtDB = Thought.ThoughtDB
  const ThoughtType = Thought.ThoughtType

  const thoughtDb = new ThoughtDB(Keys.notion,
    dev ? ThoughtDB.testdbid : ThoughtDB.proddbid);

  const contentDb = new Content.ContentDB(Keys.notion,
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


  const watcher = chokidar.watch(watchFolder, {
    ignored: [/^\./, '**/.DS_Store',
      //'**/*.!(mp3|mp4|m4a|m4v|mov)'
    ], // Ignore dot files, .DS_Store, and files that are not mp3, mp4, m4a, or m4v
    persistent: true,
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 100
    }
  });

  const validExtensions = ['.mp3', '.mp4', '.m4a', '.m4v', '.mov']

  var qcount = 0;
  q.on('next', async function (i: any) {
    let me = qcount++;
    // Access the job details
    console.log('--- processing', i, me);


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
    console.log('running whisper on', filePath);
    const fileName = path.basename(filePath);
    const command = `whisper --model medium --language English "${fileName}"`;

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



  enum FileType {
    Audio,
    Video,
    Movie,
    Unknown
  }

  async function processFile(filePath: string) {
    const fileName = path.basename(filePath);
    const destPath = path.join(destinationFolder, fileName);

    if (fs.existsSync(filePath) && fs.existsSync(destPath)) {
      // bad: uplicate, stuck
      console.warn('file already imported, skipping', { filePath, destPath });
      return
    }

    if (!fs.existsSync(filePath)) {
      // bad: where is teh file?
      console.warn('import failed, file missing: ', filePath)
      return
    }

    await initialContentLoad(filePath, destPath);
    await addTranscript(destPath);
  }

  async function reprocessFile(path: string) {
    // const destPath = path.join(destinationFolder, fileName);

    if (!fs.existsSync(path)) {
      // bad: uplicate, stuck
      console.warn('file missing, skipping', { path });
      return
    }

    await addTranscript(path);
  }

  async function initialContentLoad(filePath: string, destPath: string) {
    if (fs.existsSync(destPath)) {
      console.log('File already exists in destination folder, skipping: ', destPath);

    }
    // good
    console.log('File does not exist in destination folder, adding to db: ', destPath);
    await contentDb.save(destPath, [], '');
    renameSync(filePath, destPath);
  }

  async function addTranscript(targetPath: string) {
    const fileName = path.basename(targetPath);
    const transcriptPath = getTranscriptPath(targetPath);

    console.log('testing transcriptPath', transcriptPath, fs.existsSync(transcriptPath))

    if (fs.existsSync(transcriptPath)) {
      return; // already done, fix this test later
    }

    console.log(`Processing ${fileName} to ${destinationFolder}`);

    await runWhisper(targetPath);

    const transcript = fs.existsSync(transcriptPath) ? fs.readFileSync(transcriptPath, 'utf8') : null;
    console.log(`Processed ${fileName} to ${destinationFolder}`);

    const t = transcript == null ? ['empty'] : await suggestTags(transcript, CommonHashTags);
    const s = transcript == null ? fileName : await suggestSummaryName(transcript);

    const fileType = getFileType(fileName);

    switch (fileType) {
      case FileType.Audio:
        thoughtDb.saveIt2(`${s}\n\n${transcript}`, undefined, t);
        contentDb.update(targetPath, {
          title: s || 'Untitled iPhone Audio',
          tags: t,
          transcript: transcript || undefined
        });
        break;
      case FileType.Video:
        contentDb.update(targetPath, {
          title: s || 'Untitled iPhone Video',
          tags: t,
          transcript: transcript || undefined
        });
        break;
      case FileType.Movie:
        contentDb.update(targetPath, {
          title: s || 'Untitled Desktop Video',
          tags: t,
          transcript: transcript || undefined
        });
        break;
      default:
        break;
    }
  }

  function getFileType(fileName: string): FileType {
    const fileTypeRegexMap: any = {
      '/\.(mp3|m4a)$/i': FileType.Audio,
      '/\.(mp4|m4v)$/i': FileType.Video,
      '/\.(mov)$/i': FileType.Movie,
    };

    for (const regex in fileTypeRegexMap) {
      if (new RegExp(regex).test(fileName)) {
        return fileTypeRegexMap[regex];
      }
    }

    return FileType.Unknown;
  }

  function getTranscriptPath(filePath: string): string {
    return path.join(path.dirname(filePath), path.basename(filePath, path.extname(filePath)) + '.txt');
  }

  return () => {
    watcher.close();
    q.close();
    if (reprocess) {
      re_q.close();
    }
  }
}