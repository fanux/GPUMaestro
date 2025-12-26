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
"[project]/GPUMaestro/components/AdminPanel.tsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/GPUMaestro/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$compiler$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/GPUMaestro/node_modules/react/compiler-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/GPUMaestro/node_modules/react/index.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$save$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Save$3e$__ = __turbopack_context__.i("[project]/GPUMaestro/node_modules/lucide-react/dist/esm/icons/save.js [client] (ecmascript) <export default as Save>");
var __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Shield$3e$__ = __turbopack_context__.i("[project]/GPUMaestro/node_modules/lucide-react/dist/esm/icons/shield.js [client] (ecmascript) <export default as Shield>");
var __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$info$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Info$3e$__ = __turbopack_context__.i("[project]/GPUMaestro/node_modules/lucide-react/dist/esm/icons/info.js [client] (ecmascript) <export default as Info>");
var __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$gauge$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Gauge$3e$__ = __turbopack_context__.i("[project]/GPUMaestro/node_modules/lucide-react/dist/esm/icons/gauge.js [client] (ecmascript) <export default as Gauge>");
var __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$zap$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Zap$3e$__ = __turbopack_context__.i("[project]/GPUMaestro/node_modules/lucide-react/dist/esm/icons/zap.js [client] (ecmascript) <export default as Zap>");
var __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$server$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Server$3e$__ = __turbopack_context__.i("[project]/GPUMaestro/node_modules/lucide-react/dist/esm/icons/server.js [client] (ecmascript) <export default as Server>");
var __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$sliders$2d$vertical$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Sliders$3e$__ = __turbopack_context__.i("[project]/GPUMaestro/node_modules/lucide-react/dist/esm/icons/sliders-vertical.js [client] (ecmascript) <export default as Sliders>");
var __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$cpu$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Cpu$3e$__ = __turbopack_context__.i("[project]/GPUMaestro/node_modules/lucide-react/dist/esm/icons/cpu.js [client] (ecmascript) <export default as Cpu>");
var __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$database$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Database$3e$__ = __turbopack_context__.i("[project]/GPUMaestro/node_modules/lucide-react/dist/esm/icons/database.js [client] (ecmascript) <export default as Database>");
var __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$thermometer$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Thermometer$3e$__ = __turbopack_context__.i("[project]/GPUMaestro/node_modules/lucide-react/dist/esm/icons/thermometer.js [client] (ecmascript) <export default as Thermometer>");
var __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle2$3e$__ = __turbopack_context__.i("[project]/GPUMaestro/node_modules/lucide-react/dist/esm/icons/circle-check.js [client] (ecmascript) <export default as CheckCircle2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertTriangle$3e$__ = __turbopack_context__.i("[project]/GPUMaestro/node_modules/lucide-react/dist/esm/icons/triangle-alert.js [client] (ecmascript) <export default as AlertTriangle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$fingerprint$2d$pattern$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Fingerprint$3e$__ = __turbopack_context__.i("[project]/GPUMaestro/node_modules/lucide-react/dist/esm/icons/fingerprint-pattern.js [client] (ecmascript) <export default as Fingerprint>");
var __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$network$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Network$3e$__ = __turbopack_context__.i("[project]/GPUMaestro/node_modules/lucide-react/dist/esm/icons/network.js [client] (ecmascript) <export default as Network>");
var __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$constants$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/GPUMaestro/constants.tsx [client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
;
;
;
;
const AdminPanel = ()=>{
    _s();
    const $ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$compiler$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["c"])(23);
    if ($[0] !== "efe4031e57e9cf97623afd86a2cfd7e698da88396fedecdc885c42de2b56ea4a") {
        for(let $i = 0; $i < 23; $i += 1){
            $[$i] = Symbol.for("react.memo_cache_sentinel");
        }
        $[0] = "efe4031e57e9cf97623afd86a2cfd7e698da88396fedecdc885c42de2b56ea4a";
    }
    const [activeSubTab, setActiveSubTab] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])("settings");
    const [gpuSplitting, setGpuSplitting] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [idleTimeout, setIdleTimeout] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(120);
    const [preemption, setPreemption] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])("BEST_EFFORT");
    const [rdmaEnabled, setRdmaEnabled] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(true);
    let t0;
    if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
        t0 = Array.from(new Set(__TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$constants$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["MOCK_GPUS"].map(_temp)));
        $[1] = t0;
    } else {
        t0 = $[1];
    }
    const nodes = t0;
    let t1;
    if ($[2] === Symbol.for("react.memo_cache_sentinel")) {
        t1 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                    className: "text-3xl font-bold text-white tracking-tight",
                    children: "Admin Control Center"
                }, void 0, false, {
                    fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                    lineNumber: 28,
                    columnNumber: 15
                }, ("TURBOPACK compile-time value", void 0)),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "text-slate-400 mt-1",
                    children: "Manage global policies and cluster infrastructure health."
                }, void 0, false, {
                    fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                    lineNumber: 28,
                    columnNumber: 101
                }, ("TURBOPACK compile-time value", void 0))
            ]
        }, void 0, true, {
            fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
            lineNumber: 28,
            columnNumber: 10
        }, ("TURBOPACK compile-time value", void 0));
        $[2] = t1;
    } else {
        t1 = $[2];
    }
    let t2;
    if ($[3] === Symbol.for("react.memo_cache_sentinel")) {
        t2 = ()=>setActiveSubTab("settings");
        $[3] = t2;
    } else {
        t2 = $[3];
    }
    const t3 = `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeSubTab === "settings" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"}`;
    let t4;
    if ($[4] === Symbol.for("react.memo_cache_sentinel")) {
        t4 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$sliders$2d$vertical$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Sliders$3e$__["Sliders"], {
            size: 16
        }, void 0, false, {
            fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
            lineNumber: 43,
            columnNumber: 10
        }, ("TURBOPACK compile-time value", void 0));
        $[4] = t4;
    } else {
        t4 = $[4];
    }
    let t5;
    if ($[5] !== t3) {
        t5 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
            onClick: t2,
            className: t3,
            children: [
                t4,
                "Platform Settings"
            ]
        }, void 0, true, {
            fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
            lineNumber: 50,
            columnNumber: 10
        }, ("TURBOPACK compile-time value", void 0));
        $[5] = t3;
        $[6] = t5;
    } else {
        t5 = $[6];
    }
    let t6;
    if ($[7] === Symbol.for("react.memo_cache_sentinel")) {
        t6 = ()=>setActiveSubTab("nodes");
        $[7] = t6;
    } else {
        t6 = $[7];
    }
    const t7 = `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeSubTab === "nodes" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"}`;
    let t8;
    if ($[8] === Symbol.for("react.memo_cache_sentinel")) {
        t8 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$server$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Server$3e$__["Server"], {
            size: 16
        }, void 0, false, {
            fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
            lineNumber: 66,
            columnNumber: 10
        }, ("TURBOPACK compile-time value", void 0));
        $[8] = t8;
    } else {
        t8 = $[8];
    }
    let t9;
    if ($[9] !== t7) {
        t9 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
            onClick: t6,
            className: t7,
            children: [
                t8,
                "Nodes & Clusters"
            ]
        }, void 0, true, {
            fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
            lineNumber: 73,
            columnNumber: 10
        }, ("TURBOPACK compile-time value", void 0));
        $[9] = t7;
        $[10] = t9;
    } else {
        t9 = $[10];
    }
    let t10;
    if ($[11] !== t5 || $[12] !== t9) {
        t10 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex justify-between items-start",
            children: [
                t1,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex bg-slate-900 p-1 rounded-xl border border-slate-800",
                    children: [
                        t5,
                        t9
                    ]
                }, void 0, true, {
                    fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                    lineNumber: 81,
                    columnNumber: 65
                }, ("TURBOPACK compile-time value", void 0))
            ]
        }, void 0, true, {
            fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
            lineNumber: 81,
            columnNumber: 11
        }, ("TURBOPACK compile-time value", void 0));
        $[11] = t5;
        $[12] = t9;
        $[13] = t10;
    } else {
        t10 = $[13];
    }
    let t11;
    if ($[14] !== activeSubTab || $[15] !== gpuSplitting || $[16] !== idleTimeout || $[17] !== preemption || $[18] !== rdmaEnabled) {
        t11 = activeSubTab === "settings" ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "grid grid-cols-1 md:grid-cols-3 gap-8",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "md:col-span-2 space-y-6",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "bg-slate-900/40 border border-slate-800 rounded-3xl p-8 space-y-8",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                                className: "space-y-6",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center gap-3 pb-2 border-b border-slate-800",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$zap$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Zap$3e$__["Zap"], {
                                                className: "text-amber-400",
                                                size: 20
                                            }, void 0, false, {
                                                fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                                lineNumber: 90,
                                                columnNumber: 323
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                                className: "text-lg font-bold text-white uppercase tracking-wider",
                                                children: "Scheduling Strategy"
                                            }, void 0, false, {
                                                fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                                lineNumber: 90,
                                                columnNumber: 367
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                        lineNumber: 90,
                                        columnNumber: 251
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "space-y-6",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex items-center justify-between group",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "max-w-[70%]",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                className: "font-bold text-slate-100 mb-1",
                                                                children: "GPU Virtualization (Splitting)"
                                                            }, void 0, false, {
                                                                fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                                                lineNumber: 90,
                                                                columnNumber: 580
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                className: "text-sm text-slate-500 leading-relaxed",
                                                                children: "Allow fractional GPU allocation for lightweight interactive sandboxes (e.g., 0.1, 0.5 GPU)."
                                                            }, void 0, false, {
                                                                fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                                                lineNumber: 90,
                                                                columnNumber: 659
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                                        lineNumber: 90,
                                                        columnNumber: 551
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                        onClick: ()=>setGpuSplitting(!gpuSplitting),
                                                        className: `relative w-14 h-8 rounded-full transition-colors duration-300 ${gpuSplitting ? "bg-indigo-600" : "bg-slate-800"}`,
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: `absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform duration-300 ${gpuSplitting ? "translate-x-6" : "translate-x-0"}`
                                                        }, void 0, false, {
                                                            fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                                            lineNumber: 90,
                                                            columnNumber: 996
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    }, void 0, false, {
                                                        fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                                        lineNumber: 90,
                                                        columnNumber: 814
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                                lineNumber: 90,
                                                columnNumber: 494
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "space-y-3",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "font-bold text-slate-100",
                                                        children: "Idle Sandbox Auto-Termination"
                                                    }, void 0, false, {
                                                        fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                                        lineNumber: 90,
                                                        columnNumber: 1197
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-sm text-slate-500 leading-relaxed",
                                                        children: "Reclaim GPU resources if a sandbox shows no activity for the specified period."
                                                    }, void 0, false, {
                                                        fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                                        lineNumber: 90,
                                                        columnNumber: 1270
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "flex items-center gap-4",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                type: "range",
                                                                min: "15",
                                                                max: "480",
                                                                step: "15",
                                                                value: idleTimeout,
                                                                onChange: (e)=>setIdleTimeout(parseInt(e.target.value)),
                                                                className: "flex-1 accent-indigo-500"
                                                            }, void 0, false, {
                                                                fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                                                lineNumber: 90,
                                                                columnNumber: 1447
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "w-24 px-3 py-1 bg-slate-800 border border-slate-700 rounded-lg text-sm text-center font-mono text-indigo-400",
                                                                children: [
                                                                    idleTimeout,
                                                                    " min"
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                                                lineNumber: 90,
                                                                columnNumber: 1612
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                                        lineNumber: 90,
                                                        columnNumber: 1406
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                                lineNumber: 90,
                                                columnNumber: 1170
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                        lineNumber: 90,
                                        columnNumber: 467
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                lineNumber: 90,
                                columnNumber: 220
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                                className: "space-y-6 pt-4",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center gap-3 pb-2 border-b border-slate-800",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$network$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Network$3e$__["Network"], {
                                                className: "text-emerald-400",
                                                size: 20
                                            }, void 0, false, {
                                                fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                                lineNumber: 90,
                                                columnNumber: 1899
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                                className: "text-lg font-bold text-white uppercase tracking-wider",
                                                children: "High Performance Computing"
                                            }, void 0, false, {
                                                fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                                lineNumber: 90,
                                                columnNumber: 1949
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                        lineNumber: 90,
                                        columnNumber: 1827
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center justify-between group",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "max-w-[70%]",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "font-bold text-slate-100 mb-1",
                                                        children: "RDMA / RoCE Acceleration"
                                                    }, void 0, false, {
                                                        fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                                        lineNumber: 90,
                                                        columnNumber: 2142
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-sm text-slate-500 leading-relaxed",
                                                        children: "Enable direct memory access for multi-node Transformer training (DeepSpeed / FSDP)."
                                                    }, void 0, false, {
                                                        fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                                        lineNumber: 90,
                                                        columnNumber: 2215
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                                lineNumber: 90,
                                                columnNumber: 2113
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                onClick: ()=>setRdmaEnabled(!rdmaEnabled),
                                                className: `relative w-14 h-8 rounded-full transition-colors duration-300 ${rdmaEnabled ? "bg-indigo-600" : "bg-slate-800"}`,
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: `absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform duration-300 ${rdmaEnabled ? "translate-x-6" : "translate-x-0"}`
                                                }, void 0, false, {
                                                    fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                                    lineNumber: 90,
                                                    columnNumber: 2541
                                                }, ("TURBOPACK compile-time value", void 0))
                                            }, void 0, false, {
                                                fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                                lineNumber: 90,
                                                columnNumber: 2362
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                        lineNumber: 90,
                                        columnNumber: 2056
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                lineNumber: 90,
                                columnNumber: 1791
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                                className: "space-y-6 pt-4",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center gap-3 pb-2 border-b border-slate-800",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Shield$3e$__["Shield"], {
                                                className: "text-indigo-400",
                                                size: 20
                                            }, void 0, false, {
                                                fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                                lineNumber: 90,
                                                columnNumber: 2832
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                                className: "text-lg font-bold text-white uppercase tracking-wider",
                                                children: "Access & Preemption"
                                            }, void 0, false, {
                                                fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                                lineNumber: 90,
                                                columnNumber: 2880
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                        lineNumber: 90,
                                        columnNumber: 2760
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "space-y-4",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                className: "block",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "block font-bold text-slate-100 mb-2",
                                                        children: "Preemption Policy"
                                                    }, void 0, false, {
                                                        fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                                        lineNumber: 90,
                                                        columnNumber: 3036
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                        value: preemption,
                                                        onChange: (e_0)=>setPreemption(e_0.target.value),
                                                        className: "w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 outline-none focus:border-indigo-500 transition-colors",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                value: "STRICT",
                                                                children: "Strict (Interactive tasks never preempted)"
                                                            }, void 0, false, {
                                                                fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                                                lineNumber: 90,
                                                                columnNumber: 3338
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                value: "BEST_EFFORT",
                                                                children: "Best Effort (High priority batch can preempt low utilization interactive)"
                                                            }, void 0, false, {
                                                                fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                                                lineNumber: 90,
                                                                columnNumber: 3412
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                value: "DISABLED",
                                                                children: "Disabled (First come, first served)"
                                                            }, void 0, false, {
                                                                fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                                                lineNumber: 90,
                                                                columnNumber: 3522
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                                        lineNumber: 90,
                                                        columnNumber: 3114
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                                lineNumber: 90,
                                                columnNumber: 3011
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl flex gap-4",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$info$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Info$3e$__["Info"], {
                                                        className: "text-amber-500 shrink-0",
                                                        size: 20
                                                    }, void 0, false, {
                                                        fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                                        lineNumber: 90,
                                                        columnNumber: 3694
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-xs text-amber-200/70 leading-relaxed italic",
                                                        children: "Note: Changing preemption rules will not affect currently running jobs. New policies take effect on the next scheduling cycle."
                                                    }, void 0, false, {
                                                        fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                                        lineNumber: 90,
                                                        columnNumber: 3748
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                                lineNumber: 90,
                                                columnNumber: 3608
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                        lineNumber: 90,
                                        columnNumber: 2984
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                lineNumber: 90,
                                columnNumber: 2724
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "pt-4",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    className: "flex items-center gap-2 px-6 py-3 bg-indigo-600 rounded-xl font-bold text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition-all",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$save$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Save$3e$__["Save"], {
                                            size: 20
                                        }, void 0, false, {
                                            fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                            lineNumber: 90,
                                            columnNumber: 4152
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        "Save Changes"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                    lineNumber: 90,
                                    columnNumber: 3986
                                }, ("TURBOPACK compile-time value", void 0))
                            }, void 0, false, {
                                fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                lineNumber: 90,
                                columnNumber: 3964
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                        lineNumber: 90,
                        columnNumber: 137
                    }, ("TURBOPACK compile-time value", void 0))
                }, void 0, false, {
                    fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                    lineNumber: 90,
                    columnNumber: 96
                }, ("TURBOPACK compile-time value", void 0)),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "space-y-6",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "bg-slate-900/40 border border-slate-800 rounded-3xl p-6",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                    className: "text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$fingerprint$2d$pattern$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Fingerprint$3e$__["Fingerprint"], {
                                            size: 16
                                        }, void 0, false, {
                                            fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                            lineNumber: 90,
                                            columnNumber: 4413
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        "Cluster Capabilities"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                    lineNumber: 90,
                                    columnNumber: 4309
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "space-y-2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex items-center gap-2 text-xs text-emerald-400 bg-emerald-400/5 px-3 py-2 rounded-lg border border-emerald-400/10",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "w-1.5 h-1.5 rounded-full bg-emerald-400"
                                                }, void 0, false, {
                                                    fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                                    lineNumber: 90,
                                                    columnNumber: 4623
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                "NVLink 4.0 Support"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                            lineNumber: 90,
                                            columnNumber: 4490
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex items-center gap-2 text-xs text-indigo-400 bg-indigo-400/5 px-3 py-2 rounded-lg border border-indigo-400/10",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "w-1.5 h-1.5 rounded-full bg-indigo-400"
                                                }, void 0, false, {
                                                    fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                                    lineNumber: 90,
                                                    columnNumber: 4836
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                "Flash-Attention v2 Ready"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                            lineNumber: 90,
                                            columnNumber: 4706
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex items-center gap-2 text-xs text-blue-400 bg-blue-400/5 px-3 py-2 rounded-lg border border-blue-400/10",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "w-1.5 h-1.5 rounded-full bg-blue-400"
                                                }, void 0, false, {
                                                    fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                                    lineNumber: 90,
                                                    columnNumber: 5048
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                "Multi-Instance GPU (MIG)"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                            lineNumber: 90,
                                            columnNumber: 4924
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                    lineNumber: 90,
                                    columnNumber: 4463
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                            lineNumber: 90,
                            columnNumber: 4236
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "bg-slate-900/40 border border-slate-800 rounded-3xl p-6",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                    className: "text-sm font-bold text-slate-400 uppercase tracking-widest mb-4",
                                    children: "Resource Quotas"
                                }, void 0, false, {
                                    fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                    lineNumber: 90,
                                    columnNumber: 5219
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "space-y-4",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex justify-between items-center text-sm",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "text-slate-400",
                                                    children: "Max GPUs per User"
                                                }, void 0, false, {
                                                    fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                                    lineNumber: 90,
                                                    columnNumber: 5405
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "font-bold text-slate-100",
                                                    children: "8"
                                                }, void 0, false, {
                                                    fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                                    lineNumber: 90,
                                                    columnNumber: 5462
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                            lineNumber: 90,
                                            columnNumber: 5346
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex justify-between items-center text-sm",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "text-slate-400",
                                                    children: "Max Sandbox Duration"
                                                }, void 0, false, {
                                                    fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                                    lineNumber: 90,
                                                    columnNumber: 5578
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "font-bold text-slate-100",
                                                    children: "72h"
                                                }, void 0, false, {
                                                    fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                                    lineNumber: 90,
                                                    columnNumber: 5638
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                            lineNumber: 90,
                                            columnNumber: 5519
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                    lineNumber: 90,
                                    columnNumber: 5319
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    className: "w-full mt-6 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold transition-colors",
                                    children: "Manage Users"
                                }, void 0, false, {
                                    fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                    lineNumber: 90,
                                    columnNumber: 5703
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                            lineNumber: 90,
                            columnNumber: 5146
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "bg-indigo-600/10 border border-indigo-500/20 rounded-3xl p-6",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-center gap-3 mb-4 text-indigo-400",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$gauge$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Gauge$3e$__["Gauge"], {
                                            size: 20
                                        }, void 0, false, {
                                            fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                            lineNumber: 90,
                                            columnNumber: 5988
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                            className: "font-bold",
                                            children: "Usage Optimization"
                                        }, void 0, false, {
                                            fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                            lineNumber: 90,
                                            columnNumber: 6007
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                    lineNumber: 90,
                                    columnNumber: 5926
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-xs text-indigo-100/60 leading-relaxed mb-4",
                                    children: "Based on current Transformer training trends, enabling FP8 precision across the H100 cluster could save 30% energy while maintaining 99% accuracy."
                                }, void 0, false, {
                                    fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                    lineNumber: 90,
                                    columnNumber: 6062
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-center gap-2 text-indigo-400 text-xs font-bold cursor-pointer hover:underline",
                                    children: "View Model Performance Benchmarks"
                                }, void 0, false, {
                                    fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                    lineNumber: 90,
                                    columnNumber: 6275
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                            lineNumber: 90,
                            columnNumber: 5848
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                    lineNumber: 90,
                    columnNumber: 4209
                }, ("TURBOPACK compile-time value", void 0))
            ]
        }, void 0, true, {
            fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
            lineNumber: 90,
            columnNumber: 41
        }, ("TURBOPACK compile-time value", void 0)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "grid grid-cols-1 gap-8 animate-in fade-in zoom-in-95 duration-300",
            children: nodes.map(_temp4)
        }, void 0, false, {
            fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
            lineNumber: 90,
            columnNumber: 6441
        }, ("TURBOPACK compile-time value", void 0));
        $[14] = activeSubTab;
        $[15] = gpuSplitting;
        $[16] = idleTimeout;
        $[17] = preemption;
        $[18] = rdmaEnabled;
        $[19] = t11;
    } else {
        t11 = $[19];
    }
    let t12;
    if ($[20] !== t10 || $[21] !== t11) {
        t12 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500",
            children: [
                t10,
                t11
            ]
        }, void 0, true, {
            fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
            lineNumber: 102,
            columnNumber: 11
        }, ("TURBOPACK compile-time value", void 0));
        $[20] = t10;
        $[21] = t11;
        $[22] = t12;
    } else {
        t12 = $[22];
    }
    return t12;
};
_s(AdminPanel, "DV20li+StZWUQxEU0vJDykRQ9bA=");
_c = AdminPanel;
const __TURBOPACK__default__export__ = AdminPanel;
function _temp(g) {
    return g.nodeName;
}
function _temp2(g_1) {
    return g_1.status === "HEALTHY";
}
function _temp3(gpu) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "p-5 bg-slate-950/50 border border-slate-800 rounded-2xl hover:border-slate-700 transition-all group",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex justify-between items-start mb-4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "text-indigo-400",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$cpu$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Cpu$3e$__["Cpu"], {
                            size: 20
                        }, void 0, false, {
                            fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                            lineNumber: 119,
                            columnNumber: 228
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                        lineNumber: 119,
                        columnNumber: 195
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: `text-[10px] font-bold px-2 py-0.5 rounded-full border ${gpu.status === "HEALTHY" ? "text-emerald-400 border-emerald-400/20 bg-emerald-400/5" : gpu.status === "WARNING" ? "text-amber-400 border-amber-400/20 bg-amber-400/5" : "text-red-400 border-red-400/20 bg-red-400/5"}`,
                        children: gpu.status
                    }, void 0, false, {
                        fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                        lineNumber: 119,
                        columnNumber: 251
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                lineNumber: 119,
                columnNumber: 140
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                className: "font-bold text-slate-100",
                children: gpu.name
            }, void 0, false, {
                fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                lineNumber: 119,
                columnNumber: 567
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-xs text-slate-500 mb-4",
                children: gpu.type
            }, void 0, false, {
                fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                lineNumber: 119,
                columnNumber: 623
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "space-y-3",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex justify-between items-center text-xs",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-1.5 text-slate-400",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$database$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Database$3e$__["Database"], {
                                        size: 12
                                    }, void 0, false, {
                                        fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                        lineNumber: 119,
                                        columnNumber: 824
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: "VRAM"
                                    }, void 0, false, {
                                        fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                        lineNumber: 119,
                                        columnNumber: 846
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                lineNumber: 119,
                                columnNumber: 766
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "font-mono text-slate-200",
                                children: [
                                    gpu.usedMemoryGB,
                                    "/",
                                    gpu.totalMemoryGB,
                                    "GB"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                lineNumber: 119,
                                columnNumber: 869
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                        lineNumber: 119,
                        columnNumber: 707
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "w-full bg-slate-800 h-1 rounded-full overflow-hidden",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "bg-indigo-500 h-full group-hover:bg-indigo-400 transition-colors",
                            style: {
                                width: `${gpu.usedMemoryGB / gpu.totalMemoryGB * 100}%`
                            }
                        }, void 0, false, {
                            fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                            lineNumber: 119,
                            columnNumber: 1035
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                        lineNumber: 119,
                        columnNumber: 965
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex justify-between items-center text-xs",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-1.5 text-slate-400",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$thermometer$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Thermometer$3e$__["Thermometer"], {
                                        size: 12
                                    }, void 0, false, {
                                        fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                        lineNumber: 121,
                                        columnNumber: 137
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: "Temp"
                                    }, void 0, false, {
                                        fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                        lineNumber: 121,
                                        columnNumber: 162
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                lineNumber: 121,
                                columnNumber: 79
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: `font-mono ${gpu.temperatureCelsius > 70 ? "text-amber-400" : "text-slate-200"}`,
                                children: [
                                    gpu.temperatureCelsius,
                                    "°C"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                lineNumber: 121,
                                columnNumber: 185
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                        lineNumber: 121,
                        columnNumber: 20
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                lineNumber: 119,
                columnNumber: 680
            }, this)
        ]
    }, gpu.id, true, {
        fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
        lineNumber: 119,
        columnNumber: 10
    }, this);
}
function _temp4(nodeName) {
    const nodeGpus = __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$constants$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["MOCK_GPUS"].filter((g_0)=>g_0.nodeName === nodeName);
    const isHealthy = nodeGpus.every(_temp2);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-sm shadow-xl",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "p-6 bg-slate-800/30 border-b border-slate-800 flex justify-between items-center",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center gap-4",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: `p-2.5 rounded-xl ${isHealthy ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}`,
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$server$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Server$3e$__["Server"], {
                                    size: 24
                                }, void 0, false, {
                                    fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                    lineNumber: 126,
                                    columnNumber: 398
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                lineNumber: 126,
                                columnNumber: 275
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                        className: "text-lg font-bold text-white",
                                        children: nodeName
                                    }, void 0, false, {
                                        fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                        lineNumber: 126,
                                        columnNumber: 429
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center gap-3 mt-0.5",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-xs text-slate-500",
                                                children: "RDMA: Active (100Gbps)"
                                            }, void 0, false, {
                                                fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                                lineNumber: 126,
                                                columnNumber: 537
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "w-1 h-1 rounded-full bg-slate-700"
                                            }, void 0, false, {
                                                fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                                lineNumber: 126,
                                                columnNumber: 607
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-xs text-slate-500",
                                                children: "NVLink: Enabled"
                                            }, void 0, false, {
                                                fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                                lineNumber: 126,
                                                columnNumber: 661
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                        lineNumber: 126,
                                        columnNumber: 489
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                lineNumber: 126,
                                columnNumber: 424
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                        lineNumber: 126,
                        columnNumber: 234
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center gap-6",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "text-right",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1",
                                        children: "CPU Usage"
                                    }, void 0, false, {
                                        fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                        lineNumber: 126,
                                        columnNumber: 811
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-sm font-bold text-white",
                                        children: "12 / 64 Cores"
                                    }, void 0, false, {
                                        fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                        lineNumber: 126,
                                        columnNumber: 907
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                lineNumber: 126,
                                columnNumber: 783
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "text-right",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1",
                                        children: "Memory"
                                    }, void 0, false, {
                                        fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                        lineNumber: 126,
                                        columnNumber: 1002
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-sm font-bold text-white",
                                        children: "45 / 256 GB"
                                    }, void 0, false, {
                                        fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                        lineNumber: 126,
                                        columnNumber: 1095
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                lineNumber: 126,
                                columnNumber: 974
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: `flex items-center gap-2 px-3 py-1.5 rounded-lg border ${isHealthy ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"}`,
                                children: [
                                    isHealthy ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle2$3e$__["CheckCircle2"], {
                                        size: 16
                                    }, void 0, false, {
                                        fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                        lineNumber: 126,
                                        columnNumber: 1375
                                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertTriangle$3e$__["AlertTriangle"], {
                                        size: 16
                                    }, void 0, false, {
                                        fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                        lineNumber: 126,
                                        columnNumber: 1404
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-xs font-bold uppercase tracking-wider",
                                        children: isHealthy ? "Healthy" : "Issue Detected"
                                    }, void 0, false, {
                                        fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                        lineNumber: 126,
                                        columnNumber: 1432
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                                lineNumber: 126,
                                columnNumber: 1160
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                        lineNumber: 126,
                        columnNumber: 742
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                lineNumber: 126,
                columnNumber: 137
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4",
                children: nodeGpus.map(_temp3)
            }, void 0, false, {
                fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
                lineNumber: 126,
                columnNumber: 1560
            }, this)
        ]
    }, nodeName, true, {
        fileName: "[project]/GPUMaestro/components/AdminPanel.tsx",
        lineNumber: 126,
        columnNumber: 10
    }, this);
}
var _c;
__turbopack_context__.k.register(_c, "AdminPanel");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/GPUMaestro/pages/admin.tsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$components$2f$AdminPanel$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/GPUMaestro/components/AdminPanel.tsx [client] (ecmascript)");
;
const __TURBOPACK__default__export__ = __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$components$2f$AdminPanel$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["default"];
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[next]/entry/page-loader.ts { PAGE => \"[project]/GPUMaestro/pages/admin.tsx [client] (ecmascript)\" } [client] (ecmascript)", ((__turbopack_context__, module, exports) => {

const PAGE_PATH = "/admin";
(window.__NEXT_P = window.__NEXT_P || []).push([
    PAGE_PATH,
    ()=>{
        return __turbopack_context__.r("[project]/GPUMaestro/pages/admin.tsx [client] (ecmascript)");
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
"[hmr-entry]/hmr-entry.js { ENTRY => \"[project]/GPUMaestro/pages/admin\" }", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.r("[next]/entry/page-loader.ts { PAGE => \"[project]/GPUMaestro/pages/admin.tsx [client] (ecmascript)\" } [client] (ecmascript)");
}),
]);

//# sourceMappingURL=%5Broot-of-the-server%5D__bbd67ee3._.js.map