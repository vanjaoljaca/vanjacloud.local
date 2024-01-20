import * as chokidar from 'chokidar';
import * as dotenv from 'dotenv';
dotenv.config(); // Load .env file, must be before vanjacloud.shared

const prod = process.argv.includes('--prod');
const dev = !prod;
console.log("Current working directory:", process.cwd());

console.log("argv", process.argv)

console.log('Running in mode: ' + (dev ? 'dev' : 'prod'));

import vanjacloud from "vanjacloud.shared.js";

import ScrapeDBHandler from './handlers/scrapedb';
import ContentDBHandler from './handlers/contentdb';

const Keys = vanjacloud.Keys;

const scrapeDb = new ScrapeDBHandler(prod);
// const contentDbHandlerCleanup = ContentDBHandler(prod);

// Add an 'on exit' hook
process.on('exit', () => {
  scrapeDb.shutdown();
  // contentDbHandlerCleanup();
});
