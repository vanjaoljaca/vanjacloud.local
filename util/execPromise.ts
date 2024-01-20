import { exec } from 'child_process';

export const execPromise = (command: string, options?: { cwd: string; }): Promise<string> => {
  return new Promise((resolve, reject) => {
    exec(command, options || { cwd: '.' }, (err, stdout) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(stdout);
    });
  });
};
