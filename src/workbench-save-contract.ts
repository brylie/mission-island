// Where the Workbench sends saves, shared by the dev server's handler and the Workbench page.
export const roadSavePath = '/__workbench/roads'
// The Workbench sends this header with the value `save`; a browser must preflight it, so no web page can.
export const workbenchSaveHeader = 'x-mission-island-workbench'
