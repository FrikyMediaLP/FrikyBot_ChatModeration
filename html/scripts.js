const CUSTOM_DATA = {
    "Word Filter": (settings) => {
        let s = "";
        s += '<h3>Blacklisted Words <button onclick="WordFilter_clearList(\'blacklist\')" red>CLEAR</button></h3>';
        s += '<div id="WordFilter_BL">' + CUSTOM_DATA['WordFilter_BL'](settings.custom_data.Blacklist) + '</div>';
        
        s += '<h3>Whitelisted Words <button onclick="WordFilter_clearList(\'whitelist\')" red>CLEAR</button></h3>';
        s += '<div id="WordFilter_WL">' + CUSTOM_DATA['WordFilter_WL'](settings.custom_data.Whitelist) + '</div>';

        let ttv_options = {
            headers: ['text', 'by', 'at'],
            header_translation: {
                by: 'moderator_id',
                at: 'updated_at'
            },
            empty_text: settings.custom_data.TTV_Blacklist === 'No Scope Access!' ? 'NO SCOPE ACCESS' : 'EMPTY',
            timestamps: { at: 'relative' }
        };
        s += '<h3>TTV Blacklist</h3>';
        s += '<div id="WordFilter_TTV">';
        s += MISC_createTable(settings.custom_data.TTV_Blacklist.data, ttv_options);
        s += '</div>';

        return s;
    },
    "WordFilter_BL": (blacklist) => {
        let BLoptions = {
            headers: ['word', 'weight', 'by', 'at', 'settings'],
            header_translation: {
                by: 'blocked_by',
                at: 'blocked_at',
                settings: ['casesensitive', 'in_word_use', 'block_patterns', 'ignore_emotes', 'emote_only', 'include_BTTV', 'include_FFZ']
            },
            content_translation: {
                casesensitive: (x) => x ? '<img src="images/icons/caps.png" title="CaseSensitive"/>' : '',
                in_word_use: (x) => x ? '<img src="images/icons/inword.png" title="In Word Use"/>' : '',
                block_patterns: (x) => x ? '<img src="images/icons/textpattern.png" title="Block Patterns"/>' : '',
                ignore_emotes: (x) => x ? '<img src="images/icons/disabled_frikybot.png" title="Ignore Emotes"/>' : '',
                emote_only: (x) => x ? '<img src="images/icons/FrikyBot_Colored.png" title="Emote Only"/>' : '',
                include_BTTV: (x) => x ? '<img src="images/icons/BTTV.png" title="Include BTTV Emotes"/>' : '',
                include_FFZ: (x) => x ? '<img src="images/icons/FFZ.png" title="Include FFZ Emotes"/>' : ''
            },
            column_addition: { settings: (x) => '<button onclick="WordFilter_removeWord(\'' + x.word + '\', ' + "'blacklist'" + ')" red>REMOVE WORD</button>' },
            timestamps: { at: 'relative' }
        };

        return MISC_createTable(blacklist, BLoptions);
    },
    "WordFilter_WL": (whitelist) => {
        let options = {
            headers: ['word', 'by', 'at', 'settings'],
            header_translation: {
                by: 'allowed_by',
                at: 'allowed_at',
                settings: ['casesensitive', 'in_word_use', 'block_patterns', 'ignore_emotes', 'emote_only', 'include_BTTV', 'include_FFZ']
            },
            content_translation: {
                casesensitive: (x) => x ? '<img src="images/icons/caps.png" title="CaseSensitive"/>' : '',
                in_word_use: (x) => x ? '<img src="images/icons/inword.png" title="In Word Use"/>' : '',
                block_patterns: (x) => x ? '<img src="images/icons/textpattern.png" title="Block Patterns"/>' : '',
                ignore_emotes: (x) => x ? '<img src="images/icons/disabled_frikybot.png" title="Ignore Emotes"/>' : '',
                emote_only: (x) => x ? '<img src="images/icons/FrikyBot_Colored.png" title="Emote Only"/>' : '',
                include_BTTV: (x) => x ? '<img src="images/icons/BTTV.png" title="Include BTTV Emotes"/>' : '',
                include_FFZ: (x) => x ? '<img src="images/icons/FFZ.png" title="Include FFZ Emotes"/>' : ''
            },
            column_addition: { settings: (x) => '<button onclick="WordFilter_removeWord(\'' + x.word + '\', ' + "'whitelist'" + ')" red>REMOVE WORD</button>' },
            timestamps: { at: 'relative' }
        };
        
        return MISC_createTable(whitelist, options);
    },
    "Link Filter": (settings) => {
        let s = "";
        s += '<h3>Whitelisted Links <button onclick="LinkFilter_clearList(\'whitelist\')" red>CLEAR</button></h3>';
        s += '<div id="LinkFilter_WL">' + CUSTOM_DATA['LinkFilter_WL'](settings.custom_data.Whitelist) + '</div>';
        
        s += '<h3>Blacklisted Links <button onclick="LinkFilter_clearList(\'blacklist\')" red>CLEAR</button></h3>';
        s += '<div id="LinkFilter_BL">' + CUSTOM_DATA['LinkFilter_BL'](settings.custom_data.Blacklist) + '</div>';
        return s;
    },
    "LinkFilter_WL": (whitelist) => {
        let options = {
            headers: ['link', 'type', 'by', 'at', 'settings'],
            header_translation: {
                by: 'added_by',
                at: 'added_at'
            },
            column_addition: { settings: (x) => '<button onclick="LinkFilter_removeLink(\'whitelist\', \'' + x.type + '\', \'' + x.link + '\')" red>REMOVE ' + x.type.toUpperCase() + '</button>' },
            timestamps: { at: 'relative' }
        };
        return MISC_createTable(whitelist, options);
    },
    "LinkFilter_BL": (blacklist) => {
        let options = {
            headers: ['link', 'type', 'weight', 'by', 'at', 'settings'],
            header_translation: {
                by: 'added_by',
                at: 'added_at'
            },
            column_addition: { settings: (x) => '<button onclick="LinkFilter_removeLink(\'blacklist\', \'' + x.type + '\', \'' + x.link + '\')" red>REMOVE ' + x.type.toUpperCase() + '</button>' },
            timestamps: { at: 'relative' }
        };
        return MISC_createTable(blacklist, options);
    }
};

const CUSTOM_UI = {
    "Word Filter": (settings) => {
        let s = "";
        
        s += '<input placeholder="enter word" id="WordFilter_input" />';
        
        s += '<div><button onclick="WordFilter_addWord(' + "'blacklist'" + ')" green>ADD TO BLACKLIST</button><button onclick="WordFilter_addWord(' + "'whitelist'" + ')" green>ADD WHITELIST WORD</button></div>';
        
        s += '<div></div>';

        s += '<div id="WF_UI">';
        s += '<div><span>CaseSensitive</span> <span>e.g. "WORD" and "word"</span> <switchbutton value="true" id="WordFilter_CS"></switchbutton></div>';
        s += '<div><span>Allow In Word Use</span> <span>e.g. "WORD_" or "helloWORD"</span> <switchbutton value="true" id="WordFilter_IWU"></switchbutton></div>';
        s += '<div><span>Block Patterns</span> <span>e.g. "wordwordword"</span> <switchbutton value="true" id="WordFilter_BP"></switchbutton></div>';
        s += '<div class="SPACER"></div>';
        s += '<div><span>Ignore Emotes</span> <switchbutton value="true" id="WordFilter_IE"></switchbutton></div>';
        s += '<div><span>Emote Only</span> <switchbutton value="false" id="WordFilter_EO"></switchbutton></div>';
        s += '<div><span>Include BTTV Emotes</span> <switchbutton value="false" id="WordFilter_BTTV"></switchbutton></div>';
        s += '<div><span>Include FFZ Emotes</span> <switchbutton value="false" id="WordFilter_FFZ"></switchbutton></div>';
        s += '<div class="SPACER"></div>';
        s += '<div><span>Weight</span> <input value="1" id="WordFilter_WEIGHT" /></div>';
        s += '</div>';
        
        return s;
    },
    "Link Filter": (settings) => {
        let s = "";
        
        s += '<input placeholder="enter link" id="LinkFilter_input" type="url" oninput="LinkFilter_inputChange(this)" />';

        s += '<div>';
        s += '<button onclick="LinkFilter_addLink(\'whitelist\')" green style="width: 150px">ALLOW URL</button>';
        s += '<button onclick="LinkFilter_addLink(\'blacklist\')" red style="width: 150px">BLOCK URL</button>';
        s += '</div>';

        s += '<div></div>';

        s += '<div id="LF_UIT">';
        s += '<div><span>Allow/Block this URL</span> <span></span> <switchbutton value="true" id="LinkFilter_URL" onclick="LinkFilter_blockchange(this)" disabled></switchbutton></div>';
        s += '<div><span>Allow/Block this Domain</span> <span></span> <switchbutton value="false" id="LinkFilter_Domain" onclick="LinkFilter_blockchange(this)"></switchbutton></div>';
        s += '<div><span>Allow/Block this SubDomain</span> <span></span> <switchbutton value="false" id="LinkFilter_SubDomain" onclick="LinkFilter_blockchange(this)"></switchbutton></div>';
        s += '<div><span>Allow/Block this Folder</span> <span></span> <switchbutton value="false" id="LinkFilter_Folder" onclick="LinkFilter_blockchange(this)"></switchbutton></div>';
        s += '<div><span>Allow/Block these URL Queries</span> <span></span> <switchbutton value="false" id="LinkFilter_Queries" onclick="LinkFilter_blockchange(this)"></switchbutton></div>';
        s += '<div class="SPACER"></div>';
        s += '<div><span>Punishment Weight</span> <input type="number" id="LinkFilter_Weight" value="10"/></div>';
        s += '</div>';

        return s;
    }
};

let CANVAS_INFOS = [];
let AUTOMOD = {
    "broadcaster_id": "1234",
    "moderator_id": "5678",
    "overall_level": 0,
    "disability": 0,
    "aggression": 0,
    "sexuality_sex_or_gender": 0,
    "misogyny": 0,
    "bullying": 0,
    "swearing": 0,
    "race_ethnicity_or_religion": 0,
    "sex_based_terms": 0
};
let BANS = {};
let HISTORY = {};
let FILTER_DATA = {};

const quick_mode = false;

function init() {
    OUTPUT_create();
    SWITCHBUTTON_AUTOFILL();

    fetch("api/ChatModeration/filters/settings" + (quick_mode ? "?quick_mode=true" : ""), getAuthHeader())
        .then(STANDARD_FETCH_RESPONSE_CHECKER)
        .then(json => {
            if (json.err) return Promise.reject(new Error(json.err));
            document.getElementById('CHATMOD').style.display = "block";

            //Punishment Score Canvas
            for (let filter in json.Filters) {
                document.getElementById('V2_FILTER_UI').innerHTML += createFilter(filter, json.Filters[filter]);

                CANVAS_INFOS.push({
                    id: 'CANVAS_' + filter.split(" ").join("_"),
                    min: json.Filters[filter].cfg.min_punishment,
                    max: json.Filters[filter].cfg.max_punishment
                });
            }
            
            //TTV Automod
            AUTOMOD = json.TTV_Automod;
            SHOW_AUTOMOD_STATUS(AUTOMOD);

            //TTV Banned Users
            BANS = json.TTV_BannedUsers;
            SHOW_TTV_BANS(BANS);
            
            //User History
            HISTORY = json.User_History;
            SHOW_USER_HISTORY(HISTORY);

            FILTER_DATA = json.Filters;

            SWITCHBUTTON_AUTOFILL();
            OUTPUT_create();
            redraw_canvas();
        })
        .catch(err => {
            console.log(err);
            OUTPUT_showError('ACCESS DENIED');
        });
}

//V2 UI
function createFilter(name, settings) {
    let s = '';
    let a = name.split(" ").join("_");
    s += '<div id="' + a + '" class="Filter" data-name="' + name + '">';
    s += '<output id="FILTER_OUTPUT_' + a + '"></output>';
    s += '<div class="Filter_Header">' + name + '</div>';

    s += '<div class="Filter_Settings_Wrapper">';
    //Master Config Settings
    s += '<div class="Filter_Setting_Elt">';
    s += '<div class="Filter_Child_Header">General</div>';
    s += '<div class="Filter_Settings" data-name="__MAIN__">';
    s += createConfigSettings(settings.cfg, settings.template.filter(elt => elt.type !== 'config'), a);
    s += '</div>';

    s += '<div class="Filter_Punishment_Scale"><canvas id="CANVAS_' + a + '" height="60" onmousemove="Filter_CanvasHover(event, this)" onmousedown="Filter_CanvasPressed(event, this)" onmouseup="Filter_CanvasRelease(event, this)"></canvas></div>';

    s += '</div>';
    
    //Child Config Settings
    for (let config of settings.template.filter(elt => elt.type === 'config')) {
        s += '<div class="Filter_Setting_Elt">';
        s += '<div class="Filter_Child_Header">' + config.name + '</div>';
        s += '<div class="Filter_Settings" data-name="' + config.name + '">';
        s += createConfigSettings(settings.cfg[config.name], config.childTemplates, a);
        s += '</div>';
        s += '</div>';
    }
    s += '</div>';

    //Custom Data
    s += '<div class="Filter_Custom_UI">';
    if (CUSTOM_UI[name] && CUSTOM_UI[name]) s += CUSTOM_UI[name](settings);
    s += '</div>';

    //Custom UI
    s += '<div class="Filter_Custom_Data">';
    if (CUSTOM_DATA[name] && CUSTOM_DATA[name]) s += CUSTOM_DATA[name](settings);
    s += '</div>';
    
    s += '</div>';

    return s;
}
function createConfigSettings(cfg = {}, template = [], filter = "") {
    let s = '';
    
    for (let setting of template) {
        if (setting.html_skip) continue;

        let disabled = false;
        if (setting.name === 'max_sub_months' && cfg['skip_subs'] !== true) disabled = true;
        if (setting.name === 'TTV_Limit' && cfg['include_TTV'] === false) disabled = true;
        if (setting.name === 'BTTV_Limit' && cfg['include_BTTV'] === false) disabled = true;
        if (setting.name === 'FFZ_Limit' && cfg['include_FFZ'] === false) disabled = true;

        s += '<div class="Filter_Settings_Name" data-name="' + setting.name + '" ' + (disabled ? 'disabled' : '') + '>';
        const INDENT = ['max_sub_months', 'min_sub_month', 'Min_Sub_month_increase', 'TTV_Limit', 'BTTV_Limit', 'FFZ_Limit'];
        if (INDENT.find(elt => elt === setting.name)) s += '<div><div></div></div>';
        s += '<span>' + (setting.title || setting.name.split('_').join(" ")) + '</span>';

        if (setting.info) {
            s += '<div class="INFO">';
            s += '<div class="INFO_ICON">i</div>';
            s += '<div class="INFO_TEXT"><div>' + setting.info + '</div></div>';
            s += '</div>';
        }

        s += '</div>';
        
        s += '<div class="Filter_Settings_Value" data-name="' + setting.name + '" ' + (disabled ? 'disabled' : '') + '>';
        s += '<div>';
        s += '<span>' + createConfigSettingInput(setting, cfg[setting.name], disabled, filter) + '</span>';
        s += '</div>';
        s += '</div>';
    }

    return s;
}
function createConfigSettingInput(setting, value, disabled = false, filter = "") {
    //Integrated Save Button
    if (setting.type === 'boolean') return SWITCHBUTTON_CREATE(value === true, disabled, 'FilterSettingSave(' + "'" + setting.type + "'" + ', this)');
    if (setting.type === 'string' && setting.selection !== undefined) {
        let idx = 0;
        setting.selection.find((elt, i) => {
            if (elt === value) {
                idx = i;
                return true;
            }
            return false;
        })
        return MISC_SELECT_create(setting.selection, idx, undefined, 'FilterSettingSave(' + "'selection'" + ', this)', "", "data-old_setting=" + '"' + value + '"');
    }

    //Manuel Save Button
    let s = "";
    if (setting.type === 'number') {
        s += '<input type="number" value="' + value + '" oninput="FilterSettingInputChange(this)"';
        if (setting.name === 'min_punishment' || setting.name === 'max_punishment') s += ' id="' + filter.split("_").join("") + "_" + setting.name + '_input" ';
        if (setting.name === 'min_punishment' || setting.name === 'max_punishment') s += ' class="' + setting.name + '_input" ';
        if (setting.min) s += ' min="' + setting.min + '" ';
        if (setting.step) s += ' step="' + setting.step + '" ';
        if (setting.max) s += ' max="' + setting.max + '" ';
        if (disabled) s += ' disabled ';
        s += '/>';
    }
    if (setting.type === 'string') s += '<input type="text" value="' + value + '" oninput="FilterSettingInputChange(this)" ' + (disabled ? 'disabled' : '') + '/>';

    if (setting.unit) s += setting.unit;

    //ADDSave Button
    s += '<button disabled onclick="FilterSettingSave(' + "'" + setting.type + "'" + ', this)">SAVE</button>';

    return s;
}

function FilterSettingInputChange(elt) {
    elt.parentElement.childNodes[1].removeAttribute('disabled');
}
function FilterSettingGetValue(type, elt) {
    if (type === 'boolean') return elt.value;
    if (type === 'string') return elt.parentElement.childNodes[0].value;
    if (type === 'number') return parseInt(elt.parentElement.childNodes[0].value);
    if (type === 'selection') return MISC_SELECT_GetValue(elt);
}
function FilterSettingSave(type, elt) {
    let orig_elt = elt;

    let value = FilterSettingGetValue(type, elt);
    if (type === 'selection') {
        if (orig_elt.dataset.old_setting === value) return;
    }

    elt = elt.parentElement.parentElement.parentElement;
    let setting = elt.dataset.name;
    elt = elt.parentElement;
    let settings_wrapper = elt;
    if (elt.dataset.name !== '__MAIN__') setting = settings_wrapper.dataset.name + "." + setting;
    elt = settings_wrapper.parentElement.parentElement.parentElement;
    let filter = elt.dataset.name;
    
    let options = getAuthHeader();
    options['method'] = 'PUT';
    options['headers']['Content-Type'] = 'application/json';
    options['body'] = JSON.stringify({
        setting, value
    });
    
    fetch("api/ChatModeration/" + filter.split(' ').join("") + "/settings", options)
        .then(STANDARD_FETCH_RESPONSE_CHECKER)
        .then(json => {
            OUTPUT_showInfo("Setting Updated!", document.getElementById('FILTER_OUTPUT_' + filter.split(" ").join("_")));

            if (orig_elt.tagName === 'BUTTON') {
                orig_elt.setAttribute('disabled', 'true');
            } else if (orig_elt.classList.contains('MISC_SELECT')) {
                orig_elt.dataset.old_setting = value;
            } else {
                if (setting === 'skip_subs' || setting === 'Emotes.include_TTV' || setting === 'Emotes.include_BTTV' || setting === 'Emotes.include_FFZ') {
                    for (let child of settings_wrapper.childNodes) {
                        if ((child.dataset.name === 'max_sub_months' && setting === 'skip_subs') || (child.dataset.name === 'TTV_Limit' && setting === 'Emotes.include_TTV') || (child.dataset.name === 'BTTV_Limit' && setting === 'Emotes.include_BTTV') || (child.dataset.name === 'FFZ_Limit' && setting === 'Emotes.include_FFZ')) {
                            if (value === true) {
                                child.removeAttribute('disabled');
                                if (child.childNodes[0].childNodes[0].childNodes[0]) child.childNodes[0].childNodes[0].childNodes[0].removeAttribute('disabled');
                            } else {
                                child.setAttribute('disabled', 'true');
                                if (child.childNodes[0].childNodes[0].childNodes[0]) child.childNodes[0].childNodes[0].childNodes[0].setAttribute('disabled', 'true');
                            }
                        }
                    }
                }
            }
        })
        .catch(err => {
            console.log(err);
            OUTPUT_showError(err.message, document.getElementById('FILTER_OUTPUT_' + filter.split(" ").join("_")));
            if (orig_elt.classList.contains('MISC_SELECT')) MISC_SELECT_SelectItem(orig_elt, orig_elt.dataset.old_setting, orig_elt.dataset.old_setting);
            else if (orig_elt.tagName !== 'BUTTON') SWITCHBUTTON_TOGGLE(orig_elt, value === false);
        });
}

function Filter_CanvasPressed(e, c) {
    let infos = CANVAS_INFOS.find(elt => elt.id === c.id);
    if (!infos) return;

    let rect = c.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;

    const width = c.width;
    const height = c.height;

    if (y < height / 2 - 6 || height / 2 + 6 < y) return;
    
    let x_min = Math_map(infos.min, 2, 1000, width * 0.3, width * 0.9);
    let x_max = Math_map(infos.max, 2, 1000, width * 0.3, width * 0.9);

    if (infos.min === 0) x_min = width * 0.1;
    else if (infos.min === 1) x_min = width * 0.2;
    else if (infos.min === 2) x_min = width * 0.3;

    if (infos.max === 0) x_min = width * 0.1;
    else if (infos.max === 1) x_min = width * 0.2;
    else if (infos.max === 2) x_min = width * 0.3;

    if (x_min - 6 < x && x < x_min + 6) {
        c.dataset.moving = 'min';
    }

    if (x_max - 6 < x && x < x_max + 6) {
        c.dataset.moving = 'max';
    }
}
function Filter_CanvasRelease(e, c) {
    let infos = CANVAS_INFOS.find(elt => elt.id === c.id);
    if (!infos) return;

    let rect = c.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;

    const width = c.width;
    const height = c.height;

    let old_min = infos.min;
    let old_max = infos.max;

    let data = {};

    if (c.dataset.moving === 'min') {
        if (x <= width * 0.15) infos.min = 0;
        else if (x <= width * 0.25) infos.min = 1;
        else if (x <= width * 0.3) infos.min = 2;
        else if (x <= width * 0.9) infos.min = Math.floor(Math_map(x, width * 0.3, width * 0.9, 2, 1000));
        else infos.min = 1000;

        data.setting = 'min_punishment';
        data.value = infos.min;
    } else if (c.dataset.moving === 'max') {
        if (x <= width * 0.15) infos.max = 0;
        else if (x <= width * 0.25) infos.max = 1;
        else if (x <= width * 0.3) infos.max = 2;
        else if (x <= width * 0.9) infos.max = Math.floor(Math_map(x, width * 0.3, width * 0.9, 2, 1000));
        else infos.max = 1000;

        data.setting = 'max_punishment';
        data.value = infos.max;
    } 

    c.dataset.moving = undefined;

    //UPDATE SETTING
    let options = getAuthHeader();
    options['method'] = 'PUT';
    options['headers']['Content-Type'] = 'application/json';
    options['body'] = JSON.stringify(data);

    let filter = c.id.split('_').slice(1).join("");

    fetch("api/ChatModeration/" + filter + "/settings", options)
        .then(STANDARD_FETCH_RESPONSE_CHECKER)
        .then(json => {
            Filter_drawCanvas(infos);

            document.getElementById(filter + '_min_punishment_input').value = infos.min;
            document.getElementById(filter + '_max_punishment_input').value = infos.max;
        })
        .catch(err => {
            console.log(err);
            infos.min_punishment = old_min;
            infos.max_punishment = old_max;
            Filter_drawCanvas(infos);
            OUTPUT_showError(err.message);
        });
}
function Filter_CanvasHover(e, c) {
    let rect = c.getBoundingClientRect();
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;
    let x = cursorX;
    let y = cursorY;

    let infos = CANVAS_INFOS.find(elt => elt.id === c.id);
    if (!infos) return;

    Filter_drawCanvas(infos, true);

    const width = c.width;
    const height = c.height;
    
    let ctx = c.getContext("2d");

    ctx.fillStyle = '#028deb';
    ctx.strokeStyle = '#028deb';
    ctx.font = "10px Roboto";
    
    if (x < width * 0.15) {
        x = width * 0.1;
    } else if (x < width * 0.25) {
        x = width * 0.2;
    } else if (x < width * 0.3) {
        x = width * 0.3;
    } else if(x < width * 0.9){
        ctx.beginPath();
        ctx.arc(x, height * 0.5, 3, 0, 2 * Math.PI);
        ctx.fill();

        let scale = Math_map(x, width * 0.3, width * 0.9, 2, 1000);
        let timeout_length = Math.min(Math.floor(Math.pow(scale, 2) * 2.5), 1209600);
        let output = timeout_length;

        if (timeout_length < 60) {
            output = timeout_length + 's';
        } else if (timeout_length < 60 * 60) {
            output = Math.floor(timeout_length / 60) + 'm';
        } else if (timeout_length < 60 * 60 * 24) {
            output = Math.floor(timeout_length / (60 * 60)) + 'h';
        } else if (timeout_length < 60 * 60 * 24 * 7) {
            output = Math.floor(timeout_length / (60 * 60 * 24)) + 'd';
        } else if (timeout_length < 60 * 60 * 24 * 7 * 4) {
            output = Math.min(Math.floor(timeout_length / (60 * 60 * 24 * 7)), 2) + ' week';
        } 

        ctx.fillText("TO: " + output, x - 20, height * 0.5 + 15);
        ctx.fillText(Math.floor(scale), x - (scale >= 100 ? 10 : (scale >= 10 ? 5 : 0)), height * 0.5 - 15);
    } else {
        x = width * 0.9;
    }

    ctx.beginPath();
    ctx.arc(x, height * 0.5, 3, 0, 2 * Math.PI);
    ctx.fill();
    
    if (y < height / 2 - 6 || height / 2 + 6 < y) return c.style.cursor = 'default';

    let x_min = width * 0.1;
    if (infos.min == 0) {
        x_min = width * 0.1;
    } else if (infos.min == 1) {
        x_min = width * 0.2;
    } else if (infos.min >= 2) {
        x_min = Math_map(infos.min, 2, 1000, width * 0.3, width * 0.9);
    }

    let x_max = width * 0.1;
    if (infos.max == 0) {
        x_max = width * 0.1;
    } else if (infos.max == 1) {
        x_max = width * 0.2;
    } else if (infos.max >= 2) {
        x_max = Math_map(infos.max, 2, 1000, width * 0.3, width * 0.9);
    }
    
    if ((x_max - 6 < cursorX && cursorX < x_max + 6) || (x_min - 6 < cursorX && cursorX < x_min + 6)) c.style.cursor = 'pointer';
    else c.style.cursor = 'default';
}
function Filter_drawCanvas(canvas_info, highlight = false) {
    let c = document.getElementById(canvas_info.id);
    if (!c) return;
    
    c.width = c.parentElement.clientWidth * 0.9;

    const width = c.width;
    const height = c.height;
    const darkmode = document.getElementsByTagName('body')[0].classList.contains('darkmode');

    const dot_radius = 5;
    const steps = 20;
    const scale_y_offset = height * 0.5 - dot_radius * 2 - 3;
    const text_y_offset = height * 0.5 + dot_radius * 2 + 5;
    const light_colors = { stroke: "#000000", fill: '#000000', min: 'green', max: 'red' };
    const dark_colors = { stroke: "#FFFFFF", fill: '#FFFFFF', min: 'green', max: 'red' };
    
    const colors = darkmode ? dark_colors : light_colors;

    let ctx = c.getContext("2d");

    ctx.fillStyle = colors.fill;
    ctx.strokeStyle = colors.stroke;
    ctx.font = "10px Roboto";

    ctx.beginPath();
    ctx.moveTo(width * 0.1, height * 0.5);
    ctx.lineTo(width * 0.9, height * 0.5);
    ctx.stroke();

    //Warning
    if (canvas_info.min == 0) {
        ctx.fillStyle = colors.min;
        ctx.strokeStyle = colors.min;
    } else if (canvas_info.max == 0) {
        ctx.fillStyle = colors.max;
        ctx.strokeStyle = colors.max;
    } else {
        ctx.fillStyle = colors.fill;
        ctx.strokeStyle = colors.stroke;
    }

    ctx.beginPath();
    ctx.arc(width * 0.1, height * 0.5, dot_radius, 0, 2 * Math.PI);
    ctx.fill();

    ctx.fillText("0", width * 0.1 - 2.5, scale_y_offset);
    ctx.fillText("Warning", width * 0.1 - 18, text_y_offset);
    
    //Delete
    if (canvas_info.min == 1) {
        ctx.fillStyle = colors.min;
        ctx.strokeStyle = colors.min;
    } else if (canvas_info.max == 1) {
        ctx.fillStyle = colors.max;
        ctx.strokeStyle = colors.max;
    } else {
        ctx.fillStyle = colors.fill;
        ctx.strokeStyle = colors.stroke;
    }

    ctx.beginPath();
    ctx.arc(width * 0.2, height * 0.5, dot_radius, 0, 2 * Math.PI);
    ctx.fill();

    ctx.fillText("1", width * 0.2 - 2.5, scale_y_offset);
    ctx.fillText("Delete", width * 0.2 - 15, text_y_offset);

    //Timeout
    if (canvas_info.min == 2) {
        ctx.fillStyle = colors.min;
        ctx.strokeStyle = colors.min;
    } else if (canvas_info.max == 2) {
        ctx.fillStyle = colors.max;
        ctx.strokeStyle = colors.max;
    } else {
        ctx.fillStyle = colors.fill;
        ctx.strokeStyle = colors.stroke;
    }

    ctx.beginPath();
    ctx.arc(width * 0.3, height * 0.5, dot_radius, 0, 2 * Math.PI);
    ctx.fill();

    ctx.fillText("2", width * 0.3 - 2.5, scale_y_offset);
    ctx.fillText("Timeout", width * 0.3 - 18, text_y_offset);

    ctx.beginPath();
    for (let i = 1; i < steps; i++) {
        let x = width * 0.3 + i * ((width * 0.9 - width * 0.3) / steps);
        ctx.moveTo(x, height * 0.5);
        ctx.lineTo(x, height * 0.5 - 5);
    }
    ctx.stroke();

    //Ban
    if (canvas_info.min == 1000) {
        ctx.fillStyle = colors.min;
        ctx.strokeStyle = colors.min;
    } else if (canvas_info.max == 1000) {
        ctx.fillStyle = colors.max;
        ctx.strokeStyle = colors.max;
    } else {
        ctx.fillStyle = colors.fill;
        ctx.strokeStyle = colors.stroke;
    }
    
    ctx.beginPath();
    ctx.arc(width * 0.9, height * 0.5, dot_radius, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.fillText("1000", width * 0.9 - 12.5, scale_y_offset);
    ctx.fillText("Ban", width * 0.9 - 10, text_y_offset);
    
    //min
    ctx.fillStyle = colors.min;
    ctx.strokeStyle = colors.min;
    ctx.beginPath();
    let x = Math_map(canvas_info.min, 0, 1000, width * 0.3, width * 0.9);
    ctx.moveTo(x, height * 0.5);
    ctx.lineTo(x, height * 0.5 - 10);
    ctx.stroke();
    
    if (canvas_info.min > 2 && canvas_info.min < 1000) {
        ctx.fillText(canvas_info.min, x - (canvas_info.min >= 100 ? 10 : (canvas_info.min >= 10 ? 5 : 3)), x < width * 0.3 + 18 ? scale_y_offset - 10 : scale_y_offset);
        ctx.fillText("min", x - 10, x < width * 0.3 + 30 ? text_y_offset + 10 : text_y_offset);
        
        if (highlight) {
            ctx.beginPath();
            ctx.arc(x, height * 0.5, dot_radius / 2, 0, 2 * Math.PI);
            ctx.fill();
        }
    }

    //max
    ctx.fillStyle = colors.max;
    ctx.strokeStyle = colors.max;
    ctx.beginPath();
    x = Math_map(canvas_info.max, 0, 1000, width * 0.3, width * 0.9);
    ctx.moveTo(x, height * 0.5);
    ctx.lineTo(x, height * 0.5 - 10);
    ctx.stroke();
    
    if (canvas_info.max > 2 && canvas_info.max < 1000) {
        ctx.fillText(canvas_info.max, x - (canvas_info.max >= 100 ? 10 : (canvas_info.max >= 10 ? 5 : 0)), x > width * 0.9 - 19 ? scale_y_offset - 10 : scale_y_offset);
        ctx.fillText("max", x - 10, x > width * 0.9 - 19 ? text_y_offset + 10 : text_y_offset);

        if (highlight) {
            ctx.beginPath();
            ctx.arc(x, height * 0.5, dot_radius / 2, 0, 2 * Math.PI);
            ctx.fill();
        }
    }
}
function redraw_canvas() {
    for (let can of CANVAS_INFOS) {
        Filter_drawCanvas(can);
    }
}

//WORD FILTER
function WordFilter_addWord(target) {
    const word = document.getElementById('WordFilter_input').value;
    
    const casesensitive = document.getElementById('WordFilter_CS').value;
    const in_word_use = document.getElementById('WordFilter_IWU').value;
    const block_patterns = document.getElementById('WordFilter_BP').value;

    const ignore_emotes = document.getElementById('WordFilter_IE').value;
    const emote_only = document.getElementById('WordFilter_EO').value;
    const include_BTTV = document.getElementById('WordFilter_BTTV').value;
    const include_FFZ = document.getElementById('WordFilter_FFZ').value;

    const weight = parseInt(document.getElementById('WordFilter_WEIGHT').value);
    
    if (!word) return document.getElementById('WordFilter_input').setAttribute('missing', 'true');
    const data = { target, word, casesensitive, in_word_use, block_patterns, ignore_emotes, emote_only, include_BTTV, include_FFZ, weight };

    let options = getAuthHeader();
    options['method'] = 'POST';
    options['headers']['Content-Type'] = 'application/json';
    options['body'] = JSON.stringify(data);
    
    fetch("api/ChatModeration/WordFilter", options)
        .then(STANDARD_FETCH_RESPONSE_CHECKER)
        .then(json => {
            document.getElementById('WordFilter_input').removeAttribute('missing');

            if (target === 'blacklist') {
                FILTER_DATA['Word Filter'].custom_data.Blacklist.push(json);
                document.getElementById('WordFilter_BL').innerHTML = CUSTOM_DATA['WordFilter_BL'](FILTER_DATA['Word Filter'].custom_data.Blacklist);
            } else {
                FILTER_DATA['Word Filter'].custom_data.Whitelist.push(json);
                document.getElementById('WordFilter_WL').innerHTML = CUSTOM_DATA['WordFilter_WL'](FILTER_DATA['Word Filter'].custom_data.Whitelist);
            }
            
            document.getElementById('WordFilter_input').value = "";
            OUTPUT_showInfo('Word Added!', document.getElementById('FILTER_OUTPUT_Word_Filter'));
        })
        .catch(err => {
            document.getElementById('WordFilter_input').setAttribute('missing', 'true');
            console.log(err);
            OUTPUT_showError(err.message, document.getElementById('FILTER_OUTPUT_Word_Filter'));
        });
}
function WordFilter_removeWord(word, target) {
    if (!word) return;
    const data = { action: 'remove', word, target };

    let options = getAuthHeader();
    options['method'] = 'DELETE';
    options['headers']['Content-Type'] = 'application/json';
    options['body'] = JSON.stringify(data);

    fetch("api/ChatModeration/WordFilter", options)
        .then(STANDARD_FETCH_RESPONSE_CHECKER)
        .then(json => {
            if (target === 'blacklist') {
                let idx = -1;
                FILTER_DATA['Word Filter'].custom_data.Blacklist.find((elt, index) => {
                    if (elt.word.toLowerCase() === word.toLowerCase()) {
                        idx = index;
                        return true;
                    }
                    return false;
                });
                if (idx >= 0) FILTER_DATA['Word Filter'].custom_data.Blacklist.splice(idx, 1);
                document.getElementById('WordFilter_BL').innerHTML = CUSTOM_DATA['WordFilter_BL'](FILTER_DATA['Word Filter'].custom_data.Blacklist);
            } else {
                let idx = -1;
                FILTER_DATA['Word Filter'].custom_data.Whitelist.find((elt, index) => {
                    if (elt.word.toLowerCase() === word.toLowerCase()) {
                        idx = index;
                        return true;
                    }
                    return false;
                });
                if (idx >= 0) FILTER_DATA['Word Filter'].custom_data.Whitelist.splice(idx, 1);
                document.getElementById('WordFilter_WL').innerHTML = CUSTOM_DATA['WordFilter_WL'](FILTER_DATA['Word Filter'].custom_data.Whitelist);
            }

            OUTPUT_showInfo('Word Removed!', document.getElementById('FILTER_OUTPUT_Word_Filter'));
        })
        .catch(err => {
            console.log(err);
            OUTPUT_showError(err.message, document.getElementById('FILTER_OUTPUT_Word_Filter'));
        });
}
async function WordFilter_clearList(target) {
    let answer = 'NO';

    try {
        answer = await MISC_USERCONFIRM('ARE YOU SURE YOU WANT THIS?', 'Do you really want to remove ALL ' + target.toUpperCase() + ' Words?');
    } catch (err) {

    }
    if (answer !== 'YES') return Promise.resolve();

    const data = { action: 'clear', target };

    let options = getAuthHeader();
    options['method'] = 'DELETE';
    options['headers']['Content-Type'] = 'application/json';
    options['body'] = JSON.stringify(data);

    fetch("api/ChatModeration/WordFilter", options)
        .then(STANDARD_FETCH_RESPONSE_CHECKER)
        .then(json => {
            if (target === 'blacklist') {
                FILTER_DATA['Word Filter'].custom_data.Blacklist = [];
                document.getElementById('WordFilter_BL').innerHTML = CUSTOM_DATA['WordFilter_BL'](FILTER_DATA['Word Filter'].custom_data.Blacklist);
            } else {
                FILTER_DATA['Word Filter'].custom_data.Whitelist = [];
                document.getElementById('WordFilter_WL').innerHTML = CUSTOM_DATA['WordFilter_WL'](FILTER_DATA['Word Filter'].custom_data.Whitelist);
            }

            OUTPUT_showInfo('Words Removed!', document.getElementById('FILTER_OUTPUT_Word_Filter'));
        })
        .catch(err => {
            console.log(err);
            OUTPUT_showError(err.message, document.getElementById('FILTER_OUTPUT_Word_Filter'));
        });
}

//Link Filter
function LinkFilter_addLink(target) {
    const URL = document.getElementById('LinkFilter_input').value;
    if (!URL) return document.getElementById('LinkFilter_input').setAttribute('missing', 'true');

    const url = document.getElementById('LinkFilter_URL').value;
    const domain = document.getElementById('LinkFilter_Domain').value;
    const subdomain = document.getElementById('LinkFilter_SubDomain').value;
    const folder = document.getElementById('LinkFilter_Folder').value;
    const queries = document.getElementById('LinkFilter_Queries').value;

    const weight = document.getElementById('LinkFilter_Weight').value || 0;
    
    let link;
    let type;

    if (url) {
        link = getURL(URL);
        type = 'url';
    }
    if (domain) {
        link = getDomain(URL);
        type = 'domain';
    }
    if (subdomain) {
        link = getSubDomain(URL);
        type = 'subdomain';
    }
    if (folder) {
        link = getURLFolder(URL);
        type = 'folder';
    }
    if (queries) {
        link = getURLQueries(URL).pre + '?' + getURLQueries(URL).queries.join('&');
        type = 'queries';
    }

    const data = { target, type, link, weight };
    
    let options = getAuthHeader();
    options['method'] = 'POST';
    options['headers']['Content-Type'] = 'application/json';
    options['body'] = JSON.stringify(data);

    fetch("api/ChatModeration/LinkFilter", options)
        .then(STANDARD_FETCH_RESPONSE_CHECKER)
        .then(json => {
            document.getElementById('LinkFilter_input').removeAttribute('missing');
            document.getElementById('LinkFilter_input').value = "";

            if (target === 'blacklist') {
                FILTER_DATA['Link Filter'].custom_data.Blacklist.push(json);
                document.getElementById('LinkFilter_BL').innerHTML = CUSTOM_DATA['LinkFilter_BL'](FILTER_DATA['Link Filter'].custom_data.Blacklist);
            } else {
                FILTER_DATA['Link Filter'].custom_data.Whitelist.push(json);
                document.getElementById('LinkFilter_WL').innerHTML = CUSTOM_DATA['LinkFilter_WL'](FILTER_DATA['Link Filter'].custom_data.Whitelist);
            }

            OUTPUT_showInfo('Link Added!', document.getElementById('FILTER_OUTPUT_Link_Filter'));
        })
        .catch(err => {
            document.getElementById('LinkFilter_input').setAttribute('missing', 'true');
            console.log(err);
            OUTPUT_showError(err.message, document.getElementById('FILTER_OUTPUT_Link_Filter'));
        });
}
function LinkFilter_removeLink(target, type, link) {
    const data = { target, action: 'single', type, link };
    
    let options = getAuthHeader();
    options['method'] = 'DELETE';
    options['headers']['Content-Type'] = 'application/json';
    options['body'] = JSON.stringify(data);
    
    fetch("api/ChatModeration/LinkFilter", options)
        .then(STANDARD_FETCH_RESPONSE_CHECKER)
        .then(json => {
            if (target === 'blacklist') {
                let idx = -1;
                FILTER_DATA['Link Filter'].custom_data.Blacklist.find((elt, index) => {
                    if (elt.link.toLowerCase() === link.toLowerCase() && elt.type.toLowerCase() === type.toLowerCase()) {
                        idx = index;
                        return true;
                    }
                    return false;
                });
                if (idx >= 0) FILTER_DATA['Link Filter'].custom_data.Blacklist.splice(idx, 1);
                document.getElementById('LinkFilter_BL').innerHTML = CUSTOM_DATA['LinkFilter_BL'](FILTER_DATA['Link Filter'].custom_data.Blacklist);
            } else {
                let idx = -1;
                FILTER_DATA['Link Filter'].custom_data.Whitelist.find((elt, index) => {
                    if (elt.link.toLowerCase() === link.toLowerCase() && elt.type.toLowerCase() === type.toLowerCase()) {
                        idx = index;
                        return true;
                    }
                    return false;
                });
                if (idx >= 0) FILTER_DATA['Link Filter'].custom_data.Whitelist.splice(idx, 1);
                document.getElementById('LinkFilter_WL').innerHTML = CUSTOM_DATA['LinkFilter_WL'](FILTER_DATA['Link Filter'].custom_data.Whitelist);
            }

            OUTPUT_showInfo('Link Removed!', document.getElementById('FILTER_OUTPUT_Link_Filter'));
        })
        .catch(err => {
            console.log(err);
            OUTPUT_showError(err.message, document.getElementById('FILTER_OUTPUT_Link_Filter'));
        });
}
async function LinkFilter_clearList(target) {
    let answer = 'NO';

    try {
        answer = await MISC_USERCONFIRM('ARE YOU SURE YOU WANT THIS?', 'Do you really want to remove ALL ' + target.toUpperCase() + ' Link?');
    } catch (err) {

    }
    if (answer !== 'YES') return Promise.resolve();

    const data = { target, action: 'clear' };

    let options = getAuthHeader();
    options['method'] = 'DELETE';
    options['headers']['Content-Type'] = 'application/json';
    options['body'] = JSON.stringify(data);

    fetch("api/ChatModeration/LinkFilter", options)
        .then(STANDARD_FETCH_RESPONSE_CHECKER)
        .then(json => {
            if (target === 'blacklist') {
                FILTER_DATA['Link Filter'].custom_data.Blacklist = [];
                document.getElementById('LinkFilter_BL').innerHTML = CUSTOM_DATA['LinkFilter_BL'](FILTER_DATA['Link Filter'].custom_data.Blacklist);
            } else {
                FILTER_DATA['Link Filter'].custom_data.Whitelist = [];
                document.getElementById('LinkFilter_WL').innerHTML = CUSTOM_DATA['LinkFilter_WL'](FILTER_DATA['Link Filter'].custom_data.Whitelist);
            }

            OUTPUT_showInfo('Links Removed!', document.getElementById('FILTER_OUTPUT_Link_Filter'));
        })
        .catch(err => {
            console.log(err);
            OUTPUT_showError(err.message, document.getElementById('FILTER_OUTPUT_Link_Filter'));
        });
}

function LinkFilter_blockchange(elt) {
    if (elt.getAttribute('disabled') === "true") return;
    let url = document.getElementById('LinkFilter_URL');
    let domain = document.getElementById('LinkFilter_Domain');
    let subdomain = document.getElementById('LinkFilter_SubDomain');
    let folder = document.getElementById('LinkFilter_Folder');
    let queries = document.getElementById('LinkFilter_Queries');

    url.removeAttribute('disabled');
    domain.removeAttribute('disabled');
    subdomain.removeAttribute('disabled');
    url.removeAttribute('disabled');
    folder.removeAttribute('disabled');
    queries.removeAttribute('disabled');

    if (elt.value && elt.id === 'LinkFilter_Domain') {
        SWITCHBUTTON_TOGGLE(url, false);
        SWITCHBUTTON_TOGGLE(subdomain, false);
        SWITCHBUTTON_TOGGLE(folder, false);
        SWITCHBUTTON_TOGGLE(queries, false);
        domain.setAttribute('disabled', 'true');
    } else if (elt.value && elt.id === 'LinkFilter_SubDomain') {
        SWITCHBUTTON_TOGGLE(domain, false);
        SWITCHBUTTON_TOGGLE(url, false);
        SWITCHBUTTON_TOGGLE(folder, false);
        SWITCHBUTTON_TOGGLE(queries, false);
        subdomain.setAttribute('disabled', 'true');
    } else if (elt.value && elt.id === 'LinkFilter_Folder') {
        SWITCHBUTTON_TOGGLE(domain, false);
        SWITCHBUTTON_TOGGLE(url, false);
        SWITCHBUTTON_TOGGLE(subdomain, false);
        SWITCHBUTTON_TOGGLE(queries, false);
        folder.setAttribute('disabled', 'true');
    } else if (elt.value && elt.id === 'LinkFilter_Queries') {
        SWITCHBUTTON_TOGGLE(domain, false);
        SWITCHBUTTON_TOGGLE(url, false);
        SWITCHBUTTON_TOGGLE(subdomain, false);
        SWITCHBUTTON_TOGGLE(folder, false);
        queries.setAttribute('disabled', 'true');
    } else {
        SWITCHBUTTON_TOGGLE(folder, false);
        SWITCHBUTTON_TOGGLE(subdomain, false);
        SWITCHBUTTON_TOGGLE(domain, false);
        SWITCHBUTTON_TOGGLE(queries, false);
        url.setAttribute('disabled', 'true');
    }
}
function LinkFilter_inputChange(elt) {
    let url = document.getElementById('LinkFilter_URL').parentElement.childNodes[2];
    let domain = document.getElementById('LinkFilter_Domain').parentElement.childNodes[2];
    let subdomain = document.getElementById('LinkFilter_SubDomain').parentElement.childNodes[2];
    let folder = document.getElementById('LinkFilter_Folder').parentElement.childNodes[2];
    let queries = document.getElementById('LinkFilter_Queries').parentElement.childNodes[2];

    subdomain.innerHTML = getSubDomain(elt.value);
    domain.innerHTML = getDomain(elt.value);
    url.innerHTML = getURL(elt.value);
    folder.innerHTML = getURLFolder(elt.value);
    let quer = getURLQueries(elt.value);
    queries.innerHTML = quer.pre + " + " + (quer.queries.length > 0 ? quer.queries.join(" or ") : 'NO QUERIES');
}

function LinkFilter_inputMessage(elt) {
    elt.parentElement.classList.add('changed');
}
function LinkFilter_save(elt) {
    let action = "";
    if (elt.id == "LinkFilter_Global_msg") action = "gobal_message";
    if (elt.id == "LinkFilter_Domain_msg") action = "domain_block_message";
    if (elt.id == "LinkFilter_SubDomain_msg") action = "subdomain_block_message";
    if (elt.id == "LinkFilter_URL_msg") action = "url_block_message";
    const data = { name: 'Link Filter', action, value: elt.parentElement.childNodes[2].value };

    let options = getAuthHeader();
    options['method'] = 'PUT';
    options['headers']['Content-Type'] = 'application/json';
    options['body'] = JSON.stringify(data);

    fetch("api/ChatModeration/filters/settings", options)
        .then(STANDARD_FETCH_RESPONSE_CHECKER)
        .then(json => {
            initLinkFilter(json.updated_settings);
            OUTPUT_showInfo("Setting Updated!");
            elt.parentElement.classList.remove('cut');
            elt.remove();
        })
        .catch(err => {
            console.log(err);
            OUTPUT_showError(err.message);
        });
}

function getURL(URL) {
    let out = URL;
    if (URL.substring(0, 8) == "https://") {
        out = URL.substring(8);
    } else if (URL.substring(0, 7) == "http://") {
        out = URL.substring(7);
    }

    if (out.substring(0, 4) == "www.") {
        out = out.substring(4);
    }
    
    return encodeURI(out);
}
function getDomain(URL) {
    let subdomainSplitted = getSubDomain(URL).split(".");

    if (subdomainSplitted.length < 3) {
        return getURL(URL).split("/")[0];
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
function getSubDomain(URL) {
    return getURL(URL).split("/")[0].split("?")[0].split("#")[0];
}
function getURLFolder(URL) {
    let splitted = getURL(URL).split('/');
    splitted.pop();
    return splitted.join('/');
}
function getURLQueries(URL) {
    let url = getURL(URL);
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

//Automod
function SHOW_AUTOMOD_STATUS(automod = {}) {
    if (automod === 'No Scope Access!') return document.getElementById('AutoMod').innerHTML = "<center>NO SCOPE ACCESS</center>";

    let s = '';
   
    //Overall
    s += '<div id="AUTOMOD_OA">';
    s += '<div>OVERALL AUTOMOD LEVEL</div>';
    //4
    s += '<div class="AUTOMOD_OA_WR" id="AUTOMOD_OA_4">';
    //3
    s += '<div class="AUTOMOD_OA_WR" id="AUTOMOD_OA_3">';
    //2
    s += '<div class="AUTOMOD_OA_WR" id="AUTOMOD_OA_2">';
    //1
    s += '<div class="AUTOMOD_OA_WR" id="AUTOMOD_OA_1">';
    //0
    s += '<div class="AUTOMOD_OA_WR AUTOMOD_OA_T" id="AUTOMOD_OA_0">0</div>';

    s += '<div class="AUTOMOD_OA_T">1</div>';
    s += '</div>';

    s += '<div class="AUTOMOD_OA_T">2</div>';
    s += '</div>';

    s += '<div class="AUTOMOD_OA_T">3</div>';
    s += '</div>';

    s += '<div class="AUTOMOD_OA_T">4</div>';
    s += '</div>';
    s += '</div>';

    //Individual
    s += '<div id="AUTOMOD_ID">';

    for (let key in automod) {
        if (key === 'moderator_id' || key === 'broadcaster_id' || key === 'overall_level') continue;
        s += '<div>' + key + ' : ' + automod[key] + '</div>';
    }
    s += '</div>';

    document.getElementById("AutoMod").innerHTML = s;
    document.getElementById("AutoMod").dataset.level = automod.overall_level;
}

//TTV BANNED LIST
function SHOW_TTV_BANS(data = {}) {
    let options1 = {
        headers: ['user', 'reason', 'moderator', 'settings'],
        header_translation: {
            user: 'user_name',
            moderator: 'moderator_name'
        },
        empty_text: data === 'No Scope Access!' ? 'NO SCOPE ACCESS' : 'EMPTY',
        column_addition: {
            settings: (x) => '<button onclick="TTV_UNBAN(' + "'" + x.user_id + "'" + ')" red>UNBAN</button>'
        }
    };
    document.getElementById("BannedList").innerHTML = MISC_createTable(data.data || [], options1);
}
function TTV_UNBAN(user_id, user_name) {
    let options = getAuthHeader();
    options['method'] = 'DELETE';
    options['headers']['Content-Type'] = 'application/json';
    options['body'] = JSON.stringify({ user_id, user_name });

    fetch("api/ChatModeration/ttv/bans", options)
        .then(STANDARD_FETCH_RESPONSE_CHECKER)
        .then(json => {
            BANS.data = BANS.data.filter(elt => elt.user_id !== user_id);
            SHOW_TTV_BANS(BANS.data);
        })
        .catch(err => {
            console.log(err);
            OUTPUT_showError(err.message, document.getElementById('BANS_OUTPUT'));
        });
}

//USER HISTORY
function SHOW_USER_HISTORY(data = {}) {
    let options2 = {
        headers: ['user', 'stream', 'punishment_score', 'issues', 'settings'],
        header_translation: {
            user: 'user_name',
            stream: 'stream_id'
        },
        content_translation: {
            issues: (x) => {
                let s = '';
                for (let iss of x) {
                    s += '<span style="display: block;">' + iss.reason + ' -> ' + iss.exact_reason + ' -> ' + iss.punishment + '</span>';
                }
                return s;
            }
        },
        column_addition: {
            settings: (x) => '<button onclick="History_revoke(' + "'" + x.user_id + "', '" + x.stream_id + "'" + ')" red>REVOKE LAST</button><button onclick="History_reset(' + "'" + x.user_id + "', '" + x.stream_id + "'" + ')" red>RESET</button>'
        }
    };
    document.getElementById("UserHistory").innerHTML = MISC_createTable(data.data || [], options2);
}
function History_revoke(user_id, stream_id) {
    let options = getAuthHeader();
    options['method'] = 'PUT';
    options['headers']['Content-Type'] = 'application/json';
    options['body'] = JSON.stringify({ user_id, stream_id });
    
    fetch("api/ChatModeration/history", options)
        .then(STANDARD_FETCH_RESPONSE_CHECKER)
        .then(json => {
            let user = HISTORY.data.find(elt => elt.user_id == user_id && elt.stream_id == stream_id);
            if (!user) return OUTPUT_showError("User not found!", document.getElementById('HISTORY_OUTPUT'));
            user.issues.pop();

            if (user.issues.length === 0) {
                HISTORY.data = HISTORY.data.filter(elt => elt.user_id != user_id && elt.stream_id != stream_id);
            }

            SHOW_USER_HISTORY(HISTORY.data);
        })
        .catch(err => {
            console.log(err);
            OUTPUT_showError(err.message, document.getElementById('HISTORY_OUTPUT'));
        });
}
function History_reset(user_id, stream_id) {
    let options = getAuthHeader();
    options['method'] = 'DELETE';
    options['headers']['Content-Type'] = 'application/json';
    options['body'] = JSON.stringify({ user_id, stream_id });

    fetch("api/ChatModeration/history", options)
        .then(STANDARD_FETCH_RESPONSE_CHECKER)
        .then(json => {
            HISTORY.data = HISTORY.data.filter(elt => elt.user_id != user_id || elt.stream_id != stream_id);
            SHOW_USER_HISTORY(HISTORY.data);
        })
        .catch(err => {
            console.log(err);
            OUTPUT_showError(err.message, document.getElementById('HISTORY_OUTPUT'));
        });
}