import { WSClient } from './Main.js';

document.addEventListener('DOMContentLoaded', () => {
    // Setup server connection parameters
    const serverAddress = "rabioli.ca";
    const serverSSL = window.location.protocol === "https:";
    const serverProto = serverSSL ? "wss://" : "ws://";
    const serverPort = serverSSL ? "4202" : "4201";
    const customUrl = window.location.search.substring(1) || (serverAddress + ":" + serverPort);
    const serverUrl = serverProto + customUrl + "/wsclient";

    // Initialize WebSockClient elements
    const output = WSClient.output(document.getElementById("output"));
    const cmdprompt = WSClient.output(document.getElementById("prompt"));
    const input = WSClient.input(document.getElementById("input"));
    const conn = WSClient.connect(serverUrl);

    // Function to send a command string to the server
    function sendCommand(cmd) {
        if (conn.isConnected()) {
            if (cmd !== "") {
                conn.sendText(cmd);
                output.appendMessage("localEcho", cmd);
            }
        } else {
            // connection was broken, let's reconnect
            conn.reconnect();
            output.appendMessage("logMessage", "%% Reconnecting to server...");
        }
    }

    // Replacing inline 'onClick' event handlers for quicklinks
    document.getElementById("quicklinks").addEventListener("click", (event) => {
        if (event.target.tagName === 'A') {
            sendCommand(event.target.getAttribute('data-command'));
        }
    });

    // Additional initialization and event binding
    document.body.addEventListener('click', () => {
        input.focus();
    });

    window.addEventListener('beforeunload', () => {
        conn.sendText('QUIT');
        setTimeout(() => conn.close(), 1000);
    });

    // Event bindings for the WebSocket connection
    conn.onOpen = (evt) => output.appendMessage("logMessage", "%% Connected.");
    conn.onError = (evt) => {
        output.appendMessage("logMessage", "%% Connection error!");
        console.log(evt);
    };
    conn.onClose = (evt) => output.appendMessage("logMessage", "%% Connection closed.");

    // Handle incoming messages (text, html, pueblo, etc.)
    conn.onText = (text) => output.appendText(text);
    conn.onHTML = (html) => output.appendHTML(html);
    conn.onPueblo = (html) => output.appendPueblo(html);
    conn.onPrompt = (text) => {
        cmdprompt.clear();
        cmdprompt.appendText(text + "\r\n");
    };

    // Input event binding
    input.onEnter = (cmd) => sendCommand(cmd);
    input.onEscape = () => input.clear();

    // Additional input event callbacks if necessary
    // ...

    // Focus on the input element
    input.focus();
});

// Additional initialization or utility functions if needed
// ...
