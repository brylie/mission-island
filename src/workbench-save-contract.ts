// Where the Workbench sends saves, shared by the dev server's handler and the Workbench page.
export const roadSavePath = '/__workbench/roads'
// The Workbench sends this header with the value `save`. It makes a browser preflight the
// request; the server also checks the request came from its own page (see server/workbench-save.ts).
export const workbenchSaveHeader = 'x-mission-island-workbench'
// The server rounds dot positions and bends to this many decimals when it writes roads.ts.
export const roadSaveDecimals = 2
