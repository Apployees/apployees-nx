import { RemoteCache } from "@nrwl/workspace/src/tasks-runner/tasks-runner-v2";
import levelup from "levelup";
import { archive, extract } from "simple-archiver";
import path from "path";
import fs from "fs";
import { clone, isFunction } from "lodash";

export interface ILevelCacheOptions {
  driver?: string;
  name?: string;
  time_to_live?: number;
}

const cacheOptionsEnvKeyPrefix = "level_task_runner_";
const cacheOptionsEnvKeyDriver = "driver";
const cacheOptionsEnvKeyName = "name";
const cacheOptionsEnvKeyTimeToLive = "time_to_live";

export class LevelCache implements RemoteCache {
  private options: ILevelCacheOptions;
  private driverOptions: any;

  constructor(options?: ILevelCacheOptions) {
    this.driverOptions = this.getDriverOptions(options || {});

    this.options = {
      [cacheOptionsEnvKeyDriver]: this.driverOptions[cacheOptionsEnvKeyDriver],
      [cacheOptionsEnvKeyName]: this.driverOptions[cacheOptionsEnvKeyName],
      [cacheOptionsEnvKeyTimeToLive]: this.driverOptions[cacheOptionsEnvKeyTimeToLive],
    };

    delete this.driverOptions[cacheOptionsEnvKeyDriver];
    delete this.driverOptions[cacheOptionsEnvKeyName];
    delete this.driverOptions[cacheOptionsEnvKeyTimeToLive];
  }

  async retrieve(hash: string, cacheDirectory: string): Promise<boolean> {
    const dbAndLevelDownInstance = this.getDb();
    if (!dbAndLevelDownInstance) {
      return false;
    }

    const { db } = dbAndLevelDownInstance;

    return new Promise((resolve, reject) => {
      try {
        db.get(hash, async (err, value) => {
          if (err) {
            //console.error("level-task-runner: Error while retrieving cache item ", err);
            resolve(false);
          } else {
            try {
              await this.unarchiveIntoDir(value, cacheDirectory);
              fs.writeFileSync(path.join(cacheDirectory, `${hash}.commit`), "true");
              resolve(true);
            } catch (e) {
              console.error("level-task-runner: Error while retrieving cache item ", e);
              resolve(false);
            }
          }

          db.close(err => {
            if (err) {
              console.error(
                "level-task-runner: Error while closing db after retrieving cache item ", err);
            }
          });
        });
      } catch (e) {
        console.error("level-task-runner: Error while retrieving cache item ", e);
        resolve(false);
      }
    });
  }

  async store(hash: string, cacheDirectory: string): Promise<boolean> {
    const dbAndLevelDownInstance = this.getDb();
    if (!dbAndLevelDownInstance) {
      return false;
    }

    const { db, leveldownInstance } = dbAndLevelDownInstance;

    try {
      const zippedVal = await this.archiveFromDir(hash, cacheDirectory);

      return new Promise((resolve, reject) => {
        try {
          db.put(hash, zippedVal, async err => {
            if (err) {
              console.error("level-task-runner: Error while storing cache item ", err);
              resolve(false);
            } else {
              resolve(true);
            }

            // Some leveldown drivers like redis have an expire method
            if (this.options.time_to_live &&
                leveldownInstance.db &&
                isFunction(leveldownInstance.db.expire)) {
              leveldownInstance.db.expire(hash, this.options.time_to_live, async expireErr => {
                db.close(err => {
                  if (err) {
                    console.error("level-task-runner: Error while closing db after storing cache item ",
                      err
                    );
                  }
                });
              });
            } else {
              db.close(err => {
                if (err) {
                  console.error("level-task-runner: Error while closing db after storing cache item ",
                    err
                  );
                }
              });
            }
          });
        } catch (e) {
          console.error("level-task-runner: Error while storing cache item ", e);
          resolve(false);
        }
      });
    } catch (e) {
      console.error("level-task-runner: Error while storing cache item ", e);
      return Promise.resolve(false);
    }
  }

  private async archiveFromDir(hash: string, cacheDirectory: string): Promise<Buffer> {
    return await archive(path.join(cacheDirectory, hash));
  }

  private async unarchiveIntoDir(value: Buffer, cacheDirectory: string): Promise<void> {
    return await extract(value, cacheDirectory);
  }

  private getDb(): { db: levelup.LevelUp; leveldownInstance: any } {
    try {
      const driver = this.getDriver();
      const name = this.options.name || "level-task-runner";
      const leveldownInstance = isFunction(driver) ? driver(name, this.driverOptions) : driver;
      return leveldownInstance
        ? { db: levelup(leveldownInstance, this.driverOptions as any), leveldownInstance: leveldownInstance }
        : null;
    } catch (e) {
      console.error("level-task-runner: Error while creating level db ", e);
    }
  }

  private getDriverOptions(options: any) {
    options = options || {};
    const finalOptions = clone(options);

    // we need to check if the environment has any parameters -- those take
    // priority over the passed options
    for (const key in process.env) {
      const keyToLowercase = key.toLowerCase();
      if (keyToLowercase.startsWith(cacheOptionsEnvKeyPrefix)) {
        const suffix = key.substring(cacheOptionsEnvKeyPrefix.length);
        const suffixToLowercase = suffix.toLowerCase();
        if (
          suffixToLowercase === cacheOptionsEnvKeyDriver ||
          suffixToLowercase === cacheOptionsEnvKeyName ||
          suffixToLowercase === cacheOptionsEnvKeyTimeToLive
        ) {
          finalOptions[suffixToLowercase] = process.env[key];
        } else {
          finalOptions[suffix] = process.env[key];
        }
      }
    }

    // customize driver options based on driver.
    switch (options[cacheOptionsEnvKeyDriver]) {
      case "redisdown":
        finalOptions["ownClient"] = true;
        break;
      default:
        // nothing
    }

    return finalOptions;
  }

  private getDriver() {
    if (this.options.driver) {
      const loadedDriver = __non_webpack_require__(this.options.driver);
      return loadedDriver;
    } else {
      return null;
    }
  }
}

// eslint-disable-next-line @typescript-eslint/camelcase
declare function __non_webpack_require__(string): any;
