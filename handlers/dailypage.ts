import { Thought } from "vanjacloud.shared.js";

import moment from "moment";
import vanjacloud from "vanjacloud.shared.js";
const keys = vanjacloud.Keys;
import fs from 'fs';

import { ChatGPT } from "vanjacloud.shared.js";

import { createTTS, initTTS } from "../util/tts";

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

export default class DailyPageHandler {
  db: Thought.ThoughtDB;

  constructor() {
    console.log('DailyPageHandler constructor');
    this.db = new Thought.ThoughtDB(keys.notion, Thought.ThoughtDB.proddbid);
  }

  public async getDailyPage() {
    // const latest = this.db.getLatest(moment.duration({ week: 1 }))

    // var i = 0;
    // for await (const item of latest) {
    //   // Process each item here
    //   console.log(i, item);
    //   i++;
    // }

    // const r = await chatgpt.say("These are my notes for this week. Convert this into a journal entry in Spanish:" + '\n'
    //   + JSON.stringify(latest));

    // console.log(r)

    const r = `Estos son mis apuntes para esta semana. Convertirlo en una entrada de diario en español:

Esta semana estuve muy ocupado y tuve muchas cosas que hacer. El lunes, tenia una reunión importante en el trabajo y también tenía que terminar un informe que había estado postergando. Fue un día estresante pero logré terminar todo a tiempo. 

El martes asistí a una clase de yoga después del trabajo. Me gusta mucho hacer ejercicio y el yoga me ayuda a relajarme y despejar mi mente. Fue una sesión muy energizante y me dejó sintiéndome renovado. 

El miércoles, tuve una cita con el dentista. No me gusta ir al dentista, pero sé que es importante para mantener una buena salud bucal. Afortunadamente, todo estaba bien y no tuve que hacerme ningún tratamiento adicional. Después de la cita, fui a cenar con unos amigos y pasamos una noche muy agradable juntos.

El jueves, tuve la oportunidad de asistir a una conferencia sobre desarrollo personal y profesional. Fue muy interesante y me motivó a establecer nuevos objetivos y trabajar hacia ellos. También aprendí algunas técnicas nuevas para mejorar mi productividad y organización. Definitivamente fue una experiencia enriquecedora.

El viernes, tuve un día más tranquilo. Fuimos a cenar en un restaurante nuevo con mi pareja y disfrutamos de una comida deliciosa. Luego, tuvimos una noche de película en casa, relajándonos y disfrutando de nuestro tiempo juntos.

En general, fue una semana ocupada pero productiva. Me enfrenté a varios desafíos y logré cumplir con mis responsabilidades. También tuve tiempo para cuidar de mi bienestar y disfrutar de momentos de relajación. Estoy satisfecho con lo que logré y estoy listo para enfrentar los desafíos de la próxima semana.`

    if (r === undefined || r === null) {
      return;
    }

    const voiceFile = '../vanjacloud.private.js/voices/voice1.wav';

    if (!fs.existsSync(voiceFile)) {
      console.error('no voice file')
      return;
    }

    await initTTS();
    const path = await createTTS(voiceFile, r);
    console.log('done', path)
  }
}