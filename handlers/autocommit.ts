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

const tryStageChanges = async (repoPath: RepositoryPath): Promise<boolean> => {
  try {
    await execPromise('git add .', { cwd: repoPath });
    const status = await execPromise('git status --porcelain', { cwd: repoPath });
    return status !== '';
  } catch (error) {
    console.error(`StagingError: ${repoPath}`);
    return false;
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


const commitChanges = async (repoPath: RepositoryPath, message: string): Promise<void> => {
  if (await tryStageChanges(repoPath)) {
    try {
      await execPromise(`git commit -m "${message}"`, { cwd: repoPath });
      console.log(`Committed: ${repoPath} `);
    } catch (commitErr) {
      console.error(`CommitError: ${repoPath} `);
    }
  } else {
    console.log(`NoChanges: ${repoPath} `);
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

    const diff = await getGitDiff(repoPath)
    const message = await generateCommitMessage(repoPath, diff || '[error getting diff]', getProjectContext(repoPath));

    await commitChanges(repoPath, message);
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
