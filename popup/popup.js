var pageTitle = "";
var pageURL = "";
var jiraNumber = "";
var workspaceID = "";
var accessToken = "";
var defaultAsanaSettings = {};
var defaultJiraSettings = {};
var defaultProfects = [];
var defaultCustomFields = {};

window.addEventListener('load',()=>{  
    chrome.storage.local.get(["asanaSettings", "jiraSettings", "projects", "customFields"], function (value) {
      defaultAsanaSettings = value.asanaSettings;
      defaultJiraSettings = value.jiraSettings;
      defaultProjects = value.projects;
      defaultCustomFields = value.customFields;

      if (defaultAsanaSettings == null) {
        alert("🙏\nBefore using this extension, confirm Asana Settings in options page.");
        document.getElementById('create-task').remove();
        return
      }
      if (defaultJiraSettings == null) {
        alert("🙏\nBefore using this extension, confirm Jira Settings in options page.");
        document.getElementById('create-task').remove();
        return
      }
      chrome.tabs.getSelected(tab=>{ 
          var regexp = new RegExp(defaultJiraSettings["jiraRegexp"], "g");
          var trimmedPageTitle = tab.title.replace(regexp, '');
          document.getElementById('title').innerHTML = trimmedPageTitle;
          document.getElementById('url').innerHTML = tab.url;
          pageTitle = trimmedPageTitle;
          pageURL = tab.url;

          var regexpJiraPrefix = new RegExp(defaultJiraSettings["jiraPrefix"] + "\\-\\d+");
          jiraNumber = tab.url.match(regexpJiraPrefix);
          workspaceID = defaultAsanaSettings["workspaceID"];
          accessToken = defaultAsanaSettings["accessToken"];
          getExistingTasks();
      });
    });
});

function getExistingTasks() {
    if (jiraNumber == null || jiraNumber == "") {
      alert("🙏\nSorry, Jira number cannot be detected from URL. Open Jira task individual page.");
      document.getElementById('create-task').remove();
      return
    }

    if (workspaceID == null || workspaceID == "" || accessToken == null || accessToken == "") {
      alert("🙏\nSorry, some Asana Settings are not set. Please open extension options page and check the 'Asana Settings'.");
      document.getElementById('create-task').remove();
      return
    }

    const req = new XMLHttpRequest();
    const baseUrl = "https://app.asana.com/api/1.0/workspaces/" + workspaceID + "/tasks/search?text=" + jiraNumber;

    req.open("GET", baseUrl, true);
    req.setRequestHeader("Content-Type", "application/json");
    req.setRequestHeader("Authorization", "Bearer " + accessToken );
    req.send("");
    document.getElementById('loading-box').innerHTML = '<img class="loader" src="../images/loading.gif">';
    req.onreadystatechange = function() { 
        if (this.status === 200) {
          if (this.readyState === XMLHttpRequest.DONE) {
            document.getElementById('loading-box').innerHTML = '';
            result = JSON.parse(req.responseText);

            var htmlForAsanaTasks = "";
            if (result.data == "") {
              htmlForAsanaTasks = "No Asana tasks related to this Jira task.";
            } else {
              result.data.forEach(data => {
                  htmlForAsanaTasks += '<a href="https://app.asana.com/0/0/' + data["gid"] + '/f" target="_blank">' + data["name"] + '</a><br>';
              });
            }

            document.getElementById('asana-tasks').innerHTML = htmlForAsanaTasks;
          }
        } else {
            document.getElementById('loading-box').innerHTML = '';
            document.getElementById('asana-tasks').innerHTML = 'Failed to load related Asana tasks.';
        }
    }
}

document.querySelector('#create-task').addEventListener('click',()=>{  
    if (workspaceID == null || workspaceID == "" || accessToken == null || accessToken == "") {
      alert("🙏\nSorry, some Asana Settings are not set. Please open extension options page and check the 'Asana Settings'.");
      return
    }
    let data = new Object();
    data.completed = false;
    data.name = pageTitle;
    data.notes = pageURL;
    data.projects = defaultProjects;
    data.workspace = workspaceID;
    data.custom_fields = defaultCustomFields;
    
    let requestBody = new Object();
    requestBody.data = data;
    
    let json = JSON.stringify(requestBody);

    const req = new XMLHttpRequest();
    const baseUrl = "https://app.asana.com/api/1.0/tasks";

    req.open("POST", baseUrl, true);
    req.setRequestHeader("Content-Type", "application/json");
    req.setRequestHeader("Authorization", "Bearer " + accessToken);
    req.send(json);
    document.getElementById('loading-box').innerHTML = '<img class="loader" src="../images/loading.gif">';
    req.onreadystatechange = function() { 
        if (this.status === 201) {
          if (this.readyState === XMLHttpRequest.DONE) {
            document.getElementById('loading-box').innerHTML = '';
            result = JSON.parse(req.responseText);
            document.getElementById('created-task').innerHTML = '<a href="' + result.data.permalink_url + '" target="_blank">' + result.data.name + '</a>';
          }
        } else {
          document.getElementById('loading-box').innerHTML = '';
          document.getElementById('created-task').innerHTML = 'Failed to create Asana task.';
        }
    }

});
