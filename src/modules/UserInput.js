// User input handler (command history, callback events)
export function UserInput(root) {
  var that = this;
  this.root = root;
  this.clearHistory();

  this.root.onkeydown = function (evt) {
    UserInput.onkeydown(that, evt);
  };

  this.root.onkeyup = function (evt) {
    UserInput.onkeyup(that, evt);
  };

  // Cleanup method to remove event listeners
  this.cleanup = function () {
    this.root.onkeydown = null;
    this.root.onkeyup = null;
    this.onEnter = null;
    this.onEscape = null;
    this.keyCycleForward = null;
    this.keyCycleBackward = null;
  };
}

// passthrough to the local onKeyDown callback
UserInput.onkeydown = function (that, evt) {
  that.onKeyDown && that.onKeyDown(evt);
};

// passthrough to the local onKeyUp callback
UserInput.onkeyup = function (that, evt) {
  that.onKeyUp && that.onKeyUp(evt);
};

// set the default onKeyDown handler
UserInput.prototype.onKeyDown = function (e) {
  PressKey(this, e);
};

// set the default onKeyUp handler
UserInput.prototype.onKeyUp = function (e) {
  ReleaseKey(this, e);
};

UserInput.prototype.onEnter = null;
UserInput.prototype.onEscape = null;

// clear the command history
UserInput.prototype.clearHistory = function () {
  this.history = [];
  this.ncommand = 0;
  this.save_current = "";
  this.current = -1;
};

// push a command onto the history list and clear the input box
UserInput.prototype.saveCommand = function () {
  if (this.root.value !== "") {
    this.history[this.ncommand] = this.root.value;
    this.ncommand++;
    this.save_current = "";
    this.current = -1;
    this.root.value = "";
  }
};

// cycle the history backward
UserInput.prototype.cycleBackward = function () {
  // save the current entry in case we come back
  if (this.current < 0) {
    this.save_current = this.root.value;
  }

  // cycle command history backward
  if (this.current < this.ncommand - 1) {
    this.current++;
    this.root.value = this.history[this.ncommand - this.current - 1];
  }
};

// cycle the history forward
UserInput.prototype.cycleForward = function () {
  // cycle command history forward
  if (this.current > 0) {
    this.current--;
    this.root.value = this.history[this.ncommand - this.current - 1];
  } else if (this.current === 0) {
    // recall the current entry if they had typed something already
    this.current = -1;
    this.root.value = this.save_current;
  }
};

// move the input cursor to the end of the input element's current text
UserInput.prototype.moveCursor = function () {
  this.root.selectionStart = this.root.selectionEnd = this.root.value.length;
};

// clear the current input text
UserInput.prototype.clear = function () {
  this.root.value = "";
};

// get the current text in the input box
UserInput.prototype.value = function () {
  return this.root.value;
};

// refocus the input box
UserInput.prototype.focus = function () {
  var text = "";
  if (window.getSelection) {
    text = window.getSelection().toString();
  } else if (document.selection && document.selection.type != "Control") {
    text = document.selection.createRange().text;
  }

  if (text === "") {
    this.root.focus();
  }
};

// user-defined keys for command history
UserInput.prototype.keyCycleForward = null;
UserInput.prototype.keyCycleBackward = null;

// default handler for key press events
export function PressKey(that, e) {
  var key = {
    code: e.keyCode ? e.keyCode : e.which,
    ctrl: e.ctrlKey,
    shift: e.shiftKey,
    alt: e.altKey,
  };

  // Handle history cycling
  if (key.code === 38) { // Up Arrow Key
    that.cycleBackward();
    that.moveCursor();
    e.preventDefault();
  } else if (key.code === 40) { // Down Arrow Key
    that.cycleForward();
    that.moveCursor();
    e.preventDefault();
  } else if (key.code === 13) { // Enter key
    var cmd = that.root.value;
    that.saveCommand();
    that.onEnter && that.onEnter(cmd);
    e.preventDefault();
  } else if (key.code === 27) { // Escape key
    that.onEscape && that.onEscape();
    e.preventDefault();
  } else {
    // For all other keys, do not prevent default behavior
    return;
  }

  // Ensure input retains focus
  that.focus();
}

// default handler for key release events
export function ReleaseKey(that, e) {
  var key = {
    code: e.keyCode ? e.keyCode : e.which,
    ctrl: e.ctrlKey,
    shift: e.shiftKey,
    alt: e.altKey,
  };

  // History cycling does not need additional handling on key release
  if (
    UserInput.isKeyCycleBackward(that, key) ||
    UserInput.isKeyCycleForward(that, key)
  ) {
    that.moveCursor();
  }
}
