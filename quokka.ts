import * as dotenv from 'dotenv';
import * as moment from 'moment';
dotenv.config(); // Load .env file, must be before vanjacloud.shared
import vanjacloud, { AzureTranslate, Thought, Content } from "vanjacloud.shared.js";
const Keys = vanjacloud.Keys;

const cdb = new Content.ContentDB(Keys.notion, Content.ContentDB.testdbid);

const filePath = '/usr/home/blah12/' + moment().toString();

console.log('filePath', filePath);
async function test() {

    await cdb.save('test6', ['tagged'], 'not updated test transcript2', {
        filePath: filePath,
        date: moment().subtract(1, 'day')
    });

    await cdb.update(filePath, {
        transcript: 'updated test transcript3'
    })
}

test().then(() => {
    console.log('done');
}).catch(err => {
    console.error(err);
})