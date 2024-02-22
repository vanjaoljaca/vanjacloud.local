
import express, { Request, Response } from 'express';
import { Moment } from 'moment';
import sqlite3 from 'sqlite3';
import { AsyncDatabase } from 'promised-sqlite3';
import { promisify } from 'util';
import { Embedding } from 'openai/resources';


/* This thought db is for local sqlite3, not to be confused w notion version
Maybe these are 2 implementations of the same interface idk */
export default class ThoughtDB {
    private db: AsyncDatabase;

    constructor(prod: boolean) {

        const dbPath = prod ? './data/prod/thoughtdb.sqlite' : './data/dev/thoughtdb-dev.sqlite';

        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('Error opening database:', err);
            } else {
                console.log('Database opened successfully');
            }
        });
        this.db = new AsyncDatabase(db);
        this.setupTablesV1();
        this.setupTablesV2();
    }

    public async getAll(): Promise<RowExternal[]> {
        const rows = await this.db.all('SELECT * FROM Thoughts');
        return rows.map(this.hydrate);
    }

    public async get(id: Guid): Promise<RowExternal> {
        const r = this.db.get('SELECT * FROM Thoughts WHERE id = ?', [id]);
        return this.hydrate(r)
    }

    public async insert(row: RowExternal): Promise<void> {
        await this.db.run('INSERT INTO Thoughts (id, tags, text, type, date) VALUES (?, ?, ?, ?, ?)',
            [row.id, JSON.stringify(row.tags), row.text, row.type, row.date.format()]);
    }

    public async getLatest(): Promise<RowExternal> {
        const r = await this.db.get('SELECT * FROM Thoughts ORDER BY date DESC LIMIT 1') as any[];
        return this.hydrate(r);
    }

    public async update(id: Guid, input: { embedding?: Embedding }): Promise<void> {
        const cmd = 'UPDATE Thoughts SET embedding = ? WHERE id = ?';
        await this.db.run(cmd, [JSON.stringify(input.embedding), id]);
    }

    private setupTablesV1() {

        const cmd = `
            CREATE TABLE IF NOT EXISTS Thoughts (
                id TEXT PRIMARY KEY,
                tags TEXT,
                text TEXT,
                type TEXT,
                date TEXT
            )
        `

        return this.db.run(cmd);
    }

    private setupTablesV2() {
        const cmd = `
            ALTER TABLE Thoughts ADD COLUMN embedding TEXT;
        `;

        return this.db.run(cmd);
    }

    shutdown() {
        return this.db.close();
    }

    /*
    hydrate an entry from db into a Row
    */
    private hydrate(row: any): RowExternal {
        return {
            ...row,
            tags: JSON.parse(row.tags)
        } as RowExternal;
    }


}

type Guid = string
interface RowExternal {
    id: Guid,
    tags: string[],
    text: string,
    type: '🐿️',
    date: Moment
}

interface RowInternal {
    id: string,
    tags: string,
    text: string,
    type: string,
    date: string
}