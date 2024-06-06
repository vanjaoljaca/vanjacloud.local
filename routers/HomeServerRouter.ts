/*
this thing is for connectivity to the ios app
*/

export default function HomeServerRouter() {

    const router = Router();

    // upload described here
    // https://docs.expo.dev/versions/latest/sdk/filesystem/
    router.get('/', (req: Request, res: Response) => {
        res.send('HomeServer is running');
    });

    router.post('/upload', (req: Request, res: Response) => {
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

    return [router, () => { }]
}


import { Request, Response, Router } from 'express';
// import https from 'https';
import { UploadedFile } from 'express-fileupload';


const crypto = require('crypto');

function computeSHA256(buffer: any) {
    const hash = crypto.createHash('sha256');
    hash.update(buffer);
    return hash.digest('hex'); // or 'base64' if you prefer
}
