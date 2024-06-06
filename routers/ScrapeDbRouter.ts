
export default function create(prod: boolean): [Router, () => void] {
    const router = Router();


    // Define a GET route for fetching users
    router.get('/', (req: Request, res: Response) => {
        res.send('List of users');
    });

    // Define a POST route to create a new user
    router.post('/', (req: Request, res: Response) => {
        // Assume user creation logic here
        res.status(201).send('User created');
    });


    router.use(express.json());
    router.use(fileUpload());


    router.get('/', (req: Request, res: Response) => {
        res.send('ScrapeDB is running');
    }

    );

    router.post('/scrapedb', (req: Request, res: Response) => {
        const scrapedItem = req.body as ScrapedItem;

        // Insert scrapedItem into the database
        const columns = Object.keys(scrapedItem).join(', ');
        const values = Object.values(scrapedItem);

        const placeholders = values.map(() => '?').join(', ');

        const insertQuery = `INSERT INTO ScrapedItems (${columns}) VALUES (${placeholders})`;

        db.run(insertQuery, values, (err) => {
            if (err) {
                console.error('Error inserting data:', err);
                res.sendStatus(500);
            } else {
                console.log('inserted', scrapedItem)
                res.sendStatus(200);
            }
        });
    });

    const dbPath = prod ? './data/prod/scrapedb.sqlite' : './data/dev/scrapedb-dev.sqlite';
    const db = new sqlite3.Database(dbPath, err => {
        if (err) console.error('Error opening database:', err);
    });
    setupTables(db);


    return [router, (() => {
        db.close((err) => {
            if (err) {
                console.error('Error closing database:', err);
            } else {
                console.log('Database closed successfully');
            }
        });
    })]
}

function setupTables(db: sqlite3.Database) {
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

    db.run(cmd, (err) => {
        if (err) {
            console.error('Error creating table:', err);
        } else {
            console.log('Table created successfully');
        }
    });
}


interface ScrapedItem {
    [key: string]: any;
    source: string;
    data: object;
}

import express, { Router, Request, Response } from 'express';
import http from 'http';
// import https from 'https';
import sqlite3 from 'sqlite3';
import fileUpload, { UploadedFile } from 'express-fileupload';

