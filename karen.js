const Discord = require("discord.js");
const client = new Discord.Client();
const fs = require("fs");
const decache = require("decache");

const ytsearch = require("youtube-search");
const ytdl = require("ytdl-core");

// Config and Data JSON files
var cfg = require("./config.json");
var data = require("./data.json");

// AI config and Data JSON files
var acfg = require("./aicfg.json");
var adata = require("./aidata.json");

var time; // Current time, updated every second
var uptime; // Running uptime in seconds

var timeTag;

var homeGuild; // Home Guild containing log channels
var logChannel; // Channel for logging 
var msgChannel; // Channel for server messages
var dmChannel; // Channel for DM messages

var aiChannel; // Channel for AI messages

var msghlRule; // Messages from this Guild/Channel/User ID will be highlighted when logged
var lastDMAuthor; // Last user to message Karen

var ytkey = cfg.ytkey; // Youtube API key
var dispatcher; // Dispatcher for playing youtube videos

var month;

// Login to the Discord API
client.login(cfg.token);

// Things to do every second (tick)
setInterval(() => {
    // Update the time
    updateTime();
    timeTag = "[" + time.toString().substr(0,24) + "]";
    
    // Add 1 to the uptime
    uptime += 1

    decache("./data.json");
    decache("./config.json");
    decache("./aidata.json");
    decache("./aicfg.json");

    data = require("./data.json");
    cfg = require("./config.json");
    adata = require("./aidata.json");
    acfg = require("./aicfg.json");
    
}, 1000);

// Stores the current time/date (Called every second by setInterval)
function updateTime()
{
    time = new Date();
}

// Logs something to the logChannel
function logEvent(str, hl)
{
    // param hl is optional, default = false
    if(typeof hl === "undefined") hl = false;

    var output = "";

    output += timeTag + "\r\n";
    output += "```";
    if(hl) output += "fix";
    output += "\r\n";
    output += str;

    output = trimStr(output, 4);

    output += "\r\n```"

    fs.appendFileSync("./log/bot/" + time.getFullYear() + "." + month + "." + time.getDate() + ".txt", output + "\r\n\r\n");
    logChannel.send(output);
}

// Logs a message to any guild to the msgChannel
function logMsg(msg)
{
    var highlight = false
    var output = "";

    // If this guild, channel, or author is muted, return
    if(cfg.muted.includes(msg.guild.id) || 
       cfg.muted.includes(msg.guild.id) || 
       cfg.muted.includes(msg.guild.id)) 
    {
        return;
    }
    
    // If the channel appears to be some sort of log channel
    if(msg.channel.name.includes("log")) return;
    

    output += timeTag + "\r\n";
    output += "```";

    // If the properties of this message include the HL Rule, highlight it
    if(msg.guild.id === msghlRule) highlight = true;
    if(msg.channel.id === msghlRule) highlight = true;
    if(msg.author.id === msghlRule) highlight = true;
    if(highlight) output += "fix";

    output += "\r\n";

    // Log all the other information associated with the message, then log the body
    // If it includes a code block, do not log the body (TEMPORARY SOLUTION)
    output += msg.author.username;
    output += "#";
    output += msg.author.discriminator;
    output += " <" + msg.author.id + ">";
    output += " -> ";
    output += "#" + msg.channel.name;
    output += " <" + msg.channel.id + "> ";
    output += "@ " + msg.guild.name;
    output += " <" + msg.guild.id + ">\r\n\r\n";
    if(msg.content.includes("\`\`\`")) output += "(Unloggable Content)";
    else output += msg.content;

    output = trimStr(output, 4);

    output += "\r\n```";
    
    fs.appendFileSync("./log/msg/" + time.getFullYear() + "." + month + "." + time.getDate() + ".txt", output + "\r\n\r\n");
    msgChannel.send(output);
}

// Logs a DM message to the dmChannel
function logDM(msg)
{
    var recipient; // User that recieved the message
    var output = "";

    // Determine the recipient
    if(msg.author.id !== client.user.id)
    {
        lastDMAuthor = msg.author;
        recipient = client.user;
    }
    else
    {
        recipient = msg.channel.recipient;
    }

    output += timeTag + "\r\n";
    output += "```";

    // If the sender is not Karen, highlight the message
    if(msg.author.id !== client.user.id) output += "fix";

    output += "\r\n";

    // Log all the other information associated with the message, then log the body
    // If it includes a code block, do not log the body (TEMPORARY SOLUTION)
    output += msg.author.username;
    output += "#";
    output += msg.author.discriminator;
    output += " <" + msg.author.id + ">";
    output += " -> ";
    output += recipient.username;
    output += "#";
    output += recipient.discriminator;
    output += " <" + recipient.id + ">\r\n\r\n";
    if(msg.content.includes("\`\`\`")) output += "(Unloggable Content)";
    else output += msg.content;

    output = trimStr(output, 4);
    
    output += "\r\n```";
    
    fs.appendFileSync("./log/dm/" + time.getFullYear() + "." + month + "." + time.getDate() + ".txt", output + "\r\n\r\n");
    dmChannel.send(output);
}

// Writes data to the data JSON file
function writeData(data)
{
    fs.writeFileSync("./data.json", JSON.stringify(data, null, "\t"));
}

// Makes sure an output variable is not too long to be sent
// Param space is the amount of chars that still need to be added
function trimStr(str, space)
{
    if(typeof space === "undefined") space = 0;
    
    if(str.length > 2000-space)
    {
        str = str.substring(0, 1996-space);
        str += "...";
    }
    return str;
}

// Checks if someone has proposed to someone else
function hasProposed(id)
{
    var pendingMarriage = data.pendingMarriages.find(x => x.proposer === id);
    if(typeof pendingMarriage === "undefined") return false;
    else return true;
}

// Checks if someone is married
function isMarried(id)
{
    var marriage = data.marriages.find(x => x.proposer === id || x.target === id);
    if(typeof marriage === "undefined") return false;
    else return true;
}

// Returns a proposal object, or undefined if it does not exist
function getProposal(id)
{
    return data.proposals.find(x => x.proposer === id);
}

// Returns an array of proposal objects
function getIncomingProposals(id)
{
    var incomingProposals = [];
    data.proposals.forEach(x => {
        if(x.target === id) incomingProposals.push(x);
    });
    return incomingProposals
}

// Returns a marriage object, or undefined if it does not exist
function getMarriage(id)
{
    return data.marriages.find(x => x.proposer === id || x.target === id);
}

// Finds the index of a proposal. Returns -1 if not found
function getProposalIndex(id)
{
    data.proposals.forEach((x, i) => {
        if(x.proposer === id) return i;
    });
    return -1;
}

// Returns array of all indexes of incoming proposals. 
function getIncomingProposalIndexes(id)
{
    var incomingProposalIndexes = [];
    data.proposals.forEach((x, i) => {
        if(x.target === id) incomingProposalIndexes.push(i);
    });
    return incomingProposalIndexes
}

// Finds the index of a marriage. Returns -1 if not found
function getMarriageIndex(id)
{
    data.marriages.forEach((x, i) => {
        if(x.proposer === id || x.target === id) return i;
    });
    return -1;
}

// Remove any data file entries where one or more
// users involved are no longer in a guild with Karen
function purgeData()
{
    var workingData = data;

    workingData.marriages.forEach((x, i) => {
        var currentElement = client.users.find(y => y.id === x.proposer);
        if(typeof currentElement === "undefined")
        {
            workingData.marriages.splice(i, 1);
        }
    })
    workingData.marriages.forEach((x, i) => {
        var currentElement = client.users.find(y => y.id === x.target);
        if(typeof currentElement === "undefined")
        {
            workingData.marriages.splice(i, 1);
        }
    })
    workingData.marriages.forEach((x, i) => {
        var currentElement = client.guilds.find(y => y.id === x.guild);
        if(typeof currentElement === "undefined")
        {
            workingData.marriages.splice(i, 1);
        }
    })



    workingData.pendingMarriages.forEach((x, i) => {
        var currentElement = client.users.find(y => y.id === x.proposer);
        if(typeof currentElement === "undefined")
        {
            workingData.pendingMarriages.splice(i, 1);
        }
    })
    workingData.pendingMarriages.forEach((x, i) => {
        var currentElement = client.users.find(y => y.id === x.target);
        if(typeof currentElement === "undefined")
        {
            workingData.pendingMarriages.splice(i, 1);
        }
    })
    workingData.pendingMarriages.forEach((x, i) => {
        var currentElement = client.guilds.find(y => y.id === x.guild);
        if(typeof currentElement === "undefined")
        {
            workingData.pendingMarriages.splice(i, 1);
        }
    })



    workingData.divorcedMarriages.forEach((x, i) => {
        var currentElement = client.users.find(y => y.id === x.target);
        if(typeof currentElement === "undefined")
        {
            workingData.divorcedMarriages.splice(i, 1);
        }
    })
    workingData.divorcedMarriages.forEach((x, i) => {
        var currentElement = client.users.find(y => y.id === x.target);
        if(typeof currentElement === "undefined")
        {
            workingData.divorcedMarriages.splice(i, 1);
        }
    })
    workingData.divorcedMarriages.forEach((x, i) => {
        var currentElement = client.guilds.find(y => y.id === x.guild);
        if(typeof currentElement === "undefined")
        {
            workingData.divorcedMarriages.splice(i, 1);
        }
    })

    writeData(workingData);
}

function checkPerm(msg)
{
    var botGuildMember = msg.guild.member(client.user);
    if(msg.channel.permissionsFor(botGuildMember).has("SEND_MESSAGES"))
    {
        return true;
    }
    else return false;
}



function aiLog(str)
{
    fs.appendFileSync("./log/ai/" + time.getFullYear() + "." + month + "." + time.getDate() + ".txt", str + "\r\n\r\n");
    aiChannel.send(str);
}

function aiStrip(str)
{
    str = str.toLowerCase();
    str = str.replace(/([^A-Za-z ])/g, '');

    return str;
}

function aiWriteData(data)
{
    fs.writeFileSync("./aidata.json", JSON.stringify(data, null, "\t"));
}

function aiProcessMsg(msg)
{

    decache("./aicfg.json");
    decache("./aidata.json");
    acfg = require("./aicfg.json");
    adata = require("./aidata.json");

    if(msg.author.bot) return;

    if(acfg.exempt.includes(msg.author.id)) return;

    var author = msg.author;
    var fullMsg = msg.content;
    var strippedMsg = aiStrip(fullMsg);
    var runningMagnitude = 0.0;
    var phraseMatchCount = 0;
    var phraseMatches = [];
    var multiplierMatchCount = 0;
    var multiplierMatches = [];
    var workingadata = adata;

    var currentSubject = workingadata.records.find(x => x.id === author.id);

    // For each trouble phrase, search the message for it.
    // Count occurrences, add total magnitude to running magnitude.
    // Push matches to the phraseMatches array
    acfg.troublePhrases.forEach(x => {
        var re = new RegExp(x.phrase, "g");
        var matches = strippedMsg.match(re);
        if(matches == null) matches = [];

        runningMagnitude += x.magnitude * matches.length;
        phraseMatchCount += matches.length;
        for(var i = 0; i < matches.length; i++)
            phraseMatches.push(x);
    });

    // For each multiplier found, multiply the running 
    // magnitude by the multiplier. Tally up the multiplier
    // matches, and push the matches to the other array
    acfg.troubleMultipliers.forEach(x => {
        if(strippedMsg.includes(x.phrase))
        {
            runningMagnitude *= x.multiplier;
            multiplierMatchCount++;
            multiplierMatches.push(x);
        }
    });

    // If only a single, low-magnitude match is found, ignore it.
    if(runningMagnitude < 2 && phraseMatchCount == 1) 
    {
        runningMagnitude = 0;
        phraseMatchCount = 0;
    }


    // If record does not exist, add it
    if(typeof currentSubject === "undefined")
    {
        workingadata.records.push(
            {
                "id": author.id,
                "name": author.username,
                "disc": author.discriminator,
                "siRating": 0.0,
                "lastUncleanPost": 0,
                "recentMessages": []
            }
        );
        currentSubject = workingadata.records.find(x => x.id === author.id);
    }

    if(phraseMatchCount != 0)
    {
        

        // Update the subject's data
        currentSubject.lastUncleanPost = parseInt(Date.now());
        currentSubject.siRating += runningMagnitude;
        currentSubject.recentMessages.push(msg.content);

        
        var output = timeTag + "\r\n```fix\r\n";
        output += currentSubject.name + "#" + currentSubject.disc + " <" + currentSubject.id + 
        ">'s " + "SI Rating increased from " + (currentSubject.siRating - runningMagnitude) + 
        " to " + currentSubject.siRating + " as a result of " + phraseMatchCount + 
        " phrase matches and " + multiplierMatchCount + 
        " multiplier phrase matches.\r\n\r\nPHRASE MATCHES\r\n";

        phraseMatches.forEach(x => {
            output += "phrase: " + x.phrase + ", magnitude: " + x.magnitude + "\r\n";
        });

        output += "\nMULTIPLIER MATCHES\n";
        multiplierMatches.forEach(x => {
            output += "phrase: " + x.phrase + ", multiplier: " + x.multiplier + "\r\n";
        });

        output += "\r\nMESSAGE INFO\r\n" + "Channel #" + msg.channel.name + " <" + msg.channel.id + ">\r\nGuild " + msg.guild.name + " <" + msg.guild.id + ">\r\n";
        output += "\r\nFULL MESSAGE\r\n";
        output += fullMsg;

        output = trimStr(output, 4);

        output += "\r\n```";
        aiLog(output, true);
    }

    else
    {
        // If 1 hour has passed since last unclean post, subject is eligible for 
        // an SI rating decrease of 1
        if(Date.now() >= currentSubject.lastUncleanPost + 3600000 && currentSubject.siRating > 0)
        {
            var oldRating = currentSubject.siRating;
            currentSubject.siRating -= 1;
            currentSubject.lastUncleanPost = Date.now();

            if(currentSubject.siRating < 0) currentSubject.siRating = 0;

            var output = timeTag + "\r\n```\r\n";
            output += currentSubject.name + "#" + currentSubject.disc + " <" + 
            currentSubject.id + ">'s SI Rating decreased from " + oldRating + 
            " to " + currentSubject.siRating;

            output += "\r\n```";


            aiLog(output);
        }
    }

    // write to disk
    aiWriteData(workingadata);
    aiClean();
    aiCheckThreshold()
    
}

function aiClean()
{
    {
        var workingadata = adata;

        workingadata.records.forEach((x, i) => {
            if(x.siRating < 0.01)
            {
                workingadata.records.splice(i, 1);
            }
        });

        var sortBySI = function(a,b)
        {
            if(a.siRating > b.siRating) return -1;
            if(a.siRating < b.siRating) return 1;
            return 0;
        }

        workingadata.records.sort(sortBySI);

        aiWriteData(workingadata);
    }

}

function aiCheckThreshold()
{
    var workingadata = adata;
    workingadata.records.forEach(x => {
        if(x.siRating >= 16)
        {
            var u = client.users.find(y => y.id === x.id);
            aiTrigger(u, x.siRating, x.recentMessages)
            x.siRating = 0;
            x.recentMessages = [];
        }
    });
    aiWriteData(workingadata);
}

function aiTrigger(u, r, recentMessages)
{
    var output = timeTag + "\n";
    output += "**URGENT**\n```fix\n";
    output += "ALARM RAISED FOR " + u.username + "#" + u.discriminator + " <" + u.id + "> \n";
    output += "They have an SI Rating of " + r + "\n";
    output += "Some of their recent messages:\n\n";

    recentMessages.forEach(x => {
        output += "\"" + x + "\"\n";
    });

    output = trimStr(output, 4);

    output += "\n```";
    client.users.find(x => x.id === cfg.ownerID).send(output);
    aiLog(output);
}

function sendSupportMessage(id, msg)
{
    var target = client.users.find(x => x.id === id);
    var output = ""
    output += "Hey, are you alright?\n\n";
    output += "Your speech patterns seem to have triggered an alarm within my algorithms.\n";
    output += "If you are in need of help, I encourage you to please reach out to someone you know.\n";
    output += "If you don't have anyone, you can message me back and someone will respond through me.\n";
    output += "You're also welcome to add my developer and have a chat with him `Merlin#8474`\n"
    output += "If you're in any immediate danger, please go to the emergency room or call emergency services.\n\n\n";
    output += "*This was an automated message sent as a result of an experiemental algorithm. The results ";
    output += "determined by this algorithm is not guaranteed to be 100% accurate. By implementing this algorithm, ";
    output += "the developer assumes no liability of any type, for any reason.*";

    target.send(output).catch(() => {console.log("Couldn't message this user.")});
    msg.channel.send("Attempting to send support message to " + target.username + "#" + target.discriminator);
}



// Stop (and restart) the node.js process on any unhandled promise rejection
process.on("warning", (warn) =>
{
    if(warn.name === "UnhandledPromiseRejectionWarning")
    {
        logEvent(warn.name + ": " + warn.message);
        process.exit(1);
    }
});

client.on("ready", () => {
    updateTime();
    purgeData();
    month = time.getMonth() + 1;
    timeTag = "[" + time.toString().substr(0,24) + "]";
    uptime = 0;

    // Set the home guild and log channel variables
    homeGuild = client.guilds.find(x => x.id === cfg.homeGuildID);
    logChannel = homeGuild.channels.find(x => x.name === cfg.logChannelName);
    msgChannel = homeGuild.channels.find(x => x.name === cfg.msgChannelName);
    dmChannel = homeGuild.channels.find(x => x.name === cfg.dmChannelName);

    aiChannel = homeGuild.channels.find(x => x.name === acfg.logChannelName);

    // Set the msg highlighting rule to the home guild
    msghlRule = homeGuild.id;

    // Reply target set to myself
    lastDMAuthor = client.users.find(x => x.id === cfg.ownerID);

    client.user.setActivity("@Karen#1774");
    logEvent("Bot Ready!");
})

client.on("guildCreate", guild => {
    logEvent("New Guild: " + guild.name + " <" + guild.id + ">");

    // Send an introduction message to the general channel where the bot has permissions
    // Otherwise, send it to a random channel where the bot has permissions
    var generalChannel = guild.channels.find(x => x.name.includes("general"));
    var botMember = guild.member(client.user);
    if(typeof generalChannel !== "undefined" && generalChannel.permissionsFor(botMember).has("SEND_MESSAGES")) 
    {
        generalChannel.send("Thank you for adding me to " + guild.name + "! To get started, just mention me!");
    }
    else
    {
        guild.channels.forEach(x => {
            if(x.type === "text" && x.permissionsFor(botMember).has("SEND_MESSAGES"))
            {
                x.send("Thank you for adding me to " + guild.name + "! To get started, just mention me!");
                return;
            }
        });
    }
});

client.on("guildDelete", guild => {
    purgeData();
    logEvent("Removed from " + guild.name + " <" + guild.id + ">");
});

client.on("guildMemberRemove", () => {
    purgeData();
})

client.on("message", async msg => {
    //Handle Logging First
    if(msg.channel.type === "dm") 
    {
        logDM(msg);
        return;
    }
    else if(msg.channel.type === "text")
    {
        logMsg(msg);
    }
    else return;

    // If the channel appears to be some sort of log channel
    if(msg.channel.name.includes("log") && msg.channel.name !== "karen-dm-log") return;

    // Run the message through the AI
    aiProcessMsg(msg);
    
    // Don't do anything further with the message if it was sent by a bot
    if(msg.author.bot) return;

    // Now get the prefix of the guild the message was sent in
    var guildSpecificPrefix = data.prefixes.find(x => x.guild === msg.guild.id);
    // If the data file does not contain a prefix for this guild, use the default prefix
    if(typeof guildSpecificPrefix === "undefined") guildSpecificPrefix = cfg.prefix;
    else guildSpecificPrefix = guildSpecificPrefix.prefix;

    // Removes the prefix, leading/trailing whitespace, puts args into a string[]
    var args = msg.content.slice(guildSpecificPrefix.length).trim().split(/ +/g);
    // Puts the first argument aka the cmd into a separate string
    var command = args.shift().toLowerCase();

    // Tags for ease of use later on
    var authorTag = msg.author.username + "#" + msg.author.discriminator + " <" + msg.author.id + ">";
    var channelTag = msg.channel.name + " <" + msg.channel.id + ">";
    var guildTag = msg.guild.name + " <" + msg.guild.id + ">";

    

    // Displays basic help if bot is mentioned

    if(msg.content === "<@480591007638093824>")
    {
        if(!checkPerm(msg))
        {
            msg.author.send("I do not have permissions to speak in that channel.").catch(() => {console.log("Couldn't message this user.")});
            return;
        }
        logEvent(authorTag + " mentioned bot in " + channelTag + " @ " + guildTag);

        var output = "";
        output += "My prefix in " + msg.guild.name + " is `" + guildSpecificPrefix + "`.\n";
        output += "My help command is `" + guildSpecificPrefix + "khelp`.";

        msg.channel.send(output);
    }

    // Tries to detect some sort of cry for help
    if(msg.content === "!help" || 
       msg.content === "!khelp" ||
       msg.content === "!karen" ||
       msg.content === "!commands" ||
       msg.content === "!cmds" ||
       msg.content === guildSpecificPrefix + "khelp") 
       {
        if(!checkPerm(msg))
        {
            msg.author.send("I do not have permissions to speak in that channel.").catch(() => {console.log("Couldn't message this user.")});
            return;
        }

        logEvent(authorTag + " used help command in " + channelTag + " @ " + guildTag);

        var output = "";
        output += "```\n";
        output += "You can only propose to one person at a time.\n";
        output += "You can only be married to one person at a time.\n";
        output += "Marrying someone automatically rejects all your incoming proposals.\n";
        output += "All marriages are global. This means they are recognized across all guilds Karen is in.\n";
        output += "Due to Discord's limitations, if Karen is no longer in a guild with any party within a \n";
        output += "     relationship, that entire relationship will be removed from Karen's records.\n"
        output += "\n";
        output += `${guildSpecificPrefix}khelp - Displays this help message.\n`;
        output += `${guildSpecificPrefix}setprefix - Sets the prefix for the current guild.\n`;
        output += `${guildSpecificPrefix}propose @user#0000 - Proposes to the mentioned user\n`;
        output += `${guildSpecificPrefix}marry @user#0000 - Marrys someone who has proposed to you\n`;
        output += `${guildSpecificPrefix}reject @user#0000 - Rejects someone's marriage proposal\n`;
        output += `${guildSpecificPrefix}divorce @user#0000 - Divorces the mentioned user\n`;
        output += `${guildSpecificPrefix}marriage - Displays information about your marriage\n`;
        output += `${guildSpecificPrefix}marriage @user#0000 - Displays information about the mentioned user's marriage\n`;
        output += `${guildSpecificPrefix}certificate - Displays a marriage certificate\n`;
        output += `${guildSpecificPrefix}marriages page query - Displays marriages for current guild. Args optional. No quotes for query\n`;
        output += `${guildSpecificPrefix}globalmarriages page query  - Displays all marriages. Args optional. No quotes for query\n`;
        output += `${guildSpecificPrefix}jurisdictions page - Displays all guilds Karen recognizes marriages in\n`;
        output += `${guildSpecificPrefix}kstatus - Status of the bot\n`;
        output += "\n";
        output += "Bot created by Merlin#8474.\n";
        output += "If you would like your marriage to be recognized in another server, please invite Karen:\n";
        output += "https://discordapp.com/oauth2/authorize?client_id=480591007638093824&permissions=0&scope=bot\n";
        output += "\n```";

        msg.channel.send(output);
       }

    // Eval code
    if(msg.content.startsWith("//e") || msg.content.startsWith("// e"))
    {
        if(msg.author.id !== "172734241136836608") return;
        else
        {
			msg.channel.send("Executing Code:\n```js\n" + msg.content + "\n```").then(() => {

                try{eval(msg.content); }
                catch(e){ msg.channel.send(`\`${e.name}\` \`\`\`xl\n${e.message}\n\`\`\``); }
			});
        }
    }

    
    // BEGINNING OF ALL PREFIXED COMMANDS

    // If the message does not start with a prefix, don't continue past this point
    if(!msg.content.startsWith(guildSpecificPrefix)) return;

    

    // All commands that are tracked and therefore logged
    var commands = [
        "k", "ai", "setprefix", "certificate",
        "marriage", "marriages", "globalmarriages",
        "proposals", "jurisdictions", "kstatus",
        "propose", "unpropose", "marry", "reject",
        "divorce"
    ]

    // If the command given is a tracked command, log it
    if(commands.includes(command))
    {
        // If the bot has no permission to speak in the current channel, do nothing
        // further and let the command sender know
        if(!checkPerm(msg))
        {
            msg.author.send("I do not have permissions to speak in that channel.").catch(() => {console.log("Couldn't message this user.")});
            return;
        }

        logEvent(authorTag + " called " + command + " (" + args.toString() + ") in " + 
                 channelTag + " @ " + guildTag);
    }

    

    // Set of special commands for myself
    if(command === "k")
    {
        // Only privileged users are allowed to use this command
        if(!cfg.privileged.includes(msg.author.id)) return;

        if(args[0].startsWith("/"))
        {
            args[0] = args[0].substring(1,2);
            args[0] = "-" + args[0];
        }

        if(args[0] === "-?")
        {
            var output = "";
            output += "```\n";
            output += "KAREN MANAGEMENT COMMANDS\n";
            output += "Note: Do not use quotes for any arguments.\n\n";
            output += `${guildSpecificPrefix}k -? : Displays this help message.\n`;
            output += `${guildSpecificPrefix}k -p {string:query} : Searches and plays a youtube video.\n`;
            output += `${guildSpecificPrefix}k -p -f {string:path} : Plays a file on host machine.\n`;
            output += `${guildSpecificPrefix}k -g {int:page} {string:query} : Lists guilds with member count and id.\n`;
            output += `${guildSpecificPrefix}k -c {string:id} : Lists guild text channels with bot SEND_MESSAGES perm bool and id.\n`;
            output += `${guildSpecificPrefix}k -n {string:id} : Returns the username and discriminator of a user/member's id.\n`;
            output += `${guildSpecificPrefix}k -s {string:id} : Messages a user if a user id is provided, a text channel if a channel id was provided.\n`;
            output += `${guildSpecificPrefix}k -i {string:id} : Generates an instant invite for the server whose id was provided.\n`;
            output += `${guildSpecificPrefix}k -r {string:text} : Replies to the last person that DMed Karen.\n`;
            output += `${guildSpecificPrefix}k -h {string:rule} : Sets log highlighting rule.\n`;
            output += `${guildSpecificPrefix}k -a {string:text} : Sends message to general channel or random channel of every guild.\n`;
            output += "\n\n";
            output += `${guildSpecificPrefix}ai -r : Generates SI report.\n`;
            output += `${guildSpecificPrefix}ai -s : Send support message to user whose id was provided.\n`;
            output += `${guildSpecificPrefix}ai -d : Clears the SI record of the user whose id was provided.\n`;
            output += "\n```";
            msg.channel.send(output);
        }

        // moosik bot!
        if(args[0] === "-p")
        {
            var channel = msg.member.voice.channel;
            if(typeof channel === "undefined") return;


            if(args[1] === "-f" || args[1] === "/f")
            {
                args.shift();
                args.shift();
                args = args.join(" ")

                channel.join().then(conn => {
                    msg.channel.send("Playing " + args);
                    dispatcher = conn.play(args, {seek:0,volume:1});
                    dispatcher.on("end", end => { 
                        msg.guild.member(client.user).voice.channel.leave() 
                    });
                });
            }

            else
            {
                args.shift();
                args = args.join(" ");

                ytsearch(args, {part: "snippet", maxResults: 1, type:"video", key: ytkey}).then(x => {
                    if(x.results.length === 0) return;

                

                    channel.join().then(conn => {
                        var stream = ytdl(x.results[0].link, {filter:"audioonly"});
                        msg.channel.send("Playing " + x.results[0].title);
                        dispatcher = conn.play(stream, {seek:0,volume:.5});
                        dispatcher.on("end", end => { 
                            msg.guild.member(client.user).voice.channel.leave() 
                        });
                    });

                });
            }
            
        }

        else if(args[0] === "-l")
        {
            msg.guild.member(client.user).voice.channel.leave();
            msg.channel.send("Stopped playing music.");
        }

        // List all guilds alphabetically and show IDs
        else if(args[0] === "-g")
        {
            var queryString = "";
            var pageToDisplay;
            var tempData = "";
            var lineCount = 0;
            var guildNumber = 0;
            var guilds = []
            var fullData = [];
            var output = "";
            const ELEMENTS_PER_LINE = 20;

            args.shift();

            // arg1 number arg2 number = invalid
            if( !isNaN(args[0]) && !isNaN(args[1]) )
            {
                pageToDisplay = parseInt(args[0]);
                args.shift();
                queryString = args.join(" ");
            }

            // arg1 number arg2 undefined = display page arg1 of all
            else if( !isNaN(args[0]) && typeof args[1] === "undefined")
            {
                pageToDisplay = parseInt(args[0]);
            }

            // arg1 number arg2 string = display page arg1 of query rest of string
            else if( typeof args[0] !== "undefined" && typeof args[1] !== "undefined" && !isNaN(args[0]) && isNaN(args[1]) )
            {
                pageToDisplay = parseInt(args[0]);
                args.shift();
                queryString = args.join(" ");
            }

            // arg1 string arg2 string = display page 1 of query rest of string
        
            else if( typeof args[0] !== "undefined" && typeof args[1] !== "undefined" && isNaN(args[0]) && isNaN(args[1]) )
            {
                pageToDisplay = 1;
                queryString = args.join(" ");
            }

            // arg1 string arg2 undefined = display page 1 of query arg 1
            else if ( typeof args[0] !== "undefined" && isNaN(args[0]) && typeof args[1] === "undefined" )
            {
                pageToDisplay = 1;
                queryString = args[0];
            }

            // arg1 undefined = display page 1 of all
            else if( typeof args[0] === "undefined")
            {
                pageToDisplay = 1;
            }
            


            client.guilds.forEach(x => {
                guilds.push(x.name + " (" + x.members.size + ") " + " - " + x.id);
            });

            guilds.sort();

            guilds.forEach((x, i) => {
                if(x.toLowerCase().includes(queryString.toLowerCase()))
                {
                    guildNumber = fullData.length * ELEMENTS_PER_LINE + lineCount + 1;
                    tempData += "   " + guildNumber + ": " + x + "\n";
                    lineCount++;

                    if(lineCount === ELEMENTS_PER_LINE)
                    {
                        fullData.push(tempData);
                        tempData = "";
                        lineCount = 0;
                    }
                }
                
            });

            if(tempData !== "")
            {
                fullData.push(tempData);
            }

            output += "**Guilds"

            if(queryString !== "") 
            {
                output += " containing " + queryString;
            }

            output += "**\n```\n"

            output += "~~~PAGE " + pageToDisplay + " OF " + fullData.length + "~~~\n";

            if(typeof fullData[pageToDisplay - 1] !== "undefined")
            {
                output += fullData[pageToDisplay - 1];
            }

            output += "~~~PAGE " + pageToDisplay + " OF " + fullData.length + "~~~";
            output += "```";
            msg.channel.send(output);
        }

        // Lists all text channels in a guild and tells whether the bot can send
        else if(args[0] === "-c")
        {
            if(typeof args[1] === "undefined") return;
            var output = "```\n";
            var guild = client.guilds.find(x => x.id === args[1]);
            var botMember = guild.members.find(x => x.id === "480591007638093824");

            guild.channels.forEach(x => {
                if(x.type === "text")
                {
                    output += x.name;
                    
                    if(x.permissionsFor(botMember).has("SEND_MESSAGES") || x.type === "text") 
                        output += "(1)";
                    else output += "(0)";

                    output += " - " + x.id + "\n";
                }
            });

            output = trimStr(output, 4);

            output += "\n```";
            msg.channel.send(output);
        }

        // Returns a user's name and discriminator
        else if(args[0] === "-n")
        {
            var u = client.users.find(x => x.id === args[1]);
            msg.channel.send("```\n" + u.username + "#" + u.discriminator + "\n```").catch(() => {});
        }

        // Messages a text channel or user
        else if(args[0] === "-s")
        {
            var destID = args[1];
            args.shift();
            args.shift();

            var dest;
            dest = client.channels.find(x => x.id === destID);
            if(typeof dest === "undefined")
            {
                dest = client.users.find(x => x.id === destID);
            }
            dest.send(args.join(" ")).catch(() => {console.log("Couldn't message this channel or user.")});
        }

        // Generate an instant invite
        else if(args[0] === "-i")
        {
            var guild = client.guilds.find(x => x.id === args[1]);
            var channel;
            var botMember = guild.members.find(x => x.id === "480591007638093824");
            var inv;

            channel = guild.channels.find(x => x.permissionsFor(botMember).has("CREATE_INSTANT_INVITE"))
            inv = channel.createInvite().then(x => {
                msg.channel.send("http://discord.gg/" + x.code);
            });

        }

        // Reply to last DM
        else if(args[0] === "-r")
        {
            args.shift();
            lastDMAuthor.send(args.join(" ")).catch(() => {console.log("Couldn't message this user.")});
        }

        // Set message log highlighting rule
        else if(args[0] === "-h")
        {
            msghlRule = args[1];
            msg.channel.send("Set message highlighting rule to " + args[1]);
        }

        // Announce to all general or a random channel
        else if(args[0] === "-a")
        {
            args.shift();
            var str = args.join(" ");

            var generalChannel;
            var botMember;
            var msgCount = 0;
            var guildCount = client.guilds.size;

            client.guilds.forEach(guild => {
                botMember = guild.member(client.user);
                generalChannel = guild.channels.find(x => x.name.includes("general"));
                if(typeof generalChannel !== "undefined" && generalChannel.permissionsFor(botMember).has("SEND_MESSAGES")) 
                {
                    generalChannel.send(str);
                    msgCount++;
                }
                else
                {
                    var alternateChannel = guild.channels.
                        find( x => x.type === "text" && x.permissionsFor(botMember).has("SEND_MESSAGES") );
                    if(typeof alternateChannel !== "undefined") 
                    {
                        alternateChannel.send(str);
                        msgCount++;
                    }
                }
            })
            
            msg.channel.send("Sent announcement to `" + msgCount + " / " + guildCount + "`")
        }

    }

    if(command === "ai")
    {
        // Only privileged users are allowed to use this command
        if(!cfg.privileged.includes(msg.author.id)) return;

        if(args[0].startsWith("/"))
        {
            args[0] = args[0].substring(1,2);
            args[0] = "-" + args[0];
        }

        // Quick SI Report
        if(args[0] === "-r")
        {
            var output = "SI RATING REPORT\n```\n";
            aiClean();

            adata.records.forEach(x => {
                if(x.siRating > 0)
                {
                    output += x.siRating + " - " + x.name + "#" + x.disc + " <" + x.id + ">\n";
                }
            });
            output += "\n```";
            msg.channel.send(output);
        }

        // Send support message
        else if(args[0] === "-s")
        {
            sendSupportMessage(args[1], msg);
        }

        // Remove record
        else if(args[0] === "-d")
        {
            var workingadata = adata;

            args.shift();

            args.forEach(idToRemove => {
                var index = workingadata.records.findIndex(x => x.id === idToRemove);
                if(index !== -1) workingadata.records.splice(index, 1);
            })
            
            
            aiWriteData(workingadata);
            msg.channel.send("Removed record(s).")
        }
    }

    // Sets prefix for current guild
    else if(command === "karensetprefix")
    {
        // If the user does not specify a prefix
        if(typeof args[0] === "undefined")
        {
            logEvent(authorTag + " tried to set prefix but provided no arguments.")
            msg.channel.send("You must specify a prefix!");
            return;
        }

        var workingData = data;
        var prefixObjectIndex;

        // Find the index of the prefix object for current guild
        prefixObjectIndex = workingData.prefixes.findIndex(x => x.guild === msg.guild.id);

        // If the object exists, remove it
        if(prefixObjectIndex >= 0)
        {
            workingData.prefixes.splice(prefixObjectIndex, 1);
        }

        // Insert new prefix object
        workingData.prefixes.push({"guild": msg.guild.id, "prefix": args[0]});

        // Write data to disk
        writeData(workingData);
        logEvent(authorTag + " set prefix.")
        msg.channel.send("Prefix set.")
    }

    // Displays marriage certificate
    else if(command === "certificate")
    {
        var marriage;

        var author = msg.author;

        var proposer;
        var target;
        var marriageDate;
        var marriageMonth;
        var marriageYear;
        var marriageGuild;

        var output = "";

        // If they're not married, do not try to generate certificate
        if(!isMarried(author.id))
        {
            logEvent(authorTag + " requested certificate but is not married.");
            msg.channel.send("You are not married.");
            return;
        }

        marriage = data.marriages.find(x => x.proposer === author.id || x.target === author.id);

        proposer = client.users.find(x => x.id === marriage.proposer);
        target = client.users.find(x => x.id === marriage.target);

        marriageDate = marriage.date.split(' ');
        marriageMonth = marriageDate[0];
        marriageDay = marriageDate[1];
        marriageYear = marriageDate[2];

        marriageGuild = client.guilds.find(x => x.id === marriage.guild);

        output += "**CERTIFICATE OF MARRIAGE**\n\n";
        output += "THIS CERTIFIES THAT\n";
        output += "**" + proposer.username + "#" + proposer.discriminator + "** AND **" + target.username + "#" + proposer.discriminator + "**\n";
        output += "WERE UNITED IN MARRIAGE ON THE **" + marriageDay + "** DAY OF **" + marriageMonth + "** IN THE YEAR **" + marriageYear + "**\n";
        output += "IN **" + marriageGuild.name + "**\n\n";
        output += "WITNESSED BY **Karen#1774**\n\n";
        output += "PARTIES UNDERSIGNED: \n";
        output += "*" + proposer.username + "*\n";
        output += "*" + target.username + "*\n\n";
        output += "Official Marriage ID: " + marriage.unixTime + "\n";

        logEvent(authorTag + " requested certificate.");
        msg.channel.send(output);
    }

    // Displays marriage information
    else if(command === "marriage")
    {
        var author = msg.author;
        var cmdTarget;
        var proposer;
        var target;
        var guild;

        var marriage;
        var pendingMarriage;
        var proposerID;
        var targetID;
        var guildID;
        var marriageDate;
        var proposalDate;

        // If they specified no target, target is themselves.
        if(typeof args[0] === "undefined") cmdTarget = author;
        else cmdTarget = msg.mentions.users.first();

        // If they sent the command with an invalid mention
        if(typeof cmdTarget === "undefined")
        {
            logEvent(authorTag + " requested marriage info but provided invalid arguments.");
            msg.channel.send("Invalid Arguments");
            return;
        }

        if(!isMarried(cmdTarget.id) && !hasProposed(cmdTarget.id))
        {
            logEvent(authorTag + "requested marriage info about " + cmdTarget.username + 
                     "#" + cmdTarget.discriminator + " <" + cmdTarget.id + ">");

            msg.channel.send(cmdTarget.username + "#" + cmdTarget.discriminator + 
                             " is not married, nor have they proposed to anyone.");

            return;
        }

        if(isMarried(cmdTarget.id))
            {
                marriage = data.marriages.find(x => x.proposer === cmdTarget.id || x.target === cmdTarget.id);
                proposerID = marriage.proposer;
                targetID = marriage.target;
                guildID = marriage.guild;
                marriageDate = marriage.date;

                proposer = client.users.find(u => u.id === proposerID);
                target = client.users.find(u => u.id === targetID);
                guild = client.guilds.find(guild => guild.id === guildID);

                logEvent(authorTag + "requested marriage info about " + cmdTarget.username + 
                     "#" + cmdTarget.discriminator + " <" + cmdTarget.id + ">");
                msg.channel.send(target.username + "#" + target.discriminator + " married " + 
                                proposer.username + "#" + proposer.discriminator + " in " + guild.name + 
                                " on " + marriageDate);
            }

        if(hasProposed(cmdTarget.id))
        {
            pendingMarriage = data.pendingMarriages.find(x => x.proposer === cmdTarget.id);
            targetID = pendingMarriage.target;
            guildID = pendingMarriage.guild;
            proposalDate = pendingMarriage.date;

            target = msg.guild.members.find(member => member.id === targetID).user;
            guild = client.guilds.find(guild => guild.id === guildID);

            logEvent(authorTag + "requested marriage info about " + cmdTarget.username + 
                     "#" + cmdTarget.discriminator + " <" + cmdTarget.id + ">");
            msg.channel.send(cmdTarget.username + "#" + cmdTarget.discriminator + " proposed to " + 
                            target.username + "#" + target.discriminator + " in " + guild.name + 
                            " on " + proposalDate);
        }
    }

    // Lists marriages
    else if(command === "marriages" || command === "globalmarriages")
    {
        var marriageProposerID;
        var marriageTargetID;
        var marriageDate;
        var marriageGuildID;
        var proposer;
        var target;
        var guild;
        var pageToDisplay;
        var queryString = "";
        var tempData = "";
        var lineCount = 0;
        var marriageNumber = 0;
        var fullData = [];
        var output = "";
        const ELEMENTS_PER_LINE = 20;
        

        

        // arg1 string arg2 number = invalid
        if( isNaN(args[0]) && !isNaN(args[1]) )
        {
            logEvent(authorTag + " requested marriage list but provided invalid arguments");
            msg.channel.send("Invalid Arguments.");
            return;
        }

        // arg1 number arg2 number = invalid
        else if( !isNaN(args[0]) && !isNaN(args[1]) )
        {
            pageToDisplay = parseInt(args[0]);
            args.shift();
            queryString = args.join(" ");
        }

        // arg1 number arg2 undefined = display page arg1 of all
        else if( !isNaN(args[0]) && typeof args[1] === "undefined")
        {
            pageToDisplay = parseInt(args[0]);
        }

        // arg1 number arg2 string = display page arg1 of query rest of string
        else if( typeof args[0] !== "undefined" && typeof args[1] !== "undefined" && !isNaN(args[0]) && isNaN(args[1]) )
        {
            pageToDisplay = parseInt(args[0]);
            args.shift();
            queryString = args.join(" ");
        }

        // arg1 string arg2 string = display page 1 of query rest of string
        
        else if( typeof args[0] !== "undefined" && typeof args[1] !== "undefined" && isNaN(args[0]) && isNaN(args[1]) )
        {
            pageToDisplay = 1;
            queryString = args.join(" ");
        }

        // arg1 string arg2 undefined = display page 1 of query arg 1
        else if ( typeof args[0] !== "undefined" && isNaN(args[0]) && typeof args[1] === "undefined" )
        {
            pageToDisplay = 1;
            queryString = args[0];
        }

        // arg1 undefined = display page 1 of all
        else if( typeof args[0] === "undefined")
        {
            pageToDisplay = 1;
        }



        
        // For each marriage in the marriages data array,
        // add it to a new line in the tempData string.
        // Once the line limit is reached, push that string
        // to the fullData array.
        data.marriages.forEach(marriage => {
            marriageString = marriage.textString;
            marriageProposerID = marriage.proposer;
            marriageTargetID = marriage.target;
            marriageDate = marriage.date;
            marriageGuildID = marriage.guild;

            proposer = client.users.find(user => user.id === marriageProposerID);
            target = client.users.find(user => user.id === marriageTargetID);
            guild = client.guilds.find(x => x.id === marriageGuildID)
            if(  (command === "marriages" && marriageGuildID === msg.guild.id) || command === "globalmarriages"  )
            {
                if(marriage.textString.toLowerCase().includes(queryString.toLowerCase()))
                {
                    marriageNumber = fullData.length * ELEMENTS_PER_LINE + lineCount + 1;
                    tempData += "   " + marriageNumber + ": " + marriageDate + " - " + 
                        target.username + "#" + target.discriminator + " married " + 
                        proposer.username + "#" + proposer.discriminator;
                    if(command === "globalmarriages") tempData += " in " + guild.name
                    tempData += "\n";
                    lineCount++;
                }
            }
            if(lineCount === ELEMENTS_PER_LINE)
            {
                fullData.push(tempData);
                tempData = "";
                lineCount = 0;
            }
        });
        
        // Push that last page of data to the array as well if it isn't empty
        if(tempData !== "")
        {
            fullData.push(tempData);
        }

        if(command === "marriages") output += "**Marriages in "+ msg.guild.name;
        if(command === "globalmarriages") output += "**All marriages recognized by Karen";

        // Display search query if one was provided
        if(queryString !== "") 
        {
            output += " containing " + queryString;
        }


        output += "**\n```\n"
        
        output += "~~~PAGE " + pageToDisplay + " OF " + fullData.length + "~~~\n";

        if(typeof fullData[pageToDisplay - 1] !== "undefined")
        {
            output += fullData[pageToDisplay - 1];
        }

        output += "~~~PAGE " + pageToDisplay + " OF " + fullData.length + "~~~";
        output += "```";

        logEvent(authorTag + " requested marriage list.");
        msg.channel.send(output);
    }

    // Lists someone's incoming proposals
    else if(command === "proposals")
    {
        var proposerID;
        var targetID;
        var proposalDate;
        var proposalGuildID;
        var author = msg.author;
        var output = "";
        var i = 0;

        output += "**Your incoming proposals**\n```\n"

        // For each proposal in the data JSON file,
        // store the data in separate variables and
        // add it to an output variable
        data.pendingMarriages.forEach(proposal => {
            proposerID = proposal.proposer;
            targetID = proposal.target;
            proposalDate = proposal.date;
            proposalGuildID = proposal.guild;

            proposer = client.users.find(x => x.id === proposerID);
            target = client.users.find(x => x.id === targetID);
            guild = client.guilds.find(x => x.id === proposalGuildID)
            i++;
            
            if(targetID === author.id)
            {
                output += i + ": " + proposalDate + " - " + proposer.username + "#" + proposer.discriminator;
                output += " in " + guild.name;
                output += "\n";
            }
        });

        output = trimStr(output, 4);

        output += "\n```";
        msg.channel.send(output);
    }

    // All the guilds Karen operates in
    else if(command === "jurisdictions")
    {
        var pageToDisplay = 1;
        var tempData = "";
        var lineCount = 0;
        var guildNumber = 0;
        var guilds = [];
        var fullData = [];
        var output = "";
        const ELEMENTS_PER_LINE = 20;

        // If an argument is provided but it is NaN
        if(typeof args[0] !== "undefined" && isNaN(args[0]))
        {
            logEvent(authorTag + " requested jurisdictions but provided invalid arguments");
            msg.channel.send("Invalid Arguments");
            return;
        }
        if(typeof args[0] !== "undefined" && !isNaN(args[0]))
        {
            pageToDisplay = args[0];
        }


        client.guilds.forEach(guild => {
            guilds.push(guild.name + ", population " + guild.members.size);
        });

        guilds.sort();

        // For each guild the client is in,
        // add it to a new line in the tempData string.
        // Once the line limit is reached, push that string
        // to the fullData array.
        guilds.forEach(x => {

        guildNumber = fullData.length * ELEMENTS_PER_LINE + lineCount + 1;
        tempData += guildNumber + ": " + x;
        tempData += "\n";
        lineCount++;

        if(lineCount === ELEMENTS_PER_LINE)
        {
            fullData.push(tempData);
            tempData = "";
            lineCount = 0;
        }
        });
        
        if(tempData !== "")
        {
            fullData.push(tempData);
        }

        output += "**All jurisdictions Karen operates in**\n```\n";
        output += "~~~PAGE " + pageToDisplay + " OF " + fullData.length + "~~~\n";

        if(typeof fullData[pageToDisplay - 1] !== "undefined")
        {
            output += fullData[pageToDisplay - 1];
        }

        output += "~~~PAGE " + pageToDisplay + " OF " + fullData.length + "~~~";
        output += "```";

        logEvent(authorTag + " requested jurisdictions.");
        msg.channel.send(output);
    }

    // Status of Karen
    else if(command === "kstatus")
    {
        var output = "";
        output += "Uptime = `" + uptime + "`\n";
        output += "Guilds = `" + client.guilds.size + "`\n"; 
        output += "Population = `" + client.users.size + "`\n";
        output += "Marriages = `" + data.marriages.length + "`\n";
        output += "Pending Marriages = `" + data.pendingMarriages.length + "`\n";
        output += "Divorces = `" + data.divorcedMarriages.length + "`\n";

        // No log function call needed because this command only
        // has one outcome.
        msg.channel.send(output);
    }

    // Propose to a user
    else if(command === "propose")
    {
        var workingData = data;
        var proposer = msg.author;
        var target;
        var guild = msg.guild;
        var textString = "";

        // Checks if the proposer is already married
        if(isMarried(proposer.id))
        {   
            logEvent(authorTag + "tried to propose but is already married.");
            msg.channel.send("You are already married.");
            return;
        }

        // Checks if the proposer has already proposed to someone else
        if(hasProposed(proposer.id))
        {
            logEvent(authorTag + "tried to propose but has already proposed.");
            msg.channel.send("You already proposed to someone.");
            return;
        }

        // If proposer provides no target
        if(typeof args[0] === "undefined")
        {
            logEvent(authorTag + "tried to propose but provided no target.");
            msg.channel.send("Mention a user after the command.");
            return;
        }

        target = msg.mentions.users.first();
        // If proposer doesn't mention a valid user
        if(typeof target === "undefined")
        {
            logEvent(authorTag + "tried to propose but provided an invalid target.");
            msg.channel.send("Invalid Target.");
            return;
        }

        // If proposer tries to propose to a bot
        if(target.bot)
        {
            logEvent(authorTag + "tried to propose but target is a bot.");
            msg.channel.send("You cannot marry a bot.");
            return;
        }

        // If proposer tries to propose to self
        if(target.id === proposer.id)
        {
            logEvent(authorTag + "tried to propose but target is themselves.");
            msg.channel.send("You cannot marry yourself.");
            return;
        }

        // Check if the target is already married
        if(isMarried(target))
        {
            logEvent(authorTag + "tried to propose but target is married.");
            msg.channel.send("This person is already married.");
            return;
        }

        // textString to be inserted to object for easier searching
        textString = proposer.username + "#" + proposer.discriminator + " -> " + 
                     target.username + "#" + target.discriminator + ", " + 
                     guild.name + ", " + time.toDateString().substring(4);

        // push the proposal object to the temp JSON object
        workingData.pendingMarriages.push(
                {"textString": textString,"guild": guild.id, "proposer": proposer.id, 
                "target": target.id, "proposalDate": time.toDateString().substring(4), 
                "proposalUnixTime" : time.getTime()}
            );

        // write the data to the disk
        writeData(workingData);

        logEvent(authorTag + " proposed.");
        msg.channel.send(proposer.username + "#" + proposer.discriminator + " just proposed to " + 
                             target.username + "#" + target.discriminator + "! \n<@" + target.id + 
                             ">, do you accept the marriage proposal? \`" + guildSpecificPrefix + 
                             "marry @" + proposer.username + "#" + proposer.discriminator + "\`" +
                             " or \`" + guildSpecificPrefix + "reject @" + proposer.username + "#" + 
                             proposer.discriminator + "\`");

        proposer.send("[" + time.toString().substr(0,24) + "] " + "You proposed to " + 
                      target.username + "#" + target.discriminator).catch(() => {console.log("Couldn't message this user.")});

        target.send("[" + time.toString().substr(0,24) + "] " + "You have a marriage proposal from " + 
                    proposer.username + "#" + proposer.discriminator + ". They proposed to you in #" + 
                    msg.channel.name + " in " + msg.guild.name).catch(() => {console.log("Couldn't message this user.")});
    }

    // Rescind a proposal
    else if(command === "unpropose")
    {
        var workingData = data;
        var proposer = msg.author;
        var guild = msg.guild;
        var target;
        var marriageToCancel;
        var indexOfMarriageToCancel;
        
        // If they provided no target
        if(typeof args[0] === "undefined")
        {
            logEvent(authorTag + "tried to unpropose but provided no target.");
            msg.channel.send("Mention a user after the command.");
            return;
        }

        target = msg.mentions.users.first();
        // If they did not mention a valid user
        if(typeof target === "undefined")
        {
            logEvent(authorTag + "tried to unpropose but provided an invalid target.");
            msg.channel.send("Invalid Target.");
            return;
        }

        marriageToCancel = workingData.pendingMarriages.find(x => x.target === target.id);
        // If the pending marriage does not exist
        if(typeof marriageToCancel === "undefined")
        {
            logEvent(authorTag + "tried to unpropose but did not propose to target.");
            msg.channel.send("You did not propose to this user.");
            return;
        }

        // Find and remove the pending marriage
        indexOfMarriageToCancel = workingData.pendingMarriages.findIndex(x => x === marriageToCancel);
        workingData.pendingMarriages.splice(indexOfMarriageToCancel, 1);

        // write to disk
        writeData(workingData);

        logEvent(mAuthName + "#" + mAuthDisc + " rescinded a proposal.");

        msg.channel.send(proposer.username + "#" + proposer.discriminator + " rescinded his proposal to " + 
                             target.username + "#" + target.discriminator);
        proposer.send("[" + time.toString().substr(0,24) + "] " + "You rescinded your proposal to to " + 
                      target.username + "#" + target.discriminator + ".")
                      .catch(() => {console.log("Couldn't message this user.")});

        target.send("[" + time.toString().substr(0,24) + "] " + proposer.username + "#" + 
                    proposer.discriminator + " has rescinded their proposal to you.")
                    .catch(() => {console.log("Couldn't message this user.")});
    }

    // Marry or reject a proposal
    else if(command === "marry" || command === "reject")
    {
        var workingData = data;
        var author = msg.author;
        var guild = msg.guild;
        var givenProposer;
        var proposedMarriageToResolve;
        var indexOfPendingMarriageToResolve;
        var textString = "";

        // If no target is provided
        if(typeof args[0] === "undefined")
        {
            logEvent(authorTag + " tried to resolve proposal but provided no target.");
            msg.channel.send("Mention a user after the command.");
            return;
        }

        givenProposer = msg.mentions.users.first()
        // If no valid user was mentioned
        if(typeof givenProposer === "undefined")
        {
            logEvent(authorTag + " tried to resolve proposal but provided an invalid target.");
            msg.channel.send("Invalid argument.");
            return;
        }

        proposedMarriageToResolve = workingData.pendingMarriages.find(pendingMarriage => 
            pendingMarriage.proposer === givenProposer.id && 
            pendingMarriage.target === author.id);
        // If the mentioned user did not propose to author
        if(typeof proposedMarriageToResolve === "undefined")
        {
            logEvent(authorTag + " tried to resolve proposal but were not proposed to by target.");
            msg.channel.send("You do not have a pending proposal from this user.");
            return;
        }

        // Find the pending marriage to resolve and remove it
        indexOfPendingMarriageToResolve = workingData.pendingMarriages
            .findIndex(x => x.proposer === proposedMarriageToResolve.proposer);
        workingData.pendingMarriages.splice(indexOfPendingMarriageToResolve, 1);

        if(command === "marry")
        {
            // Push new marriage to temp array
            textString = author.username + "#" + author.discriminator + ", " + 
                                 givenProposer.username + "#" + givenProposer.discriminator + ", " + guild.name + ", " +
                                 time.toDateString().substring(4);
            workingData.marriages.push(
                {"textString": textString, "guild": guild.id, "proposer": proposedMarriageToResolve.proposer, 
                "target": author.id, "proposalDate": proposedMarriageToResolve.proposalDate, 
                "proposalUnixTime": proposedMarriageToResolve.proposalUnixTime,
                "date": time.toDateString().substring(4), "unixTime":time.getTime()}
                );

            logEvent(authorTag + " accepted a proposal.");

            // Send the alert and DMs
            msg.channel.send("Congratulations! " + author.username + "#" + author.discriminator + " is now married with " +
                              givenProposer.username + "#" + givenProposer.discriminator + "!");

            author.send("[" + time.toString().substr(0,24) + "] " + "You are now married to " + givenProposer.username + 
                "#" + givenProposer.discriminator + "!").catch(() => {console.log("Couldn't message this user.")});
            givenProposer.send("[" + time.toString().substr(0,24) + "] " + "You are now married to " 
                + author.username + "#" + author.discriminator + "!").catch(() => {console.log("Couldn't message this user.")});

            // We need to resolve all incoming proposals for both parties,
            // as well as the outgoing proposal (if it exists) of the author
            workingData.pendingMarriages.forEach((x, i) => {
                // Incoming proposals for author
                if(x.target === author.id)
                {
                    author.send("[" + time.toString().substr(0,24) + "] " + "You rejected " + 
                        x.proposer.username + "#" + x.proposer.discriminator + "'s proposal.")
                            .catch(() => {console.log("Couldn't message this user.")});
                    workingData.pendingMarriages.splice(i, 1);
                }
                // Incoming proposals for proposer
                if(x.target === givenProposer.id)
                {
                    givenProposer.send("[" + time.toString().substr(0,24) + "] " + "You rejected " + 
                        x.proposer.username + "#" + x.proposer.discriminator + "'s proposal.")
                            .catch(() => {console.log("Couldn't message this user.")});
                    workingData.pendingMarriages.splice(i, 1);
                }
                // Outgoing proposals for author
                if(x.proposer === author.id)
                {
                    author.send("[" + time.toString().substr(0,24) + "] " + "You rescinded your proposal to " + 
                        x.target.username + "#" + x.target.discriminator)
                            .catch(() => {console.log("Couldn't message this user.")});
                    workingData.pendingMarriages.splice(i, 1);
                }
            });
        }
        else
        {
            logEvent(authorTag + " rejected a proposal.");

            // Send the alerts and DMs
            author.send("You rejected " + givenProposer.username + "#" + givenProposer.discriminator + 
                "'s proposal.");
            givenProposer.send("[" + time.toString().substr(0,24) + "] " + author.username + 
                "#" + author.discriminator + " rejected your proposal.").catch(() => {console.log("Couldn't message this user.")});

            msg.channel.send("[" + time.toString().substr(0,24) + "] " + author.username + "#" + author.discriminator + " has rejected " +
                             givenProposer.username + "#" + givenProposer.discriminator + "'s marriage proposal.")
                                .catch(() => {console.log("Couldn't message this user.")});
        }
    }

    // Divorce
    else if(command === "divorce")
    {
        var workingData = data;
        var divorcer = msg.author;
        var givenDivorcee;
        var marriageToDivorce;
        var indexOfMarriageToRemove;

        // If user provided no argument
        if(typeof args[0] === "undefined")
        {
            logEvent(authorTag + " tried to divorce but provided no target.");
            msg.channel.send("Mention a user after the command.");
            return;
        }

        givenDivorcee = msg.mentions.users.first();
        // Is divorcee a valid user?
        if(typeof givenDivorcee === "undefined")
        {
            logEvent(authorTag + " tried to divorce but provided an invalid target.");
            msg.channel.send("Invalid argument.");
            return;
        }

        // You cannot divorce yourself!
        if(givenDivorcee.id === divorcer.id)
        {
            logEvent(authorTag + " tried to divorce but provided themselves as a target.");
            msg.channel.send("You cannot divorce yourself.");
            return;
        }

        marriageToDivorce = workingData.marriages.find(marriage => 
            (marriage.proposer === givenDivorcee.id && marriage.target === divorcer.id) || 
            (marriage.target === givenDivorcee.id && marriage.proposer === divorcer.id)
        );
        // Checks if divorcer is married to divorcee
        if(typeof marriageToDivorce === "undefined")
        {
            logEvent(authorTag + " tried to divorce but were not married to target.");
            msg.channel.send("You cannot this person because you are not married to them.");
            return;
        }

        // Find the marriage and remove it
        indexOfMarriageToRemove = workingData.marriages.findIndex(x => x.proposer === marriageToDivorce.proposer);
        workingData.marriages.splice(indexOfMarriageToRemove, 1);

        // Add a few more properties to the divorced marriage object and push it
        marriageToDivorce.endDate = time.toDateString().substring(4);
        marriageToDivorce.endUnixTime = time.getTime();
        workingData.divorcedMarriages.push(marriageToDivorce);
        workingData.divorcedMarriages.push(marriageToDivorce);

        writeData(workingData);

        logEvent(authorTag + " divorced.");

        msg.channel.send(msg.author.username + "#" + msg.author.discriminator + " has divorced " + 
            givenDivorcee.username + "#" + givenDivorcee.discriminator + "." + " They were married since " + 
            marriageToDivorce.date);

        divorcer.send("[" + time.toString().substr(0,24) + "] " + "You divorced " + 
            givenDivorcee.username + "#" + givenDivorcee.discriminator + ".")
            .catch(() => {console.log("Couldn't message this user.")});

        givenDivorcee.send("[" + time.toString().substr(0,24) + "] " + 
            divorcer.username + "#" + divorcer.discriminator + " divorced you.")
            .catch(() => {console.log("Couldn't message this user.")});
    }
});