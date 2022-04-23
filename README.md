# ChatModeration Package 
This Repository is a Package for the FrikyBot.

The ChatModeration Package is an atempt to automate Moderations. Custom Filters to Check for Links, Spam or Blacklisted Words can easily added, removed and customized to your Chat culture and memes.

Note: This is Code cant be run on its own, its still tied to the FrikyBot Interface and Ecosystem!

## Getting Started
This Package is powered by Node.js and some NPM Modules.

All dependancies are:
* [express](https://www.npmjs.com/package/express) - providing File and API Routing Capabilities
* [nedb](https://www.npmjs.com/package/nedb) - Database Manager (to be replaced with MongoDB "soon")

Installing a Package is very easy! Clone this Package to your local machine, wrap it in Folder Named "ChatModeration" and drop that into your FrikyBot Packages Folder.
Now use the FrikyBot WebInterface and add the Package on the Settings->Packages Page.

## Features

### Filters
Filters are small Classes checking incomming messages for Issues. These Filters can be disabled, added and changed at any point.

### Punishment Score
Punishments are executed based on a score from 0 to 1000 - 0 meaning just a warning and 1000 meaning a ban. Punishemnt Scores are increased when a Filter finds an Issue. These Issues can have their own minimum, increment or maximum Punishment Score indicating the severity of the Issue.

### Twitch Moderation Tools
Using the Twitch API the ChatModeration Package can tap into the existing Moderation Tools of Twitch. Changing AutoMod Settings, banned users or Blacklisted words.

## Planned Features
* **Filter Management** - Easy interface to embed your custom Filter from another Package or extern Folders.
* **RegEx Support** - Filter Messages using RegEx.
* **Badge Userlevl System** - Similar Badge based Userlevel to Commands.
* **Commands / API for Punishments** - Interface to get a users Punishments.

## Updates
Follow the official [Twitter](https://twitter.com/FrikyBot) Account or take a look at the [FrikyBot News](https://frikybot.de/News) to see upcomming Features and Updates.

## Authors
* **Tim Klenk** - [FrikyMediaLP](https://github.com/FrikyMediaLP)
