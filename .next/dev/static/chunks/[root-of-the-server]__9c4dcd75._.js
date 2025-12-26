(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[turbopack]/browser/dev/hmr-client/hmr-client.ts [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/// <reference path="../../../shared/runtime-types.d.ts" />
/// <reference path="../../runtime/base/dev-globals.d.ts" />
/// <reference path="../../runtime/base/dev-protocol.d.ts" />
/// <reference path="../../runtime/base/dev-extensions.ts" />
__turbopack_context__.s([
    "connect",
    ()=>connect,
    "setHooks",
    ()=>setHooks,
    "subscribeToUpdate",
    ()=>subscribeToUpdate
]);
function connect({ addMessageListener, sendMessage, onUpdateError = console.error }) {
    addMessageListener((msg)=>{
        switch(msg.type){
            case 'turbopack-connected':
                handleSocketConnected(sendMessage);
                break;
            default:
                try {
                    if (Array.isArray(msg.data)) {
                        for(let i = 0; i < msg.data.length; i++){
                            handleSocketMessage(msg.data[i]);
                        }
                    } else {
                        handleSocketMessage(msg.data);
                    }
                    applyAggregatedUpdates();
                } catch (e) {
                    console.warn('[Fast Refresh] performing full reload\n\n' + "Fast Refresh will perform a full reload when you edit a file that's imported by modules outside of the React rendering tree.\n" + 'You might have a file which exports a React component but also exports a value that is imported by a non-React component file.\n' + 'Consider migrating the non-React component export to a separate file and importing it into both files.\n\n' + 'It is also possible the parent component of the component you edited is a class component, which disables Fast Refresh.\n' + 'Fast Refresh requires at least one parent function component in your React tree.');
                    onUpdateError(e);
                    location.reload();
                }
                break;
        }
    });
    const queued = globalThis.TURBOPACK_CHUNK_UPDATE_LISTENERS;
    if (queued != null && !Array.isArray(queued)) {
        throw new Error('A separate HMR handler was already registered');
    }
    globalThis.TURBOPACK_CHUNK_UPDATE_LISTENERS = {
        push: ([chunkPath, callback])=>{
            subscribeToChunkUpdate(chunkPath, sendMessage, callback);
        }
    };
    if (Array.isArray(queued)) {
        for (const [chunkPath, callback] of queued){
            subscribeToChunkUpdate(chunkPath, sendMessage, callback);
        }
    }
}
const updateCallbackSets = new Map();
function sendJSON(sendMessage, message) {
    sendMessage(JSON.stringify(message));
}
function resourceKey(resource) {
    return JSON.stringify({
        path: resource.path,
        headers: resource.headers || null
    });
}
function subscribeToUpdates(sendMessage, resource) {
    sendJSON(sendMessage, {
        type: 'turbopack-subscribe',
        ...resource
    });
    return ()=>{
        sendJSON(sendMessage, {
            type: 'turbopack-unsubscribe',
            ...resource
        });
    };
}
function handleSocketConnected(sendMessage) {
    for (const key of updateCallbackSets.keys()){
        subscribeToUpdates(sendMessage, JSON.parse(key));
    }
}
// we aggregate all pending updates until the issues are resolved
const chunkListsWithPendingUpdates = new Map();
function aggregateUpdates(msg) {
    const key = resourceKey(msg.resource);
    let aggregated = chunkListsWithPendingUpdates.get(key);
    if (aggregated) {
        aggregated.instruction = mergeChunkListUpdates(aggregated.instruction, msg.instruction);
    } else {
        chunkListsWithPendingUpdates.set(key, msg);
    }
}
function applyAggregatedUpdates() {
    if (chunkListsWithPendingUpdates.size === 0) return;
    hooks.beforeRefresh();
    for (const msg of chunkListsWithPendingUpdates.values()){
        triggerUpdate(msg);
    }
    chunkListsWithPendingUpdates.clear();
    finalizeUpdate();
}
function mergeChunkListUpdates(updateA, updateB) {
    let chunks;
    if (updateA.chunks != null) {
        if (updateB.chunks == null) {
            chunks = updateA.chunks;
        } else {
            chunks = mergeChunkListChunks(updateA.chunks, updateB.chunks);
        }
    } else if (updateB.chunks != null) {
        chunks = updateB.chunks;
    }
    let merged;
    if (updateA.merged != null) {
        if (updateB.merged == null) {
            merged = updateA.merged;
        } else {
            // Since `merged` is an array of updates, we need to merge them all into
            // one, consistent update.
            // Since there can only be `EcmascriptMergeUpdates` in the array, there is
            // no need to key on the `type` field.
            let update = updateA.merged[0];
            for(let i = 1; i < updateA.merged.length; i++){
                update = mergeChunkListEcmascriptMergedUpdates(update, updateA.merged[i]);
            }
            for(let i = 0; i < updateB.merged.length; i++){
                update = mergeChunkListEcmascriptMergedUpdates(update, updateB.merged[i]);
            }
            merged = [
                update
            ];
        }
    } else if (updateB.merged != null) {
        merged = updateB.merged;
    }
    return {
        type: 'ChunkListUpdate',
        chunks,
        merged
    };
}
function mergeChunkListChunks(chunksA, chunksB) {
    const chunks = {};
    for (const [chunkPath, chunkUpdateA] of Object.entries(chunksA)){
        const chunkUpdateB = chunksB[chunkPath];
        if (chunkUpdateB != null) {
            const mergedUpdate = mergeChunkUpdates(chunkUpdateA, chunkUpdateB);
            if (mergedUpdate != null) {
                chunks[chunkPath] = mergedUpdate;
            }
        } else {
            chunks[chunkPath] = chunkUpdateA;
        }
    }
    for (const [chunkPath, chunkUpdateB] of Object.entries(chunksB)){
        if (chunks[chunkPath] == null) {
            chunks[chunkPath] = chunkUpdateB;
        }
    }
    return chunks;
}
function mergeChunkUpdates(updateA, updateB) {
    if (updateA.type === 'added' && updateB.type === 'deleted' || updateA.type === 'deleted' && updateB.type === 'added') {
        return undefined;
    }
    if (updateA.type === 'partial') {
        invariant(updateA.instruction, 'Partial updates are unsupported');
    }
    if (updateB.type === 'partial') {
        invariant(updateB.instruction, 'Partial updates are unsupported');
    }
    return undefined;
}
function mergeChunkListEcmascriptMergedUpdates(mergedA, mergedB) {
    const entries = mergeEcmascriptChunkEntries(mergedA.entries, mergedB.entries);
    const chunks = mergeEcmascriptChunksUpdates(mergedA.chunks, mergedB.chunks);
    return {
        type: 'EcmascriptMergedUpdate',
        entries,
        chunks
    };
}
function mergeEcmascriptChunkEntries(entriesA, entriesB) {
    return {
        ...entriesA,
        ...entriesB
    };
}
function mergeEcmascriptChunksUpdates(chunksA, chunksB) {
    if (chunksA == null) {
        return chunksB;
    }
    if (chunksB == null) {
        return chunksA;
    }
    const chunks = {};
    for (const [chunkPath, chunkUpdateA] of Object.entries(chunksA)){
        const chunkUpdateB = chunksB[chunkPath];
        if (chunkUpdateB != null) {
            const mergedUpdate = mergeEcmascriptChunkUpdates(chunkUpdateA, chunkUpdateB);
            if (mergedUpdate != null) {
                chunks[chunkPath] = mergedUpdate;
            }
        } else {
            chunks[chunkPath] = chunkUpdateA;
        }
    }
    for (const [chunkPath, chunkUpdateB] of Object.entries(chunksB)){
        if (chunks[chunkPath] == null) {
            chunks[chunkPath] = chunkUpdateB;
        }
    }
    if (Object.keys(chunks).length === 0) {
        return undefined;
    }
    return chunks;
}
function mergeEcmascriptChunkUpdates(updateA, updateB) {
    if (updateA.type === 'added' && updateB.type === 'deleted') {
        // These two completely cancel each other out.
        return undefined;
    }
    if (updateA.type === 'deleted' && updateB.type === 'added') {
        const added = [];
        const deleted = [];
        const deletedModules = new Set(updateA.modules ?? []);
        const addedModules = new Set(updateB.modules ?? []);
        for (const moduleId of addedModules){
            if (!deletedModules.has(moduleId)) {
                added.push(moduleId);
            }
        }
        for (const moduleId of deletedModules){
            if (!addedModules.has(moduleId)) {
                deleted.push(moduleId);
            }
        }
        if (added.length === 0 && deleted.length === 0) {
            return undefined;
        }
        return {
            type: 'partial',
            added,
            deleted
        };
    }
    if (updateA.type === 'partial' && updateB.type === 'partial') {
        const added = new Set([
            ...updateA.added ?? [],
            ...updateB.added ?? []
        ]);
        const deleted = new Set([
            ...updateA.deleted ?? [],
            ...updateB.deleted ?? []
        ]);
        if (updateB.added != null) {
            for (const moduleId of updateB.added){
                deleted.delete(moduleId);
            }
        }
        if (updateB.deleted != null) {
            for (const moduleId of updateB.deleted){
                added.delete(moduleId);
            }
        }
        return {
            type: 'partial',
            added: [
                ...added
            ],
            deleted: [
                ...deleted
            ]
        };
    }
    if (updateA.type === 'added' && updateB.type === 'partial') {
        const modules = new Set([
            ...updateA.modules ?? [],
            ...updateB.added ?? []
        ]);
        for (const moduleId of updateB.deleted ?? []){
            modules.delete(moduleId);
        }
        return {
            type: 'added',
            modules: [
                ...modules
            ]
        };
    }
    if (updateA.type === 'partial' && updateB.type === 'deleted') {
        // We could eagerly return `updateB` here, but this would potentially be
        // incorrect if `updateA` has added modules.
        const modules = new Set(updateB.modules ?? []);
        if (updateA.added != null) {
            for (const moduleId of updateA.added){
                modules.delete(moduleId);
            }
        }
        return {
            type: 'deleted',
            modules: [
                ...modules
            ]
        };
    }
    // Any other update combination is invalid.
    return undefined;
}
function invariant(_, message) {
    throw new Error(`Invariant: ${message}`);
}
const CRITICAL = [
    'bug',
    'error',
    'fatal'
];
function compareByList(list, a, b) {
    const aI = list.indexOf(a) + 1 || list.length;
    const bI = list.indexOf(b) + 1 || list.length;
    return aI - bI;
}
const chunksWithIssues = new Map();
function emitIssues() {
    const issues = [];
    const deduplicationSet = new Set();
    for (const [_, chunkIssues] of chunksWithIssues){
        for (const chunkIssue of chunkIssues){
            if (deduplicationSet.has(chunkIssue.formatted)) continue;
            issues.push(chunkIssue);
            deduplicationSet.add(chunkIssue.formatted);
        }
    }
    sortIssues(issues);
    hooks.issues(issues);
}
function handleIssues(msg) {
    const key = resourceKey(msg.resource);
    let hasCriticalIssues = false;
    for (const issue of msg.issues){
        if (CRITICAL.includes(issue.severity)) {
            hasCriticalIssues = true;
        }
    }
    if (msg.issues.length > 0) {
        chunksWithIssues.set(key, msg.issues);
    } else if (chunksWithIssues.has(key)) {
        chunksWithIssues.delete(key);
    }
    emitIssues();
    return hasCriticalIssues;
}
const SEVERITY_ORDER = [
    'bug',
    'fatal',
    'error',
    'warning',
    'info',
    'log'
];
const CATEGORY_ORDER = [
    'parse',
    'resolve',
    'code generation',
    'rendering',
    'typescript',
    'other'
];
function sortIssues(issues) {
    issues.sort((a, b)=>{
        const first = compareByList(SEVERITY_ORDER, a.severity, b.severity);
        if (first !== 0) return first;
        return compareByList(CATEGORY_ORDER, a.category, b.category);
    });
}
const hooks = {
    beforeRefresh: ()=>{},
    refresh: ()=>{},
    buildOk: ()=>{},
    issues: (_issues)=>{}
};
function setHooks(newHooks) {
    Object.assign(hooks, newHooks);
}
function handleSocketMessage(msg) {
    sortIssues(msg.issues);
    handleIssues(msg);
    switch(msg.type){
        case 'issues':
            break;
        case 'partial':
            // aggregate updates
            aggregateUpdates(msg);
            break;
        default:
            // run single update
            const runHooks = chunkListsWithPendingUpdates.size === 0;
            if (runHooks) hooks.beforeRefresh();
            triggerUpdate(msg);
            if (runHooks) finalizeUpdate();
            break;
    }
}
function finalizeUpdate() {
    hooks.refresh();
    hooks.buildOk();
    // This is used by the Next.js integration test suite to notify it when HMR
    // updates have been completed.
    // TODO: Only run this in test environments (gate by `process.env.__NEXT_TEST_MODE`)
    if (globalThis.__NEXT_HMR_CB) {
        globalThis.__NEXT_HMR_CB();
        globalThis.__NEXT_HMR_CB = null;
    }
}
function subscribeToChunkUpdate(chunkListPath, sendMessage, callback) {
    return subscribeToUpdate({
        path: chunkListPath
    }, sendMessage, callback);
}
function subscribeToUpdate(resource, sendMessage, callback) {
    const key = resourceKey(resource);
    let callbackSet;
    const existingCallbackSet = updateCallbackSets.get(key);
    if (!existingCallbackSet) {
        callbackSet = {
            callbacks: new Set([
                callback
            ]),
            unsubscribe: subscribeToUpdates(sendMessage, resource)
        };
        updateCallbackSets.set(key, callbackSet);
    } else {
        existingCallbackSet.callbacks.add(callback);
        callbackSet = existingCallbackSet;
    }
    return ()=>{
        callbackSet.callbacks.delete(callback);
        if (callbackSet.callbacks.size === 0) {
            callbackSet.unsubscribe();
            updateCallbackSets.delete(key);
        }
    };
}
function triggerUpdate(msg) {
    const key = resourceKey(msg.resource);
    const callbackSet = updateCallbackSets.get(key);
    if (!callbackSet) {
        return;
    }
    for (const callback of callbackSet.callbacks){
        callback(msg);
    }
    if (msg.type === 'notFound') {
        // This indicates that the resource which we subscribed to either does not exist or
        // has been deleted. In either case, we should clear all update callbacks, so if a
        // new subscription is created for the same resource, it will send a new "subscribe"
        // message to the server.
        // No need to send an "unsubscribe" message to the server, it will have already
        // dropped the update stream before sending the "notFound" message.
        updateCallbackSets.delete(key);
    }
}
}),
"[project]/GPUMaestro/types.ts [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "JobStatus",
    ()=>JobStatus,
    "ResourceType",
    ()=>ResourceType
]);
var JobStatus = /*#__PURE__*/ function(JobStatus) {
    JobStatus["PENDING"] = "PENDING";
    JobStatus["RUNNING"] = "RUNNING";
    JobStatus["COMPLETED"] = "COMPLETED";
    JobStatus["FAILED"] = "FAILED";
    JobStatus["TERMINATED"] = "TERMINATED";
    return JobStatus;
}({});
var ResourceType = /*#__PURE__*/ function(ResourceType) {
    ResourceType["A100"] = "NVIDIA A100";
    ResourceType["H100"] = "NVIDIA H100";
    ResourceType["L40S"] = "NVIDIA L40S";
    ResourceType["V100"] = "NVIDIA V100";
    return ResourceType;
}({});
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/GPUMaestro/constants.tsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "MOCK_DATASETS",
    ()=>MOCK_DATASETS,
    "MOCK_GPUS",
    ()=>MOCK_GPUS,
    "MOCK_MODELS",
    ()=>MOCK_MODELS,
    "MOCK_WORKLOADS",
    ()=>MOCK_WORKLOADS,
    "NAV_ITEMS",
    ()=>NAV_ITEMS,
    "STATUS_COLORS",
    ()=>STATUS_COLORS
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/GPUMaestro/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$layout$2d$dashboard$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__LayoutDashboard$3e$__ = __turbopack_context__.i("[project]/GPUMaestro/node_modules/lucide-react/dist/esm/icons/layout-dashboard.js [client] (ecmascript) <export default as LayoutDashboard>");
var __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$rocket$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Rocket$3e$__ = __turbopack_context__.i("[project]/GPUMaestro/node_modules/lucide-react/dist/esm/icons/rocket.js [client] (ecmascript) <export default as Rocket>");
var __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$terminal$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Terminal$3e$__ = __turbopack_context__.i("[project]/GPUMaestro/node_modules/lucide-react/dist/esm/icons/terminal.js [client] (ecmascript) <export default as Terminal>");
var __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$settings$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Settings$3e$__ = __turbopack_context__.i("[project]/GPUMaestro/node_modules/lucide-react/dist/esm/icons/settings.js [client] (ecmascript) <export default as Settings>");
var __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$box$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Box$3e$__ = __turbopack_context__.i("[project]/GPUMaestro/node_modules/lucide-react/dist/esm/icons/box.js [client] (ecmascript) <export default as Box>");
var __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$database$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Database$3e$__ = __turbopack_context__.i("[project]/GPUMaestro/node_modules/lucide-react/dist/esm/icons/database.js [client] (ecmascript) <export default as Database>");
var __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$folder$2d$tree$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FolderTree$3e$__ = __turbopack_context__.i("[project]/GPUMaestro/node_modules/lucide-react/dist/esm/icons/folder-tree.js [client] (ecmascript) <export default as FolderTree>");
var __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$types$2e$ts__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/GPUMaestro/types.ts [client] (ecmascript)");
;
;
;
const NAV_ITEMS = [
    {
        id: 'dashboard',
        label: 'Dashboard',
        icon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$layout$2d$dashboard$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__LayoutDashboard$3e$__["LayoutDashboard"], {
            size: 20
        }, void 0, false, {
            fileName: "[project]/GPUMaestro/constants.tsx",
            lineNumber: 7,
            columnNumber: 48
        }, ("TURBOPACK compile-time value", void 0))
    },
    {
        id: 'sandboxes',
        label: 'Sandboxes',
        icon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$terminal$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Terminal$3e$__["Terminal"], {
            size: 20
        }, void 0, false, {
            fileName: "[project]/GPUMaestro/constants.tsx",
            lineNumber: 8,
            columnNumber: 48
        }, ("TURBOPACK compile-time value", void 0))
    },
    {
        id: 'jobs',
        label: 'Batch Jobs',
        icon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$rocket$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Rocket$3e$__["Rocket"], {
            size: 20
        }, void 0, false, {
            fileName: "[project]/GPUMaestro/constants.tsx",
            lineNumber: 9,
            columnNumber: 44
        }, ("TURBOPACK compile-time value", void 0))
    },
    {
        id: 'models',
        label: 'Models',
        icon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$box$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Box$3e$__["Box"], {
            size: 20
        }, void 0, false, {
            fileName: "[project]/GPUMaestro/constants.tsx",
            lineNumber: 10,
            columnNumber: 42
        }, ("TURBOPACK compile-time value", void 0))
    },
    {
        id: 'datasets',
        label: 'Datasets',
        icon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$database$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Database$3e$__["Database"], {
            size: 20
        }, void 0, false, {
            fileName: "[project]/GPUMaestro/constants.tsx",
            lineNumber: 11,
            columnNumber: 46
        }, ("TURBOPACK compile-time value", void 0))
    },
    {
        id: 'files',
        label: 'Files & Artifacts',
        icon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$folder$2d$tree$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FolderTree$3e$__["FolderTree"], {
            size: 20
        }, void 0, false, {
            fileName: "[project]/GPUMaestro/constants.tsx",
            lineNumber: 12,
            columnNumber: 52
        }, ("TURBOPACK compile-time value", void 0))
    },
    {
        id: 'admin',
        label: 'Admin Panel',
        icon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$settings$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Settings$3e$__["Settings"], {
            size: 20
        }, void 0, false, {
            fileName: "[project]/GPUMaestro/constants.tsx",
            lineNumber: 13,
            columnNumber: 46
        }, ("TURBOPACK compile-time value", void 0))
    }
];
const MOCK_GPUS = [
    {
        id: 'gpu-001',
        name: 'GPU 0',
        type: __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$types$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["ResourceType"].H100,
        totalMemoryGB: 80,
        usedMemoryGB: 45,
        utilizationPercent: 62,
        temperatureCelsius: 58,
        nodeName: 'k8s-worker-01',
        status: 'HEALTHY'
    },
    {
        id: 'gpu-002',
        name: 'GPU 1',
        type: __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$types$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["ResourceType"].H100,
        totalMemoryGB: 80,
        usedMemoryGB: 78,
        utilizationPercent: 98,
        temperatureCelsius: 74,
        nodeName: 'k8s-worker-01',
        status: 'WARNING'
    },
    {
        id: 'gpu-003',
        name: 'GPU 0',
        type: __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$types$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["ResourceType"].A100,
        totalMemoryGB: 40,
        usedMemoryGB: 0,
        utilizationPercent: 0,
        temperatureCelsius: 32,
        nodeName: 'k8s-worker-02',
        status: 'HEALTHY'
    },
    {
        id: 'gpu-004',
        name: 'GPU 1',
        type: __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$types$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["ResourceType"].A100,
        totalMemoryGB: 40,
        usedMemoryGB: 12,
        utilizationPercent: 25,
        temperatureCelsius: 45,
        nodeName: 'k8s-worker-02',
        status: 'HEALTHY'
    }
];
const MOCK_WORKLOADS = [
    {
        id: 'wl-101',
        name: 'jupyter-lab-research-01',
        type: 'INTERACTIVE',
        owner: 'dr_chen',
        gpuRequested: 0.25,
        status: __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$types$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["JobStatus"].RUNNING,
        createdAt: '2023-10-25T10:00:00Z',
        updatedAt: '2023-10-25T10:00:00Z',
        logs: [
            'Starting JupyterLab...',
            'Mounted PVC /data/models',
            'Kernel initialized'
        ]
    },
    {
        id: 'wl-102',
        name: 'bert-large-finetuning',
        type: 'BATCH',
        owner: 'ai_eng_sarah',
        gpuRequested: 1,
        status: __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$types$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["JobStatus"].RUNNING,
        createdAt: '2023-10-25T08:30:00Z',
        updatedAt: '2023-10-25T11:45:00Z',
        logs: [
            'Epoch 1: loss=0.45',
            'Epoch 2: loss=0.32',
            'Checkpoint saved'
        ]
    },
    {
        id: 'wl-103',
        name: 'pytorch-debug-session',
        type: 'INTERACTIVE',
        owner: 'ai_eng_sarah',
        gpuRequested: 0.5,
        status: __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$types$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["JobStatus"].PENDING,
        createdAt: '2023-10-25T12:00:00Z',
        updatedAt: '2023-10-25T12:00:00Z'
    },
    {
        id: 'wl-104',
        name: 'data-proc-spark-gpu',
        type: 'BATCH',
        owner: 'data_ops',
        gpuRequested: 2,
        status: __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$types$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["JobStatus"].COMPLETED,
        createdAt: '2023-10-24T22:00:00Z',
        updatedAt: '2023-10-25T02:00:00Z'
    }
];
const MOCK_MODELS = [
    {
        id: 'm-001',
        name: 'Llama-3-8B-Instruct',
        version: 'v1.2',
        framework: 'PyTorch / Transformers',
        parameters: '8B',
        size: '14.9 GB',
        status: 'DEPLOYED',
        updatedAt: '2023-10-26 14:20'
    },
    {
        id: 'm-002',
        name: 'Stable-Diffusion-XL-Base',
        version: 'v1.0',
        framework: 'Diffusers',
        parameters: '6.6B',
        size: '12.5 GB',
        status: 'READY',
        updatedAt: '2023-10-24 09:15'
    },
    {
        id: 'm-003',
        name: 'Mistral-7B-v0.1',
        version: 'v1.0',
        framework: 'Transformers',
        parameters: '7B',
        size: '13.2 GB',
        status: 'ARCHIVED',
        updatedAt: '2023-10-20 18:45'
    },
    {
        id: 'm-004',
        name: 'ResNet-50-Classifier',
        version: 'v2.4',
        framework: 'TensorFlow',
        parameters: '25.6M',
        size: '98 MB',
        status: 'READY',
        updatedAt: '2023-10-25 11:30'
    }
];
const MOCK_DATASETS = [
    {
        id: 'd-001',
        name: 'WikiText-103-Pretrain',
        source: 'S3://llm-data-bucket',
        format: 'Parquet',
        size: '540 MB',
        items: '103M Tokens',
        category: 'TRAIN',
        status: 'SYNCED'
    },
    {
        id: 'd-002',
        name: 'ImageNet-1K-Val',
        source: 'PVC://k8s-storage-01',
        format: 'WebP',
        size: '6.4 GB',
        items: '50k images',
        category: 'VAL',
        status: 'SYNCED'
    },
    {
        id: 'd-003',
        name: 'Instruction-Tuning-Internal',
        source: 'NFS://nas-04',
        format: 'JSONL',
        size: '1.2 GB',
        items: '250k samples',
        category: 'TRAIN',
        status: 'PENDING'
    }
];
const STATUS_COLORS = {
    [__TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$types$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["JobStatus"].RUNNING]: 'text-green-400 bg-green-400/10 border-green-400/20',
    [__TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$types$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["JobStatus"].PENDING]: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    [__TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$types$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["JobStatus"].COMPLETED]: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    [__TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$types$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["JobStatus"].FAILED]: 'text-red-400 bg-red-400/10 border-red-400/20',
    [__TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$types$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["JobStatus"].TERMINATED]: 'text-slate-400 bg-slate-400/10 border-slate-400/20'
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/GPUMaestro/services/geminiService.ts [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getJobStatusInsights",
    ()=>getJobStatusInsights,
    "getOptimizationSuggestions",
    ()=>getOptimizationSuggestions,
    "getSchedulingAdvice",
    ()=>getSchedulingAdvice
]);
const getJobStatusInsights = async (logs, jobName)=>{
    try {
        const response = await fetch('/api/gemini/job-insights', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                logs,
                jobName
            })
        });
        if (!response.ok) {
            throw new Error('Failed to get job insights');
        }
        const data = await response.json();
        return data.insight;
    } catch (error) {
        console.error('Error fetching job insights:', error);
        return 'Unable to generate insights at this time.';
    }
};
const getSchedulingAdvice = async (activeLoad, requestedGpus)=>{
    try {
        const response = await fetch('/api/gemini/scheduling-advice', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                activeLoad,
                requestedGpus
            })
        });
        if (!response.ok) {
            throw new Error('Failed to get scheduling advice');
        }
        const data = await response.json();
        return data.advice;
    } catch (error) {
        console.error('Error fetching scheduling advice:', error);
        return 'Schedule immediately (Automatic).';
    }
};
const getOptimizationSuggestions = async (gpuUtilizationHistory)=>{
    try {
        const response = await fetch('/api/gemini/optimization-suggestions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                gpuUtilizationHistory
            })
        });
        if (!response.ok) {
            throw new Error('Failed to get optimization suggestions');
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching optimization suggestions:', error);
        return {
            suggestion: 'Enable dynamic GPU splitting',
            impact: 'High',
            difficulty: 'Medium'
        };
    }
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/GPUMaestro/components/Sandboxes.tsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/GPUMaestro/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$compiler$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/GPUMaestro/node_modules/react/compiler-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/GPUMaestro/node_modules/react/index.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$constants$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/GPUMaestro/constants.tsx [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$types$2e$ts__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/GPUMaestro/types.ts [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$plus$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Plus$3e$__ = __turbopack_context__.i("[project]/GPUMaestro/node_modules/lucide-react/dist/esm/icons/plus.js [client] (ecmascript) <export default as Plus>");
var __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$terminal$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Terminal$3e$__ = __turbopack_context__.i("[project]/GPUMaestro/node_modules/lucide-react/dist/esm/icons/terminal.js [client] (ecmascript) <export default as Terminal>");
var __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$external$2d$link$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ExternalLink$3e$__ = __turbopack_context__.i("[project]/GPUMaestro/node_modules/lucide-react/dist/esm/icons/external-link.js [client] (ecmascript) <export default as ExternalLink>");
var __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$search$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Search$3e$__ = __turbopack_context__.i("[project]/GPUMaestro/node_modules/lucide-react/dist/esm/icons/search.js [client] (ecmascript) <export default as Search>");
var __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$zap$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Zap$3e$__ = __turbopack_context__.i("[project]/GPUMaestro/node_modules/lucide-react/dist/esm/icons/zap.js [client] (ecmascript) <export default as Zap>");
var __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$stop$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__StopCircle$3e$__ = __turbopack_context__.i("[project]/GPUMaestro/node_modules/lucide-react/dist/esm/icons/circle-stop.js [client] (ecmascript) <export default as StopCircle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$refresh$2d$ccw$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__RefreshCcw$3e$__ = __turbopack_context__.i("[project]/GPUMaestro/node_modules/lucide-react/dist/esm/icons/refresh-ccw.js [client] (ecmascript) <export default as RefreshCcw>");
var __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$activity$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Activity$3e$__ = __turbopack_context__.i("[project]/GPUMaestro/node_modules/lucide-react/dist/esm/icons/activity.js [client] (ecmascript) <export default as Activity>");
var __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$code$2d$xml$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Code2$3e$__ = __turbopack_context__.i("[project]/GPUMaestro/node_modules/lucide-react/dist/esm/icons/code-xml.js [client] (ecmascript) <export default as Code2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$globe$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Globe$3e$__ = __turbopack_context__.i("[project]/GPUMaestro/node_modules/lucide-react/dist/esm/icons/globe.js [client] (ecmascript) <export default as Globe>");
var __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$cpu$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Cpu$3e$__ = __turbopack_context__.i("[project]/GPUMaestro/node_modules/lucide-react/dist/esm/icons/cpu.js [client] (ecmascript) <export default as Cpu>");
var __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$database$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Database$3e$__ = __turbopack_context__.i("[project]/GPUMaestro/node_modules/lucide-react/dist/esm/icons/database.js [client] (ecmascript) <export default as Database>");
var __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$box$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Box$3e$__ = __turbopack_context__.i("[project]/GPUMaestro/node_modules/lucide-react/dist/esm/icons/box.js [client] (ecmascript) <export default as Box>");
var __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__ = __turbopack_context__.i("[project]/GPUMaestro/node_modules/lucide-react/dist/esm/icons/x.js [client] (ecmascript) <export default as X>");
var __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$right$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronRight$3e$__ = __turbopack_context__.i("[project]/GPUMaestro/node_modules/lucide-react/dist/esm/icons/chevron-right.js [client] (ecmascript) <export default as ChevronRight>");
var __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$copy$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Copy$3e$__ = __turbopack_context__.i("[project]/GPUMaestro/node_modules/lucide-react/dist/esm/icons/copy.js [client] (ecmascript) <export default as Copy>");
var __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$monitor$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Monitor$3e$__ = __turbopack_context__.i("[project]/GPUMaestro/node_modules/lucide-react/dist/esm/icons/monitor.js [client] (ecmascript) <export default as Monitor>");
var __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2d$check$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ShieldCheck$3e$__ = __turbopack_context__.i("[project]/GPUMaestro/node_modules/lucide-react/dist/esm/icons/shield-check.js [client] (ecmascript) <export default as ShieldCheck>");
var __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$services$2f$geminiService$2e$ts__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/GPUMaestro/services/geminiService.ts [client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
;
;
;
;
;
;
const Sandboxes = ()=>{
    _s();
    const $ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$compiler$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["c"])(39);
    if ($[0] !== "ce21a4df34d4741444f8559689640be78647dd9dc8b4039d0c02c303f57a9477") {
        for(let $i = 0; $i < 39; $i += 1){
            $[$i] = Symbol.for("react.memo_cache_sentinel");
        }
        $[0] = "ce21a4df34d4741444f8559689640be78647dd9dc8b4039d0c02c303f57a9477";
    }
    let t0;
    if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
        t0 = __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$constants$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["MOCK_WORKLOADS"].filter(_temp);
        $[1] = t0;
    } else {
        t0 = $[1];
    }
    const [sessions, setSessions] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(t0);
    const [selectedSession, setSelectedSession] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [insight, setInsight] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [, setIsLoadingInsight] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [copied, setCopied] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(false);
    let t1;
    if ($[2] === Symbol.for("react.memo_cache_sentinel")) {
        t1 = {
            name: "",
            interface: "Web Terminal + VS Code",
            modelId: "",
            datasetId: "",
            gpuType: __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$types$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["ResourceType"].H100,
            gpuCount: 1
        };
        $[2] = t1;
    } else {
        t1 = $[2];
    }
    const [formData, setFormData] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(t1);
    let t2;
    if ($[3] === Symbol.for("react.memo_cache_sentinel")) {
        t2 = async (session)=>{
            if (!session.logs) {
                return;
            }
            setIsLoadingInsight(true);
            const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$services$2f$geminiService$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["getJobStatusInsights"])(session.logs, session.name);
            setInsight(result);
            setIsLoadingInsight(false);
        };
        $[3] = t2;
    } else {
        t2 = $[3];
    }
    const fetchInsights = t2;
    let t3;
    let t4;
    if ($[4] !== selectedSession) {
        t3 = ()=>{
            if (selectedSession) {
                fetchInsights(selectedSession);
            } else {
                setInsight(null);
            }
        };
        t4 = [
            selectedSession
        ];
        $[4] = selectedSession;
        $[5] = t3;
        $[6] = t4;
    } else {
        t3 = $[5];
        t4 = $[6];
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useEffect"])(t3, t4);
    let t5;
    if ($[7] !== formData.gpuCount || $[8] !== formData.name || $[9] !== sessions) {
        t5 = (e)=>{
            e.preventDefault();
            const newSession = {
                id: `wl-${Math.floor(Math.random() * 1000)}`,
                name: formData.name || "new-dev-env",
                type: "INTERACTIVE",
                owner: "Admin User",
                gpuRequested: formData.gpuCount,
                status: __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$types$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["JobStatus"].RUNNING,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                logs: [
                    "Provisioning GPU resources...",
                    "Starting SSH Tunnel service...",
                    "Initializing Web Terminal (ttyd)...",
                    "Model weights mounted at /mnt/models",
                    "Ready for remote development."
                ]
            };
            setSessions([
                newSession,
                ...sessions
            ]);
            setIsCreateModalOpen(false);
        };
        $[7] = formData.gpuCount;
        $[8] = formData.name;
        $[9] = sessions;
        $[10] = t5;
    } else {
        t5 = $[10];
    }
    const handleCreate = t5;
    let t6;
    if ($[11] === Symbol.for("react.memo_cache_sentinel")) {
        t6 = (id)=>{
            navigator.clipboard.writeText(`ssh -p 2222 user@cluster-node-${id}.gpu-maestro.io`);
            setCopied(true);
            setTimeout(()=>setCopied(false), 2000);
        };
        $[11] = t6;
    } else {
        t6 = $[11];
    }
    const copySSH = t6;
    let t7;
    if ($[12] === Symbol.for("react.memo_cache_sentinel")) {
        t7 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                    className: "text-2xl font-bold text-white tracking-tight",
                    children: "Interactive Sandboxes"
                }, void 0, false, {
                    fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                    lineNumber: 118,
                    columnNumber: 15
                }, ("TURBOPACK compile-time value", void 0)),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "text-slate-400 mt-1",
                    children: "High-performance development environments with VS Code & Web Terminal access."
                }, void 0, false, {
                    fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                    lineNumber: 118,
                    columnNumber: 102
                }, ("TURBOPACK compile-time value", void 0))
            ]
        }, void 0, true, {
            fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
            lineNumber: 118,
            columnNumber: 10
        }, ("TURBOPACK compile-time value", void 0));
        $[12] = t7;
    } else {
        t7 = $[12];
    }
    let t8;
    let t9;
    if ($[13] === Symbol.for("react.memo_cache_sentinel")) {
        t8 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
            className: "flex items-center gap-2 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl font-semibold text-slate-300 hover:text-white transition-all",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$globe$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Globe$3e$__["Globe"], {
                    size: 18
                }, void 0, false, {
                    fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                    lineNumber: 126,
                    columnNumber: 175
                }, ("TURBOPACK compile-time value", void 0)),
                "Hub"
            ]
        }, void 0, true, {
            fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
            lineNumber: 126,
            columnNumber: 10
        }, ("TURBOPACK compile-time value", void 0));
        t9 = ()=>setIsCreateModalOpen(true);
        $[13] = t8;
        $[14] = t9;
    } else {
        t8 = $[13];
        t9 = $[14];
    }
    let t10;
    if ($[15] === Symbol.for("react.memo_cache_sentinel")) {
        t10 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex justify-between items-center",
            children: [
                t7,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex gap-3",
                    children: [
                        t8,
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: t9,
                            className: "flex items-center gap-2 px-6 py-3 bg-indigo-600 rounded-xl font-bold text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition-all hover:-translate-y-0.5",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$plus$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Plus$3e$__["Plus"], {
                                    size: 20
                                }, void 0, false, {
                                    fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                    lineNumber: 136,
                                    columnNumber: 300
                                }, ("TURBOPACK compile-time value", void 0)),
                                "Create Sandbox"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                            lineNumber: 136,
                            columnNumber: 98
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                    lineNumber: 136,
                    columnNumber: 66
                }, ("TURBOPACK compile-time value", void 0))
            ]
        }, void 0, true, {
            fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
            lineNumber: 136,
            columnNumber: 11
        }, ("TURBOPACK compile-time value", void 0));
        $[15] = t10;
    } else {
        t10 = $[15];
    }
    let t11;
    if ($[16] === Symbol.for("react.memo_cache_sentinel")) {
        t11 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex items-center gap-4",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "p-2 bg-indigo-600 rounded-lg text-white",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$monitor$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Monitor$3e$__["Monitor"], {
                        size: 20
                    }, void 0, false, {
                        fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                        lineNumber: 143,
                        columnNumber: 109
                    }, ("TURBOPACK compile-time value", void 0))
                }, void 0, false, {
                    fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                    lineNumber: 143,
                    columnNumber: 52
                }, ("TURBOPACK compile-time value", void 0)),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h4", {
                            className: "text-sm font-bold text-white",
                            children: "Remote Development Enabled"
                        }, void 0, false, {
                            fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                            lineNumber: 143,
                            columnNumber: 141
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-xs text-indigo-300/80 text-pretty",
                            children: "Connect via VS Code Remote-SSH or directly in your browser with our integrated Web Terminal."
                        }, void 0, false, {
                            fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                            lineNumber: 143,
                            columnNumber: 217
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                    lineNumber: 143,
                    columnNumber: 136
                }, ("TURBOPACK compile-time value", void 0))
            ]
        }, void 0, true, {
            fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
            lineNumber: 143,
            columnNumber: 11
        }, ("TURBOPACK compile-time value", void 0));
        $[16] = t11;
    } else {
        t11 = $[16];
    }
    let t12;
    if ($[17] === Symbol.for("react.memo_cache_sentinel")) {
        t12 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "bg-indigo-600/10 border border-indigo-500/20 p-4 rounded-2xl flex items-center justify-between",
            children: [
                t11,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex gap-2",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center gap-1.5 px-3 py-1 bg-slate-950 border border-slate-800 rounded-full text-[10px] text-emerald-400 font-bold",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2d$check$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ShieldCheck$3e$__["ShieldCheck"], {
                                size: 12
                            }, void 0, false, {
                                fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                lineNumber: 150,
                                columnNumber: 298
                            }, ("TURBOPACK compile-time value", void 0)),
                            "SSH SECURE"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                        lineNumber: 150,
                        columnNumber: 156
                    }, ("TURBOPACK compile-time value", void 0))
                }, void 0, false, {
                    fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                    lineNumber: 150,
                    columnNumber: 128
                }, ("TURBOPACK compile-time value", void 0))
            ]
        }, void 0, true, {
            fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
            lineNumber: 150,
            columnNumber: 11
        }, ("TURBOPACK compile-time value", void 0));
        $[17] = t12;
    } else {
        t12 = $[17];
    }
    let t13;
    if ($[18] === Symbol.for("react.memo_cache_sentinel")) {
        t13 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex items-center gap-3 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 w-full max-w-md",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$search$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Search$3e$__["Search"], {
                    size: 18,
                    className: "text-slate-500"
                }, void 0, false, {
                    fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                    lineNumber: 157,
                    columnNumber: 126
                }, ("TURBOPACK compile-time value", void 0)),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                    type: "text",
                    placeholder: "Filter sandboxes...",
                    className: "bg-transparent border-none outline-none text-sm w-full placeholder:text-slate-600"
                }, void 0, false, {
                    fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                    lineNumber: 157,
                    columnNumber: 173
                }, ("TURBOPACK compile-time value", void 0))
            ]
        }, void 0, true, {
            fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
            lineNumber: 157,
            columnNumber: 11
        }, ("TURBOPACK compile-time value", void 0));
        $[18] = t13;
    } else {
        t13 = $[18];
    }
    let t14;
    if ($[19] === Symbol.for("react.memo_cache_sentinel")) {
        t14 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60",
            children: [
                t13,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex items-center gap-2 text-slate-500",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        className: "p-2 hover:bg-slate-800 rounded-lg transition-colors",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$refresh$2d$ccw$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__RefreshCcw$3e$__["RefreshCcw"], {
                            size: 18
                        }, void 0, false, {
                            fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                            lineNumber: 164,
                            columnNumber: 241
                        }, ("TURBOPACK compile-time value", void 0))
                    }, void 0, false, {
                        fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                        lineNumber: 164,
                        columnNumber: 169
                    }, ("TURBOPACK compile-time value", void 0))
                }, void 0, false, {
                    fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                    lineNumber: 164,
                    columnNumber: 113
                }, ("TURBOPACK compile-time value", void 0))
            ]
        }, void 0, true, {
            fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
            lineNumber: 164,
            columnNumber: 11
        }, ("TURBOPACK compile-time value", void 0));
        $[19] = t14;
    } else {
        t14 = $[19];
    }
    let t15;
    if ($[20] === Symbol.for("react.memo_cache_sentinel")) {
        t15 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                className: "bg-slate-950/50 text-[10px] uppercase tracking-widest font-bold text-slate-500 border-b border-slate-800",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                        className: "px-6 py-4",
                        children: "Name"
                    }, void 0, false, {
                        fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                        lineNumber: 171,
                        columnNumber: 139
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                        className: "px-6 py-4",
                        children: "Interfaces"
                    }, void 0, false, {
                        fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                        lineNumber: 171,
                        columnNumber: 174
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                        className: "px-6 py-4",
                        children: "Compute"
                    }, void 0, false, {
                        fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                        lineNumber: 171,
                        columnNumber: 215
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                        className: "px-6 py-4",
                        children: "Status"
                    }, void 0, false, {
                        fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                        lineNumber: 171,
                        columnNumber: 253
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                        className: "px-6 py-4 text-right",
                        children: "Dev Access"
                    }, void 0, false, {
                        fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                        lineNumber: 171,
                        columnNumber: 290
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                lineNumber: 171,
                columnNumber: 18
            }, ("TURBOPACK compile-time value", void 0))
        }, void 0, false, {
            fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
            lineNumber: 171,
            columnNumber: 11
        }, ("TURBOPACK compile-time value", void 0));
        $[20] = t15;
    } else {
        t15 = $[20];
    }
    let t16;
    if ($[21] !== sessions) {
        let t17;
        if ($[23] === Symbol.for("react.memo_cache_sentinel")) {
            t17 = (session_0)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                    className: "group hover:bg-slate-800/30 transition-colors cursor-pointer",
                    onClick: ()=>setSelectedSession(session_0),
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                            className: "px-6 py-5",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-3",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-indigo-400 border border-slate-700",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$terminal$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Terminal$3e$__["Terminal"], {
                                            size: 20
                                        }, void 0, false, {
                                            fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                            lineNumber: 180,
                                            columnNumber: 359
                                        }, ("TURBOPACK compile-time value", void 0))
                                    }, void 0, false, {
                                        fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                        lineNumber: 180,
                                        columnNumber: 235
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "font-bold text-slate-100 group-hover:text-white transition-colors",
                                                children: session_0.name
                                            }, void 0, false, {
                                                fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                lineNumber: 180,
                                                columnNumber: 392
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-[10px] text-slate-500 font-mono",
                                                children: [
                                                    "ID: ",
                                                    session_0.id
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                lineNumber: 180,
                                                columnNumber: 493
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                        lineNumber: 180,
                                        columnNumber: 387
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                lineNumber: 180,
                                columnNumber: 194
                            }, ("TURBOPACK compile-time value", void 0))
                        }, void 0, false, {
                            fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                            lineNumber: 180,
                            columnNumber: 168
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                            className: "px-6 py-5",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex gap-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "p-1.5 bg-slate-800 rounded-lg text-indigo-400",
                                        title: "VS Code Support",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$code$2d$xml$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Code2$3e$__["Code2"], {
                                            size: 14
                                        }, void 0, false, {
                                            fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                            lineNumber: 180,
                                            columnNumber: 726
                                        }, ("TURBOPACK compile-time value", void 0))
                                    }, void 0, false, {
                                        fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                        lineNumber: 180,
                                        columnNumber: 638
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "p-1.5 bg-slate-800 rounded-lg text-emerald-400",
                                        title: "Web Terminal Support",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$terminal$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Terminal$3e$__["Terminal"], {
                                            size: 14
                                        }, void 0, false, {
                                            fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                            lineNumber: 180,
                                            columnNumber: 846
                                        }, ("TURBOPACK compile-time value", void 0))
                                    }, void 0, false, {
                                        fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                        lineNumber: 180,
                                        columnNumber: 752
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                lineNumber: 180,
                                columnNumber: 610
                            }, ("TURBOPACK compile-time value", void 0))
                        }, void 0, false, {
                            fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                            lineNumber: 180,
                            columnNumber: 584
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                            className: "px-6 py-5",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$zap$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Zap$3e$__["Zap"], {
                                        size: 14,
                                        className: "text-amber-400"
                                    }, void 0, false, {
                                        fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                        lineNumber: 180,
                                        columnNumber: 953
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-sm font-medium text-slate-300",
                                        children: [
                                            session_0.gpuRequested,
                                            "x GPU"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                        lineNumber: 180,
                                        columnNumber: 997
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                lineNumber: 180,
                                columnNumber: 912
                            }, ("TURBOPACK compile-time value", void 0))
                        }, void 0, false, {
                            fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                            lineNumber: 180,
                            columnNumber: 886
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                            className: "px-6 py-5",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: `inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold border ${__TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$constants$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["STATUS_COLORS"][session_0.status]}`,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "w-1.5 h-1.5 rounded-full bg-current mr-2"
                                    }, void 0, false, {
                                        fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                        lineNumber: 180,
                                        columnNumber: 1255
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    session_0.status
                                ]
                            }, void 0, true, {
                                fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                lineNumber: 180,
                                columnNumber: 1123
                            }, ("TURBOPACK compile-time value", void 0))
                        }, void 0, false, {
                            fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                            lineNumber: 180,
                            columnNumber: 1097
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                            className: "px-6 py-5 text-right",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex justify-end items-center gap-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        className: "flex items-center gap-2 px-3 py-1.5 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold rounded-lg hover:bg-indigo-600 hover:text-white transition-all",
                                        onClick: _temp2,
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$terminal$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Terminal$3e$__["Terminal"], {
                                                size: 14
                                            }, void 0, false, {
                                                fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                lineNumber: 180,
                                                columnNumber: 1651
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            "Terminal"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                        lineNumber: 180,
                                        columnNumber: 1436
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        className: "p-2 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-all",
                                        onClick: _temp3,
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$stop$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__StopCircle$3e$__["StopCircle"], {
                                            size: 18
                                        }, void 0, false, {
                                            fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                            lineNumber: 180,
                                            columnNumber: 1810
                                        }, ("TURBOPACK compile-time value", void 0))
                                    }, void 0, false, {
                                        fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                        lineNumber: 180,
                                        columnNumber: 1690
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                lineNumber: 180,
                                columnNumber: 1383
                            }, ("TURBOPACK compile-time value", void 0))
                        }, void 0, false, {
                            fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                            lineNumber: 180,
                            columnNumber: 1346
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, session_0.id, true, {
                    fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                    lineNumber: 180,
                    columnNumber: 26
                }, ("TURBOPACK compile-time value", void 0));
            $[23] = t17;
        } else {
            t17 = $[23];
        }
        t16 = sessions.map(t17);
        $[21] = sessions;
        $[22] = t16;
    } else {
        t16 = $[22];
    }
    let t17;
    if ($[24] !== t16) {
        t17 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm shadow-xl",
            children: [
                t14,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                    className: "w-full text-left border-collapse",
                    children: [
                        t15,
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                            className: "divide-y divide-slate-800",
                            children: t16
                        }, void 0, false, {
                            fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                            lineNumber: 193,
                            columnNumber: 185
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                    lineNumber: 193,
                    columnNumber: 128
                }, ("TURBOPACK compile-time value", void 0))
            ]
        }, void 0, true, {
            fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
            lineNumber: 193,
            columnNumber: 11
        }, ("TURBOPACK compile-time value", void 0));
        $[24] = t16;
        $[25] = t17;
    } else {
        t17 = $[25];
    }
    let t18;
    if ($[26] !== formData || $[27] !== handleCreate || $[28] !== isCreateModalOpen) {
        t18 = isCreateModalOpen && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-3",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$plus$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Plus$3e$__["Plus"], {
                                            size: 24
                                        }, void 0, false, {
                                            fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                            lineNumber: 201,
                                            columnNumber: 543
                                        }, ("TURBOPACK compile-time value", void 0))
                                    }, void 0, false, {
                                        fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                        lineNumber: 201,
                                        columnNumber: 447
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                                className: "text-xl font-bold text-white",
                                                children: "Initialize New Sandbox"
                                            }, void 0, false, {
                                                fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                lineNumber: 201,
                                                columnNumber: 572
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-xs text-slate-500",
                                                children: "Configure dev interfaces and hardware resources."
                                            }, void 0, false, {
                                                fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                lineNumber: 201,
                                                columnNumber: 644
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                        lineNumber: 201,
                                        columnNumber: 567
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                lineNumber: 201,
                                columnNumber: 406
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>setIsCreateModalOpen(false),
                                className: "p-2 hover:bg-slate-800 rounded-full text-slate-500 transition-colors",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                                    size: 20
                                }, void 0, false, {
                                    fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                    lineNumber: 201,
                                    columnNumber: 879
                                }, ("TURBOPACK compile-time value", void 0))
                            }, void 0, false, {
                                fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                lineNumber: 201,
                                columnNumber: 746
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                        lineNumber: 201,
                        columnNumber: 309
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
                        onSubmit: handleCreate,
                        className: "flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "space-y-4",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    className: "block",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block",
                                            children: "Sandbox Name"
                                        }, void 0, false, {
                                            fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                            lineNumber: 201,
                                            columnNumber: 1057
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            required: true,
                                            type: "text",
                                            placeholder: "e.g. transformer-dev-env",
                                            className: "w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-700",
                                            value: formData.name,
                                            onChange: (e_2)=>setFormData({
                                                    ...formData,
                                                    name: e_2.target.value
                                                })
                                        }, void 0, false, {
                                            fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                            lineNumber: 201,
                                            columnNumber: 1164
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                    lineNumber: 201,
                                    columnNumber: 1032
                                }, ("TURBOPACK compile-time value", void 0))
                            }, void 0, false, {
                                fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                lineNumber: 201,
                                columnNumber: 1005
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "space-y-3",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-xs font-bold text-slate-400 uppercase tracking-widest block",
                                        children: "Development Interface"
                                    }, void 0, false, {
                                        fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                        lineNumber: 204,
                                        columnNumber: 62
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "grid grid-cols-2 gap-4",
                                        children: [
                                            {
                                                id: "vscode",
                                                label: "VS Code + Terminal",
                                                desc: "Remote-SSH enabled",
                                                icon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$code$2d$xml$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Code2$3e$__["Code2"], {
                                                    size: 18
                                                }, void 0, false, {
                                                    fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                    lineNumber: 208,
                                                    columnNumber: 23
                                                }, ("TURBOPACK compile-time value", void 0))
                                            },
                                            {
                                                id: "jupyter",
                                                label: "Jupyter + Terminal",
                                                desc: "Notebook-centric",
                                                icon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$box$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Box$3e$__["Box"], {
                                                    size: 18
                                                }, void 0, false, {
                                                    fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                    lineNumber: 213,
                                                    columnNumber: 23
                                                }, ("TURBOPACK compile-time value", void 0))
                                            }
                                        ].map((option)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                type: "button",
                                                onClick: ()=>setFormData({
                                                        ...formData,
                                                        interface: option.label
                                                    }),
                                                className: `flex items-start gap-4 p-4 rounded-2xl border text-left transition-all ${formData.interface.includes(option.label.split(" ")[0]) ? "bg-indigo-600/10 border-indigo-500 text-white" : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"}`,
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: `p-2 rounded-lg ${formData.interface.includes(option.label.split(" ")[0]) ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-500"}`,
                                                        children: option.icon
                                                    }, void 0, false, {
                                                        fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                        lineNumber: 217,
                                                        columnNumber: 285
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                className: "text-sm font-bold",
                                                                children: option.label
                                                            }, void 0, false, {
                                                                fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                                lineNumber: 217,
                                                                columnNumber: 463
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                className: "text-[10px] opacity-60",
                                                                children: option.desc
                                                            }, void 0, false, {
                                                                fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                                lineNumber: 217,
                                                                columnNumber: 514
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                        lineNumber: 217,
                                                        columnNumber: 458
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                ]
                                            }, option.id, true, {
                                                fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                lineNumber: 214,
                                                columnNumber: 32
                                            }, ("TURBOPACK compile-time value", void 0)))
                                    }, void 0, false, {
                                        fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                        lineNumber: 204,
                                        columnNumber: 173
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                lineNumber: 204,
                                columnNumber: 35
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "grid grid-cols-1 md:grid-cols-2 gap-6",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                        className: "block",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$box$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Box$3e$__["Box"], {
                                                        size: 14,
                                                        className: "text-indigo-400"
                                                    }, void 0, false, {
                                                        fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                        lineNumber: 217,
                                                        columnNumber: 784
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    "Mount Model"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                lineNumber: 217,
                                                columnNumber: 678
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "relative",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                        className: "w-full appearance-none bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 outline-none pr-10",
                                                        value: formData.modelId,
                                                        onChange: (e_3)=>setFormData({
                                                                ...formData,
                                                                modelId: e_3.target.value
                                                            }),
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                value: "",
                                                                children: "Empty (Custom Upload)"
                                                            }, void 0, false, {
                                                                fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                                lineNumber: 220,
                                                                columnNumber: 21
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$constants$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["MOCK_MODELS"].map(_temp4)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                        lineNumber: 217,
                                                        columnNumber: 873
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$right$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronRight$3e$__["ChevronRight"], {
                                                        size: 16,
                                                        className: "absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-slate-600"
                                                    }, void 0, false, {
                                                        fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                        lineNumber: 220,
                                                        columnNumber: 102
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                lineNumber: 217,
                                                columnNumber: 847
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                        lineNumber: 217,
                                        columnNumber: 653
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                        className: "block",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$database$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Database$3e$__["Database"], {
                                                        size: 14,
                                                        className: "text-emerald-400"
                                                    }, void 0, false, {
                                                        fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                        lineNumber: 220,
                                                        columnNumber: 352
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    "Mount Dataset"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                lineNumber: 220,
                                                columnNumber: 246
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "relative",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                        className: "w-full appearance-none bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 outline-none pr-10",
                                                        value: formData.datasetId,
                                                        onChange: (e_4)=>setFormData({
                                                                ...formData,
                                                                datasetId: e_4.target.value
                                                            }),
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                value: "",
                                                                children: "None"
                                                            }, void 0, false, {
                                                                fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                                lineNumber: 223,
                                                                columnNumber: 21
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$constants$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["MOCK_DATASETS"].map(_temp5)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                        lineNumber: 220,
                                                        columnNumber: 449
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$right$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronRight$3e$__["ChevronRight"], {
                                                        size: 16,
                                                        className: "absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-slate-600"
                                                    }, void 0, false, {
                                                        fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                        lineNumber: 223,
                                                        columnNumber: 87
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                lineNumber: 220,
                                                columnNumber: 423
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                        lineNumber: 220,
                                        columnNumber: 221
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                lineNumber: 217,
                                columnNumber: 598
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "bg-slate-950/50 p-6 rounded-2xl border border-slate-800 space-y-6",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center gap-2 pb-2 border-b border-slate-800",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$cpu$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Cpu$3e$__["Cpu"], {
                                                size: 16,
                                                className: "text-amber-400"
                                            }, void 0, false, {
                                                fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                lineNumber: 223,
                                                columnNumber: 367
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                className: "text-xs font-bold text-white uppercase tracking-widest",
                                                children: "Compute Specs"
                                            }, void 0, false, {
                                                fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                lineNumber: 223,
                                                columnNumber: 411
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                        lineNumber: 223,
                                        columnNumber: 295
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "grid grid-cols-2 gap-8",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "space-y-4",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "text-[10px] font-bold text-slate-500 uppercase tracking-widest",
                                                        children: "Architecture"
                                                    }, void 0, false, {
                                                        fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                        lineNumber: 223,
                                                        columnNumber: 573
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "flex gap-2",
                                                        children: [
                                                            __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$types$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["ResourceType"].H100,
                                                            __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$types$2e$ts__$5b$client$5d$__$28$ecmascript$29$__["ResourceType"].A100
                                                        ].map((t)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                type: "button",
                                                                onClick: ()=>setFormData({
                                                                        ...formData,
                                                                        gpuType: t
                                                                    }),
                                                                className: `flex-1 py-2 text-[10px] font-bold rounded-lg border transition-all ${formData.gpuType === t ? "bg-indigo-600 border-indigo-500 text-white" : "bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700"}`,
                                                                children: t.split(" ")[1]
                                                            }, t, false, {
                                                                fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                                lineNumber: 223,
                                                                columnNumber: 750
                                                            }, ("TURBOPACK compile-time value", void 0)))
                                                    }, void 0, false, {
                                                        fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                        lineNumber: 223,
                                                        columnNumber: 673
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                lineNumber: 223,
                                                columnNumber: 546
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "space-y-4",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "text-[10px] font-bold text-slate-500 uppercase tracking-widest",
                                                        children: [
                                                            "GPU Count: ",
                                                            formData.gpuCount
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                        lineNumber: 226,
                                                        columnNumber: 316
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                        type: "range",
                                                        min: "0.1",
                                                        max: "8",
                                                        step: "0.1",
                                                        value: formData.gpuCount,
                                                        onChange: (e_5)=>setFormData({
                                                                ...formData,
                                                                gpuCount: parseFloat(e_5.target.value)
                                                            }),
                                                        className: "w-full accent-indigo-500"
                                                    }, void 0, false, {
                                                        fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                        lineNumber: 226,
                                                        columnNumber: 434
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                lineNumber: 226,
                                                columnNumber: 289
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                        lineNumber: 223,
                                        columnNumber: 506
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                lineNumber: 223,
                                columnNumber: 212
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "pt-4 flex gap-4",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "submit",
                                    className: "flex-1 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/20",
                                    children: "Launch Development Sandbox"
                                }, void 0, false, {
                                    fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                    lineNumber: 229,
                                    columnNumber: 111
                                }, ("TURBOPACK compile-time value", void 0))
                            }, void 0, false, {
                                fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                lineNumber: 229,
                                columnNumber: 78
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                        lineNumber: 201,
                        columnNumber: 909
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                lineNumber: 201,
                columnNumber: 172
            }, ("TURBOPACK compile-time value", void 0))
        }, void 0, false, {
            fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
            lineNumber: 201,
            columnNumber: 32
        }, ("TURBOPACK compile-time value", void 0));
        $[26] = formData;
        $[27] = handleCreate;
        $[28] = isCreateModalOpen;
        $[29] = t18;
    } else {
        t18 = $[29];
    }
    let t19;
    if ($[30] !== copied || $[31] !== insight || $[32] !== isCreateModalOpen || $[33] !== selectedSession) {
        t19 = selectedSession && !isCreateModalOpen && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "bg-slate-900 border border-slate-800 w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-4",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "w-12 h-12 rounded-2xl bg-indigo-600/20 flex items-center justify-center text-indigo-400 border border-indigo-600/30",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$terminal$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Terminal$3e$__["Terminal"], {
                                            size: 24
                                        }, void 0, false, {
                                            fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                            lineNumber: 239,
                                            columnNumber: 598
                                        }, ("TURBOPACK compile-time value", void 0))
                                    }, void 0, false, {
                                        fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                        lineNumber: 239,
                                        columnNumber: 465
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                                className: "text-2xl font-bold text-white",
                                                children: selectedSession.name
                                            }, void 0, false, {
                                                fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                lineNumber: 239,
                                                columnNumber: 631
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex items-center gap-4 mt-1",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: `text-[10px] font-bold px-2 py-0.5 rounded-full border ${__TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$constants$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["STATUS_COLORS"][selectedSession.status]}`,
                                                        children: selectedSession.status
                                                    }, void 0, false, {
                                                        fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                        lineNumber: 239,
                                                        columnNumber: 750
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "text-xs text-slate-500",
                                                        children: [
                                                            "Instance: ",
                                                            selectedSession.id
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                        lineNumber: 239,
                                                        columnNumber: 896
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                lineNumber: 239,
                                                columnNumber: 704
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                        lineNumber: 239,
                                        columnNumber: 626
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                lineNumber: 239,
                                columnNumber: 424
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>setSelectedSession(null),
                                className: "p-2 hover:bg-slate-800 rounded-full text-slate-500 transition-colors",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                                    size: 24
                                }, void 0, false, {
                                    fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                    lineNumber: 239,
                                    columnNumber: 1122
                                }, ("TURBOPACK compile-time value", void 0))
                            }, void 0, false, {
                                fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                lineNumber: 239,
                                columnNumber: 992
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                        lineNumber: 239,
                        columnNumber: 327
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex-1 overflow-y-auto p-8 grid grid-cols-1 md:grid-cols-3 gap-8 custom-scrollbar",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "md:col-span-2 space-y-8",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "space-y-4",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                className: "text-xs font-bold text-slate-400 uppercase tracking-widest",
                                                children: "Modify Code & Connect"
                                            }, void 0, false, {
                                                fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                lineNumber: 239,
                                                columnNumber: 1319
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "grid grid-cols-2 gap-4",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "p-5 bg-slate-950 border border-slate-800 rounded-2xl hover:border-indigo-500 transition-all group",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "flex justify-between items-start mb-4",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "p-2 bg-indigo-600/10 rounded-xl text-indigo-400",
                                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$code$2d$xml$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Code2$3e$__["Code2"], {
                                                                            size: 24
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                                            lineNumber: 239,
                                                                            columnNumber: 1699
                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                                        lineNumber: 239,
                                                                        columnNumber: 1634
                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        className: "text-[9px] font-bold text-indigo-400 uppercase bg-indigo-400/5 px-2 py-1 rounded",
                                                                        children: "Recommended"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                                        lineNumber: 239,
                                                                        columnNumber: 1724
                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                                lineNumber: 239,
                                                                columnNumber: 1579
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h4", {
                                                                className: "font-bold text-white mb-1",
                                                                children: "VS Code Remote"
                                                            }, void 0, false, {
                                                                fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                                lineNumber: 239,
                                                                columnNumber: 1847
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                className: "text-xs text-slate-500 mb-4",
                                                                children: "Connect via VS Code's Remote-SSH extension for a native IDE experience."
                                                            }, void 0, false, {
                                                                fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                                lineNumber: 239,
                                                                columnNumber: 1908
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "flex items-center gap-2 bg-slate-900 p-2 rounded-lg border border-slate-800 mb-3",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("code", {
                                                                        className: "text-[10px] text-slate-400 font-mono truncate",
                                                                        children: [
                                                                            "ssh -p 2222 user@cluster-node-",
                                                                            selectedSession.id
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                                        lineNumber: 239,
                                                                        columnNumber: 2124
                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                        onClick: ()=>copySSH(selectedSession.id),
                                                                        className: "p-1.5 hover:bg-slate-800 rounded-md text-slate-500 hover:text-white transition-colors",
                                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$copy$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Copy$3e$__["Copy"], {
                                                                            size: 14,
                                                                            className: copied ? "text-emerald-400" : ""
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                                            lineNumber: 239,
                                                                            columnNumber: 2395
                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                                        lineNumber: 239,
                                                                        columnNumber: 2245
                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                                lineNumber: 239,
                                                                columnNumber: 2026
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                className: "w-full py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-500 transition-colors",
                                                                children: "Open in VS Code"
                                                            }, void 0, false, {
                                                                fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                                lineNumber: 239,
                                                                columnNumber: 2473
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                        lineNumber: 239,
                                                        columnNumber: 1464
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "p-5 bg-slate-950 border border-slate-800 rounded-2xl hover:border-emerald-500 transition-all group",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "flex justify-between items-start mb-4",
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "p-2 bg-emerald-600/10 rounded-xl text-emerald-400",
                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$terminal$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Terminal$3e$__["Terminal"], {
                                                                        size: 24
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                                        lineNumber: 239,
                                                                        columnNumber: 2865
                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                }, void 0, false, {
                                                                    fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                                    lineNumber: 239,
                                                                    columnNumber: 2798
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            }, void 0, false, {
                                                                fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                                lineNumber: 239,
                                                                columnNumber: 2743
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h4", {
                                                                className: "font-bold text-white mb-1",
                                                                children: "Web Terminal"
                                                            }, void 0, false, {
                                                                fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                                lineNumber: 239,
                                                                columnNumber: 2899
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                className: "text-xs text-slate-500 mb-4",
                                                                children: "Instant browser-based terminal access for quick edits and execution."
                                                            }, void 0, false, {
                                                                fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                                lineNumber: 239,
                                                                columnNumber: 2958
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                className: "w-full mt-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-500 transition-colors flex items-center justify-center gap-2",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$external$2d$link$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ExternalLink$3e$__["ExternalLink"], {
                                                                        size: 14
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                                        lineNumber: 239,
                                                                        columnNumber: 3243
                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                    "Launch Terminal"
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                                lineNumber: 239,
                                                                columnNumber: 3073
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                        lineNumber: 239,
                                                        columnNumber: 2627
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                lineNumber: 239,
                                                columnNumber: 1424
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                        lineNumber: 239,
                                        columnNumber: 1292
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "space-y-4",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                className: "text-xs font-bold text-slate-400 uppercase tracking-widest",
                                                children: "Sandbox Activity"
                                            }, void 0, false, {
                                                fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                lineNumber: 239,
                                                columnNumber: 3338
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "bg-black/60 rounded-2xl border border-slate-800 p-6 font-mono text-[11px] text-slate-400 space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar",
                                                children: [
                                                    selectedSession.logs?.map(_temp6),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "text-emerald-400 animate-pulse",
                                                        children: "_"
                                                    }, void 0, false, {
                                                        fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                        lineNumber: 239,
                                                        columnNumber: 3629
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                lineNumber: 239,
                                                columnNumber: 3434
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                        lineNumber: 239,
                                        columnNumber: 3311
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                lineNumber: 239,
                                columnNumber: 1251
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "space-y-8",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "p-6 bg-slate-950 border border-slate-800 rounded-3xl",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                className: "text-xs font-bold text-slate-400 uppercase tracking-widest mb-4",
                                                children: "Environment Stats"
                                            }, void 0, false, {
                                                fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                lineNumber: 239,
                                                columnNumber: 3799
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "space-y-4",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "flex justify-between items-center text-xs",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "text-slate-500",
                                                                children: "VRAM Usage"
                                                            }, void 0, false, {
                                                                fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                                lineNumber: 239,
                                                                columnNumber: 3987
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "text-slate-200 font-bold font-mono",
                                                                children: "12.4 / 80 GB"
                                                            }, void 0, false, {
                                                                fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                                lineNumber: 239,
                                                                columnNumber: 4037
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                        lineNumber: 239,
                                                        columnNumber: 3928
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "w-full bg-slate-800 h-1.5 rounded-full overflow-hidden",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "bg-indigo-500 h-full w-[15%]"
                                                        }, void 0, false, {
                                                            fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                            lineNumber: 239,
                                                            columnNumber: 4187
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    }, void 0, false, {
                                                        fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                        lineNumber: 239,
                                                        columnNumber: 4115
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "flex justify-between items-center text-xs pt-2",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "text-slate-500",
                                                                children: "GPU Power"
                                                            }, void 0, false, {
                                                                fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                                lineNumber: 239,
                                                                columnNumber: 4305
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "text-slate-200 font-bold font-mono",
                                                                children: "185W"
                                                            }, void 0, false, {
                                                                fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                                lineNumber: 239,
                                                                columnNumber: 4354
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                        lineNumber: 239,
                                                        columnNumber: 4241
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                lineNumber: 239,
                                                columnNumber: 3901
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                        lineNumber: 239,
                                        columnNumber: 3729
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "bg-indigo-600/5 border border-indigo-500/20 rounded-3xl p-6",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex items-center gap-2 mb-3",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$activity$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Activity$3e$__["Activity"], {
                                                        size: 16,
                                                        className: "text-indigo-400"
                                                    }, void 0, false, {
                                                        fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                        lineNumber: 239,
                                                        columnNumber: 4559
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                        className: "text-xs font-bold text-indigo-300 uppercase tracking-widest",
                                                        children: "AI Debugging"
                                                    }, void 0, false, {
                                                        fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                        lineNumber: 239,
                                                        columnNumber: 4609
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                lineNumber: 239,
                                                columnNumber: 4513
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-[11px] text-slate-400 leading-relaxed italic",
                                                children: insight || "Gemini is monitoring environment for potential CUDA OOM issues..."
                                            }, void 0, false, {
                                                fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                                lineNumber: 239,
                                                columnNumber: 4708
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                        lineNumber: 239,
                                        columnNumber: 4436
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        className: "w-full py-4 bg-slate-800 text-red-400 border border-red-400/20 font-bold rounded-2xl hover:bg-red-400 hover:text-white transition-all",
                                        children: "Stop & Reclaim GPU"
                                    }, void 0, false, {
                                        fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                        lineNumber: 239,
                                        columnNumber: 4863
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                                lineNumber: 239,
                                columnNumber: 3702
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                        lineNumber: 239,
                        columnNumber: 1152
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                lineNumber: 239,
                columnNumber: 190
            }, ("TURBOPACK compile-time value", void 0))
        }, void 0, false, {
            fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
            lineNumber: 239,
            columnNumber: 52
        }, ("TURBOPACK compile-time value", void 0));
        $[30] = copied;
        $[31] = insight;
        $[32] = isCreateModalOpen;
        $[33] = selectedSession;
        $[34] = t19;
    } else {
        t19 = $[34];
    }
    let t20;
    if ($[35] !== t17 || $[36] !== t18 || $[37] !== t19) {
        t20 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500",
            children: [
                t10,
                t12,
                t17,
                t18,
                t19
            ]
        }, void 0, true, {
            fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
            lineNumber: 250,
            columnNumber: 11
        }, ("TURBOPACK compile-time value", void 0));
        $[35] = t17;
        $[36] = t18;
        $[37] = t19;
        $[38] = t20;
    } else {
        t20 = $[38];
    }
    return t20;
};
_s(Sandboxes, "gf4TnDrp0qrys1OwkqBUMtArcp0=");
_c = Sandboxes;
const __TURBOPACK__default__export__ = Sandboxes;
function _temp(w) {
    return w.type === "INTERACTIVE";
}
function _temp2(e_0) {
    e_0.stopPropagation();
}
function _temp3(e_1) {
    return e_1.stopPropagation();
}
function _temp4(m) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
        value: m.id,
        children: m.name
    }, m.id, false, {
        fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
        lineNumber: 271,
        columnNumber: 10
    }, this);
}
function _temp5(d) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
        value: d.id,
        children: d.name
    }, d.id, false, {
        fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
        lineNumber: 274,
        columnNumber: 10
    }, this);
}
function _temp6(log, i) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex gap-4",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "opacity-30",
                children: [
                    "09:4",
                    i,
                    ":12"
                ]
            }, void 0, true, {
                fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                lineNumber: 277,
                columnNumber: 46
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "text-indigo-300/80",
                children: log
            }, void 0, false, {
                fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
                lineNumber: 277,
                columnNumber: 92
            }, this)
        ]
    }, i, true, {
        fileName: "[project]/GPUMaestro/components/Sandboxes.tsx",
        lineNumber: 277,
        columnNumber: 10
    }, this);
}
var _c;
__turbopack_context__.k.register(_c, "Sandboxes");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/GPUMaestro/pages/sandboxes.tsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$components$2f$Sandboxes$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/GPUMaestro/components/Sandboxes.tsx [client] (ecmascript)");
;
const __TURBOPACK__default__export__ = __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$components$2f$Sandboxes$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["default"];
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[next]/entry/page-loader.ts { PAGE => \"[project]/GPUMaestro/pages/sandboxes.tsx [client] (ecmascript)\" } [client] (ecmascript)", ((__turbopack_context__, module, exports) => {

const PAGE_PATH = "/sandboxes";
(window.__NEXT_P = window.__NEXT_P || []).push([
    PAGE_PATH,
    ()=>{
        return __turbopack_context__.r("[project]/GPUMaestro/pages/sandboxes.tsx [client] (ecmascript)");
    }
]);
// @ts-expect-error module.hot exists
if (module.hot) {
    // @ts-expect-error module.hot exists
    module.hot.dispose(function() {
        window.__NEXT_P.push([
            PAGE_PATH
        ]);
    });
}
}),
"[hmr-entry]/hmr-entry.js { ENTRY => \"[project]/GPUMaestro/pages/sandboxes\" }", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.r("[next]/entry/page-loader.ts { PAGE => \"[project]/GPUMaestro/pages/sandboxes.tsx [client] (ecmascript)\" } [client] (ecmascript)");
}),
]);

//# sourceMappingURL=%5Broot-of-the-server%5D__9c4dcd75._.js.map