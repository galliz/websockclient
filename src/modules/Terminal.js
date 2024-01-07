import { WSClient } from "../Main.js";

export function Terminal(root) {
  this.root = root;

  if (root === null) {
    return null;
  }

  this.clear();

  // Set up a simple mutation observer
  this.observer = new MutationObserver(() => {
    this.root.scrollTop = this.root.scrollHeight;
  });

  this.observer.observe(this.root, { childList: true, subtree: true });
}

Terminal.PARSE_PLAIN = 0;
Terminal.PARSE_CR = 1;
Terminal.PARSE_ESC1 = 2;
Terminal.PARSE_ESC2 = 3;

Terminal.ANSI_NORMAL = 0;
Terminal.ANSI_BRIGHT = 1;
Terminal.ANSI_UNDERLINE = 4;
Terminal.ANSI_BLINK = 5;
Terminal.ANSI_INVERSE = 7;
Terminal.ANSI_XTERM_FG = 38;
Terminal.ANSI_XTERM_BG = 48;

Terminal.DEFAULT_FG = 37;
Terminal.DEFAULT_BG = 30;

Terminal.UNCLOSED_TAGS = [
  "area",
  "base",
  "br",
  "col",
  "command",
  "embed",
  "hr",
  "img",
  "input",
  "keygen",
  "link",
  "menuitem",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
];

/////////////////////////////////////////////////////
// ansi parsing routines

Terminal.encodeState = function (state) {
  if (!state) {
    return "";
  }

  var classes = [];

  if (state[Terminal.ANSI_INVERSE]) {
    var value = state.fg;
    state.fg = state.bg;
    state.bg = value;

    value = state.fg256;
    state.fg256 = state.bg256;
    state.bg256 = value;
  }

  var fg = state.fg;
  var bg = state.bg;

  if (state[Terminal.ANSI_UNDERLINE]) {
    classes[classes.length] = "ansi-" + Terminal.ANSI_UNDERLINE;
  }

  // make sure to avoid conflict with XTERM256 color's usage of blink (code 5)
  if (state.fg256) {
    classes[classes.length] = "ansi-38-5-" + state.fg;
  } else {
    if (state[Terminal.ANSI_BRIGHT]) {
      if (state[Terminal.ANSI_INVERSE]) {
        if (fg !== Terminal.DEFAULT_FG) {
          classes[classes.length] = "ansi-" + fg;
        }
      } else {
        classes[classes.length] = "ansi-1-" + fg;
      }
    } else if (fg !== Terminal.DEFAULT_FG) {
      classes[classes.length] = "ansi-" + fg;
    }
  }

  if (state.bg256) {
    classes[classes.length] = "ansi-48-5-" + state.bg;
  } else {
    if (state[Terminal.ANSI_BRIGHT]) {
      if (state[Terminal.ANSI_INVERSE]) {
        classes[classes.length] = "ansi-1-" + (bg + 10);
      } else {
        if (bg !== Terminal.DEFAULT_BG) {
          classes[classes.length] = "ansi-" + (bg + 10);
        }
      }
    } else if (bg !== Terminal.DEFAULT_BG) {
      classes[classes.length] = "ansi-" + (bg + 10);
    }
  }

  if (state[Terminal.ANSI_BLINK] && !(state.fg256 || state.bg256)) {
    classes[classes.length] = "ansi-" + Terminal.ANSI_BLINK;
  }

  return classes.join(" ");
};

Terminal.prototype.getANSI = function () {
  if (!this.ansiState) {
    this.ansiState = {
      fg: Terminal.DEFAULT_FG,
      bg: Terminal.DEFAULT_BG,
      fg256: false,
      bg256: false,
    };
  }

  return this.ansiState;
};

Terminal.prototype.applyANSI = function (ansi) {
  switch (ansi.charCodeAt(ansi.length - 1)) {
    case 109: // m (SGR)
      var codes = ansi.substring(0, ansi.length - 1).split(";");

      var value, state;
      for (var ii = 0; (value = codes[ii]) !== undefined; ++ii) {
        if (value.length === 0) {
          // Empty is treated as the equivalent of 0.
          value = Terminal.ANSI_NORMAL;
        } else {
          value = parseInt(value);
        }

        state = this.getANSI();

        // check for xterm256 fg/bg first, fallback to standard codes otherwise
        if (state[Terminal.ANSI_XTERM_FG] && state[Terminal.ANSI_BLINK]) {
          if (value >= 0 && value <= 255) {
            state.fg = value;
            state.fg256 = true;
            state[Terminal.ANSI_XTERM_FG] = false;
            state[Terminal.ANSI_BLINK] = false;
          } else {
            // invalid xterm256, let's reset the ansi state due to bad codes
            this.ansiState = null;
          }
        } else if (
          state[Terminal.ANSI_XTERM_BG] &&
          state[Terminal.ANSI_BLINK]
        ) {
          if (value >= 0 && value <= 255) {
            state.bg = value;
            state.bg256 = true;
            state[Terminal.ANSI_XTERM_BG] = false;
            state[Terminal.ANSI_BLINK] = false;
          } else {
            // invalid xterm256, let's reset the ansi state due to bad codes
            this.ansiState = null;
          }
        } else {
          // detect regular ansi codes
          switch (value) {
            case Terminal.ANSI_NORMAL: // reset
              this.ansiState = null;
              break;

            case Terminal.ANSI_BRIGHT:
            case Terminal.ANSI_UNDERLINE:
            case Terminal.ANSI_BLINK:
            case Terminal.ANSI_INVERSE:
            case Terminal.ANSI_XTERM_FG:
            case Terminal.ANSI_XTERM_BG:
              state[value] = true;
              break;

            default:
              if (30 <= value && value <= 37) {
                state.fg = value;
              } else if (40 <= value && value <= 47) {
                state.bg = value - 10;
              }
              break;
          }
        }

        this.ansiDirty = true;
      }
      break;
  }
};

Terminal.prototype.write = function (value, start, end) {
  if (start === end) {
    return;
  }

  if (this.ansiDirty) {
    var next = Terminal.encodeState(this.ansiState);

    if (this.ansiClass !== next) {
      this.ansiClass = next;
      this.span = null;
    }

    this.ansiDirty = false;
  }

  if (this.ansiClass && !this.span) {
    this.span = document.createElement("span");
    this.span.className = this.ansiClass;
    this.stack[this.stack.length - 1].appendChild(this.span);
  }

  var text = document.createTextNode(value.substring(start, end));
  this.lineBuf[this.lineBuf.length] = text;

  this.appendChild(text);
};

Terminal.prototype.endLine = function () {
  var that = this;
  this.onLine && this.onLine(that, this.lineBuf);

  this.write("\n", 0, 1);
  this.lineBuf.length = 0;
};

Terminal.prototype.abortParse = function (value, start, end) {
  switch (this.state) {
    case Terminal.PARSE_PLAIN:
      this.write(value, start, end);
      break;

    case Terminal.PARSE_ESC1:
      this.write("\u001B", 0, 1);
      break;

    case Terminal.PARSE_ESC2:
      this.write("\u001B[", 0, 2);
      this.write(this.parseBuf, 0, this.parseBuf.length);
      this.parseBuf = "";
      break;
  }
};

/////////////////////////////////////////////////////
// message appending routines

// appends a text string to the terminal, parsing ansi escape codes into html/css
Terminal.prototype.appendText = function (data) {
  var start = 0;

  // Scan for sequence start characters.
  // TODO: Could scan with RegExp; not convinced sufficiently simpler/faster.
  for (var ii = 0, ilen = data.length; ii < ilen; ++ii) {
    var ch = data.charCodeAt(ii);

    // Resynchronize at special characters.
    switch (ch) {
      case 10: // newline
        if (this.state !== Terminal.PARSE_CR) {
          this.abortParse(data, start, ii);
          this.endLine();
        }

        start = ii + 1;
        this.state = Terminal.PARSE_PLAIN;
        continue;

      case 13: // carriage return
        this.abortParse(data, start, ii);
        this.endLine();
        start = ii + 1;
        this.state = Terminal.PARSE_CR;
        continue;

      case 27: // escape
        this.abortParse(data, start, ii);
        start = ii + 1;
        this.state = Terminal.PARSE_ESC1;
        continue;
    }

    // Parse other characters.
    switch (this.state) {
      case Terminal.PARSE_CR:
        this.state = Terminal.PARSE_PLAIN;
        break;

      case Terminal.PARSE_ESC1:
        if (ch === 91) {
          // Start of escape sequence (\e[).
          start = ii + 1;
          this.state = Terminal.PARSE_ESC2;
        } else {
          // Not an escape sequence.
          this.abortParse(data, start, ii);
          start = ii;
          this.state = Terminal.PARSE_PLAIN;
        }
        break;

      case Terminal.PARSE_ESC2:
        if (64 <= ch && ch <= 126) {
          // End of escape sequence.
          this.parseBuf += data.substring(start, (start = ii + 1));
          this.applyANSI(this.parseBuf);
          this.parseBuf = "";
          this.state = Terminal.PARSE_PLAIN;
        }
        break;
    }
  }

  // Handle tail.
  switch (this.state) {
    case Terminal.PARSE_PLAIN:
      this.write(data, start, data.length);
      break;

    case Terminal.PARSE_ESC2:
      this.parseBuf += data.substring(start);
      break;
  }
};

Terminal.prototype.appendHTML = function (html) {
  var div = document.createElement("div");
  var fragment = document.createDocumentFragment();

  div.innerHTML = html;

  for (var child = div.firstChild; child; child = child.nextSibling) {
    var cmd = child.getAttribute("xch_cmd");
    if (cmd !== null && cmd !== "") {
      child.setAttribute("onClick", 'this.onCommand("' + cmd + '");');
      child.onCommand = this.onCommand;
      child.removeAttribute("xch_cmd");
    }
    fragment.appendChild(child);
  }

  this.appendChild(fragment);
};

// append an HTML fragment to the terminal
Terminal.prototype.appendChild = function (fragment) {
  var last = this.span || this.stack[this.stack.length - 1];
  last.appendChild(fragment);

  this.scrollDown();
};

// append a log message to the terminal
Terminal.prototype.appendMessage = function (classid, message) {
  var div = document.createElement("div");
  div.className = classid;

  // create a text node to safely append the string without rendering code
  var text = document.createTextNode(message);
  div.appendChild(text);

  this.appendChild(div);
};

// push a new html element onto the stack
Terminal.prototype.pushElement = function (element) {
  this.span = null;
  this.stack[this.stack.length - 1].appendChild(element);
  this.stack[this.stack.length] = element;
};

// remove 1 level from the stack, check consistency
Terminal.prototype.popElement = function () {
  this.span = null;

  if (this.stack.length > 1) {
    --this.stack.length;
  } else {
    window.console && window.console.warn("element stack underflow");
  }
};

// append a pueblo tag to the terminal stack (or pop if an end tag)
Terminal.prototype.appendPueblo = function (data) {
  var tag, attrs;

  var idx = data.indexOf(" ");
  if (idx !== -1) {
    tag = data.substring(0, idx);
    attrs = data.substring(idx + 1);
  } else {
    tag = data;
    attrs = "";
  }

  var html = "<" + tag + (attrs ? " " : "") + attrs + ">";

  var start;
  if (tag[0] !== "/") {
    start = true;
  } else {
    start = false;
    tag = tag.substring(1);
  }

  // detect a self closed tag
  var selfClosing = false;
  if (tag.substring(-1) === "/" || attrs.substring(-1) === "/") {
    selfClosing = true;
  }

  if (Terminal.UNCLOSED_TAGS.indexOf(tag.toLowerCase()) > -1) {
    selfClosing = true;
  }

  if (
    tag === "XCH_PAGE" ||
    (tag === "IMG" &&
      attrs.search(/xch_graph=(("[^"]*")|('[^']*')|([^\s]*))/i) !== -1)
  ) {
    //console.log("unhandled pueblo", html);
    return;
  }

  // we have a starting <tag> (not </tag>)
  if (start) {
    var div = document.createElement("div");

    html = html.replace(/xch_graph=(("[^"]*")|('[^']*')|([^\s]*))/i, "");

    html = html.replace(/xch_mode=(("[^"]*")|('[^']*')|([^\s]*))/i, "");

    html = html.replace(/xch_hint="([^"]*)"/i, 'title="$1"');

    div.innerHTML = html.replace(
      /xch_cmd="([^"]*)"/i,
      "onClick='this.onCommand(&quot;$1&quot;)'"
    );

    div.firstChild.onCommand = this.onCommand;

    div.setAttribute("target", "_blank");

    // add this tag to the stack to keep track of nested elements
    this.pushElement(div.firstChild);

    // automatically pop the tag if it is self closing
    if (selfClosing) {
      this.popElement();
    }
  } else {
    // we have an ending </tag> so remove the closed tag from the stack
    // don't bother for self closing tags with an explicit end tag, we already popped them
    if (!selfClosing) {
      this.popElement();
    }
  }
};

Terminal.prototype.clear = function () {
  while (this.root.firstChild) {
    this.root.removeChild(this.root.firstChild);
  }

  this.root.innerHTML = "";

  this.stack = [this.root];

  this.state = Terminal.PARSE_PLAIN;
  this.line = null;
  this.lineBuf = [];
  this.span = null;
  this.parseBuf = "";

  this.ansiClass = "";
  this.ansiState = null;
  this.ansiDirty = false;
};

Terminal.prototype.shouldAutoScroll = function () {
  return (
    this.root.scrollTop + this.root.clientHeight >= this.root.scrollHeight - 5
  );
};

Terminal.prototype.scrollToBottom = function () {
  this.root.scrollTop = this.root.scrollHeight;
};

// Add cleanup method to Terminal
Terminal.prototype.cleanup = function () {
  this.observer.disconnect();
  this.root.innerHTML = "";
  this.onLine = null;
  this.onCommand = null;
};

// animate scrolling the terminal window to the bottom
Terminal.prototype.scrollDown = function () {
  var root = this.root;
  var shouldScroll =
    root.scrollTop + root.clientHeight >= root.scrollHeight - 5; // 5px threshold

  if (shouldScroll) {
    setTimeout(function () {
      root.scrollTop = root.scrollHeight;
    }, 0);
  }
};

// setup the pueblo xch_cmd callback
Terminal.prototype.onCommand = function (command) {
  if (WSClient.connection && WSClient.connection.isConnected()) {
    WSClient.connection.sendText(command);
  } else {
    console.error("Connection is not established.");
    // Optionally, try to reconnect
    WSClient.connection && WSClient.connection.reconnect();
  }
};
