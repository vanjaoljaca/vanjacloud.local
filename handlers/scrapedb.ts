
import express, { Request, Response } from 'express';
import sqlite3 from 'sqlite3';

export default class ScrapeDB {
  private app: express.Application;
  private db: sqlite3.Database;
  listener: import("http").Server<typeof import("http").IncomingMessage, typeof import("http").ServerResponse>;

  constructor(prod: boolean) {
    this.app = express();
    this.app.use(express.json());
    this.setupRoutes();

    const dbPath = prod ? './data/prod/scrapedb.sqlite' : './data/dev/scrapedb-dev.sqlite';

    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err);
      } else {
        console.log('Database opened successfully');
      }
    });
    this.setupTables();

    const port = 3050
    this.listener = this.app.listen(port, () => {
      console.log('http://localhost:' + port + '/scrapedb');
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
