
import express, { Request, Response } from 'express';
import http from 'http';
// import https from 'https';
import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';
import fileUpload, { UploadedFile } from 'express-fileupload';

import { WebSocketServer } from 'ws';

const crypto = require('crypto');

function computeSHA256(buffer: any) {
    const hash = crypto.createHash('sha256');
    hash.update(buffer);
    return hash.digest('hex'); // or 'base64' if you prefer
}

export default class ScrapeDB {
    private app: express.Application;
    private db: sqlite3.Database;
    listener: import("http").Server;

    constructor(prod: boolean) {
        this.app = express();
        this.app.use(express.json());
        this.app.use(fileUpload());
        this.setupRoutes();

        const dbPath = prod ? './data/prod/scrapedb.sqlite' : './data/dev/scrapedb-dev.sqlite';
        this.db = new sqlite3.Database(dbPath, err => {
            if (err) console.error('Error opening database:', err);
        });
        this.setupTables();

        // SSL Certificate paths
        // const sslOptions = {
        //     key: fs.readFileSync(path.join(__dirname, '..', 'sslcert', 'server.key')),
        //     cert: fs.readFileSync(path.join(__dirname, '..', 'sslcert', 'server.cert'))
        // };

        const port = 3050; // HTTPS typically uses port 443, but for local testing 3050 is fine
        const server = http.createServer({}, this.app);
        this.listener = server.listen(port, () => {
            console.log(`http://localhost:${port}/scrapedb`);
        });
        const wss = new WebSocketServer({ server });


        wss.on('connection', function connection(ws: any) {
            ws.binaryType = 'arraybuffer';

            ws.on('error', function error(err: any) {
                console.error('WebSocket error:', err);
            });

            ws.on('message', function incoming(message: any) {
                // const buffer = message as Buffer;

                // const f = Buffer.from(buffer.toString(), 'base64');




                // console.log('Before:', message.length, computeSHA256(message));


                // console.log('Buffer content length:', buffer.length);
                // const filePath = path.join(__dirname, 'received_file.mp4');
                // console.log(filePath)
                // fs.writeFileSync(filePath, f, 'binary');


                // // Re-read the file and compute its checksum
                // fs.readFile(filePath, (err, data) => {
                //     if (err) {
                //         console.error('Failed to read file:', err);
                //     } else {
                //         const reReadBase64 = data.toString('base64');
                //         const reReadChecksum = computeSHA256(reReadBase64);
                //         const originalChecksum = computeSHA256(message);

                //         console.log('Re-read file checksum:', reReadBase64.length, reReadChecksum);
                //         console.log('Original message checksum:', message.length, originalChecksum);

                //         if (reReadChecksum === originalChecksum) {
                //             console.log('File integrity verified.');
                //         } else {
                //             console.log('File integrity check failed.');
                //         }
                //     }
                // });

            });

            async function test2() {

                // Base64 encoded string
                const base64Data = 'strumpdjkfldjlkstrumpdjkfldjlkstrumpdjkfldjlkstrumpdjkfldjlkstrumpdjkfldjlkstrumpdjkfldjlkstrumpdjkfldjlk';

                // Decode the base64 string to a Buffer
                const buffer = Buffer.from(base64Data, 'base64');

                // File path
                const filePath = '.test';

                fs.writeFileSync(filePath, buffer);

                const d = fs.readFileSync(filePath)
                const db64 = d.toString('base64')

                console.log('File content length:', base64Data.length, db64.length);
                console.log(base64Data === db64)
                console.log(base64Data, db64)
            }

            async function test() {
                // Binary data (for example, a base64-encoded string)
                const base64Data = 'c3RydW1wZGprZmxkamxrc3RydW1wZGprZmxkamxrc3RydW1wZGprZmxkamxrc3RydW1wZGprZmxkamxrc3RydW1wZGprZmxkamxrc3RydW1wZGprZmxkamxrc3RydW1wZGprZmxk';

                // Convert the base64 string to a Buffer
                const buffer = Buffer.from(base64Data, 'base64');

                // File path
                const filePath = '.test';

                // Write the Buffer to the file
                fs.writeFileSync(filePath, buffer);

                // Read the file contents back into a Buffer
                const fileBuffer = fs.readFileSync(filePath);

                // Convert the Buffer back to a base64 string
                const readData = fileBuffer.toString('base64');

                console.log('Original data length:', base64Data.length);
                console.log('Read data length:', readData.length);
                console.log('Data matches:', base64Data === readData);
                console.log('Original data:', computeSHA256(base64Data), base64Data);
                console.log('Saved data:', computeSHA256(fileBuffer), fileBuffer);
                console.log('Read data:', computeSHA256(readData), readData);
                console.log(base64Data);
                console.log(readData);
            }

            // test()

            // ws.send('Hello! Message From Server!!');

            // Function to send file
            // const sendFile = (filePath: string) => {

            //     fs.readFile(filePath, (err, data) => {
            //         if (err) {
            //             console.error('Error reading file:', err);
            //             ws.send('Failed to read file');
            //             return;
            //         }
            //         // Convert the binary data to a base64 string
            //         const base64Data = data.toString('base64');
            //         ws.send(base64Data);  // Send as a base64 string
            //         console.log('File sent as base64 to the client.');
            //     });
            // };

            const sendFile = (filePath: string) => {

                fs.readFile(filePath, (err, data) => {
                    if (err) {
                        console.error('Error reading file:', err);
                        return;
                    }
                    // Convert the binary data to a base64 string

                    console.log(data.length)
                    // const d = [1, 3, 5, 8]
                    const r = ws.send(Buffer.from(data), { binary: true });  // Send as a base64 string
                    console.log('sent', r);
                });
            };

            // Example: Send a file upon connection
            sendFile('/Users/vanjaoljaca/Music/Ableton/Factory Packs/Orchestral Woodwinds/Samples/Combined/Woodwinds Ensemble Legato.aif');
            // sendFile('./data/test_face.mp4');
        });
    }

    shutdown() {
        this.listener.close(() => {
            console.log('HTTP listener closed');
        });

        this.db.close((err) => {
            if (err) {
                console.error('Error closing database:', err);
            } else {
                console.log('Database closed successfully');
            }
        });
    }


    private setupRoutes() {
        this.app.get('/', (req: Request, res: Response) => {
            res.send('ScrapeDB is running');
        }

        );

        this.app.post('/upload', (req: Request, res: Response) => {
            if (!req.files || Object.keys(req.files).length === 0) {
                console.log('empty...')
                return res.status(400).send('No files were uploaded.');
            }

            // console.log(req.files)
            const uploadedFile =
                // (req.files as fileUpload.FileArray).uploadedFile as UploadedFile;
                (req.files).file as UploadedFile

            uploadedFile.mv('./uploads/test.mp4', function (err) {
                if (err) {
                    return res.status(500).send(err);
                }
                res.send('File uploaded!');
            });
        });

        this.app.post('/scrapedb', (req: Request, res: Response) => {
            const scrapedItem = req.body as ScrapedItem;

            // Insert scrapedItem into the database
            const columns = Object.keys(scrapedItem).join(', ');
            const values = Object.values(scrapedItem);

            const placeholders = values.map(() => '?').join(', ');

            const insertQuery = `INSERT INTO ScrapedItems (${columns}) VALUES (${placeholders})`;

            this.db.run(insertQuery, values, (err) => {
                if (err) {
                    console.error('Error inserting data:', err);
                    res.sendStatus(500);
                } else {
                    console.log('inserted', scrapedItem)
                    res.sendStatus(200);
                }
            });
        });
    }

    private setupTables() {
        const scrapedItem = {} as ScrapedItem;
        const columns = Object.keys(scrapedItem).map((key) => `${key} ${getType(scrapedItem[key])}`).join(',\n');

        function getType(value: any): string {
            if (typeof value === 'string') {
                return 'TEXT';
            } else if (typeof value === 'number') {
                return 'INTEGER';
            } else {
                return 'TEXT'; // Default to TEXT if the type is not recognized
            }
        }

        const cmd = `
        CREATE TABLE IF NOT EXISTS ScrapedItems (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          source TEXT,
          data TEXT
        )
      `

        console.log(cmd)

        this.db.run(cmd, (err) => {
            if (err) {
                console.error('Error creating table:', err);
            } else {
                console.log('Table created successfully');
            }
        });
    }
}


interface ScrapedItem {
    [key: string]: any;
    source: string;
    data: object;
}
