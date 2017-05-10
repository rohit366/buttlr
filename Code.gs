function doPost(e){
  getLogger().log("doPost() triggered by %s with command '%s'", e.parameter["user_name"], e.parameter["text"]);
  var commandReceived = e.parameter["text"];

  if (commandReceived.match(/help/)) showHelp();
  if (commandReceived.match(/list/)) listStaging();
  if (commandReceived.match(/take/)) take(e);
  if (commandReceived.match(/leave/)) leave(e);
}

function listStaging(){
  getLogger().log("listing staging servers");

  var sheet = getStatusSheet();
  var values = sheet.getRange("B2:D4").getValues();
  var lines = new Array(3);

  for (var i = 0; i < values.length; i++){
    lines.push(
      buildStagingListLine(i+1, values[i])
    );
  }

  sendMessage(lines.join("\n"));
}

function showHelp(){
  getLogger().log("showing help");

  var message = "*Available commands:*\n\n";
  message += "- *help*: What you see here.\n";
  message += "- *list*: Will show the list of staging servers and their current state\n";
  message += "- *take <server_number>*: Will mark the server as busy by the author of the command.\n";
  message += "- *leave <server_number>*: Will free the server.\n";

  sendMessage(message);
}

function take(e){
  var currentOwner = e.parameter["user_name"];
  var messageReceived = e.parameter["text"].trim();
  var regex = /take ([0-9])( (.*))?/;
  var matches = regex.exec(messageReceived);
  var serverNumber = parseInt(matches[1]);
  var reason = matches[3] ? matches[3] : "Not specified";
  var sheet = getStatusSheet();

  sheet.getRange("B" + (serverNumber+1)).setValue(true);
  sheet.getRange("C" + (serverNumber+1)).setValue(currentOwner);
  sheet.getRange("D" + (serverNumber+1)).setValue(reason);

  getLogger().log("%s took staging server %d. Reason: %s", currentOwner, serverNumber, reason);

  listStaging();
}

function leave(e){
  var releaser = e.parameter["user_name"];
  var messageReceived = e.parameter["text"].trim();
  var regex = /leave ([0-9])/;
  var matches = regex.exec(messageReceived);
  var serverNumber = parseInt(matches[1]);
  var sheet = getStatusSheet();

  sheet.getRange("B" + (serverNumber+1)).setValue(false);
  sheet.getRange("C" + (serverNumber+1)).setValue("");
  sheet.getRange("D" + (serverNumber+1)).setValue("");

  getLogger().log("%s released staging server %d", releaser, serverNumber);

  listStaging();
}

function getStatusSheet(){
  return SpreadsheetApp.openById(getProperty("SPREADSHEET_ID")).getSheetByName("Status");
}

function buildStagingListLine(serverNumber, row){
  var line = "";

  if(row[0] == true){
    line += ":lock: S" + serverNumber + " (Taken by: " + row[1] + ") (Reason: " + row[2] + ")";
  }else{
    line += ":white_check_mark: S" + serverNumber;
  }

  return line;
}

function sendMessage(message){
  var payload = {
    "channel": "#" + getProperty("SLACK_CHANNEL_NAME"),
    "username": "Staging Status",
    "icon_emoji": ":trident:",
    "text": message
  };

  var url = getProperty("SLACK_INCOMING_WEBHOOK");
  var options = {
    'method': 'post',
    'payload': JSON.stringify(payload)
  };

  var response = UrlFetchApp.fetch(url, options);
}

function getLogger(){
  return BetterLog.useSpreadsheet(getProperty("SPREADSHEET_ID"));
}

function getProperty(propertyName){
  return PropertiesService.getScriptProperties().getProperty(propertyName);
}
