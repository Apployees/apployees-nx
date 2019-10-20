import {
  BuilderContext,
  BuilderOutput,
  createBuilder,
  scheduleTargetAndForget,
  targetFromTargetString
} from '@angular-devkit/architect';
import { ChildProcess, fork } from 'child_process';
import * as treeKill from 'tree-kill';

import { bindCallback, from, Observable, of, zip } from 'rxjs';
import { concatMap, filter, first, map, mapTo, tap } from 'rxjs/operators';

import { stripIndents } from '@angular-devkit/core/src/utils/literals';
import { JsonObject } from '@angular-devkit/core';
import { InspectType, WebpackBuildEvent } from '@apployees-nx/common-build-utils';

try {
  require('dotenv').config();
} catch (e) {}

export interface NodeExecuteBuilderOptions extends JsonObject {
  inspect: boolean | InspectType;
  args: string[];
  waitUntilTargets: string[];
  entryFile?: string;
  buildTarget: string;
  host: string;
  port: number;
}

export default createBuilder<NodeExecuteBuilderOptions>(
  nodeExecuteBuilderHandler
);

let subProcess: ChildProcess;

export function nodeExecuteBuilderHandler(
  options: NodeExecuteBuilderOptions,
  context: BuilderContext
): Observable<BuilderOutput> {
  return runWaitUntilTargets(options, context).pipe(
    concatMap(v => {
      if (!v.success) {
        context.logger.error(
          `One of the tasks specified in waitUntilTargets failed`
        );
        return of({ success: false });
      }
      return startBuild(options, context).pipe(
        concatMap((event: WebpackBuildEvent) => {

          const fileToRun = getFileToRun(event, options, context);

          if (event.success) {
            return restartProcess(fileToRun, options, context).pipe(
              mapTo(event)
            );
          } else {
            context.logger.error(
              'There was an error with the build. See above.'
            );
            context.logger.info(`${fileToRun} was not restarted.`);
            return of(event);
          }
        })
      );
    })
  );
}

function getFileToRun(event: WebpackBuildEvent, options: NodeExecuteBuilderOptions,
                      context: BuilderContext) {
  const fileEntry = event.emittedFiles ? event.emittedFiles.filter(
    e => (e.name === options.entryFile || e.file === options.entryFile)
  )[0] : null;

  const fileName = fileEntry && fileEntry.name ? fileEntry.name : "main";

  return event.outfile ?
    event.outfile.replace('[name]', fileName) : `${fileName}.js`;
}

function runProcess(file: string, options: NodeExecuteBuilderOptions) {
  if (subProcess) {
    throw new Error('Already running');
  }
  subProcess = fork(file, options.args, {
    execArgv: getExecArgv(options)
  });
}

function getExecArgv(options: NodeExecuteBuilderOptions) {
  const args = ['-r', 'source-map-support/register'];

  if (options.inspect === true) {
    options.inspect = InspectType.Inspect;
  }

  if (options.inspect) {
    args.push(`--${options.inspect}=${options.host}:${options.port}`);
  }

  return args;
}

function restartProcess(
  file: string,
  options: NodeExecuteBuilderOptions,
  context: BuilderContext
) {
  return killProcess(context).pipe(
    tap(() => {
      runProcess(file, options);
    })
  );
}

function killProcess(context: BuilderContext): Observable<void | Error> {
  if (!subProcess) {
    return of(undefined);
  }

  const observableTreeKill = bindCallback<number, string, Error>(treeKill);
  return observableTreeKill(subProcess.pid, 'SIGTERM').pipe(
    tap(err => {
      subProcess = null;
      if (err) {
        if (Array.isArray(err) && err[0] && err[2]) {
          const errorMessage = err[2];
          context.logger.error(errorMessage);
        } else if (err.message) {
          context.logger.error(err.message);
        }
      }
    })
  );
}

function startBuild(
  options: NodeExecuteBuilderOptions,
  context: BuilderContext
): Observable<WebpackBuildEvent> {
  const target = targetFromTargetString(options.buildTarget);
  return from(
    Promise.all([
      context.getTargetOptions(target),
      context.getBuilderNameForTarget(target)
    ]).then(([options, builderName]) =>
      context.validateOptions(options, builderName)
    )
  ).pipe(
    tap(options => {
      if (options.optimization) {
        context.logger.warn(stripIndents`
            ************************************************
            This is a simple process manager for use in
            testing or debugging Node applications locally.
            DO NOT USE IT FOR PRODUCTION!
            You should look into proper means of deploying
            your node application to production.
            ************************************************`);
      }
    }),
    concatMap(
      () =>
        scheduleTargetAndForget(context, target, {
          watch: true
        }) as Observable<WebpackBuildEvent>
    )
  );
}

function runWaitUntilTargets(
  options: NodeExecuteBuilderOptions,
  context: BuilderContext
): Observable<BuilderOutput> {
  if (!options.waitUntilTargets || options.waitUntilTargets.length === 0)
    return of({ success: true });

  return zip(
    ...options.waitUntilTargets.map(b => {
      return scheduleTargetAndForget(context, targetFromTargetString(b)).pipe(
        filter(e => e.success !== undefined),
        first()
      );
    })
  ).pipe(
    map(results => {
      return { success: !results.some(r => !r.success) };
    })
  );
}
