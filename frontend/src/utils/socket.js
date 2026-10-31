import axios from 'axios';
import io from 'socket.io-client';

import { SOCKET_URL } from './apiBase';

/*
 * One live-update socket for the whole app.
 *
 * Pages join the rooms they care about (a product, an order) and leave them
 * on the way out; the connection itself is shared. Before, each product or
 * order page opened its own connection and closed it on leaving, so every
 * visit paid for a fresh handshake, and after a dropped connection the rooms
 * were never rejoined, so live updates quietly stopped.
 *
 * - Rooms are rejoined on every (re)connect.
 * - The connection closes after a short idle spell with no rooms.
 * - Signed-in users identify themselves with a short-lived socket token; a
 *   different user (or signing out) reconnects with fresh credentials.
 */
const IDLE_CLOSE_MS = 30 * 1000;

let socket = null;
let socketUser = null;
let idleTimer = null;
const rooms = new Map(); // room -> { count, join, leave }

// Called by socket.io on every connect attempt, so a reconnect gets a fresh token.
const authenticate = callback => {
    if (!socketUser) return callback({});
    axios.get('/api/v1/socket-token')
        .then(({ data }) => callback({ token: data?.token }))
        .catch(() => callback({}));
};

const ensureSocket = () => {
    if (socket) return socket;
    socket = io(SOCKET_URL, { auth: authenticate });
    socket.on('connect', () => {
        rooms.forEach((entry, room) => socket.emit(entry.join, room));
    });
    // Dropped connections reconnect by themselves, except when the server
    // closed it on purpose (e.g. shutting down for a deploy); reconnect then
    // too while a page still wants updates.
    socket.on('disconnect', reason => {
        if (reason === 'io server disconnect' && rooms.size > 0) {
            setTimeout(() => socket?.connect(), 1000);
        }
    });
    return socket;
};

const scheduleIdleClose = () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
        if (rooms.size === 0 && socket) {
            socket.disconnect();
            socket = null;
        }
    }, IDLE_CLOSE_MS);
};

/** Reconnect with new credentials when the signed-in user changes. */
const setSocketUser = userId => {
    const next = userId ? String(userId) : null;
    if (next === socketUser) return;
    socketUser = next;
    if (socket) {
        socket.disconnect();
        socket.connect(); // auth runs again; rooms are rejoined on connect
    }
};

/**
 * Join `room` and return the shared socket for adding listeners.
 * `kind` picks the server's events: 'product' rooms are a product id,
 * anything else uses the generic joinRoom/leaveRoom (e.g. 'order:<id>').
 * Call leaveSocketRoom(room) with the same arguments when done.
 */
export const joinSocketRoom = (room, { kind = 'room', userId = null } = {}) => {
    setSocketUser(userId);
    clearTimeout(idleTimer);
    const s = ensureSocket();
    const entry = rooms.get(room);
    if (entry) {
        entry.count += 1;
    } else {
        const events = kind === 'product'
            ? { join: 'joinProductRoom', leave: 'leaveProductRoom' }
            : { join: 'joinRoom', leave: 'leaveRoom' };
        rooms.set(room, { count: 1, ...events });
        if (s.connected) s.emit(events.join, room); // otherwise joined on connect
    }
    return s;
};

export const leaveSocketRoom = room => {
    const entry = rooms.get(room);
    if (!entry) return;
    entry.count -= 1;
    if (entry.count > 0) return;
    rooms.delete(room);
    if (socket?.connected) socket.emit(entry.leave, room);
    if (rooms.size === 0) scheduleIdleClose();
};
