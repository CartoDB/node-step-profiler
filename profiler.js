var debug = require('debug')('step-profiler');

function Profiler(opts) {
  if ( opts.statsd_client ) {
    this.statsd_client = opts.statsd_client;
  }
  this.events = [];
  this.custom = {};
  this.taskcount = 0;
}

Profiler.prototype.done = function(what) {
  var now = Date.now();
  debug("prf " + now + " done " + what);
  var item = { name:what, time:now };
  this.events.push(item);
};

Profiler.prototype.end = function() {
  if ( ! this.taskcount ) {
    debug("prf Unbalanced end task event refused");
    return;
  }
  --this.taskcount;
  var now = Date.now();
  debug("prf " + now + " end task ");
  var item = { time:now, end:1 };
  this.events.push(item);
};

Profiler.prototype.start = function(what) {
  var now = Date.now();
  debug("prf " + now + " start task " + what);
  var item = { time:now, start:1, name:what };
  this.events.push(item);
  ++this.taskcount;
};

/**
 * Allows to add custom metrics
 *
 * @param {Object} metrics a {String} => {Number} map
 */
Profiler.prototype.add = function(metrics) {
  Object.keys(metrics).forEach(function(key) {
    this.custom[key] = metrics[key];
  }.bind(this));
};

Profiler.prototype.sendStats = function() {
  if ( ! this.statsd_client ) return;
  debug("prf " + Date.now() + " SEND STATS! ");
  var tasks = [];
  var prefix = [];
  var prefix_string = '';
  var prevtime = 0;
  var tname = '';
  var elapsed;
  var lbl;
  for (var i=0; i<this.events.length; ++i) {
    var ev = this.events[i];
    var t = ev.time;
    if ( ev.start ) { // start of a new sub task
      tname = ev.name;
      tasks.push({ start:t, name:tname });
      debug("prf Task " + tname + " starts at " + t);
      prefix.push(tname);
      prefix_string = prefix.join('.');
    }
    else if ( ev.end ) { // end of a new sub task
      var task = tasks.pop();
      if ( task ) {
        elapsed = t - task.start;
        debug("prf Task " + tname + " stops at " + t + " elapsed: "  + elapsed);
        if ( elapsed || debug ) {
          lbl = prefix_string + '.time';
          debug("prf Sending (task) " + lbl + " " + elapsed);
          this.statsd_client.timing(lbl, elapsed)
        }
        prefix.pop();
        prefix_string = prefix.join('.');
      } else {
        debug("prf Unbalanced end task event found");
      }
    }
    else {
      var what = ev.name;
      elapsed = t - prevtime;
      if ( elapsed || debug ) {
        lbl = prefix_string + '.' + what + '.time';
        debug("prf Sending (done) " + lbl + " " + elapsed);
        this.statsd_client.timing(lbl, elapsed)
      }
    }
    prevtime = t;
  }
  // In case anything is missing...
  while ( task = tasks.pop() ) {
      tname = task.name;
      elapsed = t - task.start;
      debug("prf Task " + tname + " stops (uncleanly) at " + t + " elapsed: "  + elapsed + " " + tasks.length + " more open tasks in the queue");
      if ( elapsed || debug ) {
        lbl = prefix_string + '.time';
        debug("prf Sending (task) " + lbl + " " + elapsed);
        this.statsd_client.timing(lbl, elapsed)
      }
      prefix.pop();
      prefix_string = prefix.join('.');
  }
};

Profiler.prototype.toString = function() {
  var sitems = [];
  var prevt;
  var ttime = 0;
  for (var i=0; i<this.events.length; ++i) {
    var ev = this.events[i];
    var t = ev.time;
    if ( ! i ) prevt = t;
    // we're only interested in abs times
    if ( ev.start || ev.end ) continue;
    var el = ev.time - prevt;
    if ( el ) { // skip steps taking no computable time
      sitems.push(ev.name + ':' + el);
      ttime += el;
    }
    prevt = t;
  }
  var s = 'TOT:'+ttime+';'+sitems.join(';');
  debug("prf toString " + s);
  return s;
};

Profiler.prototype.toJSONString = function() {
    var sitems = {};
    var prevt;
    var ttime = 0;
    for (var i=0; i<this.events.length; ++i) {
        var ev = this.events[i];
        var t = ev.time;
        if ( ! i ) prevt = t;
        // we're only interested in abs times
        if ( ev.start || ev.end ) continue;
        var el = ev.time - prevt;
        if ( el ) { // skip steps taking no computable time
            sitems[replaceDots(ev.name)] = el;
            ttime += el;
        }
        prevt = t;
    }
    Object.keys(this.custom).forEach(function(key) {
        sitems[replaceDots(key)] = this.custom[key];
    }.bind(this));
    if (ttime) {
        sitems.total = ttime;
    }
    return JSON.stringify(sitems);
};

function replaceDots(key) {
    if (key) {
        key = key.replace(/\./g, '_');
    }
    return key;
}

module.exports = Profiler;
