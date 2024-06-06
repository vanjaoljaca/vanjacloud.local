/*
this thing is for connectivity to the ios app
*/

export default function HomeServerWS(server: Server) {

    const wss = new WebSocketServer({ server });

    wss.on('connection', function connection(ws: any) {
        // ws.binaryType = 'arraybuffer';

        ws.on('error', function error(err: any) {
            console.error('WebSocket error:', err);
        });

        ws.on('message', function incoming(message: Buffer) {
            // don't use this for files, use HomeServerRouter post
            const o = JSON.parse(message.toString()) as string[];
            console.log('Received object:', o);
            ws.send(o[0])

        });

        const sendFile = (filePath: string) => {
            // this is the only way to push files to iOS
            // else iOS needs to GET from HomeServerRouter

            fs.readFile(filePath, (err, data) => {
                if (err) {
                    console.error('Error reading file:', err);
                    return;
                }
                console.log(data.length)
                ws.send(Buffer.from(data), { binary: true });
            });
        };
    });
}

import fs from 'fs';
import { Server } from 'http';

import { WebSocketServer } from 'ws';

const crypto = require('crypto');

function computeSHA256(buffer: any) {
    const hash = crypto.createHash('sha256');
    hash.update(buffer);
    return hash.digest('hex'); // or 'base64' if you prefer
}
