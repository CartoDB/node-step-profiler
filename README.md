# Simple step profiler for node.js

## Usage:

```javascript
var Profiler = require('step-profiler');

var opts = {
  // Optional StatsD integration, to send
  // timings of each step to a statsd server
  // See https://github.com/sivy/node-statsd
  statsd_client: new StatsD(...);
}
var profiler = new Profiler(opts);
profiler.start('task1');
...
profiler.done('op1');
...
profiler.done('op2');
...
profiler.end(); // ends 'task1'
...
console.log(profiler.toString());
profiler.sendStats()
```
