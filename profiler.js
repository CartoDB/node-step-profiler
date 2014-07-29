var debug = 0;

function Profiler(opts) {
  if ( opts.statsd_client ) {
    this.statsd_client = opts.statsd_client;
  }
  this.events = [];
  this.taskcount = 0;
}

Profiler.prototype.done = function(what) {
  var now = Date.now();
  if ( debug ) {
    console.log("prf " + now + " done " + what);
  }
  var item = { name:what, time:now };
  this.events.push(item);
}

Profiler.prototype.end = function() {
  if ( ! this.taskcount ) {
    console.log("prf Unbalanced end task event refused");
    return;
  }
  --this.taskcount;
  var now = Date.now();
  if ( debug ) {
    console.log("prf " + now + " end task ");
  }
  var item = { time:now, end:1 }
  this.events.push(item);
}

Profiler.prototype.start = function(what) {
  var now = Date.now();
  if ( debug ) {
    console.log("prf " + now + " start task " + what);
  }
  var item = { time:now, start:1, name:what }
  this.events.push(item);
  ++this.taskcount;
}

Profiler.prototype.sendStats = function() {
  if ( ! this.statsd_client ) return;
  if ( debug ) {
    console.log("prf " + Date.now() + " SEND STATS! ");
  }
  var tasks = [];
  var prefix = [];
  var prefix_string = '';
  var prevtime = 0;
  for (var i=0; i<this.events.length; ++i) {
    var ev = this.events[i];
    var t = ev.time;
    if ( ev.start ) { // start of a new sub task
      var tname = ev.name;
      tasks.push({ start:t, name:tname });
      if ( debug ) {
        console.log("prf Task " + tname + " starts at " + t);
      }
      prefix.push(tname);
      prefix_string = prefix.join('.');
    }
    else if ( ev.end ) { // end of a new sub task
      var task = tasks.pop();
      if ( task ) {
        var elapsed = t - task.start;
        if ( debug ) {
          console.log("prf Task " + tname + " stops at " + t + " elapsed: "  + elapsed);
        }
        if ( elapsed || debug ) {
          var lbl = prefix_string + '.time';
          if ( debug ) {
            console.log("prf Sending (task) " + lbl + " " + elapsed);
          }
          this.statsd_client.timing(lbl, elapsed)
        }
        prefix.pop();
        prefix_string = prefix.join('.');
      } else {
        console.log("prf Unbalanced end task event found");
      }
    }
    else {
      var what = ev.name;
      var elapsed = t - prevtime;
      if ( elapsed || debug ) {
        var lbl = prefix_string + '.' + what + '.time';
        if ( debug ) {
          console.log("prf Sending (done) " + lbl + " " + elapsed);
        }
        this.statsd_client.timing(lbl, elapsed)
      }
    }
    prevtime = t;
  }
  // In case anything is missing...
  while ( task = tasks.pop() ) {
      var tname = task.name;
      var elapsed = t - task.start;
      if ( debug ) {
        console.log("prf Task " + tname + " stops (uncleanly) at " + t + " elapsed: "  + elapsed + " " + tasks.length + " more open tasks in the queue");
      }
      if ( elapsed || debug ) {
        var lbl = prefix_string + '.time';
        if ( debug ) {
          console.log("prf Sending (task) " + lbl + " " + elapsed);
        }
        this.statsd_client.timing(lbl, elapsed)
      }
      prefix.pop();
      prefix_string = prefix.join('.');
  }
}

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
  if ( debug ) {
    console.log("prf toString " + s);
  }
  return s;
}

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
            sitems[ev.name] = el;
            ttime += el;
        }
        prevt = t;
    }
    sitems['total'] = ttime;
    return JSON.stringify(sitems);
}

module.exports = Profiler;
