const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('localAI', {
    isElectron: true,

    // ── sd.cpp engine ──────────────────────────────────────────────────────
    getBinaryStatus: () => ipcRenderer.invoke('local-ai:binary-status'),
    downloadBinary: () => ipcRenderer.invoke('local-ai:download-binary'),

    listModels: () => ipcRenderer.invoke('local-ai:list-models'),
    downloadModel: (modelId) => ipcRenderer.invoke('local-ai:download-model', modelId),
    downloadAuxiliary: (auxKey) => ipcRenderer.invoke('local-ai:download-auxiliary', auxKey),
    deleteModel: (modelId) => ipcRenderer.invoke('local-ai:delete-model', modelId),
    cancelDownload: (modelId) => ipcRenderer.invoke('local-ai:cancel-download', modelId),

    generate: (params) => ipcRenderer.invoke('local-ai:generate', params),
    cancelGeneration: () => ipcRenderer.invoke('local-ai:cancel-generation'),

    // ── Wan2GP engine (local folder or remote MCP server) ──────────────────
    wan2gp: {
        getConfig:  () => ipcRenderer.invoke('wan2gp:get-config'),
        setConfig:  (cfg) => ipcRenderer.invoke('wan2gp:set-config', cfg),
        setUrl:     (url) => ipcRenderer.invoke('wan2gp:set-url', url),
        check:      (cfg) => ipcRenderer.invoke('wan2gp:check', cfg),
        pickFolder: () => ipcRenderer.invoke('wan2gp:pick-folder'),
        probe:      (url) => ipcRenderer.invoke('wan2gp:probe', url),
        listModels: () => ipcRenderer.invoke('wan2gp:list-models'),
        generate:   (params) => ipcRenderer.invoke('wan2gp:generate', params),
        cancelGeneration: () => ipcRenderer.invoke('wan2gp:cancel-generation'),
        uploadFile: (payload) => ipcRenderer.invoke('wan2gp:upload-file', payload),
        warm:       () => ipcRenderer.invoke('wan2gp:warm'),
        engineState: () => ipcRenderer.invoke('wan2gp:engine-state'),
    },

    // Progress events — both engines emit on local-ai:progress
    onProgress: (callback) => {
        const listener = (_, data) => callback(data);
        ipcRenderer.on('local-ai:progress', listener);
        return () => ipcRenderer.removeListener('local-ai:progress', listener);
    },
    onDownloadProgress: (callback) => {
        const listener = (_, data) => callback(data);
        ipcRenderer.on('local-ai:download-progress', listener);
        return () => ipcRenderer.removeListener('local-ai:download-progress', listener);
    },
});

// Payoff Studio: Cloud / Local mode (switching reloads the window).
contextBridge.exposeInMainWorld('payoffMode', {
    get: () => ipcRenderer.sendSync('payoff-mode:get'),
    set: (mode) => ipcRenderer.invoke('payoff-mode:set', mode),
});

// Payoff Studio: client projects on disk + provenance records.
contextBridge.exposeInMainWorld('payoffProjects', {
    get:          () => ipcRenderer.invoke('payoff-projects:get'),
    listProjects: (client) => ipcRenderer.invoke('payoff-projects:list-projects', client),
    set:          (cfg) => ipcRenderer.invoke('payoff-projects:set', cfg),
    pickRoot:     () => ipcRenderer.invoke('payoff-projects:pick-root'),
    open:         () => ipcRenderer.invoke('payoff-projects:open'),
    record:       (info) => ipcRenderer.invoke('payoff-projects:record', info),
});

// Payoff Studio: MuAPI prices for the cost chip (fetched in the main process).
contextBridge.exposeInMainWorld('payoffPricing', {
    price: (endpoint, body) => ipcRenderer.invoke('pricing:price', endpoint, body),
    all: () => ipcRenderer.invoke('pricing:all'),
});
