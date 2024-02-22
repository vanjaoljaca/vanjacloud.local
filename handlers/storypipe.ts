import moment from "moment";
import vanjacloud from "vanjacloud.shared.js";
const keys = vanjacloud.Keys;
import fs from 'fs';

import { ChatGPT } from "vanjacloud.shared.js";

async function x() {
  const openai = require('openai');

  const openaiClient = new openai(keys.openai);
  const response = await openaiClient.completions.create({
    engine: 'davinci',
    prompt: "Once upon a time",
    maxTokens: 5,
    temperature: 0.9,
    topP: 1,
    frequencyPenalty: 0,
    presencePenalty: 0,
    stop: ["\n"]
  });
  return response.data.choices[0].text;
}

const chatgpt = new ChatGPT.Client({ apiKey: keys.openai });

async function process(name: string, instruction: string, payload: string) {
  const r = await chatgpt.say(instruction + '\n' + payload);
  return r;
}

export default async function storypipe() {

  const now = moment();
  // create output folder for this run date and time
  const outputFolder = `./handlers/storypipe/output/${now.format('YYYY-MM-DD_HH-mm-ss')}`;
  fs.mkdirSync(outputFolder);

  const in_premise = 'a story about an angry person who smells like cabbage'

  const chaptersRaw = await process('prep chapters',
    'using a standard story arc, expand the following idea into a 3-8 chapter story. output in json array format: [{name, description}]',
    in_premise)

  console.log(chaptersRaw)

  if (chaptersRaw === null || chaptersRaw === undefined) {
    console.log('null response from chatgpt')
    return;
  }

  const chapters = JSON.parse(chaptersRaw);

  console.log(chapters)

  // return response.data.choices[0].text;
}