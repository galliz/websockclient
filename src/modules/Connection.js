// MU* protocol carried over the WebSocket API.
export function Connection(url) {
    var that = this;
  
    this.url = url;
    this.socket = null;
    this.isOpen = false;
  
    Connection.reconnect(that);
  }
  
  Connection.CHANNEL_TEXT = "t";
  Connection.CHANNEL_JSON = "j";
  Connection.CHANNEL_HTML = "h";
  Connection.CHANNEL_PUEBLO = "p";
  Connection.CHANNEL_PROMPT = ">";
  
  Connection.reconnect = function (that) {
    that.reconnect();
  };
  
  Connection.onopen = function (that, evt) {
    that.isOpen = true;
    that.onOpen && that.onOpen(evt);
  };
  
  Connection.onerror = function (that, evt) {
    that.isOpen = false;
    that.onError && that.onError(evt);
  };
  
  Connection.onclose = function (that, evt) {
    that.isOpen = false;
    that.onClose && that.onClose(evt);
  };
  
  Connection.onmessage = function (that, evt) {
    that.onMessage && that.onMessage(evt.data[0], evt.data.substring(1));
  };
  
  Connection.prototype.reconnect = function () {
    var that = this;
  
    if (this.socket) {
      this.socket.onopen = null;
      this.socket.onmessage = null;
      this.socket.onerror = null;
      this.socket.onclose = null;
      this.socket.close();
    }
  
    // quit the old connection, if we have one
    if (this.isConnected()) {
      var old = this.socket;
      this.sendText("QUIT");
      this.isOpen && setTimeout(old.close, 1000);
    }
  
    this.socket = new window.WebSocket(this.url);
    this.isOpen = false;
  
    this.socket.onopen = function (evt) {
      Connection.onopen(that, evt);
    };
  
    this.socket.onerror = function (evt) {
      Connection.onerror(that, evt);
    };
  
    this.socket.onclose = function (evt) {
      Connection.onclose(that, evt);
    };
  
    this.socket.onmessage = function (evt) {
      Connection.onmessage(that, evt);
    };
  };
  
  Connection.prototype.isConnected = function () {
    return this.socket && this.isOpen && this.socket.readyState === 1;
  };
  
  Connection.prototype.close = function () {
    this.socket && this.socket.close();
  };
  
  Connection.prototype.sendText = function (data) {
    this.isConnected() && this.socket.send(Connection.CHANNEL_TEXT + data + "\r\n");
  };
  
  Connection.prototype.sendObject = function (data) {
    this.isConnected() && this.socket.send(Connection.CHANNEL_JSON + window.JSON.stringify(data));
  };
  
  Connection.prototype.onOpen = null;
  Connection.prototype.onError = null;
  Connection.prototype.onClose = null;
  
  Connection.prototype.onMessage = function (channel, data) {
    switch (channel) {
      case Connection.CHANNEL_TEXT:
        this.onText && this.onText(data);
        break;
  
      case Connection.CHANNEL_JSON:
        this.onObject && this.onObject(window.JSON.parse(data));
        break;
  
      case Connection.CHANNEL_HTML:
        this.onHTML && this.onHTML(data);
        break;
  
      case Connection.CHANNEL_PUEBLO:
        this.onPueblo && this.onPueblo(data);
        break;
  
      case Connection.CHANNEL_PROMPT:
        this.onPrompt && this.onPrompt(data);
        break;
  
      default:
        window.console && window.console.log("unhandled message", channel, data);
        return false;
    }
  
    return true;
  };
  
  Connection.prototype.onText = null;
  Connection.prototype.onObject = null;
  Connection.prototype.onHTML = null;
  Connection.prototype.onPueblo = null;
  Connection.prototype.onPrompt = null;
  