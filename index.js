const _ = require('lodash');
const extendedValidate = require('./lib/extendedValidate');

class ServerlessPluginAlb {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.provider = serverless.getProvider('aws');
    this.stage = this.provider.getStage();

    Object.assign(this, extendedValidate);

    this.hooks = {
      'before:deploy:deploy': this.extendedValidate.bind(this),
      'package:compileEvents': this.compileAlbEvents.bind(this)
    };

    this.getFunctionAlbEvents = this.getFunctionAlbEvents.bind(this);
  }

  getFunctionAlbEvents(functionName) {
    const functionObj = this.serverless.service.getFunction(functionName);
    if (_.isArray(functionObj.events)) {
      return functionObj.events
        .filter(event => event.alb)
        .map(event => ({ ...event.alb, functionName }));
    }
    return [];
  }

  getAllAlbEvents() {
    return this.serverless.service
      .getAllFunctions()
      .map(this.getFunctionAlbEvents)
      .reduce((allAlbEvents, functionAlbEvents) => allAlbEvents.concat(functionAlbEvents), []);
  }

  compileAlbEvents() {
    this.serverless.service.getAllFunctions().forEach(functionName => {
      const albEvents = this.getFunctionAlbEvents(functionName);

      if (albEvents.length > 0) {
        const lambdaLogicalId = this.provider.naming.getLambdaLogicalId(functionName);
        const permissionTemplate = {
          [this.getLambdaAlbPermissionLogicalId(functionName)]: {
            Type: 'AWS::Lambda::Permission',
            Properties: {
              FunctionName: { 'Fn::GetAtt': [lambdaLogicalId, 'Arn'] },
              Action: 'lambda:InvokeFunction',
              Principal: 'elasticloadbalancing.amazonaws.com'
            }
          }
        };
        const targetGroupTemplate = {
          [this.getTargetGroupLogicalId(functionName)]: {
            Type: 'AWS::ElasticLoadBalancingV2::TargetGroup',
            DependsOn: this.getLambdaAlbPermissionLogicalId(functionName),
            Properties: {
              TargetType: 'lambda',
              Targets: [{ Id: { 'Fn::GetAtt': [lambdaLogicalId, 'Arn'] } }],
              Name: ServerlessPluginAlb.getTargetGroupName(functionName, this.stage)
            }
          }
        };

        _.merge(
          this.serverless.service.provider.compiledCloudFormationTemplate.Resources,
          permissionTemplate,
          targetGroupTemplate
        );

        albEvents.forEach(event => {
          const listenerRule = this.createListenerRule(event);
          _.merge(
            this.serverless.service.provider.compiledCloudFormationTemplate.Resources,
            listenerRule
          );
        });
      }
    });
  }

  createListenerRule(albEvent) {
    const host = _.get(this.serverless, 'service.custom.alb.host');
    const listenerArn =
      albEvent.listenerArn || _.get(this.serverless, 'service.custom.alb.listenerArn');

    const listenerRuleTemplate = {
      Type: 'AWS::ElasticLoadBalancingV2::ListenerRule',
      Properties: {
        Actions: [
          {
            Type: 'forward',
            TargetGroupArn: {
              Ref: this.getTargetGroupLogicalId(albEvent.functionName)
            }
          }
        ],
        Conditions: [],
        ListenerArn: listenerArn,
        Priority: albEvent.priority
      }
    };

    if (albEvent.conditions.path) {
      listenerRuleTemplate.Properties.Conditions.push({
        Field: 'path-pattern',
        Values: [albEvent.conditions.path]
      });
    }

    if (host || albEvent.conditions.host) {
      let hostHeaderValues = [];
      if (albEvent.conditions.host) {
        hostHeaderValues = hostHeaderValues.concat(albEvent.conditions.host);
      }
      if (host) {
        hostHeaderValues = hostHeaderValues.concat(host);
      }

      listenerRuleTemplate.Properties.Conditions.push({
        Field: 'host-header',
        Values: hostHeaderValues
      });
    }

    if (albEvent.conditions.method) {
      listenerRuleTemplate.Properties.Conditions.push({
        Field: 'http-request-method',
        HttpRequestMethodConfig: {
          Values: _.concat(albEvent.conditions.method)
        }
      });
    }

    if (_.isObject(albEvent.conditions.header)) {
      listenerRuleTemplate.Properties.Conditions.push({
        Field: 'http-header',
        HttpHeaderConfig: {
          HttpHeaderName: albEvent.conditions.header.name,
          Values: _.concat(albEvent.conditions.header.values)
        }
      });
    }

    if (_.isObject(albEvent.conditions.query)) {
      listenerRuleTemplate.Properties.Conditions.push({
        Field: 'query-string',
        QueryStringConfig: {
          Values: Object.keys(albEvent.conditions.query).map(key => ({
            Key: key,
            Value: albEvent.conditions.query[key]
          }))
        }
      });
    }

    if (albEvent.conditions.ip) {
      listenerRuleTemplate.Properties.Conditions.push({
        Field: 'source-ip',
        SourceIpConfig: {
          Values: _.concat(albEvent.conditions.ip)
        }
      });
    }

    if (listenerRuleTemplate.Properties.Conditions.length === 0) {
      throw new Error(`At least one condition mut be set for function ${albEvent.functionName}`);
    }

    return {
      [this.getListenerRuleLogicalId(
        albEvent.functionName,
        albEvent.priority
      )]: listenerRuleTemplate
    };
  }

  getLambdaAlbPermissionLogicalId(functionName) {
    return `${this.provider.naming.getNormalizedFunctionName(functionName)}LambdaPermissionAlb`;
  }

  getTargetGroupLogicalId(functionName) {
    return `${this.provider.naming.getNormalizedFunctionName(functionName)}LambdaTargetGroup`;
  }

  getListenerRuleLogicalId(functionName, rulePriority) {
    return `${this.provider.naming.getNormalizedFunctionName(
      functionName
    )}ListenerRule${rulePriority}`;
  }

  static getTargetGroupName(functionName, stage = '') {
    return `${_.truncate(functionName, {
      length: 32 - (stage.length + 1),
      omission: ''
    })}-${stage}`;
  }
}

module.exports = ServerlessPluginAlb;
