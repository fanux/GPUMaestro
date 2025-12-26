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
"[project]/GPUMaestro/components/DatasetManagement.tsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/GPUMaestro/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$compiler$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/GPUMaestro/node_modules/react/compiler-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/GPUMaestro/node_modules/react/index.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$constants$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/GPUMaestro/constants.tsx [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$database$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Database$3e$__ = __turbopack_context__.i("[project]/GPUMaestro/node_modules/lucide-react/dist/esm/icons/database.js [client] (ecmascript) <export default as Database>");
var __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$plus$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Plus$3e$__ = __turbopack_context__.i("[project]/GPUMaestro/node_modules/lucide-react/dist/esm/icons/plus.js [client] (ecmascript) <export default as Plus>");
var __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$search$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Search$3e$__ = __turbopack_context__.i("[project]/GPUMaestro/node_modules/lucide-react/dist/esm/icons/search.js [client] (ecmascript) <export default as Search>");
var __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$eye$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Eye$3e$__ = __turbopack_context__.i("[project]/GPUMaestro/node_modules/lucide-react/dist/esm/icons/eye.js [client] (ecmascript) <export default as Eye>");
var __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$refresh$2d$cw$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__RefreshCw$3e$__ = __turbopack_context__.i("[project]/GPUMaestro/node_modules/lucide-react/dist/esm/icons/refresh-cw.js [client] (ecmascript) <export default as RefreshCw>");
var __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$hard$2d$drive$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__HardDrive$3e$__ = __turbopack_context__.i("[project]/GPUMaestro/node_modules/lucide-react/dist/esm/icons/hard-drive.js [client] (ecmascript) <export default as HardDrive>");
var __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$info$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Info$3e$__ = __turbopack_context__.i("[project]/GPUMaestro/node_modules/lucide-react/dist/esm/icons/info.js [client] (ecmascript) <export default as Info>");
var __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$share$2d$2$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Share2$3e$__ = __turbopack_context__.i("[project]/GPUMaestro/node_modules/lucide-react/dist/esm/icons/share-2.js [client] (ecmascript) <export default as Share2>");
;
var _s = __turbopack_context__.k.signature();
;
;
;
;
const DatasetManagement = ()=>{
    _s();
    const $ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$compiler$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["c"])(54);
    if ($[0] !== "dd0daef1a7b778519ee3e96349ef0bfd427e8f8c143e5a342c927625abbe50da") {
        for(let $i = 0; $i < 54; $i += 1){
            $[$i] = Symbol.for("react.memo_cache_sentinel");
        }
        $[0] = "dd0daef1a7b778519ee3e96349ef0bfd427e8f8c143e5a342c927625abbe50da";
    }
    const [searchTerm, setSearchTerm] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])("");
    let t0;
    let t1;
    let t10;
    let t2;
    let t3;
    let t4;
    let t5;
    let t6;
    let t7;
    let t8;
    let t9;
    if ($[1] !== searchTerm) {
        const filteredDatasets = __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$constants$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["MOCK_DATASETS"].filter((d)=>d.name.toLowerCase().includes(searchTerm.toLowerCase()) || d.source.toLowerCase().includes(searchTerm.toLowerCase()));
        t9 = "space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500";
        let t11;
        if ($[13] === Symbol.for("react.memo_cache_sentinel")) {
            t11 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                        className: "text-2xl font-bold text-white",
                        children: "Datasets & Storage"
                    }, void 0, false, {
                        fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
                        lineNumber: 30,
                        columnNumber: 18
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-slate-400",
                        children: "Manage data sources for training and evaluation pipelines."
                    }, void 0, false, {
                        fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
                        lineNumber: 30,
                        columnNumber: 91
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
                lineNumber: 30,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0));
            $[13] = t11;
        } else {
            t11 = $[13];
        }
        if ($[14] === Symbol.for("react.memo_cache_sentinel")) {
            t10 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex justify-between items-center",
                children: [
                    t11,
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        className: "flex items-center gap-2 px-6 py-3 bg-indigo-600 rounded-xl font-bold text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition-all hover:-translate-y-0.5",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$plus$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Plus$3e$__["Plus"], {
                                size: 18
                            }, void 0, false, {
                                fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
                                lineNumber: 36,
                                columnNumber: 258
                            }, ("TURBOPACK compile-time value", void 0)),
                            "Add Dataset"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
                        lineNumber: 36,
                        columnNumber: 69
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
                lineNumber: 36,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0));
            $[14] = t10;
        } else {
            t10 = $[14];
        }
        t8 = "grid grid-cols-1 md:grid-cols-3 gap-6";
        t7 = "md:col-span-2 space-y-6";
        t5 = "bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-sm shadow-xl";
        let t12;
        if ($[15] === Symbol.for("react.memo_cache_sentinel")) {
            t12 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$search$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Search$3e$__["Search"], {
                size: 18,
                className: "text-slate-500"
            }, void 0, false, {
                fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
                lineNumber: 46,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0));
            $[15] = t12;
        } else {
            t12 = $[15];
        }
        let t13;
        if ($[16] === Symbol.for("react.memo_cache_sentinel")) {
            t13 = (e)=>setSearchTerm(e.target.value);
            $[16] = t13;
        } else {
            t13 = $[16];
        }
        const t14 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
            type: "text",
            placeholder: "Filter datasets...",
            className: "bg-transparent border-none outline-none text-sm w-full",
            value: searchTerm,
            onChange: t13
        }, void 0, false, {
            fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
            lineNumber: 58,
            columnNumber: 17
        }, ("TURBOPACK compile-time value", void 0));
        let t15;
        if ($[17] !== t14) {
            t15 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center gap-3 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 flex-1 max-w-md",
                children: [
                    t12,
                    t14
                ]
            }, void 0, true, {
                fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
                lineNumber: 61,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0));
            $[17] = t14;
            $[18] = t15;
        } else {
            t15 = $[18];
        }
        let t16;
        if ($[19] === Symbol.for("react.memo_cache_sentinel")) {
            t16 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex gap-2",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                    className: "p-2 text-slate-400 hover:bg-slate-800 rounded-lg transition-colors",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$refresh$2d$cw$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__RefreshCw$3e$__["RefreshCw"], {
                        size: 18
                    }, void 0, false, {
                        fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
                        lineNumber: 69,
                        columnNumber: 128
                    }, ("TURBOPACK compile-time value", void 0))
                }, void 0, false, {
                    fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
                    lineNumber: 69,
                    columnNumber: 41
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false, {
                fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
                lineNumber: 69,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0));
            $[19] = t16;
        } else {
            t16 = $[19];
        }
        if ($[20] !== t15) {
            t6 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60",
                children: [
                    t15,
                    t16
                ]
            }, void 0, true, {
                fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
                lineNumber: 75,
                columnNumber: 12
            }, ("TURBOPACK compile-time value", void 0));
            $[20] = t15;
            $[21] = t6;
        } else {
            t6 = $[21];
        }
        t4 = "overflow-x-auto";
        t2 = "w-full text-left border-collapse";
        if ($[22] === Symbol.for("react.memo_cache_sentinel")) {
            t3 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                    className: "bg-slate-950/50 text-[10px] uppercase tracking-widest font-bold text-slate-500 border-b border-slate-800",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                            className: "px-6 py-4",
                            children: "Dataset Name"
                        }, void 0, false, {
                            fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
                            lineNumber: 84,
                            columnNumber: 140
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                            className: "px-6 py-4",
                            children: "Size / Items"
                        }, void 0, false, {
                            fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
                            lineNumber: 84,
                            columnNumber: 183
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                            className: "px-6 py-4",
                            children: "Format"
                        }, void 0, false, {
                            fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
                            lineNumber: 84,
                            columnNumber: 226
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                            className: "px-6 py-4",
                            children: "Status"
                        }, void 0, false, {
                            fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
                            lineNumber: 84,
                            columnNumber: 263
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                            className: "px-6 py-4 text-right",
                            children: "Actions"
                        }, void 0, false, {
                            fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
                            lineNumber: 84,
                            columnNumber: 300
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
                    lineNumber: 84,
                    columnNumber: 19
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false, {
                fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
                lineNumber: 84,
                columnNumber: 12
            }, ("TURBOPACK compile-time value", void 0));
            $[22] = t3;
        } else {
            t3 = $[22];
        }
        t0 = "divide-y divide-slate-800";
        t1 = filteredDatasets.map(_temp);
        $[1] = searchTerm;
        $[2] = t0;
        $[3] = t1;
        $[4] = t10;
        $[5] = t2;
        $[6] = t3;
        $[7] = t4;
        $[8] = t5;
        $[9] = t6;
        $[10] = t7;
        $[11] = t8;
        $[12] = t9;
    } else {
        t0 = $[2];
        t1 = $[3];
        t10 = $[4];
        t2 = $[5];
        t3 = $[6];
        t4 = $[7];
        t5 = $[8];
        t6 = $[9];
        t7 = $[10];
        t8 = $[11];
        t9 = $[12];
    }
    let t11;
    if ($[23] !== t0 || $[24] !== t1) {
        t11 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
            className: t0,
            children: t1
        }, void 0, false, {
            fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
            lineNumber: 118,
            columnNumber: 11
        }, ("TURBOPACK compile-time value", void 0));
        $[23] = t0;
        $[24] = t1;
        $[25] = t11;
    } else {
        t11 = $[25];
    }
    let t12;
    if ($[26] !== t11 || $[27] !== t2 || $[28] !== t3) {
        t12 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
            className: t2,
            children: [
                t3,
                t11
            ]
        }, void 0, true, {
            fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
            lineNumber: 127,
            columnNumber: 11
        }, ("TURBOPACK compile-time value", void 0));
        $[26] = t11;
        $[27] = t2;
        $[28] = t3;
        $[29] = t12;
    } else {
        t12 = $[29];
    }
    let t13;
    if ($[30] !== t12 || $[31] !== t4) {
        t13 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: t4,
            children: t12
        }, void 0, false, {
            fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
            lineNumber: 137,
            columnNumber: 11
        }, ("TURBOPACK compile-time value", void 0));
        $[30] = t12;
        $[31] = t4;
        $[32] = t13;
    } else {
        t13 = $[32];
    }
    let t14;
    if ($[33] !== t13 || $[34] !== t5 || $[35] !== t6) {
        t14 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: t5,
            children: [
                t6,
                t13
            ]
        }, void 0, true, {
            fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
            lineNumber: 146,
            columnNumber: 11
        }, ("TURBOPACK compile-time value", void 0));
        $[33] = t13;
        $[34] = t5;
        $[35] = t6;
        $[36] = t14;
    } else {
        t14 = $[36];
    }
    let t15;
    if ($[37] !== t14 || $[38] !== t7) {
        t15 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: t7,
            children: t14
        }, void 0, false, {
            fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
            lineNumber: 156,
            columnNumber: 11
        }, ("TURBOPACK compile-time value", void 0));
        $[37] = t14;
        $[38] = t7;
        $[39] = t15;
    } else {
        t15 = $[39];
    }
    let t16;
    if ($[40] === Symbol.for("react.memo_cache_sentinel")) {
        t16 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
            className: "text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$hard$2d$drive$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__HardDrive$3e$__["HardDrive"], {
                    size: 16,
                    className: "text-indigo-400"
                }, void 0, false, {
                    fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
                    lineNumber: 165,
                    columnNumber: 115
                }, ("TURBOPACK compile-time value", void 0)),
                "Storage Quota"
            ]
        }, void 0, true, {
            fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
            lineNumber: 165,
            columnNumber: 11
        }, ("TURBOPACK compile-time value", void 0));
        $[40] = t16;
    } else {
        t16 = $[40];
    }
    let t17;
    if ($[41] === Symbol.for("react.memo_cache_sentinel")) {
        t17 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex justify-between items-center text-xs",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: "text-slate-500",
                    children: "PVC Storage (Hot)"
                }, void 0, false, {
                    fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
                    lineNumber: 172,
                    columnNumber: 70
                }, ("TURBOPACK compile-time value", void 0)),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: "text-slate-200 font-bold",
                    children: "1.2 TB / 5 TB"
                }, void 0, false, {
                    fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
                    lineNumber: 172,
                    columnNumber: 127
                }, ("TURBOPACK compile-time value", void 0))
            ]
        }, void 0, true, {
            fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
            lineNumber: 172,
            columnNumber: 11
        }, ("TURBOPACK compile-time value", void 0));
        $[41] = t17;
    } else {
        t17 = $[41];
    }
    let t18;
    if ($[42] === Symbol.for("react.memo_cache_sentinel")) {
        t18 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "space-y-2",
            children: [
                t17,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "w-full bg-slate-800 h-2 rounded-full overflow-hidden",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "bg-indigo-600 h-full w-[24%]"
                    }, void 0, false, {
                        fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
                        lineNumber: 179,
                        columnNumber: 113
                    }, ("TURBOPACK compile-time value", void 0))
                }, void 0, false, {
                    fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
                    lineNumber: 179,
                    columnNumber: 43
                }, ("TURBOPACK compile-time value", void 0))
            ]
        }, void 0, true, {
            fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
            lineNumber: 179,
            columnNumber: 11
        }, ("TURBOPACK compile-time value", void 0));
        $[42] = t18;
    } else {
        t18 = $[42];
    }
    let t19;
    if ($[43] === Symbol.for("react.memo_cache_sentinel")) {
        t19 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex justify-between items-center text-xs",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: "text-slate-500",
                    children: "Cloud Object Store (Cold)"
                }, void 0, false, {
                    fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
                    lineNumber: 186,
                    columnNumber: 70
                }, ("TURBOPACK compile-time value", void 0)),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: "text-slate-200 font-bold",
                    children: "45 TB / 100 TB"
                }, void 0, false, {
                    fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
                    lineNumber: 186,
                    columnNumber: 135
                }, ("TURBOPACK compile-time value", void 0))
            ]
        }, void 0, true, {
            fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
            lineNumber: 186,
            columnNumber: 11
        }, ("TURBOPACK compile-time value", void 0));
        $[43] = t19;
    } else {
        t19 = $[43];
    }
    let t20;
    if ($[44] === Symbol.for("react.memo_cache_sentinel")) {
        t20 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "bg-slate-900/40 border border-slate-800 rounded-3xl p-6",
            children: [
                t16,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "space-y-6",
                    children: [
                        t18,
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "space-y-2",
                            children: [
                                t19,
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "w-full bg-slate-800 h-2 rounded-full overflow-hidden",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "bg-blue-600 h-full w-[45%]"
                                    }, void 0, false, {
                                        fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
                                        lineNumber: 193,
                                        columnNumber: 223
                                    }, ("TURBOPACK compile-time value", void 0))
                                }, void 0, false, {
                                    fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
                                    lineNumber: 193,
                                    columnNumber: 153
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
                            lineNumber: 193,
                            columnNumber: 121
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
                    lineNumber: 193,
                    columnNumber: 89
                }, ("TURBOPACK compile-time value", void 0)),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                    className: "w-full mt-8 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all",
                    children: "Request Expansion"
                }, void 0, false, {
                    fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
                    lineNumber: 193,
                    columnNumber: 287
                }, ("TURBOPACK compile-time value", void 0))
            ]
        }, void 0, true, {
            fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
            lineNumber: 193,
            columnNumber: 11
        }, ("TURBOPACK compile-time value", void 0));
        $[44] = t20;
    } else {
        t20 = $[44];
    }
    let t21;
    if ($[45] === Symbol.for("react.memo_cache_sentinel")) {
        t21 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex items-center gap-2 text-indigo-400 mb-4",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$info$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Info$3e$__["Info"], {
                    size: 18
                }, void 0, false, {
                    fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
                    lineNumber: 200,
                    columnNumber: 73
                }, ("TURBOPACK compile-time value", void 0)),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h4", {
                    className: "font-bold text-sm",
                    children: "Data Insights"
                }, void 0, false, {
                    fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
                    lineNumber: 200,
                    columnNumber: 91
                }, ("TURBOPACK compile-time value", void 0))
            ]
        }, void 0, true, {
            fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
            lineNumber: 200,
            columnNumber: 11
        }, ("TURBOPACK compile-time value", void 0));
        $[45] = t21;
    } else {
        t21 = $[45];
    }
    let t22;
    if ($[46] === Symbol.for("react.memo_cache_sentinel")) {
        t22 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "space-y-6",
            children: [
                t20,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "bg-indigo-600/5 border border-indigo-500/10 rounded-3xl p-6 relative overflow-hidden group",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "relative z-10",
                            children: [
                                t21,
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-xs text-slate-400 leading-relaxed",
                                    children: [
                                        "Your instructional data is being optimized for ",
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "text-indigo-300 font-bold underline decoration-indigo-500/30",
                                            children: "Llama-3"
                                        }, void 0, false, {
                                            fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
                                            lineNumber: 207,
                                            columnNumber: 288
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        " training. Auto-cleaning detected 4,200 redundant entries."
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
                                    lineNumber: 207,
                                    columnNumber: 187
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
                            lineNumber: 207,
                            columnNumber: 151
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$database$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Database$3e$__["Database"], {
                            className: "absolute -right-4 -bottom-4 text-indigo-600/5 group-hover:scale-125 transition-transform",
                            size: 120
                        }, void 0, false, {
                            fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
                            lineNumber: 207,
                            columnNumber: 449
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
                    lineNumber: 207,
                    columnNumber: 43
                }, ("TURBOPACK compile-time value", void 0))
            ]
        }, void 0, true, {
            fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
            lineNumber: 207,
            columnNumber: 11
        }, ("TURBOPACK compile-time value", void 0));
        $[46] = t22;
    } else {
        t22 = $[46];
    }
    let t23;
    if ($[47] !== t15 || $[48] !== t8) {
        t23 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: t8,
            children: [
                t15,
                t22
            ]
        }, void 0, true, {
            fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
            lineNumber: 214,
            columnNumber: 11
        }, ("TURBOPACK compile-time value", void 0));
        $[47] = t15;
        $[48] = t8;
        $[49] = t23;
    } else {
        t23 = $[49];
    }
    let t24;
    if ($[50] !== t10 || $[51] !== t23 || $[52] !== t9) {
        t24 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: t9,
            children: [
                t10,
                t23
            ]
        }, void 0, true, {
            fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
            lineNumber: 223,
            columnNumber: 11
        }, ("TURBOPACK compile-time value", void 0));
        $[50] = t10;
        $[51] = t23;
        $[52] = t9;
        $[53] = t24;
    } else {
        t24 = $[53];
    }
    return t24;
};
_s(DatasetManagement, "+YdqPTpSlp4r5CWiFEQiF/UjThM=");
_c = DatasetManagement;
const __TURBOPACK__default__export__ = DatasetManagement;
function _temp(ds) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
        className: "group hover:bg-slate-800/30 transition-colors",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                className: "px-6 py-5",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex items-center gap-3",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: `p-2 rounded-lg ${ds.category === "TRAIN" ? "bg-indigo-500/10 text-indigo-400" : "bg-purple-500/10 text-purple-400"}`,
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$database$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Database$3e$__["Database"], {
                                size: 16
                            }, void 0, false, {
                                fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
                                lineNumber: 235,
                                columnNumber: 286
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
                            lineNumber: 235,
                            columnNumber: 151
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "font-bold text-slate-200 group-hover:text-white transition-colors text-sm",
                                    children: ds.name
                                }, void 0, false, {
                                    fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
                                    lineNumber: 235,
                                    columnNumber: 319
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-[10px] text-slate-600 font-mono truncate max-w-[180px]",
                                    children: ds.source
                                }, void 0, false, {
                                    fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
                                    lineNumber: 235,
                                    columnNumber: 421
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
                            lineNumber: 235,
                            columnNumber: 314
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
                    lineNumber: 235,
                    columnNumber: 110
                }, this)
            }, void 0, false, {
                fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
                lineNumber: 235,
                columnNumber: 84
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                className: "px-6 py-5",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "space-y-0.5",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-xs font-bold text-slate-300",
                            children: ds.size
                        }, void 0, false, {
                            fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
                            lineNumber: 235,
                            columnNumber: 583
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-[10px] text-slate-500 uppercase tracking-tighter",
                            children: ds.items
                        }, void 0, false, {
                            fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
                            lineNumber: 235,
                            columnNumber: 644
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
                    lineNumber: 235,
                    columnNumber: 554
                }, this)
            }, void 0, false, {
                fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
                lineNumber: 235,
                columnNumber: 528
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                className: "px-6 py-5",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: "text-[10px] px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-400 font-mono",
                    children: ds.format
                }, void 0, false, {
                    fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
                    lineNumber: 235,
                    columnNumber: 764
                }, this)
            }, void 0, false, {
                fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
                lineNumber: 235,
                columnNumber: 738
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                className: "px-6 py-5",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: `inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${ds.status === "SYNCED" ? "text-emerald-400 border-emerald-400/20 bg-emerald-400/5" : ds.status === "PENDING" ? "text-amber-400 border-amber-400/20 bg-amber-400/5" : "text-red-400 border-red-400/20 bg-red-400/5"}`,
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: `w-1.5 h-1.5 rounded-full mr-2 ${ds.status === "SYNCED" ? "bg-emerald-400" : "bg-amber-400"}`
                        }, void 0, false, {
                            fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
                            lineNumber: 235,
                            columnNumber: 1238
                        }, this),
                        ds.status
                    ]
                }, void 0, true, {
                    fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
                    lineNumber: 235,
                    columnNumber: 925
                }, this)
            }, void 0, false, {
                fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
                lineNumber: 235,
                columnNumber: 899
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                className: "px-6 py-5 text-right",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex justify-end gap-2",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            className: "p-2 text-slate-500 hover:text-indigo-400 transition-colors",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$eye$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Eye$3e$__["Eye"], {
                                size: 18
                            }, void 0, false, {
                                fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
                                lineNumber: 235,
                                columnNumber: 1531
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
                            lineNumber: 235,
                            columnNumber: 1452
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            className: "p-2 text-slate-500 hover:text-white transition-colors",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$share$2d$2$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Share2$3e$__["Share2"], {
                                size: 18
                            }, void 0, false, {
                                fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
                                lineNumber: 235,
                                columnNumber: 1631
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
                            lineNumber: 235,
                            columnNumber: 1557
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
                    lineNumber: 235,
                    columnNumber: 1412
                }, this)
            }, void 0, false, {
                fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
                lineNumber: 235,
                columnNumber: 1375
            }, this)
        ]
    }, ds.id, true, {
        fileName: "[project]/GPUMaestro/components/DatasetManagement.tsx",
        lineNumber: 235,
        columnNumber: 10
    }, this);
}
var _c;
__turbopack_context__.k.register(_c, "DatasetManagement");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/GPUMaestro/pages/datasets.tsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$components$2f$DatasetManagement$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/GPUMaestro/components/DatasetManagement.tsx [client] (ecmascript)");
;
const __TURBOPACK__default__export__ = __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$components$2f$DatasetManagement$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["default"];
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[next]/entry/page-loader.ts { PAGE => \"[project]/GPUMaestro/pages/datasets.tsx [client] (ecmascript)\" } [client] (ecmascript)", ((__turbopack_context__, module, exports) => {

const PAGE_PATH = "/datasets";
(window.__NEXT_P = window.__NEXT_P || []).push([
    PAGE_PATH,
    ()=>{
        return __turbopack_context__.r("[project]/GPUMaestro/pages/datasets.tsx [client] (ecmascript)");
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
"[hmr-entry]/hmr-entry.js { ENTRY => \"[project]/GPUMaestro/pages/datasets\" }", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.r("[next]/entry/page-loader.ts { PAGE => \"[project]/GPUMaestro/pages/datasets.tsx [client] (ecmascript)\" } [client] (ecmascript)");
}),
]);

//# sourceMappingURL=%5Broot-of-the-server%5D__aa09a1b2._.js.map