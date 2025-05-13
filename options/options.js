var asanaSettingsOnLoad = {};
var jiraSettingsOnLoad = {};
var projectGidForCustomFieldsOnLoad = ""; 
var customFieldSelectionsOnLoad = {}; 

var currentCustomFieldsHTML = ""; 
var currentTeamID = ""; 
var currentAccessToken = "";

window.addEventListener('load', () => {
    chrome.storage.local.get([
        "asanaSettings",
        "jiraSettings",
        "projectGidForCustomFields",
        "customFieldSelections"
    ], function (data) {
        asanaSettingsOnLoad = data.asanaSettings || {};
        jiraSettingsOnLoad = data.jiraSettings || {};
        projectGidForCustomFieldsOnLoad = data.projectGidForCustomFields || "";
        customFieldSelectionsOnLoad = data.customFieldSelections || {};

        // Asana SettingsのUI反映
        if (asanaSettingsOnLoad.accessToken) {
            document.getElementById('access-token').value = asanaSettingsOnLoad.accessToken;
            currentAccessToken = asanaSettingsOnLoad.accessToken;
        }
        if (asanaSettingsOnLoad.workspaceID) {
            document.getElementById('workspace-id').value = asanaSettingsOnLoad.workspaceID;
        }
        if (asanaSettingsOnLoad.teamID) { 
            document.getElementById('team-id').value = asanaSettingsOnLoad.teamID;
            currentTeamID = asanaSettingsOnLoad.teamID;
        }


        // Jira SettingsのUI反映
        if (jiraSettingsOnLoad.jiraPrefix) {
            document.getElementById('jira-prefix').value = jiraSettingsOnLoad.jiraPrefix;
        }
        if (jiraSettingsOnLoad.jiraRegexp) {
            document.getElementById('jira-regexp').value = jiraSettingsOnLoad.jiraRegexp;
        }

        // Project GID for Custom FieldsのUI反映
        document.getElementById('project-gid-for-custom-fields').value = projectGidForCustomFieldsOnLoad;

        // カスタムフィールド設定対象のプロジェクトがあれば読み込む
        if (projectGidForCustomFieldsOnLoad && currentAccessToken) {
            loadCustomFieldsForProject(projectGidForCustomFieldsOnLoad);
        } else {
            if (!currentAccessToken && projectGidForCustomFieldsOnLoad) {
                 alert("Please set Asana 'Personal Access Token' to load custom fields.");
            }
        }
    });
});

// Asana基本設定（トークン、ワークスペースID、チームID）を保存
function saveAsanaSettings() {
    const newAsanaSettings = {
        accessToken: document.getElementById("access-token").value,
        workspaceID: document.getElementById("workspace-id").value,
        teamID: document.getElementById("team-id").value 
    };

    chrome.storage.local.set({ 'asanaSettings': newAsanaSettings }, function () {
        alert("👍 Successfully saved Asana Settings.");
        asanaSettingsOnLoad = newAsanaSettings;
        currentAccessToken = newAsanaSettings.accessToken;
        currentTeamID = newAsanaSettings.teamID;

        document.getElementById('project-gid-for-custom-fields').value = '';
        projectGidForCustomFieldsOnLoad = '';
        clearCustomFieldsDisplay();
        chrome.storage.local.set({
            'projectGidForCustomFields': '',
            'customFieldSelections': {}
        }, () => {
            customFieldSelectionsOnLoad = {};
        });
    });
}

// Jira設定を保存
function saveJiraSettings() {
    const newJiraSettings = {
        jiraPrefix: document.getElementById("jira-prefix").value,
        jiraRegexp: document.getElementById("jira-regexp").value || ""
    };
    chrome.storage.local.set({ 'jiraSettings': newJiraSettings }, function () {
        alert("👍 Successfully saved Jira Settings.");
        jiraSettingsOnLoad = newJiraSettings;
    });
}

// 指定されたGIDのプロジェクトのカスタムフィールドを読み込むボタンの処理
function handleLoadCustomFieldsForProjectButton() {
    const projectGid = document.getElementById('project-gid-for-custom-fields').value.trim();
    if (!projectGid) {
        alert("Please enter a Project GID for Custom Fields.");
        return;
    }
    if (!currentAccessToken) {
        alert("Please set 'Personal Access Token' in Asana Settings first.");
        return;
    }
    chrome.storage.local.set({ 'projectGidForCustomFields': projectGid }, () => {
        projectGidForCustomFieldsOnLoad = projectGid; 
        alert(`📝 Set Project GID for Custom Fields to: ${projectGid}. Now loading its custom fields.`);
        loadCustomFieldsForProject(projectGid);
    });
}

function fetchProjectName(projectGid, callback) {
    if (!currentAccessToken) {
        if (callback) callback(`Project GID: ${projectGid} (Token not set)`);
        return;
    }
    const projectDetailsURL = `https://app.asana.com/api/1.0/projects/${projectGid}?opt_fields=name`;
    const request = new XMLHttpRequest();
    request.open("GET", projectDetailsURL, true);
    request.setRequestHeader("Authorization", `Bearer ${currentAccessToken}`);
    request.send();
    request.onreadystatechange = function() {
        if (this.readyState === XMLHttpRequest.DONE) {
            if (this.status === 200) {
                const response = JSON.parse(this.responseText);
                if (callback) callback(response.data.name);
            } else {
                console.error(`Failed to fetch project name for GID ${projectGid}. Status: ${this.status}`);
                if (callback) callback(`Project GID: ${projectGid} (Name not found)`);
            }
        }
    };
}


// 指定された単一プロジェクトのカスタムフィールドを読み込んで表示
function loadCustomFieldsForProject(projectGid) {
    if (!projectGid) {
        clearCustomFieldsDisplay();
        document.getElementById('custom-fields-target-project-info').textContent = "No project GID specified for custom fields.";
        return;
    }
    if (!currentAccessToken) {
        alert("Asana Access Token is not set. Cannot load custom fields.");
        return;
    }

    clearCustomFieldsDisplay();
    document.getElementById('custom-fields-loading').innerHTML = '<img class="loader" src="../images/loading.gif">';
    
    fetchProjectName(projectGid, function(projectName) {
        document.getElementById('custom-fields-target-project-info').textContent = `Custom Fields for: ${projectName}`;
    });

    const customFieldsRequest = new XMLHttpRequest();
    const customFieldsURL = `https://app.asana.com/api/1.0/projects/${projectGid}/custom_field_settings?opt_fields=custom_field.name,custom_field.gid,custom_field.type,custom_field.enum_options,custom_field.enum_options.name,custom_field.enum_options.gid&limit=100`;
    customFieldsRequest.open("GET", customFieldsURL, true);
    customFieldsRequest.setRequestHeader("Authorization", `Bearer ${currentAccessToken}`);
    customFieldsRequest.send();

    customFieldsRequest.onreadystatechange = function () {
        if (this.readyState === XMLHttpRequest.DONE) {
            document.getElementById('custom-fields-loading').innerHTML = '';
            if (this.status === 200) {
                const customFieldsResponse = JSON.parse(customFieldsRequest.responseText);
                let htmlForCustomFields = "";
                let foundEnumFields = false;
                customFieldsResponse.data.forEach(fieldSetting => {
                    const customField = fieldSetting.custom_field;
                    if (customField.type === "enum" && customField.enum_options) {
                        foundEnumFields = true;
                        htmlForCustomFields += `<div class="custom-field-name">${customField.name}</div>`;
                        htmlForCustomFields += `<form class="custom-field-form">`; 
                        const customFieldGid = customField.gid;
                        customField.enum_options.forEach(option => {
                            const previouslySelectedOptionGid = customFieldSelectionsOnLoad[customFieldGid];
                            let checkedText = (previouslySelectedOptionGid === option.gid) ? "checked" : "";
                            htmlForCustomFields += `<div><input type="radio" name="custom_field_option_${customFieldGid}" data-customfieldgid="${customFieldGid}" value="${option.gid}" ${checkedText}><label>${option.name}</label></div>`;
                        });
                        htmlForCustomFields += '</form>';
                    }
                });
                currentCustomFieldsHTML = htmlForCustomFields;
                document.getElementById('custom-fields').innerHTML = currentCustomFieldsHTML;
                if (!foundEnumFields) {
                     document.getElementById('custom-fields').innerHTML = "No enum type custom fields found for this project.";
                }
            } else {
                document.getElementById('custom-fields').innerHTML = `Failed to load custom fields. Status: ${this.status}`;
                console.error("Error fetching custom fields: ", this.status, this.responseText);
                document.getElementById('custom-fields-target-project-info').textContent = `Error loading custom fields for GID: ${projectGid}`;
            }
        }
    };
}

// 表示されているカスタムフィールドの選択値を保存
function saveCustomFieldSelections() {
    const newCustomFieldSelections = {};
    const forms = document.getElementsByClassName("custom-field-form");
    for (let i = 0; i < forms.length; i++) {
        let inputs = forms[i].getElementsByTagName("input");
        for (let j = 0; j < inputs.length; j++) {
            if (inputs[j].checked && inputs[j].type === 'radio') {
                const optionGid = inputs[j].value;
                const customFieldGid = inputs[j].dataset.customfieldgid;
                newCustomFieldSelections[customFieldGid] = optionGid;
            }
        }
    }
    chrome.storage.local.set({ 'customFieldSelections': newCustomFieldSelections }, function () {
        alert("👍 Successfully saved Custom Fields selections.");
        customFieldSelectionsOnLoad = newCustomFieldSelections;
    });
}

// カスタムフィールドの表示エリアをクリアする
function clearCustomFieldsDisplay() {
    currentCustomFieldsHTML = "";
    document.getElementById('custom-fields').innerHTML = "";
    document.getElementById('custom-fields-target-project-info').textContent = ""; 
    document.getElementById('custom-fields-loading').innerHTML = "";
}

// イベントリスナーの設定
document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('saveAsanaSettingsButton').addEventListener('click', saveAsanaSettings);
    document.getElementById('saveJiraSettingsButton').addEventListener('click', saveJiraSettings);
    document.getElementById('loadCustomFieldsForProjectButton').addEventListener('click', handleLoadCustomFieldsForProjectButton);
    document.getElementById('saveCustomFieldsButton').addEventListener('click', saveCustomFieldSelections);
});
