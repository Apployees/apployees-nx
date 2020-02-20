# level-task-runner

## What is it?

A task runner for [Nx](https://nx.dev) that allows caching of operations such as lint, test, build to be cached using 
[LevelUP](https://www.npmjs.com/package/levelup).

Right now, Nx v11+ will cache the output of operations in the node_modules/.cache/nx directory. With this package, you 
can use any [LevelDOWN](https://www.npmjs.com/browse/depended/abstract-leveldown) driver to cache your build operations. For example,
you can save the outputs of each app/lib in Nx in [Redis](https://www.npmjs.com/package/redisdown) or 
[S3](https://www.npmjs.com/package/s3leveldown), etc.
 
This speeds up your CICD process. Like...significantly.

## How do I install it?

Install this package and [some leveldown driver](https://www.npmjs.com/browse/depended/abstract-leveldown).

Yarn:
```
yarn add @apployees-nx/level-task-runner redisdown --dev
```

NPM:
```
npm install @apployees-nx/level-task-runner redisdown --dev
```

## Okay, how do I use it?

In your `nx.json` file, add the following right after `implicitDependencies`:

```
  "tasksRunnerOptions": {
    "default": {
      "runner": "@apployees-nx/level-task-runner",
      "options": {
        "cacheableOperations": ["build", "test", "lint"],
        "levelTaskRunnerOptions": {
          "driver": "redisdown",
          "name": "my-build-cache",
          "host": "10.11.12.13",
          "port": 6379
        }
      }
    }
  },
```

...and that's it.

## What if I need to pass additional options for my redisdown/s3down/someOtherDown?

Add whatever you need in the `levelTaskRunnerOptions` object. For example, with
[redisdown](https://www.npmjs.com/package/redisdown), you can use options from 
[node_redis](https://github.com/NodeRedis/node_redis#options-object-properties). One of these options is
in node_redis is `password`, so:

```
  "tasksRunnerOptions": {
    "default": {
      "runner": "@apployees-nx/level-task-runner",
      "options": {
        "cacheableOperations": ["build", "test", "lint"],
        "levelTaskRunnerOptions": {
          "driver": "redisdown",
          "name": "my-build-cache",
          "host": "10.11.12.13",
          "port": 6379,
          "password": "hunter2"
        }
      }
    }
  },
```

## But I have different options for dev. env. than Jenkins/GithubActions/Gitlab/CICD_Pipeline...

No problem! Anything that you can supply in `levelTaskRunnerOptions` in `nx.json`, you can also supply as
environment variables. The environment variables take precedence over what is in `nx.json`. So you can keep
`levelTaskRunnerOptions` empty so that level-task-runner is not even used in dev, but then supply these options
as environment variables in your CI environment.

To supply these options using environment variables, prefix any variable with `level_task_runner_`. For example:

```
level_task_runner_driver=redisdown level_task_runner_host=10.11.12.13 level_task_runner_port=6379 level_task_runner_time_to_live=1 yarn lint lib-name
```

## Can I supply a name for the DB? Like if you give a name in redisdown, it uses it as the Redis namespace.

Yes, you can use the option `name` in `levelTaskRunnerOptions` or `level_task_runner_name` as an environment variable.

The `name` parameter will be given as the first argument to the constructor of the leveldown adapter.

For example, for the [s3leveldown](https://www.npmjs.com/package/s3leveldown) adapter, the name parameter will get used as the S3 bucket name. 

## How is cache evicted?

There is an option call `time_to_live` (in seconds) that tries to set the Redis expiry if the driver is redisdown.

However, you can setup your Redis cache to automatically evict old entries. See [https://redis.io/topics/lru-cache](https://redis.io/topics/lru-cache).
