import { Thought } from "vanjacloud.shared.js";

import moment from "moment";
import vanjacloud from "vanjacloud.shared.js";
const keys = vanjacloud.Keys;
import fs from 'fs';

import { ChatGPT } from "vanjacloud.shared.js";
import sqlite3 from 'sqlite3';
import ThoughtDB from "./thoughtdb";
import OpenAI from "openai";




const chatgpt = new ChatGPT.Client({ apiKey: keys.openai });

async function process(name: string, instruction: string, payload: string) {
    const r = await chatgpt.say(instruction + '\n' + payload);
    return r;
}

export default class SearchPastHandler {
    remoteDb: Thought.ThoughtDB;
    localDb: ThoughtDB;

    constructor() {
        const isProd = true;
        console.log('DailyPageHandler constructor');
        this.remoteDb = new Thought.ThoughtDB(keys.notion, isProd ? Thought.ThoughtDB.proddbid : Thought.ThoughtDB.testdbid);
        this.localDb = new ThoughtDB(isProd)
    }

    public async run() {


        const latestLocal = await this.localDb.getLatest();

        const e = await this.getEmbedding(latestLocal.text);
        console.log(JSON.stringify(e));
        this.localDb.update(latestLocal.id, { embedding: e.data[0].embedding });
        return;

        const now = moment();
        const duration = moment.duration(now.diff(moment(latestLocal.date)));

        const latest = this.remoteDb.getLatest(duration);

        var i = 0;
        for await (const item of latest) {
            // Process each item here
            console.log(i, item); // add date here
            i++;
            await this.localDb.insert(item);
        }



        // const r = await chatgpt.say("These are my notes for this week. Convert this into a journal entry in Spanish:" + '\n'
        //     + JSON.stringify(latest));

        // console.log(r)

        // if (r === undefined || r === null) {
        //     return;
        // }

    }

    private async getEmbedding(text: string) {
        const openai = new OpenAI({ apiKey: keys.openai });
        const r = await openai.embeddings.create({
            model: "text-embedding-ada-002",
            input: text
        });
        return r;
    }
}