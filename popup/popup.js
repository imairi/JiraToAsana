var pageTitle = "";
var pageURL = "";
var jiraNumber = "";
var workspaceID = "";
var accessToken = "";

var asanaSettingsFromStorage = {};
var jiraSettingsFromStorage = {};
var projectGidForCustomFieldsFromStorage = ""; 
var customFieldSelectionsForTask = {};

window.addEventListener('load', () => {
    chrome.storage.local.get([
        "asanaSettings",
        "jiraSettings",
        "projectGidForCustomFields", 
        "customFieldSelections"
    ], function (data) {
        asanaSettingsFromStorage = data.asanaSettings || {};
        jiraSettingsFromStorage = data.jiraSettings || {};
        projectGidForCustomFieldsFromStorage = data.projectGidForCustomFields || ""; 
        customFieldSelectionsForTask = data.customFieldSelections || {};

        if (!asanaSettingsFromStorage.accessToken || !asanaSettingsFromStorage.workspaceID) {
            alert("🙏\nBefore using this extension, please confirm Asana Settings (Personal Access Token and Workspace ID) in the options page.");
            document.getElementById('create-task').remove();
            return;
        }
        if (!jiraSettingsFromStorage.jiraPrefix) {
            alert("🙏\nBefore using this extension, please confirm Jira Settings (Jira Issue Prefix) in the options page.");
            document.getElementById('create-task').remove();
            return;
        }
        // カスタムフィールドが設定されているのに、そのカスタムフィールドが属するプロジェクトGIDがない場合は警告
        if (Object.keys(customFieldSelectionsForTask).length > 0 && !projectGidForCustomFieldsFromStorage) {
            alert("⚠️\nCustom fields are set, but the project GID for these custom fields is missing. Please set 'Project GID for Custom Fields Setup' in the options page. Task creation might fail for custom fields.");
        }


        workspaceID = asanaSettingsFromStorage.workspaceID;
        accessToken = asanaSettingsFromStorage.accessToken;

        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            var tab = tabs[0];
            var jiraRegexpString = jiraSettingsFromStorage.jiraRegexp || "";
            var trimmedPageTitle = tab.title;
            if (jiraRegexpString) {
                try {
                    var regexp = new RegExp(jiraRegexpString, "g");
                    trimmedPageTitle = tab.title.replace(regexp, '');
                } catch (e) {
                    console.warn("Invalid RegExp for cutting Jira title:", e);
                }
            }

            document.getElementById('title').innerHTML = trimmedPageTitle;
            document.getElementById('url').innerHTML = tab.url;
            pageTitle = trimmedPageTitle;
            pageURL = tab.url;

            try {
                var regexpJiraPrefix = new RegExp(jiraSettingsFromStorage.jiraPrefix + "\\-\\d+");
                jiraNumber = tab.url.match(regexpJiraPrefix);
            } catch (e) {
                console.warn("Invalid RegExp for Jira Prefix:", e);
                jiraNumber = null;
            }

            getExistingTasks();
        });
    });
});

function getExistingTasks() {
    if (!workspaceID || !accessToken) {
        if(document.getElementById('create-task')) document.getElementById('create-task').remove();
        return;
    }

    const searchText = jiraNumber ? jiraNumber[0] : pageTitle;
    const req = new XMLHttpRequest();
    const baseUrl = `https://app.asana.com/api/1.0/workspaces/${workspaceID}/tasks/search?text=${encodeURIComponent(searchText)}&opt_fields=name,gid,permalink_url`;

    req.open("GET", baseUrl, true);
    req.setRequestHeader("Content-Type", "application/json");
    req.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    req.send("");
    document.getElementById('loading-box').innerHTML = '<img class="loader" src="../images/loading.gif">';
    req.onreadystatechange = function () {
        if (this.readyState === XMLHttpRequest.DONE) {
            document.getElementById('loading-box').innerHTML = '';
            if (this.status === 200) {
                const result = JSON.parse(req.responseText);
                var htmlForAsanaTasks = "";
                if (!result.data || result.data.length === 0) {
                    htmlForAsanaTasks = "No Asana tasks found related to this Jira task.";
                } else {
                    result.data.forEach(data => {
                        const taskUrl = data.permalink_url || `https://app.asana.com/0/0/${data.gid}/f`;
                        htmlForAsanaTasks += `<a href="${taskUrl}" target="_blank">${data.name}</a><br>`;
                    });
                }
                document.getElementById('asana-tasks').innerHTML = htmlForAsanaTasks;
            } else {
                document.getElementById('asana-tasks').innerHTML = `Failed to load related Asana tasks. Status: ${this.status}`;
                console.error("Error fetching existing tasks: ", this.status, this.responseText);
            }
        }
    };
}

document.querySelector('#create-task').addEventListener('click', () => {
    if (!workspaceID || !accessToken) {
        alert("🙏\nSorry, Asana Settings are not properly set. Please check the options page.");
        return;
    }

    let taskData = {
        completed: false,
        name: pageTitle,
        notes: pageURL,
        workspace: workspaceID,
        custom_fields: customFieldSelectionsForTask
    };

    if (projectGidForCustomFieldsFromStorage) {
        taskData.projects = [projectGidForCustomFieldsFromStorage];
    } else {
        if (Object.keys(customFieldSelectionsForTask).length > 0) {
            alert("⚠️ Attempting to create a task with custom fields but without a designated project for those fields. This may cause an error. Please set 'Project GID for Custom Fields Setup' in options.");
        }
    }


    if (Object.keys(customFieldSelectionsForTask).length === 0) {
        delete taskData.custom_fields;
    }

    let requestBody = {
        data: taskData
    };

    let json = JSON.stringify(requestBody);

    const req = new XMLHttpRequest();
    const baseUrl = "https://app.asana.com/api/1.0/tasks";

    req.open("POST", baseUrl, true);
    req.setRequestHeader("Content-Type", "application/json");
    req.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    req.send(json);
    document.getElementById('loading-box').innerHTML = '<img class="loader" src="../images/loading.gif">';
    req.onreadystatechange = function () {
        if (this.readyState === XMLHttpRequest.DONE) {
            document.getElementById('loading-box').innerHTML = '';
            if (this.status === 201) {
                const result = JSON.parse(req.responseText);
                document.getElementById('created-task').innerHTML = `✅️ <a href="${result.data.permalink_url}" target="_blank">${result.data.name}</a>`;
            } else {
                document.getElementById('created-task').innerHTML = `Failed to create Asana task. Status: ${this.status} - ${this.responseText}`;
                console.error("Error creating Asana task: ", this.status, this.responseText);
            }
        }
    };
});
