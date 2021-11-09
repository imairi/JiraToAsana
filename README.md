<div align="center">
  <img src="images/logo.png" width="800">
</div>

# JiraToAsana

Copy Jira ticket to Asana from Chrome Extension.

The below options are automatically set to Asana task.

- multiple projects
- custom field options(enum) for each project

Let's save time to copy & paste Jira ticket to Asana as much as possible.

# Features

## Create Asana task

Open JiraToAsana, it loads Jira title and url. Click "Create Task" button, Asana task will be created following the Jira ticket with custom settings. Custom settings detail is reffered to the below.

## Show Related tasks

If related tasks for the Jira tickets in Asana, the tasks link will be displayed in the extension. It is the results for searching the Jira number in Asana.


# Settings

There are some settings in the extension option page. These settings are stored in Chrome local storage. If it occurred some problems cannot resolved by yourself, delete extension and install again.

## Asana Settings

Please input your Personal Access Token for connecting Asana. You can generate PAT from [Asana Developer app console](https://app.asana.com/0/my-apps).

Additionally, Workspace ID and Team ID should be inputted to use this extension. Workspace ID is used for creating Asana task, Team ID is for getting Asana projects and custom fields.

Use [Asana API Explorer](https://developers.asana.com/explorer) for getting these IDs.

```
GET /workspaces?
GET /organizations/:workspace_gid/teams
```

## Projects

List up the Projects following the team. Check the project, the created Asana task will be added to the projects.

Once save Asana Settings, all Projects settings are cleared and reloaded.

## Custom Fields

List up the Custom Fields following the checked projects. This extension is compatible to only enum options.

If reset the selected options, save Projects again.

## Jira Settings

Jira prefix should be set for detecting Jira number. Jira prefix is like the below. It is all uppercase letter.

```
https://xxx.atlassian.net/browse/{Jira prefix}-12345
```

If cut off the phrase from Jira ticket title when copy to Asana, input Regexp field like this.

```
【.*】| - Jira
```

If input the above regexp, the title is converted like the below.

```
[IMAIRI-12345] 【v5.0.0】【Chrome】Chrome Extension is not working for some users. - Jira
↓
[IMAIRI-12345] Chrome Extension is not working for some users.
```
