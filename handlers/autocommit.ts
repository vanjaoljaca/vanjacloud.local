import { exec } from 'child_process';
import moment from 'moment';
import fs from 'fs';
import vanjacloud, { Thought, Content, ChatGPT } from "vanjacloud.shared.js";
const Keys = vanjacloud.Keys;
import { generateCommitMessage } from '../util/gitsummarize';

type RepositoryPath = string;

const parentDir = '..';
const commitInterval = moment.duration(24, 'seconds');
const checkInterval = moment.duration(1, 'minutes').asMilliseconds();

var repositories: RepositoryPath[] = fs.readdirSync(parentDir, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .filter(dirent => fs.existsSync(`${parentDir}/${dirent.name}/.git`))
  .map(dirent => `${parentDir}/${dirent.name}`);

if (false) { // for test
  console.log(repositories);
  repositories = [repositories[3]] // for test
}

const execPromise = (command: string, options: { cwd: string }): Promise<string> => {
  return new Promise((resolve, reject) => {
    exec(command, options, (err, stdout) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(stdout);
    });
  });
};

const getLastCommitTimestamp = async (repoPath: RepositoryPath): Promise<moment.Moment> => {
  try {
    const output = await execPromise('git log -1 --format=%ct', { cwd: repoPath });
    return moment.unix(parseInt(output.trim(), 10));
  } catch (error) {
    console.error(`LastCommitError: ${repoPath}`);
    return moment();
  }
};

async function getGitHasChanges(repoPath: RepositoryPath): Promise<boolean> {
  const status = await execPromise('git status --porcelain', { cwd: repoPath });
  return status !== '';
}

const stageChanges = async (repoPath: RepositoryPath) => {
  try {
    return await execPromise('git add .', { cwd: repoPath });
  } catch (error) {
    console.error(`StagingError: ${repoPath}`);
    throw error;
  }
};

function getProjectContext(repoPath: RepositoryPath): string {
  return 'todo ' + repoPath
}


const getGitDiff = async (repoPath: RepositoryPath): Promise<string | undefined> => {
  try {
    const diff = await execPromise('git diff --staged', { cwd: repoPath });
    console.log('GitDiff:', { repoPath, diff })
    return diff;
  } catch (error) {
    console.error(`GitDiffError: ${repoPath}`, error);
    throw error
  }
}


const commitStagedChanges = async (repoPath: RepositoryPath, message: string): Promise<void> => {
  try {
    await execPromise(`git commit -m "${message}"`, { cwd: repoPath });
    console.log(`Committed: ${repoPath} `);
  } catch (commitErr) {
    console.error(`CommitError: ${repoPath} `);
  }
};

const checkAndCommit = async (): Promise<void> => {
  for (let repoPath of repositories) {
    const lastCommitTime = await getLastCommitTimestamp(repoPath);
    const nextCommitTime = lastCommitTime.clone().add(commitInterval);

    if (!moment().isAfter(nextCommitTime)) {
      console.log(`FilterCommitTime: ${repoPath} ${lastCommitTime.format()} `);
      continue;
    }

    if (!await getGitHasChanges(repoPath)) {
      console.log(`FilterNoChanges: ${repoPath} `);
      continue;
    }

    await stageChanges(repoPath)

    const diff = await getGitDiff(repoPath)
    if (!diff) {
      console.log(`FilterCommitDiffError: ${repoPath} `);
      continue;
    }

    const message = await generateCommitMessage(repoPath, diff, getProjectContext(repoPath));

    await commitStagedChanges(repoPath, message);
  }
};

setInterval(checkAndCommit, checkInterval);


export default function autocommitter() {
  console.log('Autocommitter started')
  console.log(repositories);
  const timeout = setInterval(checkAndCommit, checkInterval);
  checkAndCommit();
  return () => {
    clearInterval(timeout);
    console.log('Autocommitter stopped')
  }
}
