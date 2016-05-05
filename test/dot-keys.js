var assert = require('assert');
var Profiler = require('./../profiler');

// monkey patch Date.now
var startTime = 0;
Date.now = function() {
    return startTime++;
};

var profiler = new Profiler({});
profiler.start('job');
profiler.done('test.wadus');
profiler.done('test.wadus.tada');
assert.deepEqual(JSON.parse(profiler.toJSONString()), { test_wadus: 1, test_wadus_tada: 1, total: 2 });
