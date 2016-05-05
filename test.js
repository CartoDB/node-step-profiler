var assert = require('assert');
var Profiler = require('./profiler');

// monkey patch Date.now
var startTime = 0;
Date.now = function() {
    return startTime++;
};

var statsClientExpectedCalls = [
    ['job.task1.time', 1],
    ['job.task2.time', 1],
    ['job.time', 2]
];
var call = 0;
var statsdClient = {
    timing: function(lbl, elapsed) {
        assert.deepEqual([lbl, elapsed], statsClientExpectedCalls[call++]);
    }
};

var profiler = new Profiler({ statsd_client: statsdClient });

profiler.start('job');
profiler.done('task1');
profiler.done('task2');
assert.equal(profiler.toString(), 'TOT:2;task1:1;task2:1');
assert.deepEqual(JSON.parse(profiler.toJSONString()), {"task1":1,"task2":1,"total":2});

profiler.sendStats();
