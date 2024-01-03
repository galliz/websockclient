// some string helper functions for replacing links and user input tokens
// Example onLine() handler that linkifies URLs in text.
export function LinkHandler(that, lineBuf) {
  // Merge text so we can scan it.
  if (!lineBuf.length) {
    return;
  }

  var line = "";
  for (var ii = 0, ilen = lineBuf.length; ii < ilen; ++ii) {
    line += lineBuf[ii].nodeValue;
  }

  // Scan the merged text for links.
  var links = LinkHandler.scan(line);
  if (!links.length) {
    return;
  }

  // Find the start and end text nodes.
  var nodeIdx = 0,
    nodeStart = 0,
    nodeEnd = lineBuf[0].nodeValue.length;
  for (var ii = 0, ilen = links.length; ii < ilen; ++ii) {
    var info = links[ii],
      startOff,
      startNode,
      endOff,
      endNode;

    while (nodeEnd <= info.start) {
      nodeStart = nodeEnd;
      nodeEnd += lineBuf[++nodeIdx].nodeValue.length;
    }

    startOff = info.start - nodeStart;
    startNode = lineBuf[nodeIdx];

    while (nodeEnd < info.end) {
      nodeStart = nodeEnd;
      nodeEnd += lineBuf[++nodeIdx].nodeValue.length;
    }

    endOff = info.end - nodeStart;
    endNode = lineBuf[nodeIdx];

    // Wrap the link text.
    // TODO: In this version, we won't try to cross text nodes.
    // TODO: Discard any text nodes that are already part of links?
    if (startNode !== endNode) {
      window.console && window.console.warn("link", info);
      continue;
    }

    lineBuf[nodeIdx] = endNode.splitText(endOff);
    nodeStart += endOff;

    var middleNode = startNode.splitText(startOff);
    var anchor = document.createElement("a");
    middleNode.parentNode.replaceChild(anchor, middleNode);

    anchor.target = "_blank";
    if (info.url === "" && info.xch_cmd !== "") {
      anchor.setAttribute("onClick", 'this.onCommand("' + info.xch_cmd + '");');
      anchor.onCommand = that.onCommand;
    } else {
      anchor.href = info.url;
    }
    anchor.appendChild(middleNode);
  }
}

// Link scanner function.
// TODO: Customizers may want to replace this, since regular expressions
// ultimately limit how clever our heuristics can be.
LinkHandler.scan = function (line) {
  var links = [],
    result;

  // Define the regex inside the scan function
  // LinkHandler regex:
  //
  // 1. Links must be preceded by a non-alphanumeric delimiter.
  // 2. Links are matched greedily.
  // 3. URLs must start with a supported scheme.
  // 4. E-mail addresses are also linkified.
  // 5. Twitter users and hash tags are also linkified.
  //
  // TODO: This can be improved (but also customized). One enhancement might be
  // to support internationalized syntax.
  var regex =
    /(^|[^a-zA-Z0-9]+)(?:((?:http|https):\/\/[-a-zA-Z0-9_.~:\/?#[\]@!$&'()*+,;=%]+[-a-zA-Z0-9_~:\/?#@!$&*+;=%])|([-.+a-zA-Z0-9_]+@[-a-zA-Z0-9]+(?:\.[-a-zA-Z0-9]+)+)|(@[a-zA-Z]\w*))/g;

  regex.lastIndex = 0;
  while ((result = regex.exec(line))) {
    var info = {};

    info.start = result.index + result[1].length;
    info.xch_cmd = "";
    if (result[2]) {
      result = result[2];
      info.url = result;
    } else if (result[3]) {
      result = result[3];
      info.url = "mailto:" + result;
    } else if (result[4]) {
      result = result[4];
      info.url = "";
      info.xch_cmd = "help " + result;
      info.className = "ansi-1-37";
    }

    info.end = info.start + result.length;

    links[links.length] = info;
  }

  return links;
};


// detect if more user input is required for a pueblo command
export function ReplaceToken(command) {
  var cmd = command;
  var regex = /\?\?/;

  // check for the search token '??'
  if (cmd.search(regex) !== -1) {
    var val = prompt(command);

    if (val === null) {
      // user cancelled the prompt, don't send any command
      cmd = "";
    } else {
      // replace the ?? token with the prompt value
      cmd = cmd.replace(regex, val);
    }
  }

  return cmd;
}
