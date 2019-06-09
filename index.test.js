const Serverless = require('serverless');
const AwsProvider = require('serverless/lib/plugins/aws/provider/awsProvider');
const AlbPlugin = require('./index');

const listenerArn =
  'arn:aws:elasticloadbalancing:us-east-1:123456789012:listener/app/my-load-balancer/50dc6c495c0c9188/f2f7dc8efc522ab2';

describe('AlbPlugin', () => {
  let albPlugin;

  beforeEach(() => {
    const serverless = new Serverless();
    serverless.setProvider('aws', new AwsProvider(serverless));
    serverless.service.service = 'some-service';
    serverless.service.provider.compiledCloudFormationTemplate = { Resources: {} };

    albPlugin = new AlbPlugin(serverless);
    albPlugin.serverless.service.custom.alb = { listenerArn };
  });

  describe('#compileAlbEvents', () => {
    it('should create listener rules', () => {
      albPlugin.serverless.service.functions = {
        foo: {
          events: [{ alb: { conditions: { path: '/foo' }, priority: 1 } }]
        },
        bar: {
          events: [{ alb: { conditions: { path: '/bar' }, priority: 2 } }]
        }
      };
      albPlugin.compileAlbEvents();

      const resources =
        albPlugin.serverless.service.provider.compiledCloudFormationTemplate.Resources;

      expect(resources.FooListenerRule1).toBeDefined();
      expect(resources.FooListenerRule1).toEqual({
        Type: 'AWS::ElasticLoadBalancingV2::ListenerRule',
        Properties: {
          Actions: [
            {
              Type: 'forward',
              TargetGroupArn: {
                Ref: 'FooLambdaTargetGroup'
              }
            }
          ],
          Conditions: [
            {
              Field: 'path-pattern',
              Values: ['/foo']
            }
          ],
          ListenerArn: listenerArn,
          Priority: 1
        }
      });

      expect(resources.BarListenerRule2).toBeDefined();
      expect(resources.BarListenerRule2).toEqual({
        Type: 'AWS::ElasticLoadBalancingV2::ListenerRule',
        Properties: {
          Actions: [
            {
              Type: 'forward',
              TargetGroupArn: {
                Ref: 'BarLambdaTargetGroup'
              }
            }
          ],
          Conditions: [
            {
              Field: 'path-pattern',
              Values: ['/bar']
            }
          ],
          ListenerArn: listenerArn,
          Priority: 2
        }
      });
    });

    it('should create listener rule with header condition', () => {
      albPlugin.serverless.service.functions = {
        foo: {
          events: [
            {
              alb: {
                conditions: { header: { name: 'api-key', values: ['aaa', 'bbb'] } },
                priority: 1
              }
            }
          ]
        }
      };
      albPlugin.compileAlbEvents();

      const resources =
        albPlugin.serverless.service.provider.compiledCloudFormationTemplate.Resources;

      expect(resources.FooListenerRule1.Properties.Conditions).toBeDefined();
      expect(resources.FooListenerRule1.Properties.Conditions).toEqual([
        {
          Field: 'http-header',
          HttpHeaderConfig: {
            HttpHeaderName: 'api-key',
            Values: ['aaa', 'bbb']
          }
        }
      ]);
    });

    it('should create listener rule with query condition', () => {
      albPlugin.serverless.service.functions = {
        foo: {
          events: [{ alb: { conditions: { query: { foo: 'a', bar: 'b' } }, priority: 1 } }]
        }
      };
      albPlugin.compileAlbEvents();

      const resources =
        albPlugin.serverless.service.provider.compiledCloudFormationTemplate.Resources;

      expect(resources.FooListenerRule1.Properties.Conditions).toBeDefined();
      expect(resources.FooListenerRule1.Properties.Conditions).toEqual([
        {
          Field: 'query-string',
          QueryStringConfig: {
            Values: [{ Key: 'foo', Value: 'a' }, { Key: 'bar', Value: 'b' }]
          }
        }
      ]);
    });

    it('should create listener rule with ip condition', () => {
      albPlugin.serverless.service.functions = {
        foo: {
          events: [{ alb: { conditions: { ip: ['1.1.1.1/32', '2.2.2.2/32'] }, priority: 1 } }]
        }
      };
      albPlugin.compileAlbEvents();

      const resources =
        albPlugin.serverless.service.provider.compiledCloudFormationTemplate.Resources;

      expect(resources.FooListenerRule1.Properties.Conditions).toBeDefined();
      expect(resources.FooListenerRule1.Properties.Conditions).toEqual([
        {
          Field: 'source-ip',
          SourceIpConfig: {
            Values: ['1.1.1.1/32', '2.2.2.2/32']
          }
        }
      ]);
    });

    it('should create listener rule with method condition', () => {
      albPlugin.serverless.service.functions = {
        foo: {
          events: [{ alb: { conditions: { method: 'GET' }, priority: 1 } }]
        }
      };
      albPlugin.compileAlbEvents();

      const resources =
        albPlugin.serverless.service.provider.compiledCloudFormationTemplate.Resources;

      expect(resources.FooListenerRule1.Properties.Conditions).toBeDefined();
      expect(resources.FooListenerRule1.Properties.Conditions).toEqual([
        {
          Field: 'http-request-method',
          HttpRequestMethodConfig: {
            Values: ['GET']
          }
        }
      ]);
    });
  });
});
