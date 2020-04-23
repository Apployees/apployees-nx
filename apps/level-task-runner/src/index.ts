import { Observable } from "rxjs";
import { AffectedEventType, Task, TaskCompleteEvent } from "@nrwl/workspace/src/tasks-runner/tasks-runner";
import { TaskOrchestrator } from "@nrwl/workspace/src/tasks-runner/task-orchestrator";
import { TaskOrderer } from "@nrwl/workspace/src/tasks-runner/task-orderer";
import { NxJson } from "@nrwl/workspace";
import { ProjectGraph } from "@nrwl/workspace/src/core/project-graph";
import { DefaultTasksRunnerOptions } from "@nrwl/workspace/src/tasks-runner/tasks-runner-v2";
import { LevelCache } from "./LevelCache";
import { LifeCycle } from "@nrwl/workspace/src/tasks-runner/default-tasks-runner";

class NoopLifeCycle implements LifeCycle {
  startTask(task: Task): void {}
  endTask(task: Task, code: number): void {}
}

export const cachingTaskRunner = (
  tasks: Task[],
  options: DefaultTasksRunnerOptions & { levelTaskRunnerOptions: any },
  context: { target: string; projectGraph: ProjectGraph; nxJson: NxJson },
): Observable<TaskCompleteEvent> => {
  if (!options.lifeCycle) {
    options.lifeCycle = new NoopLifeCycle();
  }

  options.remoteCache = new LevelCache(options.levelTaskRunnerOptions || {});

  return new Observable((subscriber) => {
    runAllTasks(tasks, options, context)
      .then((data) => data.forEach((d) => subscriber.next(d)))
      .catch((e) => {
        console.error("Unexpected error:");
        console.error(e);
        process.exit(1);
      })
      .finally(() => {
        subscriber.complete();
        // fix for https://github.com/nrwl/nx/issues/1666
        if (process.stdin["unref"]) (process.stdin as any).unref();
      });
  });
};

async function runAllTasks(
  tasks: Task[],
  options: DefaultTasksRunnerOptions,
  context: { target: string; projectGraph: ProjectGraph; nxJson: NxJson },
): Promise<Array<{ task: Task; type: any; success: boolean }>> {
  const stages = new TaskOrderer(context.target, context.projectGraph).splitTasksIntoStages(tasks);

  const orchestrator = new TaskOrchestrator(context.target, context.projectGraph, options);

  const res = [];
  for (let i = 0; i < stages.length; ++i) {
    const tasksInStage = stages[i];
    const statuses = await orchestrator.run(tasksInStage);
    res.push(...statuses);

    // any task failed, we need to skip further stages
    if (statuses.find((s) => !s.success)) {
      res.push(...markStagesAsNotSuccessful(stages.splice(i + 1)));
      return res;
    }
  }
  return res;
}

function markStagesAsNotSuccessful(stages: Task[][]) {
  return stages.reduce((m, c) => [...m, ...tasksToStatuses(c, false)], []);
}

function tasksToStatuses(tasks: Task[], success: boolean) {
  return tasks.map((task) => ({
    task,
    type: AffectedEventType.TaskComplete,
    success,
  }));
}

export default cachingTaskRunner;
