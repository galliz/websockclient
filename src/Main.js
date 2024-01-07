// WebSockClient for PennMUSH
// There is no license. Just make a neato game with it.

import { Connection } from "./modules/Connection.js";
import { Terminal } from "./modules/Terminal.js";
import { UserInput, PressKey, ReleaseKey } from "./modules/UserInput.js";
import { LinkHandler, ReplaceToken } from "./modules/LinkHandler.js";
import { initializeAutoResizeInput } from "./AutoResizeInput.js";

// set the default line handler for the terminal to use the LinkHandler
Terminal.prototype.onLine = LinkHandler;

var WSClient = {
  connection: null, // Add this line

  connect: function (url) {
    this.connection = new Connection(url); // Modified this line
    return this.connection;
  },
  output: function (root) {
    return new Terminal(root);
  },
  input: function (root) {
    return new UserInput(root);
  },
  parseCommand: ReplaceToken,
  parseLinks: LinkHandler,
  // Add more methods if there are any
};

initializeAutoResizeInput();

// Module exports.
var exports = {
  connect: Connection,
  output: Terminal,
  input: UserInput,
  pressKey: PressKey,
  releaseKey: ReleaseKey,
  parseCommand: ReplaceToken,
  parseLinks: LinkHandler,
};

// Export the WSClient object
export { WSClient };
