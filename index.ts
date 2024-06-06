import * as chokidar from 'chokidar';
import * as dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
dotenv.config(); // Load .env file, must be before vanjacloud.shared

const prod = process.argv.includes('--prod');
const dev = !prod;
console.log("Current working directory:", process.cwd());

console.log("argv", process.argv)

console.log('Running in mode: ' + (dev ? 'dev' : 'prod'));

import vanjacloud from "vanjacloud.shared.js";

import ContentDBHandler from './handlers/contentdb';
import HomeServer from './routers/HomeServerRouter';

const Keys = vanjacloud.Keys;


const app = express();
const port = process.env.PORT || 3050;


// SSL Certificate paths
// const sslOptions = {
//     key: fs.readFileSync(path.join(__dirname, '..', 'sslcert', 'server.key')),
//     cert: fs.readFileSync(path.join(__dirname, '..', 'sslcert', 'server.cert'))
// };
import fileUpload, { UploadedFile } from 'express-fileupload';

app.use(express.json());
app.use(fileUpload());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

import ScrapeDBRouter from './routers/ScrapeDbRouter';
import HomeServerRouter from './routers/HomeServerRouter';
import HomeServerWS from './routers/ws/HomeServerWS';
const [router, cleanup] = ScrapeDBRouter(false);
app.use('/scrapedb', router);
const [router2, cleanup2] = HomeServerRouter()
app.use('/homeserver', router2);



app.use((req, res) => {
    res.status(404).send('Page not found');
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

const listener = app.listen(port, () => {
    console.log(`Server running on port http://localhost/${port}`);
});

const x = HomeServerWS(listener)

process.on('exit', () => {

    cleanup();

    listener.close(() => {
        console.log('HTTP listener closed');
    });

    // todo scrapedb needs shutdown
});
