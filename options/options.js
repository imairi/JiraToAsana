var defaultAsanaSettings = {};
var defaultJiraSettings = {};
var defaultProjects = [];
var defaultCustomFields = {};
var currentProjects = {};
var currentCustomFieldsHTML = "";
var teamID = "";
var accessToken = "";

window.addEventListener('load',()=>{ 
    chrome.storage.local.get(["asanaSettings", "jiraSettings", "projects", "customFields"], function (value) {
      defaultAsanaSettings = value.asanaSettings;
      defaultJiraSettings = value.jiraSettings;
      defaultProjects = value.projects;
      defaultCustomFields = value.customFields;

      if (defaultAsanaSettings == null && defaultJiraSettings == null) {
        alert("\n✨✨ Welcome!! ✨✨\n Input Asana and Jira Settings.");
        return
      }

      if (defaultAsanaSettings == null) {
        alert("🙏\nInput Asana Settings for connecting Asana.");
        return
      } else {
        teamID = defaultAsanaSettings["teamID"];
        accessToken = defaultAsanaSettings["accessToken"];

        document.getElementById('access-token').value = defaultAsanaSettings["accessToken"];
        document.getElementById('workspace-id').value = defaultAsanaSettings["workspaceID"];
        document.getElementById('team-id').value = defaultAsanaSettings["teamID"];
      }

      if (defaultJiraSettings == null) {
        alert("🙏\nInput Jira Settings for detecting Jira tasks.");
        return
      } else {
        document.getElementById('jira-prefix').value = defaultJiraSettings["jiraPrefix"];
        document.getElementById('jira-regexp').value = defaultJiraSettings["jiraRegexp"];
      }

      getProjects(function() {
        loadCustomFields();
      });
    });
})

function getProjects(callBack) {
    if (teamID == null || teamID == "" || accessToken == null || accessToken == "") {
      alert("Please set 'Personal Access Token' or 'Asana Team ID'.");
      return
    }

    document.getElementById('asana-projects').innerHTML = '<img class="loader" src="../images/loading.gif">';

    const projectsRequest = new XMLHttpRequest();
    const projectsURL = "https://app.asana.com/api/1.0/teams/" + teamID + "/projects?archived=false&limit=100";
    projectsRequest.open("GET", projectsURL, true);
    projectsRequest.setRequestHeader("Content-Type", "application/json");
    projectsRequest.setRequestHeader("Authorization", "Bearer " + accessToken);
    projectsRequest.send("");
    projectsRequest.onreadystatechange = function() {
        document.getElementById('asana-projects').innerHTML = '';
        if (this.status === 200) {
          if (this.readyState === XMLHttpRequest.DONE) {
              projectsResponse = JSON.parse(projectsRequest.responseText);
              let htmlForAsanaProjects = "";
              projectsResponse.data.forEach(data => {
                  let checkedText = defaultProjects.includes(data["gid"]) ? "checked" : "";
                  htmlForAsanaProjects += '<div><input type="checkbox" name="project" value="' + data["gid"]  + '" ' + checkedText + '><label>' + data["name"]  + '</label></div>';
                  currentProjects[data["gid"]] = data["name"];
              });
              document.getElementById('asana-projects').innerHTML = htmlForAsanaProjects;
              callBack();
          }
        } else {
          document.getElementById('asana-projects').innerHTML = '情報取得に失敗しました';
        }
    }
}

function getCustomFields(projectID) {
    document.getElementById('custom-fields-loading').insertAdjacentHTML('beforeend', '<img class="loader" data-projectID="' + projectID + '" src="../images/loading.gif">');

    const customFieldsRequest = new XMLHttpRequest();
    const customFieldsURL = "https://app.asana.com/api/1.0/projects/" + projectID  + "/custom_field_settings?opt_fields=custom_field&limit=100";
    customFieldsRequest.open("GET", customFieldsURL, true);
    customFieldsRequest.setRequestHeader("Content-Type", "application/json");
    customFieldsRequest.setRequestHeader("Authorization", "Bearer " + accessToken);
    customFieldsRequest.send("");
    customFieldsRequest.onreadystatechange = function() {
        const loaders = document.getElementsByClassName("loader");
        for(let i = 0; i < loaders.length; i++) { 
          if (loaders[i].dataset.projectid == projectID) {
            loaders[i].remove();
          }
        }
        if (this.status === 200) {
          if (this.readyState === XMLHttpRequest.DONE) {
            customFieldsResponse = JSON.parse(customFieldsRequest.responseText);
            let htmlForCustomFields = "";
            htmlForCustomFields += '<div class="custom-field-project-name">' + currentProjects[projectID]  + '</div>'
            customFieldsResponse.data.forEach(data => {
                if (data.custom_field.type == "enum") {
                  htmlForCustomFields += '<div class="custom-field-name">' + data.custom_field["name"]  + '</div>';
                  htmlForCustomFields += '<form class="custom-field-form">';
                  const customFieldID = data.custom_field.gid;
                  data.custom_field.enum_options.forEach(option => {
                    const defaultOptionID = defaultCustomFields[customFieldID];
                    let checkedText = "";
                    if (defaultOptionID == option["gid"]) {
                      checkedText = "checked";
                    }  
                    htmlForCustomFields += '<div><input type="radio" data-customField="' + customFieldID + '" value="' + option["gid"]  + '" ' + checkedText + '><label>' + option["name"]  + '</label></div>';
                  });
                  htmlForCustomFields += '</form>'
                }
            });
            currentCustomFieldsHTML += htmlForCustomFields;
            document.getElementById('custom-fields').innerHTML = currentCustomFieldsHTML;
        }
      } else {
          let htmlForCustomFields = "";
          htmlForCustomFields += '<div class="custom-field-project-name">' + currentProjects[projectID]  + '</div>';
          document.getElementById('custom-fields').innerHTML = '情報取得に失敗しました';
      }
    }
}

function saveAsanaSettings() {
  const asanaSettings = {};
  const _accessToken = document.getElementById("access-token").value;
  const _workspaceID = document.getElementById("workspace-id").value;
  const _teamID = document.getElementById("team-id").value;

  asanaSettings["accessToken"] = _accessToken;
  asanaSettings["workspaceID"] = _workspaceID;
  asanaSettings["teamID"] = _teamID;

  chrome.storage.local.set({'asanaSettings': asanaSettings}, function() {
    alert("👍 Successfully saved Asana Settings.\nNow fetching projects.")
    defaultAsanaSettings = asanaSettings;
    accessToken = _accessToken;
    teamID = _teamID;
    clearProjects(function() { 
      getProjects(function() { 
        loadCustomFields();
      });
    });
    clearCustomFields(function(){});
  });
}

function saveJiraSettings() {
  const jiraSettings = {};
  const _jiraPrefix = document.getElementById("jira-prefix").value;
  const _jiraRegexp = document.getElementById("jira-regexp").value;

  jiraSettings["jiraPrefix"] = _jiraPrefix;

  if (_jiraRegexp != null) {
    jiraSettings["jiraRegexp"] = _jiraRegexp;
  }

  chrome.storage.local.set({'jiraSettings': jiraSettings}, function() {
    alert("👍 Successfully saved Jira Settings.")
  });
}

function saveProjects() {
  const projects = [];
  const project = document.form1.project;

  for (let i = 0; i < project.length; i++) {
    if (project[i].checked) { 
      projects.push(project[i].value);
    }
  }
  chrome.storage.local.set({'projects': projects}, function() {
    alert("👍 Successfully saved Projects.")
    defaultProjects = projects;
    clearCustomFields(function () { loadCustomFields();} );
  });
}

function clearProjects(callBack) {
  chrome.storage.local.set({'projects': []}, function() {
    defaultProjects = [];
    document.getElementById('asana-projects').innerHTML = "";
    callBack();
  });
}

function saveCustomFields() {
  const customFields = {};
  const forms = document.getElementsByClassName("custom-field-form");
  for(let i = 0; i <forms.length; i++){ 
    let inputs = forms[i].getElementsByTagName("input");
    for(let j = 0; j <inputs.length; j++){ 
      if (inputs[j].checked) {
        const optionID = inputs[j].value;
        const customFieldID = inputs[j].dataset.customfield;
        customFields[customFieldID] = optionID;
      }
    }
  }
  chrome.storage.local.set({'customFields': customFields}, function() {
    alert("👍 Successfully saved Custom Fields.")
  });
}

function clearCustomFields(callBack) {
  chrome.storage.local.set({'customFields': {}}, function() {
    defaultCustomFields = {};
    currentCustomFieldsHTML = "";
    document.getElementById('custom-fields').innerHTML = "";
    callBack();
  });
}

function loadCustomFields() {
  defaultProjects.forEach(projectID => {
    getCustomFields(projectID);
  });
}

document.addEventListener('DOMContentLoaded', function() {
    document.querySelector('#saveAsanaSettingsButton').addEventListener('click', saveAsanaSettings);
});

document.addEventListener('DOMContentLoaded', function() {
    document.querySelector('#saveJiraSettingsButton').addEventListener('click', saveJiraSettings);
});

document.addEventListener('DOMContentLoaded', function() {
    document.querySelector('#saveProjectsButton').addEventListener('click', saveProjects);
});

document.addEventListener('DOMContentLoaded', function() {
    document.querySelector('#saveCustomFieldsButton').addEventListener('click', saveCustomFields);
});

