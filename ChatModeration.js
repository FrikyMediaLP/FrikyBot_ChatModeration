const CONSTANTS = require('./../../Util/CONSTANTS.js');
const CONFIGHANDLER = require('./../../Util/ConfigHandler.js');
const TWITCHIRC = require('./../../Modules/TwitchIRC.js');

const BTTV = require('./../../3rdParty/BTTV.js');
const FFZ = require('./../../3rdParty/FFZ.js');

const express = require('express');
const fs = require('fs');
const PATH = require('path');
const Datastore = require('nedb');

let COMMANDHANDLER;

const PACKAGE_DETAILS = {
    name: "ChatModeration",
    description: "Chat Moderation Filters checking Chat Messages for Spam, Caps, Bad Words etc.",
    picture: "/images/icons/user-secret-solid.svg"
};

const PUNISHMENT = {
    WARNING: 0,
    DELETE: 1,
    TIMEOUT: 2,
    BAN: 1000
};

class ChatModeration extends require('./../../Util/PackageBase.js').PackageBase {
    constructor(webappinteractor, twitchirc, twitchapi, logger) {
        super(PACKAGE_DETAILS, webappinteractor, twitchirc, twitchapi, logger);
        
        this.Config.AddSettingTemplates([
            { name: 'debug', type: 'boolean', default: false },
            { name: 'Log_Dir', type: 'string', default: 'Logs/' + PACKAGE_DETAILS.name + '/' },
            { name: 'Data_Dir', type: 'string', default: this.getMainPackageRoot() + PACKAGE_DETAILS.name + '/data/' },
            { name: 'disable_Chat_Commands', type: 'boolean', default: false },
            { name: 'skip_vips', type: 'boolean', default: false },
            { name: 'skip_subs', type: 'boolean', default: false },
            { name: 'max_sub_months', type: 'number', default: 0, min: 0 },
            { name: '/me_restriction', type: 'string', default: 'all', selection: ['all', 'vips', 'subs', 'none'], title: 'Allow /me Action' },
            { name: '/me_punishment', type: 'number', default: 1, min: PUNISHMENT.WARNING, max: PUNISHMENT.BAN },
            { name: '/me_message', type: 'string', default: "{user} - using /me is not allowed!", info: 'Chat Feedback Message, use {user} to @ the Event-User.' },
            { name: 'allow_event_reduce', type: 'boolean', default: false },
            { name: 'event_reduce_time', type: 'number', default: 300, min: 0, unit: 's' }
        ]);
        this.Config.Load();
        this.Config.FillConfig();

        this.RESTRICTED_HTML_HOSTING = 'moderator';
    }

    async Init(startparameters) {
        if (!this.isEnabled()) return Promise.resolve();
        let cfg = this.Config.GetConfig();

        //Setup File Structure
        const files = [cfg['Data_Dir']];
        for (let file of files) {
            try {
                if (!fs.existsSync(PATH.resolve(file))) {
                    fs.mkdirSync(PATH.resolve(file));
                }
            } catch (err) {
                this.Logger.error(err.message);
            }
        }

        //Static Information
        this.LATEST_STREAM_DATA = null;
        this.next_stream_check = 0;

        //Permitted
        this.Permitted = {};

        //Setup Filter
        this.Filters = [
            new WordFilter(this, this.TwitchIRC, this.TwitchAPI, this.Logger),
            new LinkFilter(this, this.TwitchIRC, this.TwitchAPI, this.Logger),
            new SpamFilter(this, this.TwitchIRC, this.TwitchAPI, this.Logger)
        ];
        

        //User History
        this.USER_HISTORY = new Datastore({ filename: PATH.resolve(cfg.Data_Dir + 'users.db'), autoload: true });

        //Logs
        this.PUNISHMENT_LOG = new Datastore({ filename: PATH.resolve(cfg.Log_Dir + 'API_Logs.db'), autoload: true });
        this.addLog('Punishment Issues', this.PUNISHMENT_LOG);
        
        //Twitch Chat Listener
        this.TwitchIRC.on('action', (channel, userstate, message, self) => this.ActionEventHandler(channel, userstate, message, self));
        this.TwitchIRC.on('chat', (channel, userstate, message, self) => this.MessageEventHandler(channel, userstate, message, self));
        this.TwitchIRC.on('hosted', (channel, username, viewers, autohost, userstate) => this.Channel_Event_Reduce_Filter({
            from_broadcaster_user_id: userstate['user-id'],
            from_broadcaster_user_login: userstate['login'] || username,
            from_broadcaster_user_name: userstate['display-name'] || username,
            viewers,
            autohost
        }));
        this.TwitchIRC.on('raided', (channel, username, viewers, userstate) => this.Channel_Event_Reduce_Filter({
            from_broadcaster_user_id: userstate['user-id'],
            from_broadcaster_user_login: userstate['login'],
            from_broadcaster_user_name: userstate['display-name'],
            viewers: viewers
        }));

        //WebHooks
        this.TwitchAPI.AddEventSubCallback('channel.raid', this.getName(), (body) => this.Channel_Event_Reduce_Filter(body));
    
        //API ENDPOINTS
        let Filter_Settings_Router = express.Router();
        Filter_Settings_Router.route('/filters/settings')
            .get(async (req, res) => {
                let data = {
                    Filters: {}, TTV_Automod: {}, TTV_BannedUsers: []
                };

                let broadcaster_id = null;

                //Get Broadcaster/Moderator ID
                try {
                    broadcaster_id = (await this.TwitchAPI.getUserTokenStatus()).sub;
                } catch (err) {

                }

                //AutoMod
                try {
                    data['TTV_Automod'] = (await this.TwitchAPI.GetAutoModSettings({ broadcaster_id, moderator_id: broadcaster_id })).data[0];
                } catch (err) {
                    data['TTV_Automod'] = err.message;
                }

                //Ban List
                try {
                    data['TTV_BannedUsers'] = await this.TwitchAPI.GetBannedUsers({ broadcaster_id });
                } catch (err) {
                    data['TTV_BannedUsers'] = err.message;
                }

                //User History
                try {
                    data['User_History'] = await this.AccessNeDB(this.USER_HISTORY, {}, this.GetPaginationString(10, 0));
                } catch (err) {

                }

                //Filter Settings
                for (let filter of this.Filters) {
                    try {
                        data.Filters[filter.GetName()] = {
                            cfg: filter.Config.GetConfig(),
                            template: filter.Config.GetTemplate(true, true),
                            custom_data: await filter.GetCustomData(req.query['quick_mode'] == "true", broadcaster_id),
                            enabled: filter.isEnabled(),
                            ready: filter.isReady()
                        };
                    } catch (err) {

                    }
                }

                res.json(data);
                return Promise.resolve();
            });
        Filter_Settings_Router.route('/ttv/bans')
            .delete(async (req, res) => {
                let user_id = req.body['user_id'];
                let user_name = req.body['user_name'];

                let broadcaster_id = null;

                //Get Broadcaster/Moderator ID
                try {
                    broadcaster_id = (await this.TwitchAPI.getUserTokenStatus()).sub;
                } catch (err) {

                }

                //API UNBAN
                try {
                    await this.TwitchAPI.UnbanUser({ broadcaster_id, moderator_id: broadcaster_id, user_id });
                    res.sendStatus(200);
                    return Promise.resolve();
                } catch (err) {
                    console.log(err);
                }

                //IRC UNBAN
                try {
                    await this.TwitchIRC.unban(user_name);
                    res.sendStatus(200);
                    return Promise.resolve();
                } catch (err) {

                }

                res.sendStatus(500);
                return Promise.resolve();
            });
        Filter_Settings_Router.route('/history')
            .put(async (req, res) => {
                let user_id = req.body['user_id'];
                let stream_id = req.body['stream_id'];
                
                try {
                    await this.revokeLastUserPunishment(user_id, stream_id);
                    res.sendStatus(200);
                    return Promise.resolve();
                } catch (err) {

                }

                res.sendStatus(500);
                return Promise.resolve();
            })
            .delete(async (req, res) => {
                let user_id = req.body['user_id'];
                let stream_id = req.body['stream_id'];
                
                try {
                    await this.resetUserPunishment(user_id, stream_id);
                    res.sendStatus(200);
                    return Promise.resolve();
                } catch (err) {

                }

                res.sendStatus(500);
                return Promise.resolve();
            });
        this.setAuthenticatedAPIRouter(Filter_Settings_Router, { user_level: 'moderator' });
        
        //STATIC FILE ROUTE
        this.useDefaultFileRouter();
        
        //HTML
        this.setWebNavigation({
            name: "Chat Moderation",
            href: this.getHTMLROOT(),
            icon: PACKAGE_DETAILS.picture
        }, "Main", "moderator");

        //PACKAGE INTERCONNECT - Adding Commands
        this.ChatCommands = [];
        if (cfg.disable_Chat_Commands === false) {
            try {
                COMMANDHANDLER = require('./../CommandHandler/CommandHandler.js');

                //Command List
                this.ChatCommands = [
                    new COMMANDHANDLER.HCCommand("!ChatModeration", (userMessageObj, parameters) => this.Chat_Command_ChatModeration(userMessageObj, parameters),
                        { description: '<p>Enable/Disable/Change Chat Moderation Filters using the Twitch Chat.</p><h3>Syntax:</h3><b>!ChatModeration</b><p>Returns the current</p><b>!ChatModeration disable</b><p>Moderator Only: Disable Chat Moderation Package</p><b>!ChatModeration filter [Filter Name]</b><p>Returns the given Filter Status.</p><b>!ChatModeration filter [Filter Name] (enable/disable)</b><p>Moderator Only: Enables/Disables the given Filter.</p>' }),
                    new COMMANDHANDLER.HCCommand("!permit", (userMessageObj, parameters) => this.Chat_Command_permit(userMessageObj, parameters),
                        { description: '<p>Permits a User to post any Message otherwise restricted by the FrikyBot ChatModeration Filters! <b>(this doesn´t stop AutoMod or other Twitch Intern Settings)</b></p><h3>Syntax:</h3><b>!permit <span>username</span></b>' })
                ];

                //PACKAGE INTERCONNECT
                this.addPackageInterconnectRequest("CommandHandler", (CommandHandlerObj) => {
                    let cmd_cfg = CommandHandlerObj.GetConfig();
                    for (let cmd of this.ChatCommands) {
                        cmd.setEnable(!cmd_cfg['disabled_hccommands'].find(elt => elt === cmd.getName()) !== undefined);
                        CommandHandlerObj.addHardcodedCommands(cmd.getName(), cmd);
                    }
                }, "Add Chat Commands to setup Chat Moderation Features.");
            } catch (err) {
                if (err.message.startsWith('Cannot find module')) this.Logger.warn("Command Handler not Found! ChatModeration Commands not available!");
                else this.Logger.error(err.message);
            }
        }

        this.SETUP_COMPLETE = true;

        //Init Filters
        let filter_api_router = express.Router();
        for (let filter of this.Filters) {
            
            filter_api_router.route('/' + filter.GetName().split(' ').join("") + '/settings')
                .get(async (req, res) => {
                    let data = {};

                    try {
                        data = {
                            cfg: filter.Config.GetConfig(),
                            template: filter.Config.GetTemplate(true, true),
                            custom_data: await filter.GetCustomData(),
                            enabled: filter.isEnabled(),
                            ready: filter.isReady()
                        };
                    } catch (err) {

                    }

                    res.json(data);
                    return Promise.resolve();
                })
                .put(async (req, res) => {
                    const filter_setting = req.body['setting'];
                    const setting_value = req.body['value'];

                    if (filter_setting === undefined || setting_value === undefined) {
                        res.sendStatus(400);
                        return Promise.resolve();
                    }

                    //Master
                    if (filter_setting.indexOf('.') === -1) {
                        let err = filter.Config.UpdateSetting(filter_setting, setting_value);
                        if (err !== true) {
                            res.json({ err: err });
                            return Promise.resolve();
                        }
                    } else {
                        let child = filter.Config.GetChildConfig(filter_setting.split('.')[0]);

                        if (!child) {
                            res.json({ err: 'Child-Config not found!' });
                            return Promise.resolve();
                        }

                        let err = child.UpdateSetting(filter_setting.split('.').pop(), setting_value);
                        if (err !== true) {
                            res.json({ err: err });
                            return Promise.resolve();
                        }
                    }

                    res.sendStatus(200);
                    return Promise.resolve();
                });

            try {
                await filter.Init(filter_api_router.route('/' + filter.GetName().split(' ').join("")));
            } catch (err) {
                this.Logger.error(err.message);
            }
        }
        this.setAuthenticatedAPIRouter(filter_api_router, { user_level: 'moderator' });

        try {
            await this.CheckLiveStatus();
        } catch (err) {

        }

        return Promise.resolve();
    }
    async reload() {
        if (!this.isEnabled()) return Promise.reject(new Error("Package is disabled!"));
        
        try {
            for (let filter of this.Filters) {
                this.Logger.info("Reloading " + filter.GetName() + " ...");
                await filter.reload();
            }
        } catch (err) {
            this.Logger.error(err.message);
        }

        try {
            await this.CheckLiveStatus();
        } catch (err) {

        }

        if (this.LATEST_STREAM_DATA) this.Logger.warn("Stream is Live! Chat Moderation Active!");
        
        this.Logger.info("ChatModeration (Re)Loaded!");
        return Promise.resolve();
    }

    async enable() {
        if (this.isEnabled()) return Promise.resolve();

        this.setEnable(true);
        if (this.isEnabled() !== true) return Promise.reject(new Error('enable failed'));

        for (let cmd of this.ChatCommands) cmd.setEnable(true);

        this.Logger.warn("Package enabled!");
        return Promise.resolve();
    }
    async disable() {
        if (!this.isEnabled()) return Promise.resolve();

        this.setEnable(false);
        if (this.isEnabled() !== false) return Promise.reject(new Error('disable failed'));

        for (let cmd of this.ChatCommands) cmd.setEnable(false);

        this.Logger.warn("Package disabled!");
        return Promise.resolve();
    }

    async CheckLiveStatus(channel) {
        try {
            let response = await this.TwitchAPI.GetStreams({ user_login: channel || this.TwitchIRC.getChannel(true) });
            if (response.data.length > 0) this.LATEST_STREAM_DATA = response.data[0];
            else this.LATEST_STREAM_DATA = null;
        } catch (err) {
            this.LATEST_STREAM_DATA = null;
            return Promise.reject(err);
        }

        this.next_stream_check = Date.now() + 5*60*1000;        //Check every 5 min at max
        return Promise.resolve();
    }

    async ActionEventHandler(channel, userstate, message, self) {
        if (self) return Promise.resolve();
        let cfg = this.GetConfig();
        if (cfg['/me_restriction'] === 'all') return Promise.resolve();

        let msgObj = new TWITCHIRC.Message(channel, userstate, message);

        if (cfg['/me_restriction'] === 'vips' && msgObj.matchUserlevel(CONSTANTS.UserLevel.vip)) return Promise.resolve();
        let badge_info = msgObj.userstate['badge-info'] || {};
        if (cfg['/me_restriction'] === 'subs' && badge_info.subscriber > cfg.max_sub_months) return Promise.resolve();

        try {
            let issue = { msgObj, message: cfg['/me_message'], punishment: { min: cfg['/me_punishment'], increment: 0, max: cfg['/me_punishment'] }, reason: "Using /me", exact_reason: "/me " + message };
            await this.executePunishment(msgObj, issue);
        } catch (err) {
            this.Logger.error(err.message);
        }

        return Promise.resolve();
    }

    //Chat Moderation - Filters
    async MessageEventHandler(channel, userstate, message, self) {
        if (!this.isEnabled()) return Promise.resolve();

        //Dont Check Bot Messages
        if (self) return Promise.resolve();
        
        //SKIP PERMITTED
        this.updatePermitList();
        if (this.checkPermit[userstate.username]) return Promise.resolve();

        let cfg = this.Config.GetConfig();
        let msgObj = new TWITCHIRC.Message(channel, userstate, message);

        //Skip Moderators and up
        if (msgObj.matchUserlevel(CONSTANTS.UserLevel.moderator)) return Promise.resolve();
        //Skip VIPs
        if (cfg.skip_vips && msgObj.matchUserlevel(CONSTANTS.UserLevel.vip)) return Promise.resolve();
        //Skip Subs Over X Months
        let badge_info = msgObj.userstate['badge-info'] || {};
        if (cfg.skip_subs && badge_info.subscriber > cfg.max_sub_months) return Promise.resolve();
        
        //SKIP WHEN IN DEBUG
        if (cfg.debug !== true && this.next_stream_check < Date.now()) {
            //Skip when Streamer is Offline
            try {
                await this.CheckLiveStatus(channel);
                if (!this.LATEST_STREAM_DATA) return Promise.resolve();
            } catch (err) {
                this.Logger.error(err.message);
            }
        }

        //Check Filter
        for (let filter of this.Filters) {
            try {
                let issue = await filter.CheckMessage(msgObj, this.LATEST_STREAM_DATA);
                
                if (typeof issue == "object") {
                    await this.executePunishment(msgObj, issue);
                    return Promise.resolve();
                }
            } catch (err) {
                this.Logger.error(err.message);
            }
        }

        return Promise.resolve();
    }
    async executePunishment(msgObj, issue) {
        //Logs
        if (this.PUNISHMENT_LOG) {
            this.PUNISHMENT_LOG.insert({
                issue: issue,
                message_object: msgObj,
                time: Date.now()
            });
        }
        
        //Execute
        try {
            //Update User History Data
            let user = await this.pushUserPunishment(msgObj, issue);

            if (user.punishment_score <= PUNISHMENT.WARNING) {
                //WARNING
            } else if (user.punishment_score <= PUNISHMENT.DELETE) {
                //DELETE
                await this.TwitchIRC.deleteMessage(msgObj.getID());
            } else if (user.punishment_score <= PUNISHMENT.BAN) {
                //TIMEOUT
                //Calculate Length
                let timeout_length = Math.min(Math.floor(Math.pow(user.punishment_score, 2) * 2.5), 1209600);
                await this.TwitchIRC.timeout(msgObj.getUsername(), timeout_length, issue.reason);
            } else if (user.punishment_score == PUNISHMENT.BAN) {
                //BAN
                await this.TwitchIRC.ban(msgObj.getUsername(), issue.reason);
            }

            //Chat Response
            await this.sendResponse(issue.message, msgObj);
        } catch (err) {
            return Promise.reject(err);
        }
    }
    async sendResponse(codedString, msgObj) {
        while (codedString.indexOf("{user}") >= 0) {
            codedString = codedString.substring(0, codedString.indexOf("{user}")) + msgObj.getDisplayName() + codedString.substring(codedString.indexOf("{user}") + 6);
        }
        return this.TwitchIRC.say(codedString);
    }

    updatePermitList() {
        for (let user in this.Permitted) {
            if (this.Permitted[user] < Date.now()) delete this.Permitted[user];
        }
    }
    checkPermit(username) {
        return this.Permitted[username] > Date.now();
    }
    permitUser(username) {
        this.Permitted[username] = Date.now() + (1000 * 60);
    }

    async pushUserPunishment(msgObj, issue) {
        if (!msgObj.getUserID()) return Promise.reject(new Error("User_id not found"));
        let user = null;

        //Find User History
        if (!user) {
            try {
                let users = await this.AccessNeDB(this.USER_HISTORY, { user_id: msgObj.getUserID(), stream_id: this.getCurrentStreamID() });
                user = users[0];
            } catch (err) {

            }
        }

        //Create User History
        let first = false;
        if (!user) {
            first = true;
            user = {
                user_id: msgObj.getUserID(),
                user_name: msgObj.getUsername(),
                stream_id: this.getCurrentStreamID(),
                punishment_score: 0,
                issues: []
            };
        }

        //Calculate Punishment Score
        let punishment_score = user.punishment_score;
        if (!first) punishment_score += issue.punishment.increment;                         //increment
        punishment_score = Math.max(issue.punishment.min, punishment_score);                //minimum of 0 -> max of  0 and 0+
        punishment_score = Math.min(issue.punishment.max, punishment_score, 1000);          //maximum of 1000 -> min of 1000 and 1000+

        //Update User History Data
        user.punishment_score = punishment_score;
        issue.punishment = punishment_score;
        user.issues.push(issue);

        try {
            //Save Updated User History
            this.USER_HISTORY.update({ user_id: msgObj.getUserID(), stream_id: this.getCurrentStreamID() }, user, { upsert: true }, function (err, numReplaced, upsert) {
                if (err) this.Logger.warn("User Hisory Update Error: " + err);
            });
        } catch (err) {
            return Promise.reject(err);
        }

        return Promise.resolve(user);
    }
    async resetUserPunishment(user_id, stream_id = this.getCurrentStreamID()) {
        return new Promise(async (resolve, reject) => {
            let username = null;

            //Find Username
            try {
                let data = await this.AccessNeDB(this.USER_HISTORY, { user_id, stream_id });
                username = data[0].user_name;
            } catch (err) {

            }
            
            this.USER_HISTORY.remove({ user_id, stream_id: this.getCurrentStreamID() }, {}, async (err, n) => {
                if (err) return reject(new Error("Reset failed!"));

                //Reset Timeout / Ban
                try {
                    await this.TwitchIRC.unban(username);
                    await this.TwitchIRC.timeout(username, 1);
                } catch (err) {
                    if(err.message !== 'bad_unban_no_ban') console.log(err);
                }

                return resolve();
            });
        });
    }
    async revokeLastUserPunishment(user_id, stream_id = this.getCurrentStreamID()) {
        let user = null;

        try {
            user = (await this.AccessNeDB(this.USER_HISTORY, { user_id, stream_id }))[0];
        } catch (err) {

        }

        if (!user) return Promise.resolve();
        
        user.issues.pop();
        if (user.issues.length === 0) return this.resetUserPunishment(user_id, stream_id);
        
        let new_score = 0;
        for (let issue of user.issues) {
            new_score += issue.punishment;
        }
        user.punishment_score = Math.max(new_score, PUNISHMENT.BAN);
        
        return new Promise((resolve, reject) => {
            this.USER_HISTORY.update({ _id: user['_id'] }, user, {}, async (err, n) => {
                if (err) return reject(new Error("Revoke failed"));

                //Reset Timeout / Ban
                try {
                    await this.TwitchIRC.unban(user.user_name);
                    await this.TwitchIRC.timeout(user.user_name, 1);
                } catch (err) {
                    if (err.message !== 'bad_unban_no_ban') console.log(err);
                }

                return resolve();
            });
        });
    }

    getCurrentStreamID() {
        let cfg = this.Config.GetConfig();

        if (cfg['debug'] === true) return "1234567890";

        return this.LATEST_STREAM_DATA ? this.LATEST_STREAM_DATA.id : null;
    }

    //Commands
    async Chat_Command_ChatModeration(userMessageObj, parameters) {
        if (!this.isEnabled()) return Promise.reject(new Error("Package Disabled!"));
        
        //Get ChatModeration Status
        if (parameters.length == 1) {
            try {
                let output = "";

                if (this.isEnabled()) {
                    output = "Current Chat Moderation Filters: ";

                    for (let filter of this.Filters) {
                        if (filter.isEnabled())
                            output += filter.GetName() + ", "
                    }

                    if (output == "Current Chat Moderation Filters: ")
                        output += "NONE";
                    else
                        output = output.substring(0, output.lastIndexOf(","));
                } else {
                    output = "Chat Moderation is currently disabled!";
                }
                
                await this.TwitchIRC.say(output);
                return Promise.resolve();
            } catch (err) {
                console.log(err);
            }
        }
        
        //Chat Moderation Settings - Mod Status needed
        if (parameters.length == 2 && userMessageObj.matchUserlevel(CONSTANTS.UserLevel.moderator)) {
            //Settings
            if (parameters[1].toLowerCase() == "disable") {
                try {
                    await this.disable();
                    await this.TwitchIRC.say("Chat Moderation is now DISABLED!");
                    return Promise.resolve();
                } catch (err) {
                    console.log(err);
                }
            }
        }

        //Chat Moderation Filter
        if (parameters.length >= 3 && parameters[1].toLowerCase() == "filter") {
            let filter_name = parameters[2].substring(1);
            let name_end_at = 2;

            for (let i = 3; i < parameters.length; i++) {
                console.log(parameters[i]);
                filter_name += " " + parameters[i];
                name_end_at++;
                if (parameters[i].indexOf('"') >= 0) break;
            }
            filter_name = filter_name.substring(0, filter_name.indexOf('"'));

            let filter = this.Filters.find(elt => elt.GetName().toLowerCase() == filter_name.toLowerCase());
            if (!filter) {
                try {
                    await this.TwitchIRC.say("Filter '" + filter_name + "' not found!");
                } catch (err) {
                    console.log(err);
                }
                return Promise.resolve();
            }
            
            //Print Status
            if (parameters.length == name_end_at + 1) {
                this.TwitchIRC.saySync("Chat Moderation Filter '" + filter.GetName() + "' is currently " + (filter.isEnabled() ? "ENABLED" : "DISABLED") + "!");
                return Promise.resolve();
            }

            //Settings need Mod Status
            if (!userMessageObj.matchUserlevel(CONSTANTS.UserLevel.moderator)) {
                return Promise.resolve();
            }

            //Settings
            if (parameters[name_end_at + 1].toLowerCase() == "enable") {
                try {
                    await filter.enable();
                    await this.TwitchIRC.say("Filter '" + filter.GetName() + "' is now ENABLED!");
                    return Promise.resolve();
                } catch (err) {
                    console.log(err);
                }
            } else if (parameters[name_end_at + 1].toLowerCase() == "disable") {
                try {
                    await filter.disable();
                    await this.TwitchIRC.say("Filter '" + filter.GetName() + "' is now DISABLED!");
                    return Promise.resolve();
                } catch (err) {
                    console.log(err);
                }
            }
        }

        //Chat Moderation User
        if (parameters.length >= 3 && parameters[1].toLowerCase() == "user" && userMessageObj.matchUserlevel(CONSTANTS.UserLevel.moderator)) {
            try {
                let users = await this.AccessNeDB(this.USER_HISTORY, { user_name: parameters[2], stream_id: this.getCurrentStreamID() });

                if (users.length === 0) {
                    this.TwitchIRC.saySync(parameters[2] + " had no Issues this Stream!");
                    return Promise.resolve();
                }

                //Print User
                if (parameters.length === 3) {
                    this.TwitchIRC.saySync(parameters[2] + "'s current Punishment-Score ist: " + users[0].punishment_score + '. With ' + users[0].issues.length + ' Issues this Stream!');
                    return Promise.resolve();
                }

                //Change User History
                let action = parameters[3];

                if (action === 'revoke') {
                    try {
                        await this.revokeLastUserPunishment(users[0].user_id);
                        this.TwitchIRC.saySync("Reset Punishments of " + parameters[2] + "!");
                    } catch (err) {
                        this.TwitchIRC.saySync('Revoke failed!');
                    }
                } else if (action === 'reset') {
                    try {
                        await this.resetUserPunishment(users[0].user_id);
                        this.TwitchIRC.saySync("Revoked last Punishment of " + parameters[2] + "!");
                    } catch (err) {
                        this.TwitchIRC.saySync('Reset failed!');
                    }
                }
            } catch (err) {
                return Promise.reject(err);
            }
        }
        
        return Promise.resolve();
    }
    async Chat_Command_permit(userMessageObj, parameters) {
        if (!this.isEnabled()) return Promise.reject(new Error("Package Disabled!"));

        if (parameters.length > 1 && userMessageObj.matchUserlevel(CONSTANTS.UserLevel.moderator)) {
            try {
                this.permitUser(parameters[1].toLowerCase());
                await this.TwitchIRC.say("Permitted: " + parameters[1] + "! No Filters will be applied for the next 60seconds!");
            } catch (err) {
                console.log(err);
            }
        }
        return Promise.resolve();
    }

    //Channel Events
    async Channel_Event_Reduce_Filter(event) {
        let cfg = this.Config.GetConfig();
        if (cfg['allow_event_reduce'] == false) return Promise.resolve();

        for (let filter of this.Filters) filter.disable();

        setTimeout(() => {
            for(let filter of this.Filters) filter.enable()
        }, cfg['event_reduce_time'] * 1000);
    }
}

class Filter {
    constructor(name, ChatModeration, TwitchIRC, TwitchAPI, Logger) {
        this.name = name;
        this.ChatModeration = ChatModeration;

        //Config
        this.Config = new CONFIGHANDLER.Config(this.GetName(), [], { preloaded: ChatModeration.Config.GetConfig()[name] });
        this.Config.AddSettingTemplates([
            { name: 'enabled', type: 'boolean', requiered: true, default: true, title: 'Enable Filter' },
            { name: 'File_Dir', type: 'string', default: ChatModeration.GetConfig()['Data_Dir'] + this.GetName() + '/', html_skip: true },
            { name: 'skip_vips', type: 'boolean', default: false, title: 'Skip Vips' },
            { name: 'skip_subs', type: 'boolean', default: false, title: 'Skip Subs' },
            { name: 'max_sub_months', type: 'number', default: 0, min: 0, title: 'Max. Sub Months before skipped' },
            { name: 'min_punishment', type: 'number', default: 0, min: PUNISHMENT.WARNING, max: PUNISHMENT.BAN, title: 'Minimum Punishment', info: 'You can also drag and drop the Min- or Maximum in the graphic below. Green is minimum.' },
            { name: 'max_punishment', type: 'number', default: PUNISHMENT.BAN, min: PUNISHMENT.WARNING, max: PUNISHMENT.BAN, title: 'Maximum Punishment', info: 'You can also drag and drop the Min- or Maximum in the graphic below. Red is maximum.' }
        ]);
        ChatModeration.Config.AddChildConfig(this.Config);
        this.Config.Load();
        this.Config.FillConfig();
        
        this.TwitchIRC = TwitchIRC;
        this.TwitchAPI = TwitchAPI;
        this.Logger = Logger;
        
        //Ready
        this.READY_REQUIREMENTS = [];
        this.addReadyRequirement(() => {
            return this.Config.ErrorCheck() === true;
        });
    }

    async CheckMessage(msgObj, streamData) {
        return Promise.resolve();
    }
    async Init(api_route) {
        let cfg = this.Config.GetConfig();
        if (!fs.existsSync(PATH.resolve(cfg['File_Dir']))) {
            try {
                fs.mkdirSync(PATH.resolve(cfg['File_Dir']));
            } catch (err) {
                this.Logger.warn("Corrupted Installation: " + this.GetName() + " Filter Folder couldnt be created!");
                this.disable();
            }
        }

        return this.reload();
    }
    async reload() {
        return Promise.resolve();
    }
    
    GetName() {
        return this.name;
    }
    async GetCustomData(quick_mode = false, broadcaster_id) {
        return Promise.resolve({});
    }

    enable() {
        this.setEnabled(true);
    }
    disable() {
        this.setEnabled(false);
    }
    setEnabled(state) {
        return this.Config.UpdateSetting('enabled', state === true);
    }
    isEnabled() {
        return this.Config.GetConfig()['enabled'] !== false;
    }
    
    async CheckOneDBSearch(db, querry) {
        return new Promise((resolve, reject) => {
            db.find(querry, (err, docs) => {
                if (err) {
                    reject(err);
                } else {
                    for (let doc of docs) delete doc['_id'];
                    resolve(docs);
                }
            });
        });
    }

    //Ready/Status
    addReadyRequirement(func) {
        if (func instanceof Function) this.READY_REQUIREMENTS.push(func);
    }
    removeReadyRequirement(index) {
        this.READY_REQUIREMENTS.splice(index, 1);
    }
    isReady() {
        for (let func of this.READY_REQUIREMENTS) {
            if (func instanceof Function && func() === false) return false;
        }

        return true;
    }
}

//Word Filter
class WordFilter extends Filter {
    constructor(ChatModeration, TwitchIRC, TwitchAPI, Logger) {
        super("Word Filter", ChatModeration, TwitchIRC, TwitchAPI, Logger);

        //Config
        this.Config.AddSettingTemplates([
            { name: 'Blacklist_File', type: 'string', default: "Blacklist", html_skip: true },
            { name: 'Whitelist_File', type: 'string', default: "Whitelist", html_skip: true },
            { name: 'message', type: 'string', default: "{user} - a word u used is on the Blacklist!", info: 'Chat Feedback Message, use {user} to @ the Event-User.' }
        ]);
        this.Config.Load();
        this.Config.FillConfig();
        
        //Ready
        this.addReadyRequirement(() => {
            let cfg = this.Config.GetConfig();
            
            if (!fs.existsSync(PATH.resolve(cfg['File_Dir']))) {
                try {
                    fs.mkdirSync(PATH.resolve(cfg['File_Dir']));
                } catch (err) {
                    this.Logger.error("Corrupted Installation: Word Filter Folder couldnt be created!");
                    return false;
                }
            }

            if (!this.Blacklist) return false;
            if (!this.Whitelist) return false;
            
            return true;
        });
    }

    //SETUP
    async Init(api_route) {
        let cfg = this.Config.GetConfig();

        if (!fs.existsSync(PATH.resolve(cfg['File_Dir']))) {
            try {
                fs.mkdirSync(PATH.resolve(cfg['File_Dir']));
            } catch (err) {
                this.Logger.warn("Corrupted Installation: Word Filter Folder couldnt be created!");
                this.disable();
            }
        }

        //API
        api_route
            .post(async (req, res) => {
                let target = req.body['target'];            //whitelist/blacklist
                
                try {
                    let response = null;

                    if (target === 'blacklist') {
                        response = await this.addBlacklistWord(req.body, (res.locals.user || {}).preferred_username);
                    } else if ( target === 'whitelist') {
                        response = await this.addWhitelistWord(req.body, (res.locals.user || {}).preferred_username);
                    } else {
                        res.sendStatus(400);
                        return Promise.resolve();
                    }
                    
                    res.json(response);
                } catch (err) {
                    res.json({ err: err.message });
                }

                return Promise.resolve();
            })
            .delete(async (req, res) => {
                try {
                    let action = req.body['action'];    //remove/clear
                    let target = req.body['target'];    //whitelist/blacklist

                    if (action === 'remove' && target === 'blacklist') {
                        await this.removeBlacklistWord(req.body['word'], (res.locals.user || {}).preferred_username);
                    } else if (action === 'remove' && target === 'whitelist') {
                        await this.removeWhitelistWord(req.body['word'], (res.locals.user || {}).preferred_username);
                    } else if (action === 'clear' && target === 'blacklist') {
                        await this.clearBlacklist((res.locals.user || {}).preferred_username);
                    } else if (action === 'clear' && target === 'whitelist') {
                        await this.clearWhitelist((res.locals.user || {}).preferred_username);
                    } else {
                        res.sendStatus(400);
                        return Promise.resolve();
                    }

                    res.sendStatus(200);
                } catch (err) {
                    res.json({ err: err.message });
                }

                return Promise.resolve();
            });

        return this.reload();
    }
    async reload() {
        if (!this.isEnabled()) return Promise.reject(new Error("Filter is disabled!"));
        let cfg = this.Config.GetConfig();

        if (!this.Blacklist)
            this.Blacklist = new Datastore({ filename: PATH.resolve(cfg['File_Dir'] + cfg['Blacklist_File'] + '.db'), autoload: true });

        if (!this.Whitelist)
            this.Whitelist = new Datastore({ filename: PATH.resolve(cfg['File_Dir'] + cfg['Whitelist_File'] + '.db'), autoload: true });
        
        return Promise.resolve();
    }
    
    async GetCustomData(quick_mode = false, broadcaster_id) {
        let custom_data = {
            Blacklist: [],
            Whitelist: [],
            TTV_Blacklist: []
        };

        try {
            custom_data['Blacklist'] = await this.CheckOneDBSearch(this.Blacklist, {});
            custom_data['Whitelist'] = await this.CheckOneDBSearch(this.Whitelist, {});
        } catch (err) {

        }

        if (quick_mode) return Promise.resolve(custom_data);

        try {
            custom_data['TTV_Blacklist'] = await this.TwitchAPI.GetBlockedTerms({ broadcaster_id, moderator_id: broadcaster_id });
        } catch (err) {
            custom_data['TTV_Blacklist'] = err.message;
        }

        return Promise.resolve(custom_data);
    }

    //Filter
    async CheckMessage(msgObj, streamData){
        if (!this.isEnabled() || !this.isReady()) return Promise.resolve();

        let blacklist = [];
        let whitelist = [];
        let cfg = this.Config.GetConfig();
        
        //Skip VIPs
        if (cfg.skip_vips && msgObj.matchUserlevel(CONSTANTS.UserLevel.vip)) return Promise.resolve();
        //Skip Subs Over X Months
        let badge_info = msgObj.userstate['badge-info'] || {};
        if (cfg.skip_subs && badge_info.subscriber > cfg.max_sub_months) return Promise.resolve();
        
        //Load Words
        try {
            blacklist = await this.CheckOneDBSearch(this.Blacklist, {});
        } catch (err) {

        }
        try {
            whitelist = await this.CheckOneDBSearch(this.Whitelist, {});
        } catch (err) {

        }

        //EXCLUDE EMOTES IF NOT ALLOWED / EMOTES ONLY / ONLY BTTV / FFZ EMOTES
        let words = msgObj.getMessage().split(" ");
        let TTV_emotes = {};
        let BTTV_emotes = {};
        let FFZ_emotes = {};

        try {
            words = (await msgObj.getMessageWithoutEmotes(false, false)).split(" ");
            TTV_emotes = await msgObj.getEmotes();
            BTTV_emotes = await msgObj.getEmotes(true, false, false);
            FFZ_emotes = await msgObj.getEmotes(false, true, false);
        } catch (err) {

        }

        //Is Blacklisted?
        try {
            for (let bl_word of blacklist) {
                let issue_found = false;

                //Check remaining Words
                if (!bl_word.emote_only) {
                    for (let word of words) {
                        if (word === '') continue;
                        
                        let violation = this.Word_matches_query(word, bl_word);

                        if (!violation) continue;
                        let wl_words = whitelist.filter(elt => word.toLowerCase().indexOf(elt.word.toLowerCase()) >= 0);

                        for (let wl_word of wl_words) {
                            if (wl_word.emote_only) continue;
                            let pardon = this.Word_matches_query(word, wl_word);
                            
                            if (pardon) {
                                violation = false;
                                break;
                            }
                        }

                        if (violation) {
                            issue_found = true;
                            break;
                        }
                    }
                }

                if (!issue_found && !bl_word.ignore_emotes) {
                    //Check TTV Emotes
                    for (let emote in TTV_emotes) {
                        let emote_start = parseInt(TTV_emotes[emote][0].split('-')[0]);
                        let emote_end = parseInt(TTV_emotes[emote][0].split('-')[1]);
                        let emote_name = msgObj.getMessage().substring(emote_start, emote_end + 1);

                        let violation = this.Word_matches_query(emote_name, bl_word);

                        if (!violation) continue;
                        let wl_words = whitelist.filter(elt => emote_name.toLowerCase().indexOf(elt.word.toLowerCase()) >= 0);

                        for (let wl_word of wl_words) {
                            if (wl_word.ignore_emotes) continue;
                            let pardon = this.Word_matches_query(emote_name, wl_word);
                            if (pardon) {
                                violation = false;
                                break;
                            }
                        }

                        if (violation) {
                            issue_found = true;
                            break;
                        }
                    }

                    //BTTV
                    if (bl_word.include_BTTV) {
                        for (let emote in BTTV_emotes) {
                            let emote_start = parseInt(BTTV_emotes[emote][0].split('-')[0]);
                            let emote_end = parseInt(BTTV_emotes[emote][0].split('-')[1]);
                            let emote_name = msgObj.getMessage().substring(emote_start, emote_end + 1);

                            let violation = this.Word_matches_query(emote_name, bl_word);

                            if (!violation) continue;
                            let wl_words = whitelist.filter(elt => emote_name.toLowerCase().indexOf(elt.word.toLowerCase()) >= 0);

                            for (let wl_word of wl_words) {
                                if (wl_word.ignore_emotes) continue;
                                if (!wl_word.include_BTTV) continue;
                                let pardon = this.Word_matches_query(emote_name, wl_word);
                                if (pardon) {
                                    violation = false;
                                    break;
                                }
                            }

                            if (violation) {
                                issue_found = true;
                                break;
                            }
                        }
                    }

                    //FFZ
                    if (bl_word.include_FFZ) {
                        for (let emote in FFZ_emotes) {
                            let emote_start = parseInt(FFZ_emotes[emote][0].split('-')[0]);
                            let emote_end = parseInt(FFZ_emotes[emote][0].split('-')[1]);
                            let emote_name = msgObj.getMessage().substring(emote_start, emote_end + 1);

                            let violation = this.Word_matches_query(emote_name, bl_word);

                            if (!violation) continue;
                            let wl_words = whitelist.filter(elt => emote_name.toLowerCase().indexOf(elt.word.toLowerCase()) >= 0);
                            
                            for (let wl_word of wl_words) {
                                if (wl_word.ignore_emotes) continue;
                                if (!wl_word.include_FFZ) continue;
                                let pardon = this.Word_matches_query(emote_name, wl_word);
                                
                                if (pardon) {
                                    violation = false;
                                    break;
                                }
                            }

                            if (violation) {
                                issue_found = true;
                                break;
                            }
                        }
                    }
                }

                //Violations found?
                if (issue_found) {
                    return Promise.resolve({ msgObj, message: cfg.message, punishment: { min: cfg['min_punishment'] || 0, increment: bl_word.weight, max: cfg['max_punishment'] || 1000 }, reason: "Used a word on the Blacklist", exact_reason: bl_word.word });
                }
            }
        } catch (err) {
            this.Logger.error(err.message);
        }

        return Promise.resolve();
    }
    Word_matches_query(word, query) {
        let query_copy = this.ChatModeration.cloneJSON(query);

        if (query_copy.casesensitive === false) {
            word = word.toLowerCase();
            query_copy.word = query_copy.word.toLowerCase();
        }
        if (query_copy.block_patterns === false && word.indexOf(query_copy.word) !== word.lastIndexOf(query_copy.word)) return true;
        if (query_copy.in_word_use === false && word.indexOf(query_copy.word) >= 0) return true;
        return false;
    }
    
    //Blacklist
    async addBlacklistWord(data, by = "Unknown", at = Date.now()) {
        let word = {
            word: '',
            casesensitive: true,
            in_word_use: true,
            block_patterns: true,
            ignore_emotes: true,
            emote_only: false,
            include_BTTV: false,
            include_FFZ: false,
            weight: 1,
            blocked_by: by,
            blocked_at: at
        };
        for (let key in word) if (data[key] !== undefined) word[key] = data[key];
        
        try {
            let words = await this.CheckOneDBSearch(this.Blacklist, { word: { $regex: new RegExp(word.word, "i") } });
            if (words.length > 0) return Promise.reject(new Error('Word allready on the Blacklist!'));
        } catch (err) {
            return Promise.reject(err);
        }

        return new Promise((resolve, reject) => {
            this.Blacklist.insert(word, function (err, newDocs) {
                if (err) return reject(new Error(err));
                else return resolve(newDocs);
            });
        });
    }
    async removeBlacklistWord(word) {
        return new Promise((resolve, reject) => {
            this.Blacklist.remove({ word: word }, {}, function (err, numRemoved) {
                if (err) return reject(new Error(err));
                else return resolve();
            });
        });
    }
    async clearBlacklist(by = "Unknown") {
        return new Promise((resolve, reject) => {
            this.Blacklist.remove({}, { multi: true }, function (err, numRemoved) {
                if (err) return reject(new Error(err));
                else return resolve();
            });
        });
    }

    //Whitelist
    async addWhitelistWord(data, by = "Unknown", at = Date.now()) {
        let word = {
            word: '',
            casesensitive: true,
            in_word_use: true,
            ignore_emotes: true,
            emote_only: false,
            include_BTTV: false,
            include_FFZ: false,
            allowed_by: by,
            allowed_at: at
        };
        for (let key in word) if (data[key] !== undefined) word[key] = data[key];

        try {
            let words = await this.CheckOneDBSearch(this.Whitelist, { word: { $regex: new RegExp(word.word, "i") } });
            if (words.length > 0) return Promise.reject(new Error('Word allready on the Whitelist!'));
        } catch (err) {
            return Promise.reject(err);
        }

        return new Promise((resolve, reject) => {
            this.Whitelist.insert(word, function (err, newDocs) {
                if (err) return reject(new Error(err));
                else return resolve(newDocs);
            });
        });
    }
    async removeWhitelistWord(word) {
        return new Promise((resolve, reject) => {
            this.Whitelist.remove({ word: word }, {}, function (err, numRemoved) {
                if (err) return reject(new Error(err));
                else return resolve();
            });
        });
    }
    async clearWhitelist(by = "Unknown") {
        return new Promise((resolve, reject) => {
            this.Whitelist.remove({}, { multi: true }, function (err, numRemoved) {
                if (err) return reject(new Error(err));
                else return resolve();
            });
        });
    }
}

//Link Filter
class LinkFilter extends Filter {
    constructor(ChatModeration, TwitchIRC, TwitchAPI, Logger) {
        super("Link Filter", ChatModeration, TwitchIRC, TwitchAPI, Logger);

        this.Config.EditSettingTemplate('skip_vips', { html_skip: true });
        this.Config.EditSettingTemplate('skip_subs', { html_skip: true });
        this.Config.EditSettingTemplate('max_sub_months', { html_skip: true });

        //Config
        this.Config.AddSettingTemplates([
            { name: 'regular_setting', type: 'string', default: 'none', selection: ['none', 'whitelist', 'blacklist', 'all'], title: 'Regular Setting' },
            { name: 'vip_setting', type: 'string', default: 'whitelist', selection: ['none', 'whitelist', 'blacklist', 'all'], title: 'VIPs Setting' },
            { name: 'sub_setting', type: 'string', default: 'whitelist', selection: ['none', 'whitelist', 'blacklist', 'all'], title: 'Subscriber Setting' },
            { name: 'min_sub_month', type: 'number', default: 0, title: "Minumum Sub Month", info: "The minimum Subscriber Month to be applied to the subscriber settings." },
            { name: 'whitelist_message', type: 'string', default: "{user} - This Link is not allowed!", title: 'Not on Whitelist Chat Feedback', info: 'Chat Feedback Message, use {user} to @ the Event-User.' },
            { name: 'blacklist_message', type: 'string', default: "{user} - This Link is not allowed!", title: 'On Blacklist Chat Feedback', info: 'Chat Feedback Message, use {user} to @ the Event-User.' },
            { name: 'all_message', type: 'string', default: "{user} - Links are NOT allowed!", title: 'All Block Chat Feedback', info: 'Chat Feedback Message, use {user} to @ the Event-User.' }
        ]);
        this.Config.Load();
        this.Config.FillConfig();

        //Ready
        this.addReadyRequirement(() => {
            let cfg = this.Config.GetConfig();

            if (!fs.existsSync(PATH.resolve(cfg['File_Dir']))) {
                try {
                    fs.mkdirSync(PATH.resolve(cfg['File_Dir']));
                } catch (err) {
                    this.Logger.error("Corrupted Installation: Word Filter Folder couldnt be created!");
                    return false;
                }
            }

            if (!this.Blacklist) return false;

            return true;
        });
    }

    //SETUP
    async Init(api_route) {
        let cfg = this.Config.GetConfig();

        if (!fs.existsSync(PATH.resolve(cfg['File_Dir']))) {
            try {
                fs.mkdirSync(PATH.resolve(cfg['File_Dir']));
            } catch (err) {
                this.Logger.warn("Corrupted Installation: Link Filter Folder couldnt be created!");
                this.disable();
            }
        }

        //API
        api_route
            .post(async (req, res) => {
                const target = req.body['target'];

                if (!req.body['type'] || !req.body['link']) {
                    res.json({ err: 'Invalid Type or Link!' });
                    return Promise.resolve();
                } 

                try {
                    if (target === 'blacklist') res.json(await this.addBlacklistLink(req.body['type'], req.body['link'], req.body['weight'], (res.locals.user || {}).preferred_username));
                    else if (target === 'whitelist') res.json(await this.addWhitelistLink(req.body['type'], req.body['link'], (res.locals.user || {}).preferred_username));
                    else res.json({ err: 'Invalid Target!' });
                } catch (err) {
                    res.json({ err: err.message });
                }
                
                return Promise.resolve();
            })
            .delete(async (req, res) => {
                const target = req.body['target'];
                const action = req.body['action'];
                
                if (action === 'single' && (!req.body['type'] || !req.body['link'])) {
                    res.json({ err: 'Invalid Type or Link!' });
                    return Promise.resolve();
                } 
                
                try {
                    if (target === 'blacklist' && action === 'clear') await this.clearBlacklist();
                    else if (target === 'blacklist' && action === 'single') await this.removeBlacklistLink(req.body['type'], req.body['link']);
                    else if (target === 'whitelist' && action === 'clear') await this.clearWhitelist();
                    else if (target === 'whitelist' && action === 'single') await this.removeWhitelistLink(req.body['type'], req.body['link']);
                    else {
                        res.json({ err: 'Invalid Target or Action!' });
                        return Promise.resolve();
                    } 
                    res.sendStatus(200);
                } catch (err) {
                    res.json({ err: err.message });
                }

                return Promise.resolve();
            });

        return this.reload();
    }
    async reload() {
        let cfg = this.Config.GetConfig();

        if (!this.Blacklist)
            this.Blacklist = new Datastore({ filename: PATH.resolve(cfg.File_Dir + 'Blacklist.db'), autoload: true  });
        
        if (!this.Whitelist)
            this.Whitelist = new Datastore({ filename: PATH.resolve(cfg.File_Dir + 'Whitelist.db'), autoload: true  });

        return Promise.resolve();
    }

    async GetCustomData(quick_mode = false, broadcaster_id) {
        let custom_data = {
            Blacklist: [],
            Whitelist: []
        };

        if (quick_mode) return Promise.resolve(custom_data);

        try {
            custom_data['Blacklist'] = await this.CheckOneDBSearch(this.Blacklist, {});
            custom_data['Whitelist'] = await this.CheckOneDBSearch(this.Whitelist, {});
        } catch (err) {

        }

        return Promise.resolve(custom_data);
    }

    //Filter
    async CheckMessage(msgObj, streamData) {
        if (!this.isEnabled()) return Promise.resolve();
        let cfg = this.Config.GetConfig();
        
        //What Level
        let level = cfg.regular_setting;
        if (msgObj.isVIP()) level = cfg.vip_setting;
        if (msgObj.isSubscriber(cfg.min_sub_month)) level = cfg.sub_setting;
        
        //Level: All
        if (level === 'all') return Promise.resolve();

        //Find all Links
        let LINKS = this.findLinks(msgObj.getMessage().toLowerCase());
        if (LINKS.length === 0) return Promise.resolve();
        
        //Level: Whitelist
        if (level === 'whitelist') {
            let Whitelist = [];

            try {
                Whitelist = await this.CheckOneDBSearch(this.Whitelist, {});
            } catch (err) {
                this.Logger.error(err.message);
            }
            
            for (let link of LINKS) {
                let found = Whitelist.find(elt => this.MatchLinkToListElement(link, elt));
                if (!found) return Promise.resolve({ msgObj, message: cfg.whitelist_message, punishment: { min: 1, increment: 0, max: 1 }, reason: "Link not on Whitelist!", exact_reason: link.url });
            }

            //Remaining Links are cool
            return Promise.resolve();
        }

        //Block only Blacklisted Links
        if (level === 'blacklist') {
            let Blacklist = [];

            try {
                Blacklist = await this.CheckOneDBSearch(this.Blacklist, {});
            } catch (err) {
                this.Logger.error(err.message);
            }

            for (let link of LINKS) {
                let found = Blacklist.find(elt => this.MatchLinkToListElement(link, elt));
                if (found) return Promise.resolve({ msgObj, message: cfg.blacklist_message, punishment: { min: cfg['min_punishment'] || 0, increment: found.weight || 0, max: cfg['min_punishment'] || 1000 }, reason: reason + " is on the Blacklist!", exact_reason: link.url });
            }

            //Remaining Links are cool
            return Promise.resolve();
        }
        
        //No Links Allowed
        return Promise.resolve({ msgObj, message: cfg.all_message, punishment: { min: cfg['min_punishment'] || 0, increment: 0, max: cfg['min_punishment'] || 1000 }, reason: "Links are not allowed!", exact_reason: LINKS });
    }
    
    findLinks(messageString) {
        let maybees = messageString.toLowerCase().split(" ");
        let links = [];

        for (let maybe of maybees) {
            if (maybe.charAt(maybe.length - 1) === '.') continue;
            if (maybe.split(".").length === 1) continue;
            if (maybe.length < 5) continue;
            if (maybe.indexOf('..') > 0) continue;
            
            links.push({
                subdomain: this.getSubDomain(maybe),
                domain: this.getDomain(maybe),
                url: this.getURL(maybe),
                folder: this.getURLFolder(maybe),
                queries: this.getURLQueries(maybe)
            });
        }

        return links;
    }
    MatchLinkToListElement(link, elt) {
        //Exact Match
        if (link[elt.type] === elt.link) return true;
        
        //? Queries
        if (elt.type === 'queries' && link['queries'].pre === elt['link'].split('?')[0]) {
            for (let q of link['queries'].queries) {
                if (!elt['link'].split('?')[1].split('&').find(elt2 => elt2 === q)) return false;
            }
            return true;
        } else {
            //* Extension
            if (elt.link.charAt(elt.link.length - 1) === '*' && elt.link.charAt(0) === '*' && link[elt.type].indexOf(elt.link.split('*')[1]) >= 0) return true;
            if (elt.link.charAt(elt.link.length - 1) === '*' && link[elt.type].indexOf(elt.link.split('*')[0]) === 0) return true;
            if (elt.link.charAt(0) === '*' && link[elt.type].indexOf(elt.link.split('*')[0]) === link[elt.type].length - elt.link.length + 1) return true;

        }

        return false;
    }

    getURL(URL) {
        let out = URL;
        if (URL.substring(0, 8) == "https://") {
            out = URL.substring(8);
        } else if (URL.substring(0, 7) == "http://") {
            out = URL.substring(7);
        }

        if (out.substring(0, 4) == "www.") {
            out = out.substring(4);
        }

        return out;
    }
    getDomain(URL) {
        let subdomainSplitted = this.getSubDomain(URL).split(".");

        if (subdomainSplitted.length < 3) {
            return this.getURL(URL).split("/")[0];
        } else {
            let last = subdomainSplitted[subdomainSplitted.length - 1];
            let penultimate = subdomainSplitted[subdomainSplitted.length - 2];

            if ((last == "uk" || last == "co") && (penultimate == "uk" || penultimate == "co")) {
                return subdomainSplitted[subdomainSplitted.length - 3] + penultimate + "." + last;
            } else {
                return penultimate + "." + last;
            }

            return subdomain.split(".")[1];
        }
    }
    getSubDomain(URL) {
        return this.getURL(URL).split("/")[0].split("?")[0].split("#")[0];
    }
    getURLFolder(URL) {
        let splitted = this.getURL(URL).split('/');
        splitted.pop();
        return splitted.join('/');
    }
    getURLQueries(URL) {
        let url = this.getURL(URL);
        if (url.indexOf('?') < 0) return {
            pre: url,
            queries: []
        }

        let i = url.indexOf('?');
        let queries = [];
        do {
            let end = url.indexOf('=', i);
            if (end < 0) end = url.length - 1;
            if (url.substring(i + 1, end) !== "") queries.push(url.substring(i + 1, end));
            i = url.indexOf('&', end);
        } while (i > 0 && ((url.indexOf('#') > i && url.indexOf('#') > url.indexOf('?')) || url.indexOf('#') < url.indexOf('?')));

        return {
            pre: url.substring(0, url.indexOf('?')),
            queries
        };
    }

    async addBlacklistLink(type, link, weight = 0, by = "Unknown", at = Date.now()) {
        if (!type || !link) return Promise.reject(new Error('Invalid Type or Link!')); 
        
        let query = { $and: [{ type }, { link }] };

        try {
            let urls = await this.CheckOneDBSearch(this.Blacklist, query);
            if (urls.length > 0) return Promise.reject(new Error('URL already on the Blacklist!'));
        } catch (err) {
            return Promise.reject(err);
        }

        let url_data = {
            type: type,
            link: link,
            weight: weight,
            added_by: by,
            added_at: at
        };

        return new Promise((resolve, reject) => {
            this.Blacklist.insert(url_data, function (err, newDocs) {
                if (err) return reject(new Error(err));
                else return resolve(newDocs);
            });
        });
    }
    async removeBlacklistLink(type, link) {
        let query = { $and: [{ type }, { link }] };

        return new Promise((resolve, reject) => {
            this.Blacklist.remove(query, {}, function (err, numRemoved) {
                if (err) return reject(new Error(err));
                else return resolve();
            });
        });
    }
    async clearBlacklist() {
        return new Promise((resolve, reject) => {
            this.Blacklist.remove({}, { multi: true }, function (err, numRemoved) {
                if (err) return reject(new Error(err));
                else return resolve();
            });
        });
    }

    async addWhitelistLink(type, link, by = "Unknown", at = Date.now()) {
        if (!type || !link) return Promise.reject(new Error('Invalid Type or Link!'));

        let query = { $and: [{ type }, { link }] };

        try {
            let urls = await this.CheckOneDBSearch(this.Whitelist, query);
            if (urls.length > 0) return Promise.reject(new Error('URL already on the Whitelist!'));
        } catch (err) {
            return Promise.reject(err);
        }

        let url_data = {
            type: type,
            link: link,
            added_by: by,
            added_at: at
        };

        return new Promise((resolve, reject) => {
            this.Whitelist.insert(url_data, function (err, newDocs) {
                if (err) return reject(new Error(err));
                else return resolve(newDocs);
            });
        });
    }
    async removeWhitelistLink(type, link) {
        let query = { $and: [{ type }, { link }] };

        return new Promise((resolve, reject) => {
            this.Whitelist.remove(query, {}, function (err, numRemoved) {
                if (err) return reject(new Error(err));
                else return resolve();
            });
        });
    }
    async clearWhitelist() {
        return new Promise((resolve, reject) => {
            this.Whitelist.remove({}, { multi: true }, function (err, numRemoved) {
                if (err) return reject(new Error(err));
                else return resolve();
            });
        });
    }
}

//Spam Filter
class SpamFilter extends Filter {
    constructor(ChatModeration, TwitchIRC, TwitchAPI, Logger) {
        super("Spam Filter", ChatModeration, TwitchIRC, TwitchAPI, Logger);

        //Master Config
        this.Config.AddSettingTemplates([
            { name: 'Caps', type: 'config' },
            { name: 'Emotes', type: 'config' },
            { name: 'Patterns', type: 'config' },
            { name: 'Messages', type: 'config' }
        ]);

        //Caps Config
        this.Caps_Config = new CONFIGHANDLER.Config('Caps', [], { preloaded: this.Config.GetConfig()['Caps'] });
        this.Caps_Config.AddSettingTemplates([
            { name: 'enabled', type: 'boolean', requiered: true, default: true, title: 'Enable Caps Filter' },
            { name: 'Minimum', type: 'number', default: 10, title: 'Minimum Caps amount', info: 'The Minimum Amount of Caps to trigger the Filter.' },
            { name: 'Limit', type: 'number', default: 20, title: 'Maximum absolute Caps amount' },
            { name: 'Limit_%', type: 'number', default: 80, title: 'Maximum relative Caps amount', unit: '%' },
            { name: 'Sub_increase_%', type: 'number', default: 50, title: 'Subscriber Limit Increase', unit: '%', info: 'Relative increase to the Caps Limit for Subscribers Only' },
            { name: 'Min_Sub_month_increase', type: 'number', default: 0, title: 'Min. Sub Month until increase', info: 'Minumum Sub Month to be allowed for Sub increase' },
            { name: 'include_TTV_Emotes', type: 'boolean', default: false },
            { name: 'include_BTTV_Emotes', type: 'boolean', default: true },
            { name: 'include_FFZ_Emotes', type: 'boolean', default: true },
            { name: 'message', type: 'string', default: "{user} - Hey hey, stop shouting D:", title: 'Chat Feedback', info: 'Chat Feedback Message, use {user} to @ the Event-User.' }
        ]);
        this.Config.AddChildConfig(this.Caps_Config);

        //Emotes Config
        this.Emotes_Config = new CONFIGHANDLER.Config('Emotes', [], { preloaded: this.Config.GetConfig()['Emotes'] });
        this.Emotes_Config.AddSettingTemplates([
            { name: 'enabled', type: 'boolean', requiered: true, default: false, title: 'Enable Emote Filter' },
            { name: 'Sub_increase_%', type: 'number', default: 50, unit: '%', info: 'Relative increase to ALL Emote Limits for Subscribers' },
            { name: 'Min_Sub_month_increase', type: 'number', default: 0, title: 'Min. Sub Month until increase', info: 'Minumum Sub Month to be allowed for Sub increase' },
            { name: 'include_TTV', type: 'boolean', default: true },
            { name: 'TTV_Limit', type: 'number', default: 6 },
            { name: 'include_BTTV', type: 'boolean', default: false },
            { name: 'BTTV_Limit', type: 'number', default: 6 },
            { name: 'include_FFZ', type: 'boolean', default: false },
            { name: 'FFZ_Limit', type: 'number', default: 6 },
            { name: 'global_Limit', type: 'number', default: 15 },
            { name: 'message', type: 'string', default: "{user} - Hey hey, slow with these Emotes or you might hurt yourself!", title: 'Chat Feedback', info: 'Chat Feedback Message, use {user} to @ the Event-User.' }
        ]);
        this.Config.AddChildConfig(this.Emotes_Config);

        //Patterns Config
        this.Patterns_Config = new CONFIGHANDLER.Config('Patterns', [], { preloaded: this.Config.GetConfig()['Patterns'] });
        this.Patterns_Config.AddSettingTemplates([
            { name: 'enabled', type: 'boolean', requiered: true, default: false, title: 'Enable Patterns Filter' },
            { name: 'max_inrow_chars', type: 'number', default: 10, title: 'Maximum same chars in a row' },
            { name: 'max_symbols', type: 'number', default: 15, title: 'Maximum Symbols (!,?,...)' },
            { name: 'symbols', type: 'array', typeArray: 'string', default: [',', '.', ';', ':', '-', '_', '#', '+', '*', '~', '!', '?', '=', '(', ')', '{', '}', '[', ']', '\\', '/', '<', '>', '|', '"', '\'', '^', '°', '´', '`', '§', '$', '%', '&', '@'], title: 'Symbols to Filter' },
            { name: 'Min_Sub_month_increase', type: 'number', default: 0, title: 'Min. Sub Month until increase', info: 'Minumum Sub Month to be allowed for Sub increase' },
            { name: 'Sub_increase_%', type: 'number', default: 50, title: 'Subscriber Limit Increase', unit: '%', info: 'Relative increase to the Inrow Limit for Subscribers Only' },
            { name: 'in_row_message', type: 'string', default: "{user} - There are a lot of the same characters in a row! Please stop that!", title: 'Chat Feedback', info: 'Chat Feedback Message, use {user} to @ the Event-User.' },
            { name: 'symbol_message', type: 'string', default: "{user} - Thats a lot of Symbols! Please use less!", title: 'Chat Feedback', info: 'Chat Feedback Message, use {user} to @ the Event-User.' }
        ]);
        this.Config.AddChildConfig(this.Patterns_Config);

        //Messages Config
        this.Messages_Config = new CONFIGHANDLER.Config('Messages', [], { preloaded: this.Config.GetConfig()['Messages'] });
        this.Messages_Config.AddSettingTemplates([
            { name: 'enabled', type: 'boolean', requiered: true, default: true, title: 'Enable Messages Filter' },
            { name: 'max_length', type: 'number', default: 300 },
            { name: 'Sub_increase_%', type: 'number', default: 50 },
            { name: 'Min_Sub_month_increase', type: 'number', default: 0, title: 'Min. Sub Month until increase', info: 'Minumum Sub Month to be allowed for Sub increase' },
            { name: 'include_TTV_Emotes', type: 'boolean', default: false },
            { name: 'include_BTTV_Emotes', type: 'boolean', default: true },
            { name: 'include_FFZ_Emotes', type: 'boolean', default: true },
            { name: 'message', type: 'string', default: "{user} - Hey, keep it short please :)", title: 'Chat Feedback', info: 'Chat Feedback Message, use {user} to @ the Event-User.' }
        ]);
        this.Config.AddChildConfig(this.Messages_Config);
    }

    //SETUP
    async reload() {
        return Promise.resolve();

        this.BTTV_Emotes = [];
        this.FFZ_Emotes = [];

        if (!this.TwitchIRC) return Promise.reject(new Error("Twitch IRC not available. BTTV and FFZ Emotes not available."));

        //Current Chat Channel
        let channelLogin = this.TwitchIRC.getChannel();
        if (!channelLogin) return Promise.resolve();

        if (channelLogin.charAt(0) == "#") {
            channelLogin = channelLogin.substring(1);
        }

        //FFZ
        try {
            let response = await FFZ.GetRoomByName(channelLogin, true);
            if (!response.error) {
                for (let set in response.sets) {
                    for (let emote of response.sets[set].emoticons) {
                        this.FFZ_Emotes.push(emote.name);
                    }
                }
            }
        } catch (err) {
            if (this.Logger != null)
                this.Logger.error("Spam Filter: " + err.message);
            else console.error(err);
        }

        if (!this.TwitchAPI) return Promise.reject(new Error("Twitch API not available. BTTV Emotes not available."));
        //BTTV Emotes - Get Chat Channel ID -> Get BTTV Emotes
        try {
            let response = await this.TwitchAPI.GetUsers({ login: channelLogin });
            if (response.data && response.data.length > 0) {
                let BTTV_DATA = await BTTV.GetChannelEmotes(response.data[0].id, true);

                for (let emote of BTTV_DATA) {
                    this.BTTV_Emotes.push(emote.code);
                }
            }
        } catch (err) {
            if (this.Logger != null)
                this.Logger.error("Spam Filter: " + err.message);
            else console.error(err);
        }
    }

    //Filter
    async CheckMessage(msgObj, streamData) {
        if (!this.isEnabled()) return Promise.resolve();
        let cfg = this.Config.GetConfig();

        //Skip VIPs
        if (cfg.skip_vips && msgObj.matchUserlevel(CONSTANTS.UserLevel.vip)) return Promise.resolve();
        //Skip Subs Over X Months
        let badge_info = msgObj.userstate['badge-info'] || {};
        if (cfg.skip_subs && badge_info.subscriber > cfg.max_sub_months) return Promise.resolve();

        const CHECKS = [
            async (msgObj) => this.Check_Message_Length(msgObj),
            async (msgObj) => this.Check_Symbols_Patterns(msgObj),
            async (msgObj) => this.Check_Symbols_Caps(msgObj),
            async (msgObj) => this.Check_Symbols_Emotes(msgObj)
        ];

        for (let check of CHECKS) {
            try {
                let issue = await check(msgObj);
                if (!issue) continue;
                return Promise.resolve(issue);
            } catch (err) {
                this.Logger.error(err.message);
            }
        }

        return Promise.resolve();
    }

    async Check_Symbols_Caps(msgObj) {
        let cfg = this.Config.GetConfig();
        if (!cfg.Caps.enabled) return Promise.resolve();

        let messageString = msgObj.getMessage();

        if (cfg.Caps.include_TTV_Emotes == false || cfg.Caps.include_BTTV_Emotes == false || cfg.Caps.include_FFZ_Emotes == false) {
            try {
                messageString = await msgObj.getMessageWithoutEmotes(cfg.Caps.include_BTTV_Emotes, cfg.Caps.include_FFZ_Emotes, cfg.Caps.include_TTV_Emotes);
            } catch (err) {
                this.Logger.error(err.message ? err.message : err);
            }
        }

        let count = (messageString.match(/[A-Z]/g) || []).length;
        let min = cfg.Caps.Minimum;
        let limit = cfg.Caps.Limit;
        let limit_Percent = cfg.Caps.Limit;

        //Sub
        if (msgObj.isSubscriber(cfg.Caps.Min_Sub_month_increase || 0)) {
            limit += limit * (cfg.Caps['Sub_increase_%'] / 100);
            limit_Percent += limit_Percent * (cfg['Sub_increase_%'] / 100);
            min += min * (cfg['Sub_increase_%'] / 100);
        }

        if (min > count) return Promise.resolve();

        if (count > limit || count > (limit_Percent / 100) * messageString.length) {
            return Promise.resolve({ msgObj, message: cfg.Caps.message, punishment: { min: cfg.min_punishment, increment: 1, max: cfg.max_punishment }, reason: "Used too much CAPS", exact_reason: count });
        }

        return Promise.resolve();
    }
    async Check_Symbols_Patterns(msgObj) {
        let cfg = this.Config.GetConfig();
        if (!cfg.Patterns.enabled) return Promise.resolve();

        let limit = cfg.Patterns.max_inrow_chars;

        //Sub
        if (msgObj.isSubscriber(cfg.Patterns.Min_Sub_month_increase || 0)) {
            limit += limit * (cfg.Patterns['Sub_increase_%'] / 100);
        }

        //Same Letter/Char in a row
        let inrow = 0;
        let char = null;
        let msg = msgObj.getMessage();
        for (let i = 0; i < msg.length; i++) {
            if (char !== msg.charAt(i)) {
                char = msg.charAt(i);
                inrow = 0;
            }
            inrow++;
            if (inrow > limit) {
                return Promise.resolve({ msgObj, message: cfg.Patterns.in_row_message, punishment: { min: cfg.min_punishment, increment: 1, max: cfg.max_punishment }, reason: "Too many Chars in row", exact_reason: char + "-" + inrow });
            }
        }

        //Symbols
        let count = 0;
        limit = cfg.Patterns.max_symbols;

        for (let i = 0; i < msg.length; i++) {
            if(cfg.Patterns['symbols'].find(elt => elt === msg.charAt(i))) count++;
        }

        //Sub
        if (msgObj.isSubscriber(cfg.Patterns.Min_Sub_month_increase || 0)) {
            limit += limit * (cfg.Patterns['Sub_increase_%'] / 100);
        }
        
        if (count > limit) {
            return Promise.resolve({ msgObj, message: cfg.Patterns.symbol_message, punishment: { min: cfg.min_punishment, increment: 1, max: cfg.max_punishment }, reason: "Too many Symbols", exact_reason: count });
        }

        return Promise.resolve();
    }
    async Check_Symbols_Emotes(msgObj) {
        let cfg = this.Config.GetConfig();
        if (!cfg.Emotes.enabled) return Promise.resolve();

        let emoteCount = 0;
        let use_sub_increase = msgObj.isSubscriber(cfg.Emotes.Min_Sub_month_increase || 0);
        
        //TTV Emotes
        if (cfg.Emotes.include_TTV == true) {
            let emotes = msgObj.getEmotesSync();

            let TTVEmotes = 0;
            let limit = cfg.Emotes.TTV_Limit;

            //Sub
            if (use_sub_increase) limit += limit * (cfg.Emotes['Sub_increase_%'] / 100);

            for (let emote in emotes) {
                TTVEmotes += emotes[emote].length;
            }

            if (TTVEmotes > limit) {
                return Promise.resolve({ msgObj, message: cfg.Emotes.message, punishment: { min: 1, increment: 5, max: 1000 }, reason: "Used too many TTV Emotes", exact_reason: TTVEmotes });
            }

            emoteCount += TTVEmotes;
        }

        //BTTV Emotes
        if (cfg.Emotes.include_BTTV == true) {
            try {
                let emotes = await msgObj.getBTTVEmotes();
                let BTTVEmotes = 0;
                let limit = cfg.Emotes.BTTV_Limit;
                
                //Sub
                if (use_sub_increase) limit += limit * (cfg.Emotes['Sub_increase_%'] / 100);

                for (let emote in emotes) {
                    BTTVEmotes += emotes[emote].length;
                }

                if (BTTVEmotes > limit) {
                    return Promise.resolve({ msgObj, message: cfg.Emotes.message, punishment: { min: 1, increment: 5, max: 1000 }, reason: "Used too many BTTV Emotes", exact_reason: BTTVEmotes });
                }

                emoteCount += BTTVEmotes;
            } catch (err) {
                this.Logger.error(err.message ? err.message : err);
            }
        }

        //FFZ Emotes
        if (cfg.Emotes.include_FFZ == true) {
            try {
                let emotes = await msgObj.getFFZEmotes();
                let FFZEmotes = 0;
                let limit = cfg.Emotes.FFZ_Limit;

                //Sub
                if (use_sub_increase) limit += limit * (cfg.Emotes['Sub_increase_%'] / 100);

                for (let emote in emotes) {
                    FFZEmotes += emotes[emote].length;
                }

                if (FFZEmotes > limit) {
                    return Promise.resolve({ msgObj, message: cfg.Emotes.message, punishment: { min: 1, increment: 5, max: 1000 }, reason: "Used too many FFZ Emotes", exact_reason: FFZEmotes });
                }

                emoteCount += FFZEmotes;
            } catch (err) {
                this.Logger.error(err.message ? err.message : err);
            }
        }

        let limit = cfg.Emotes.global_Limit;

        //Sub
        if (use_sub_increase) limit += limit * (cfg.Emotes['Sub_increase_%'] / 100);

        //Global Emote Limit
        if (emoteCount > limit) {
            return Promise.resolve({ msgObj, message: cfg.Emotes.message, punishment: { min: 1, increment: 5, max: 1000 }, reason: "Used too many Emotes", exact_reason: emoteCount });
        }


        return Promise.resolve();
    }

    async Check_Message_Length(msgObj) {
        let cfg = this.Config.GetConfig();
        if (!cfg.Messages.enabled || cfg.Messages.max_message_length < 0) return Promise.resolve();

        let messageLen = 0;

        if (cfg.Messages.include_TTV_Emotes == true || cfg.Messages.include_BTTV_Emotes == true || cfg.Messages.include_FFZ_Emotes == true) {
            try {
                messageLen = (await msgObj.getMessageWithoutEmotes(cfg.Messages.include_BTTV_Emotes, cfg.Messages.include_FFZ_Emotes, cfg.Messages.include_TTV_Emotes)).length;
            } catch (err) {
                this.Logger.error(err.message ? err.message : err);
            }
        } else {
            messageLen = msgObj.getMessage().length;
        }

        let limit = cfg.Messages.max_length;

        //Sub
        if (msgObj.isSubscriber(cfg.Messages.Min_Sub_month_increase || 0)) {
            limit += limit * (cfg.Messages['Sub_increase_%'] / 100);
        }

        if (messageLen > limit) {
            return Promise.resolve({ msgObj, message: cfg.Messages.message, punishment: { min: cfg.min_punishment, increment: 1, max: cfg.max_punishment }, reason: "Message too long", exact_reason: messageLen });
        }

        return Promise.resolve();
    }
}

module.exports.ChatModeration = ChatModeration;