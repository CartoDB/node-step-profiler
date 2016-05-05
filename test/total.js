var assert = require('assert');
var Profiler = require('./../profiler');

var profiler = new Profiler({});
assert.deepEqual(JSON.parse(profiler.toJSONString()), {});
