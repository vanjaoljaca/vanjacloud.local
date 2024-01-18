// import moment from 'moment';
const moment = require('moment')
import vanjacloud, { Thought, Content, ChatGPT } from "vanjacloud.shared.js";
import { execPromise } from './execPromise';
const Keys = vanjacloud.Keys;

type RepositoryPath = string;


async function summarizeChanges(repoPath: RepositoryPath,
  changedFiles: string[],
  diff: string,
  projectContext: string
): Promise<string | null | undefined> {
  const systemPrompt =
    `Auto generate a commit message based on the change log provided. The current date is: ${moment().format('YYYY-MM-DD')}
    make sure to include it in the header [in brackets].

    Notes about commit message:
    - be terse, do not talk about trivial shit. all changes should roll up into at least one bullet point even if its high level
    - open with a high level summary, then add more detail, then minutia/trivia at bottom if needed
    - be brief. dont tell me about added new lines or other trivial garbage
    - DO NOT MENTION NEWLINES AT ALL

    Project context: ${projectContext}`
  const chat = new ChatGPT.Client({
    // apiKey: process.env['OPENAI_API_KEY'],
    apiKey: Keys.openai,
    systemPrompt
  })
  const response = await chat.say(diff);
  console.log('GeneratedMessage:', { repoPath, diff, response })
  return response;
}

async function generateCommitMessage(repoPath: RepositoryPath, diff: string, projectContext: string): Promise<string> {
  try {
    const status = await execPromise('git status --porcelain', { cwd: repoPath });
    const lines = status.split('\n');
    const changedFiles = lines.map(line => line.split(' ')[1]);
    const summarized = await summarizeChanges(repoPath, changedFiles, diff || 'TODO DIFF EERROR', projectContext);
    return summarized || '[TODO Date] Auto commit (Error)\n\nError Generating: (null | undefined)';
  } catch (error) {
    console.error(`CommitMessageError: ${repoPath} `);
    return '[TODO Date] Auto commit (Error)\n\nError Generating: ' + error;;
  }
}

// {
//   {
//     const repoPath = '../vanjacloud.azurefunc';
//     const diff = `diff --git a/testchange b/testchange
// index ff671c5..0ba4247 100644
// --- a/testchange
// +++ b/testchange
// @@ -1,2 +1,3 @@
//  THESE ARE SUPER IMPORTANT CHANGES DO NOT DELETE
// -fdsfdsdfdsjkl
// \ No newline at end of file
// +fdsfdsdfdsjkl
// +fjsdflkdsjkl
// \ No newline at end of file`;
//     const projectContext = 'todo';
//     const message = await generateCommitMessage(repoPath, diff, projectContext);

//     console.log('2', message);
//   }
// }

export {
  generateCommitMessage
}