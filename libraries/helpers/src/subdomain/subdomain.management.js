"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCookieUrlFromDomain = getCookieUrlFromDomain;
const tldts_1 = require("tldts");
function getCookieUrlFromDomain(domain) {
    const url = (0, tldts_1.parse)(domain);
    const host = url.hostname || '';
    // Browsers reject Domain attribute on bare IPs
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(':')) {
        return undefined;
    }
    return url.domain ? '.' + url.domain : host;
}
