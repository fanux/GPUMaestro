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
"[next]/internal/font/google/inter_278011f6.module.css [client] (css module)", ((__turbopack_context__) => {

__turbopack_context__.v({
  "className": "inter_278011f6-module__nDhZHa__className",
});
}),
"[next]/internal/font/google/inter_278011f6.js [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$next$5d2f$internal$2f$font$2f$google$2f$inter_278011f6$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__ = __turbopack_context__.i("[next]/internal/font/google/inter_278011f6.module.css [client] (css module)");
;
const fontData = {
    className: __TURBOPACK__imported__module__$5b$next$5d2f$internal$2f$font$2f$google$2f$inter_278011f6$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].className,
    style: {
        fontFamily: "'Inter', 'Inter Fallback'",
        fontStyle: "normal"
    }
};
if (__TURBOPACK__imported__module__$5b$next$5d2f$internal$2f$font$2f$google$2f$inter_278011f6$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].variable != null) {
    fontData.variable = __TURBOPACK__imported__module__$5b$next$5d2f$internal$2f$font$2f$google$2f$inter_278011f6$2e$module$2e$css__$5b$client$5d$__$28$css__module$29$__["default"].variable;
}
const __TURBOPACK__default__export__ = fontData;
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
"[project]/GPUMaestro/pages/_app.tsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>App
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/GPUMaestro/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$compiler$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/GPUMaestro/node_modules/react/compiler-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$next$5d2f$internal$2f$font$2f$google$2f$inter_278011f6$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[next]/internal/font/google/inter_278011f6.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$cpu$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Cpu$3e$__ = __turbopack_context__.i("[project]/GPUMaestro/node_modules/lucide-react/dist/esm/icons/cpu.js [client] (ecmascript) <export default as Cpu>");
var __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$bell$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Bell$3e$__ = __turbopack_context__.i("[project]/GPUMaestro/node_modules/lucide-react/dist/esm/icons/bell.js [client] (ecmascript) <export default as Bell>");
var __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__User$3e$__ = __turbopack_context__.i("[project]/GPUMaestro/node_modules/lucide-react/dist/esm/icons/user.js [client] (ecmascript) <export default as User>");
var __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$search$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Search$3e$__ = __turbopack_context__.i("[project]/GPUMaestro/node_modules/lucide-react/dist/esm/icons/search.js [client] (ecmascript) <export default as Search>");
var __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$activity$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Activity$3e$__ = __turbopack_context__.i("[project]/GPUMaestro/node_modules/lucide-react/dist/esm/icons/activity.js [client] (ecmascript) <export default as Activity>");
var __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$constants$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/GPUMaestro/constants.tsx [client] (ecmascript)");
;
;
;
;
;
;
function App(t0) {
    const $ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$compiler$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["c"])(21);
    if ($[0] !== "5bab4d331af6754606701f39c0963f7c0249e66d69e550a2db9f9973e97ab4fe") {
        for(let $i = 0; $i < 21; $i += 1){
            $[$i] = Symbol.for("react.memo_cache_sentinel");
        }
        $[0] = "5bab4d331af6754606701f39c0963f7c0249e66d69e550a2db9f9973e97ab4fe";
    }
    const { Component, pageProps, router } = t0;
    const pathToTab = _AppPathToTab;
    const activeTab = pathToTab(router.pathname);
    let t1;
    if ($[1] !== router) {
        t1 = ({
            "App[handleTabChange]": (tabId)=>{
                bb20: switch(tabId){
                    case "dashboard":
                        {
                            router.push("/");
                            break bb20;
                        }
                    case "sandboxes":
                        {
                            router.push("/sandboxes");
                            break bb20;
                        }
                    case "jobs":
                        {
                            router.push("/jobs");
                            break bb20;
                        }
                    case "models":
                        {
                            router.push("/models");
                            break bb20;
                        }
                    case "datasets":
                        {
                            router.push("/datasets");
                            break bb20;
                        }
                    case "files":
                        {
                            router.push("/files");
                            break bb20;
                        }
                    case "admin":
                        {
                            router.push("/admin");
                        }
                }
            }
        })["App[handleTabChange]"];
        $[1] = router;
        $[2] = t1;
    } else {
        t1 = $[2];
    }
    const handleTabChange = t1;
    let t2;
    if ($[3] === Symbol.for("react.memo_cache_sentinel")) {
        t2 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "p-6 flex items-center gap-3",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "bg-indigo-600 p-2 rounded-lg",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$cpu$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Cpu$3e$__["Cpu"], {
                        className: "text-white",
                        size: 24
                    }, void 0, false, {
                        fileName: "[project]/GPUMaestro/pages/_app.tsx",
                        lineNumber: 76,
                        columnNumber: 101
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/GPUMaestro/pages/_app.tsx",
                    lineNumber: 76,
                    columnNumber: 55
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: "text-xl font-bold tracking-tight text-white",
                    children: "GPU Maestro"
                }, void 0, false, {
                    fileName: "[project]/GPUMaestro/pages/_app.tsx",
                    lineNumber: 76,
                    columnNumber: 147
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/GPUMaestro/pages/_app.tsx",
            lineNumber: 76,
            columnNumber: 10
        }, this);
        $[3] = t2;
    } else {
        t2 = $[3];
    }
    let t3;
    if ($[4] !== activeTab || $[5] !== handleTabChange) {
        t3 = __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$constants$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["NAV_ITEMS"].map({
            "App[NAV_ITEMS.map()]": (item)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                    onClick: {
                        "App[NAV_ITEMS.map() > <button>.onClick]": ()=>handleTabChange(item.id)
                    }["App[NAV_ITEMS.map() > <button>.onClick]"],
                    className: `w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${activeTab === item.id ? "bg-gradient-to-r from-indigo-600 to-blue-500 text-white shadow-lg" : "text-slate-300 hover:bg-slate-800/70 hover:text-white hover:translate-x-1"}`,
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: `${activeTab === item.id ? "text-white" : "text-slate-400 group-hover:text-white"}`,
                            children: item.icon
                        }, void 0, false, {
                            fileName: "[project]/GPUMaestro/pages/_app.tsx",
                            lineNumber: 86,
                            columnNumber: 326
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "text-sm font-medium",
                            children: item.label
                        }, void 0, false, {
                            fileName: "[project]/GPUMaestro/pages/_app.tsx",
                            lineNumber: 86,
                            columnNumber: 446
                        }, this)
                    ]
                }, item.id, true, {
                    fileName: "[project]/GPUMaestro/pages/_app.tsx",
                    lineNumber: 84,
                    columnNumber: 39
                }, this)
        }["App[NAV_ITEMS.map()]"]);
        $[4] = activeTab;
        $[5] = handleTabChange;
        $[6] = t3;
    } else {
        t3 = $[6];
    }
    let t4;
    if ($[7] !== t3) {
        t4 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("nav", {
            className: "flex-1 mt-4 px-4 space-y-2",
            children: t3
        }, void 0, false, {
            fileName: "[project]/GPUMaestro/pages/_app.tsx",
            lineNumber: 96,
            columnNumber: 10
        }, this);
        $[7] = t3;
        $[8] = t4;
    } else {
        t4 = $[8];
    }
    let t5;
    if ($[9] === Symbol.for("react.memo_cache_sentinel")) {
        t5 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
            className: "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-300 hover:bg-slate-800/70 hover:text-white transition-all duration-200 group",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$activity$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Activity$3e$__["Activity"], {
                    size: 20,
                    className: "text-slate-400 group-hover:text-white"
                }, void 0, false, {
                    fileName: "[project]/GPUMaestro/pages/_app.tsx",
                    lineNumber: 104,
                    columnNumber: 170
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: "text-sm font-medium",
                    children: "System Status"
                }, void 0, false, {
                    fileName: "[project]/GPUMaestro/pages/_app.tsx",
                    lineNumber: 104,
                    columnNumber: 242
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/GPUMaestro/pages/_app.tsx",
            lineNumber: 104,
            columnNumber: 10
        }, this);
        $[9] = t5;
    } else {
        t5 = $[9];
    }
    let t6;
    if ($[10] === Symbol.for("react.memo_cache_sentinel")) {
        t6 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
            className: "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-300 hover:bg-slate-800/70 hover:text-white transition-all duration-200 group",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$bell$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Bell$3e$__["Bell"], {
                    size: 20,
                    className: "text-slate-400 group-hover:text-white"
                }, void 0, false, {
                    fileName: "[project]/GPUMaestro/pages/_app.tsx",
                    lineNumber: 111,
                    columnNumber: 170
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: "text-sm font-medium",
                    children: "Notifications"
                }, void 0, false, {
                    fileName: "[project]/GPUMaestro/pages/_app.tsx",
                    lineNumber: 111,
                    columnNumber: 238
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/GPUMaestro/pages/_app.tsx",
            lineNumber: 111,
            columnNumber: 10
        }, this);
        $[10] = t6;
    } else {
        t6 = $[10];
    }
    let t7;
    if ($[11] === Symbol.for("react.memo_cache_sentinel")) {
        t7 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "p-4 border-t border-slate-800",
            children: [
                t5,
                t6,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                    className: "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-300 hover:bg-slate-800/70 hover:text-white transition-all duration-200 group",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__User$3e$__["User"], {
                            size: 20,
                            className: "text-slate-400 group-hover:text-white"
                        }, void 0, false, {
                            fileName: "[project]/GPUMaestro/pages/_app.tsx",
                            lineNumber: 118,
                            columnNumber: 225
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "text-sm font-medium",
                            children: "Account"
                        }, void 0, false, {
                            fileName: "[project]/GPUMaestro/pages/_app.tsx",
                            lineNumber: 118,
                            columnNumber: 293
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/GPUMaestro/pages/_app.tsx",
                    lineNumber: 118,
                    columnNumber: 65
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/GPUMaestro/pages/_app.tsx",
            lineNumber: 118,
            columnNumber: 10
        }, this);
        $[11] = t7;
    } else {
        t7 = $[11];
    }
    let t8;
    if ($[12] !== t4) {
        t8 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("aside", {
            className: "w-64 flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col",
            children: [
                t2,
                t4,
                t7
            ]
        }, void 0, true, {
            fileName: "[project]/GPUMaestro/pages/_app.tsx",
            lineNumber: 125,
            columnNumber: 10
        }, this);
        $[12] = t4;
        $[13] = t8;
    } else {
        t8 = $[13];
    }
    let t9;
    if ($[14] === Symbol.for("react.memo_cache_sentinel")) {
        t9 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
            className: "h-16 bg-slate-900 border-b border-slate-800 flex items-center px-6",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center gap-4 flex-1",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex-1 max-w-md",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "relative",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$search$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Search$3e$__["Search"], {
                                className: "absolute left-3 top-1/2 -translate-y-1/2 text-slate-400",
                                size: 18
                            }, void 0, false, {
                                fileName: "[project]/GPUMaestro/pages/_app.tsx",
                                lineNumber: 133,
                                columnNumber: 204
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                type: "text",
                                placeholder: "Search resources, jobs, models...",
                                className: "w-full pl-10 pr-4 py-2 bg-slate-800/70 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            }, void 0, false, {
                                fileName: "[project]/GPUMaestro/pages/_app.tsx",
                                lineNumber: 133,
                                columnNumber: 292
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/GPUMaestro/pages/_app.tsx",
                        lineNumber: 133,
                        columnNumber: 178
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/GPUMaestro/pages/_app.tsx",
                    lineNumber: 133,
                    columnNumber: 145
                }, this)
            }, void 0, false, {
                fileName: "[project]/GPUMaestro/pages/_app.tsx",
                lineNumber: 133,
                columnNumber: 97
            }, this)
        }, void 0, false, {
            fileName: "[project]/GPUMaestro/pages/_app.tsx",
            lineNumber: 133,
            columnNumber: 10
        }, this);
        $[14] = t9;
    } else {
        t9 = $[14];
    }
    let t10;
    if ($[15] !== Component || $[16] !== pageProps) {
        t10 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
            className: "flex-1 flex flex-col overflow-hidden",
            children: [
                t9,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex-1 overflow-auto",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Component, {
                        ...pageProps
                    }, void 0, false, {
                        fileName: "[project]/GPUMaestro/pages/_app.tsx",
                        lineNumber: 140,
                        columnNumber: 108
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/GPUMaestro/pages/_app.tsx",
                    lineNumber: 140,
                    columnNumber: 70
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/GPUMaestro/pages/_app.tsx",
            lineNumber: 140,
            columnNumber: 11
        }, this);
        $[15] = Component;
        $[16] = pageProps;
        $[17] = t10;
    } else {
        t10 = $[17];
    }
    let t11;
    if ($[18] !== t10 || $[19] !== t8) {
        t11 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
            className: `${__TURBOPACK__imported__module__$5b$next$5d2f$internal$2f$font$2f$google$2f$inter_278011f6$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"].className}`,
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$GPUMaestro$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex h-screen bg-slate-950 overflow-hidden text-slate-200",
                children: [
                    t8,
                    t10
                ]
            }, void 0, true, {
                fileName: "[project]/GPUMaestro/pages/_app.tsx",
                lineNumber: 149,
                columnNumber: 50
            }, this)
        }, void 0, false, {
            fileName: "[project]/GPUMaestro/pages/_app.tsx",
            lineNumber: 149,
            columnNumber: 11
        }, this);
        $[18] = t10;
        $[19] = t8;
        $[20] = t11;
    } else {
        t11 = $[20];
    }
    return t11;
}
_c = App;
function _AppPathToTab(pathname) {
    switch(pathname){
        case "/":
            {
                return "dashboard";
            }
        case "/sandboxes":
            {
                return "sandboxes";
            }
        case "/jobs":
            {
                return "jobs";
            }
        case "/models":
            {
                return "models";
            }
        case "/datasets":
            {
                return "datasets";
            }
        case "/files":
            {
                return "files";
            }
        case "/admin":
            {
                return "admin";
            }
        default:
            {
                return "dashboard";
            }
    }
}
var _c;
__turbopack_context__.k.register(_c, "App");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[next]/entry/page-loader.ts { PAGE => \"[project]/GPUMaestro/pages/_app.tsx [client] (ecmascript)\" } [client] (ecmascript)", ((__turbopack_context__, module, exports) => {

const PAGE_PATH = "/_app";
(window.__NEXT_P = window.__NEXT_P || []).push([
    PAGE_PATH,
    ()=>{
        return __turbopack_context__.r("[project]/GPUMaestro/pages/_app.tsx [client] (ecmascript)");
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
"[hmr-entry]/hmr-entry.js { ENTRY => \"[project]/GPUMaestro/pages/_app\" }", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.r("[next]/entry/page-loader.ts { PAGE => \"[project]/GPUMaestro/pages/_app.tsx [client] (ecmascript)\" } [client] (ecmascript)");
}),
]);

//# sourceMappingURL=%5Broot-of-the-server%5D__911214c4._.js.map