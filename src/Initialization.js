import { WSClient } from './Main.js';

function setupConnection() {
    const serverAddress = "rabioli.ca";
    const serverSSL = window.location.protocol === "https:";
    const serverProto = serverSSL ? "wss://" : "ws://";
    const serverPort = serverSSL ? "4202" : "4201";
    const customUrl = window.location.search.substring(1) || (serverAddress + ":" + serverPort);
    return WSClient.connect(serverProto + customUrl + "/wsclient");
}

function bindConnectionEvents(conn, output, cmdprompt) {
    conn.onOpen = () => output.appendMessage("logMessage", "%% Connected.");
    conn.onError = (evt) => {
        output.appendMessage("logMessage", "%% Connection error!");
        console.error(evt);
    };
    conn.onClose = () => output.appendMessage("logMessage", "%% Connection closed.");
    conn.onText = (text) => output.appendText(text);
    conn.onHTML = (html) => output.appendHTML(html);
    conn.onPueblo = (html) => output.appendPueblo(html);
    conn.onPrompt = (text) => {
        cmdprompt.clear();
        cmdprompt.appendText(text + "\r\n");
    };
}

function bindUIEvents(input, conn) {
    document.body.addEventListener('click', () => input.focus());
    window.addEventListener('beforeunload', () => {
        conn.sendText('QUIT');
        setTimeout(() => conn.close(), 1000);
    });
}

function sendCommand(conn, output, cmd) {
    if (conn.isConnected()) {
        if (cmd !== "") {
            conn.sendText(cmd);
            output.appendMessage("localEcho", cmd);
        }
    } else {
        conn.reconnect();
        output.appendMessage("logMessage", "%% Reconnecting to server...");
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const output = WSClient.output(document.getElementById("output"));
    const cmdprompt = WSClient.output(document.getElementById("prompt"));
    const input = WSClient.input(document.getElementById("input"));
    const conn = setupConnection();

    bindConnectionEvents(conn, output, cmdprompt);
    bindUIEvents(input, conn);

    input.onEnter = (cmd) => sendCommand(conn, output, cmd);
    input.onEscape = () => input.clear();

    input.focus();
});
