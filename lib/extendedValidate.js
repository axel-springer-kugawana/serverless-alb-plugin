const _ = require('lodash');

module.exports = {
  async extendedValidate() {
    const albEvents = this.getAllAlbEvents();

    // Check that all ALB events have 'priority' propertiy set
    if (albEvents.some(event => !event.priority)) {
      throw new this.serverless.classes.Error("Property 'priority' is required of ALB events.");
    }

    // Check that all ALB events have at least one condition set
    if (albEvents.some(event => !event.conditions || Object.keys(event.conditions).length === 0)) {
      throw new this.serverless.classes.Error(
        'At least one condition must be specified for ALB events.'
      );
    }

    // Check that all event priorities are unique
    if (albEvents.length > _.uniq(albEvents.map(event => event.priority)).length) {
      throw new this.serverless.classes.Error("Property 'priority' must be unique.");
    }
  }
};
