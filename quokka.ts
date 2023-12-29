import * as dotenv from 'dotenv';
import * as moment from 'moment';
dotenv.config(); // Load .env file, must be before vanjacloud.shared
import vanjacloud, { AzureTranslate, Thought, Content } from "vanjacloud.shared.js";
const Keys = vanjacloud.Keys;

const cdb = new Content.ContentDB(Keys.notion, Content.ContentDB.testdbid);

cdb.save('test4', ['tagged'], 'test transcript2', {
    filePath: '/usr/home/blah',
    date: moment().subtract(1, 'day')
});
