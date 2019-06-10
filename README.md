# Serverless Plugin for Application Load Balancer

[![npm version](https://badge.fury.io/js/serverless-plugin-alb.svg)](https://badge.fury.io/js/serverless-plugin-alb)
[![GitHub Actions](https://img.shields.io/endpoint.svg?url=https%3A%2F%2Factions-badge.atrox.dev%2Faxel-springer-kugawana%2Fserverless-alb-plugin%2Fbadge&style=flat-square)](https://actions-badge.atrox.dev/axel-springer-kugawana/serverless-alb-plugin/goto)

This plugin compiles ALB events to Lambda Target Groups and ALB Listener Rules (as CloudFormation resources). 
It does not create a new ALB, it requires an existing ALB with a HTTP or HTTPS listener.

## Requirements

* Node.js >= `v8.10`
* Serverless Framework >= `v1.40`

## Installation

Using yarn:
```
yarn add --dev serverless-plugin-alb
```

Add the plugin to your `serverless.yml` file:
```yaml
plugins:
  - serverless-plugin-alb
```

## Usage

`serverless deploy`

## Configuration

You can specify a custom config file in your `serverless.yml`:
```yaml
custom:
  alb:
    listenerArn: <listenerArn> (required)
    host: <yourdomain.com> (optionnal)
```

You can add one or more alb event for each functions:
```yaml
# serverless.yaml
functions:
    hello:
        handler: handler.hello
        events:
          - alb:
              priority: 1
              conditions:
                path: '/hello'
          - alb:
              priority: 2
              conditions:
                host: somehost.com
                path: '/greetings'
```
For each alb event, property `priority` and at least one of `conditions` are required.

Here are the supported conditions:
* `path` (String)
* `host` (String or Array)
* `method` (String or Array)
* `query` (Object) A list of key/value 
* `header` (Object) Must have `name` and `values` properties
* `ip` (String or Array) Must be a CIDR block

Note: there can be up to 5 conditions in total. If you specify multiple values for a field name (such as `query` or `host), it counts as multiple conditions.

## How it works

For each functions with at least one ALB event, the plugin will create a target group for that function
and an InvokeFunction permission allowing ALB service to invoke that function.

Then for each ALB event, a listener rule will be created onto the provided listener with the conditions defined
in the ALB event (path-pattern or/and host) and a "Forward to" action to the function target group.

## Limitations

Update rule priorities is tricky.
For example, take the previous serverless.yml definition and swap the priorities like this: 

```yaml
# serverless.yaml
functions:
    hello:
        handler: handler.hello
        events:
          - alb:
              priority: 2
              conditions:
                path: '/hello'
          - alb:
              priority: 1
              conditions:
                host: somehost.com
                path: '/greetings'
```
Then the Cloudformation stack update will fail saying that a priority is already in use: CloudFormation does not
handle rule re-ordering. You have to use different priorites each time you add or delete functions.
