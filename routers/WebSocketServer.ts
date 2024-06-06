/* Not in use atm */
export default function create(server: any) {
    const wss = new WebSocketServer({ server });

    wss.on('connection', function connection(ws: any) {
        // ws.binaryType = 'arraybuffer';

        ws.on('error', function error(err: any) {
            console.error('WebSocket error:', err);
        });

        ws.on('message', function incoming(message: Buffer) {
            const o = JSON.parse(message.toString()) as string[];
            console.log('Received object:', o);
            ws.send(o[0])

        });

    });
}

import { WebSocketServer } from "ws";