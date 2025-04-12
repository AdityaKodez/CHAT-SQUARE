# Chatty - Real-Time Chat Application

## Project Overview

Chatty is a full-stack web application designed for real-time communication. It allows users to sign up, log in, chat privately with other users, participate in a global chat room, and receive notifications.

## Core Technologies

*   **Frontend:**
    *   React (with Vite)
    *   Zustand (State Management)
    *   Socket.IO Client (Real-time Communication)
    *   Axios (HTTP Requests)
    *   React Router DOM (Routing)
    *   Tailwind CSS & DaisyUI (Styling)
    *   Framer Motion (Animations)
    *   Lucide React (Icons)
    *   React Hot Toast (Notifications)
    *   React Linkify (Link detection in messages)
*   **Backend:**
    *   Node.js & Express.js (Server Framework)
    *   MongoDB & Mongoose (Database & ODM)
    *   Socket.IO (Real-time Communication)
    *   JSON Web Tokens (JWT) (Authentication)
    *   Bcryptjs (Password Hashing)
    *   Cloudinary (Image Uploads - Optional)
    *   Nodemailer (Email Verification - Optional)
    *   Web-push (Push Notifications)
    *   Cors (Cross-Origin Resource Sharing)
    *   Dotenv (Environment Variables)

## Key Features & Components

### Frontend (`Frontend/src`)

1.  **Authentication (`Pages/Login.jsx`, `Pages/Signup.jsx`, `store/useAuthStore.js`):**
    *   User registration and login forms.
    *   JWT-based authentication managed by `useAuthStore`.
    *   Handles storing user data and authentication tokens.
    *   Logout functionality.
    *   Email verification (optional, via OTP).
2.  **Sidebar (`Pages/Sidebar.jsx`):**
    *   Displays a list of contacts fetched from the backend.
    *   Shows online status indicators based on Socket.IO events.
    *   Displays unread message counts (`unreadCounts` state in `useChatStore`).
    *   Allows filtering users (e.g., show online only).
    *   Provides access to the Global Chat.
    *   Uses `useChatStore` and `useAuthStore`.
3.  **Chat Container (`Pages/ChatContainer.jsx`):**
    *   Displays messages for the `SelectedUser` from `useChatStore`.
    *   Handles sending new messages via `sendMessage` action in `useChatStore`.
    *   Shows typing indicators received via Socket.IO.
    *   Implements message editing and deletion (`EditMessages`, `DeleteMessage` actions).
    *   Displays "Seen" / "Delivered" status for sent messages.
    *   Includes a user profile modal with blocking/unblocking functionality (`blockUser`, `unblockUser` actions).
    *   Uses `ReactLinkify` to make URLs clickable.
    *   Implements infinite scrolling for loading older messages (`getMessages`, `loadMoreMessages`).
4.  **Global Chat (`components/GlobalChat.jsx`):**
    *   Similar structure to `ChatContainer` but for global messages.
    *   Fetches/sends messages via global endpoints/socket events.
    *   Shows online user count.
5.  **State Management (`store/`):**
    *   **`useAuthStore.js`:** Manages authentication state, user info, socket connection, login/logout/signup actions, profile updates, OTP verification.
    *   **`useChatStore.js`:** Manages chat-related state: selected user, conversations (messages keyed by user ID), online users, users list, message loading/sending status, blocked users, unread counts, and actions like fetching/sending messages, handling socket events for messages/typing/reads/blocks, etc.
    *   **`useNotificationStore.js`:** Manages browser/push notifications: fetching, displaying, marking as read/delivered, deleting.
6.  **Real-time (`store/useAuthStore.js`, `store/useChatStore.js`):**
    *   `useAuthStore` establishes and manages the main Socket.IO connection upon login.
    *   `useChatStore` initializes listeners for various chat-related events (`private_message`, `online-users`, `typing`, `messages_read`, etc.) once the socket is connected.
7.  **Notifications:**
    *   **Push Notifications (`lib/pushNotifications.js`, `components/NotificationService.jsx`, `public/sw.js`):** Handles requesting permission, subscribing to the backend via VAPID keys, and receiving push events via the Service Worker (`sw.js`).
    *   **In-App (`components/NotificationCenter.jsx`, `store/useNotificationStore.js`):** A dropdown/panel showing recent notifications fetched from the backend or received via socket, allowing marking as read/clearing.
8.  **Routing (`App.jsx`):** Uses `react-router-dom` to handle navigation between Login, Signup, Home (Chat), and Settings pages.

### Backend (`backend/src`)

1.  **Server (`index.js`, `lib/socket.js`):**
    *   Sets up the Express server and integrates Socket.IO.
    *   Connects to MongoDB (`lib/lib.js`).
    *   Defines CORS policy.
    *   Mounts API routes.
    *   Handles Socket.IO connections, user mapping (`userSockets`), and event broadcasting/emitting.
2.  **Database Models (`models/`):**
    *   **`user.model.js`:** Defines schema for users (email, password, name, profile pic, online status, description, verification, blocked users).
    *   **`message.model.js`:** Defines schema for messages (sender, receiver, content, global flag, read status, timestamps).
    *   **`notification.model.js`:** Defines schema for storing notifications (sender, receiver, message content, read/delivered status).
    *   **`otp.model.js`:** Schema for storing email verification OTPs.
3.  **API Routes (`routes/`):**
    *   **`auth.route.js`:** Handles signup, login, logout, profile updates, OTP sending/verification, blocking/unblocking users, fetching blocked users. Uses `protectRoute` middleware.
    *   **`message.route.js`:** Handles fetching users for sidebar, fetching private/global messages (with pagination), sending private/global messages, deleting/editing messages, marking messages as seen/read, fetching unread counts. Uses `protectRoute` middleware.
    *   **`notification.route.js`:** Handles subscribing/unsubscribing push notifications, fetching notifications, marking as read/delivered, deleting notifications. Uses `protectRoute` middleware.
4.  **Controllers (`controller/`):**
    *   Contain the logic for handling requests for each route (e.g., database interactions, data validation).
    *   Interact with Mongoose models.
    *   Emit Socket.IO events where necessary (e.g., after saving a message).
5.  **Middleware (`middleware/auth.middleware.js`):**
    *   `protectRoute`: Verifies the JWT token present in cookies to protect authenticated routes. Attaches user data to `req.user`.
6.  **Real-time Logic (`lib/socket.js`):**
    *   Manages connected users and their socket IDs.
    *   Listens for client events (`private_message`, `typing`, `markAsRead`, etc.).
    *   Broadcasts events to relevant clients (`online-users`, `typing`, `private_message`, `messages_read`, etc.).
    *   Checks block status before relaying private messages.
    *   Handles storing notifications for offline users.
7.  **Push Notifications (`lib/pushNotification.js`, `controller/notification.controller.js`):**
    *   Uses the `web-push` library.
    *   Stores user push subscriptions.
    *   Provides functions to send push notifications to specific users.
    *   Handles VAPID key generation.

## Explanation of Recent Fixes (isMyMessage & Seen Status)

### 1. `isMyMessage` Bug

*   **Problem:** Messages sent by the logged-in user were sometimes appearing as if they were received from the other user (styled incorrectly).
*   **Cause:** The comparison logic in `ChatContainer.jsx` was flawed.
    *   Messages fetched initially or via pagination often had `message.sender` as just the **ID string**.
    *   Messages received via the `private_message` socket event (or added locally after sending) often had `message.sender` as a populated **object** (containing `_id`, `fullName`, etc.).
    *   The code was trying to compare `message.sender._id` (which might be undefined if `sender` was just a string) with `authUser._id`.
*   **Fix (`ChatContainer.jsx`):**
    *   The comparison was adjusted to handle both cases:
        ```javascript
        const senderId = message?.sender?._id ?? message?.sender; // Get ID if sender is object, otherwise assume sender is ID string
        const authId = authUser?._id;
        const isMyMessage = senderId === authId;
        ```
    *   Detailed `console.log` statements were added temporarily to verify the types and values of `senderId` and `authId` during rendering, confirming the fix.

### 2. "Seen" Status Bug

*   **Problem:** The "Seen" status wasn't updating in real-time when the recipient viewed the message. Clicking away and back was sometimes required.
*   **Initial Approach & Issues:** An attempt was made using a store state (`isChatActive`) coordinated between the store and `ChatContainer`'s scroll/visibility events. This became complex due to:
    *   Timing issues between state updates, message arrival, and UI rendering.
    *   Difficulty ensuring the `isChatActive` state was perfectly synchronized with the actual UI state when a message arrived via socket.
*   **Current (Simplified & Working) Approach:**
    *   **Removed Store Complexity:** The `isChatActive` state and `setChatActive` action were removed from `useChatStore`.
    *   **`handleNewMessage` (Store):** This function now *only* adds the incoming message to the `conversations` state and updates the `unreadCounts` if the specific chat isn't currently selected (`SelectedUser`). It *does not* try to mark the message as read itself.
    *   **`ChatContainer` Responsibility:** The component is now solely responsible for triggering the "mark as seen" action based on user interaction.
        *   It uses local state (`isScrolledToBottom`) updated by the `handleScroll` callback.
        *   `handleScroll` checks if `isAtBottom` and `document.visibilityState === "visible"`. If true, it calls `markMessagesAsSeen(SelectedUser._id)`.
        *   A `useEffect` hook listens for `document.visibilityState` changes and calls `markMessagesAsSeen` if the tab becomes visible *while* the user is scrolled to the bottom (`isScrolledToBottom` state is true).
        *   Another `useEffect` calls `markMessagesAsSeen` after initial messages are loaded if the user is already at the bottom and the window is visible.
    *   **`markMessagesAsSeen` (Store):**
        *   This action now *always* attempts the API call (`POST /message/mark-seen`) and socket emission (`markAsRead`) when called by `ChatContainer`.
        *   It still optimistically updates the local state (`message.isRead = true`) immediately for a responsive UI.
        *   The check for `hasUnread` was kept primarily as a logging/debugging aid but doesn't prevent the backend call anymore (the backend can handle idempotency if needed).
    *   **Result:** This separation of concerns works better. The store handles message arrival and state updates. The UI component observes user actions (scrolling, focusing tab) and tells the store when to initiate the "mark as seen" process for the currently viewed chat. The store then updates its state and notifies the backend/other client.

This revised approach makes the "Seen" status update reliably based on the receiver's actions within the `ChatContainer`.