define(function()
{
  function Socket(options, callback)
  {
    var
    pid,
    observers = {},
    self      = this,
    config    =
    {
      protocol: options.protocol || 'ws',
      host    : options.host     || '127.0.0.1',
      debug   : options.debug    || false
    },
    debug = function(context, data)
    {
      config.debug
      && window.console
      && window.console.log
      && window.console.log(context, data);
    },
    socket = new WebSocket(config.protocol + '://' + config.host);

    socket.onopen = function(event)
    {
      debug('connection open', event);
      self.emit('connected');
      pid = setInterval(function(){self.emit('ping')}, 25000);
      callback();
    };

    socket.onclose = function(event)
    {
      debug('conection closed', event);
      clearInterval(pid);
    };

    socket.onmessage = function(event)
    {
      debug('recived message', event);

      var
      dto = JSON.parse(event.data)
      obs = observers[dto.event];

      for(var i = 0, l = obs ? obs.length : 0; i < l; i++)
        obs[i].call(self, dto.data);
    };

    this.emit = function(event, data)
    {
      var dto =
      {
        event : event,
        data  : data
      };
      socket.send(JSON.stringify(dto));
      debug('emitted', dto);
      return this;
    };

    this.on = function(event, observer)
    {
      if(!observers[event])
        observers[event] = [];

      observers[event].push(observer);
      debug('added observer', observer);
      return this;
    };

    this.removeListener = function(event, listener)
    {
      if(!observers[event])
        return this;

      var index = observers[event].indexOf(listener);
      ~index && observers[event].splice(index, 1);
      debug('removed observer', listener);
      return this;
    };

    this.close = function()
    {
      socket.close();
    };
  }

  return function(options)
  {
    // keeping it like this sense we don't have any good polyfill for a
    // real promise.. @todo
    var
    observers = [],
    ready = false,
    socket = new Socket(options, function()
    {
      ready = true;
      var observer;
      while(observer = observers.shift())
        observer(socket);
    }),
    promise =
    {
      then: function(observer)
      {
        ready
        ? observer(socket)
        : observers.push(observer);
      }
    };

    return promise;
  };
});
